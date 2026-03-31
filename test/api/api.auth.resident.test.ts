import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/lib/prisma';
import path from 'path';
import * as notiSSE from '../../src/module/notification/notification.sse';
import { JoinStatus, NotificationType, UserType } from '@prisma/client';
import { clearDB, getCookie, registerResidentOnlyMember } from './api.util';
import { tokenPayload } from '../../src/lib/token';
import jwt from 'jsonwebtoken';
import {
  ACCESS_TOKEN_COOKIE_NAME,
  JWT_ACCESS_TOKEN_SECRET,
  JWT_REFRESH_TOKEN_SECRET,
  REFRESH_TOKEN_COOKIE_NAME
} from '../../src/lib/constants';

beforeAll(async () => {
  await prisma.$connect();
  await clearDB();
});

afterAll(async () => {
  await clearDB();
  await prisma.$disconnect();
});

describe('welive 통합 테스트: Auth, Resident', () => {
  describe('로그인을 요하지 않는 auth APIs', () => {
    test('최고관리자 signup하면 APPROVED 상태로 사용자 계정 생성', async () => {
      const superAdminData = {
        username: 'superadmin',
        password: 'password0!',
        contact: '999-9999-9999',
        name: '최고관리자',
        email: 'superadmin@test.com',
        role: 'SUPER_ADMIN',
        joinStatus: 'APPROVED'
      };

      const response = await request(app)
        .post('/auth/signup/super-admin')
        .send(superAdminData);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        name: '최고관리자',
        email: 'superadmin@test.com',
        joinStatus: JoinStatus.APPROVED,
        isActive: true,
        role: UserType.SUPER_ADMIN
      });
    });

    test('관리자가 signup하면 (1)아파트, (2)보드, (3)PENDING 상태로 계정 생성, 그리고 (4)알림 생성 후 (5)SSE 보냄', async () => {
      jest.spyOn(notiSSE, 'sendToUser');
      const adminData = {
        username: 'hillie',
        password: 'password0!',
        contact: '010-1111-1111',
        name: '보고싶은힐리',
        email: 'hillie@test.com',
        description: '질서, 정리정돈, 청결 등 관리상태가 완벽한 아파트',
        startComplexNumber: 1,
        endComplexNumber: 5,
        startDongNumber: 1,
        endDongNumber: 10,
        startFloorNumber: 1,
        endFloorNumber: 25,
        startHoNumber: 1,
        endHoNumber: 10,
        role: 'ADMIN',
        apartmentName: '힐리아파트',
        apartmentAddress: '서울시 성북구 화랑로 2277',
        apartmentManagementNumber: '02-111-1111'
      };
      const response = await request(app).post('/auth/signup/admin').send(adminData);
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        name: '보고싶은힐리',
        email: 'hillie@test.com',
        joinStatus: JoinStatus.PENDING,
        isActive: true,
        role: UserType.ADMIN
      });

      // 트랜젝션으로 함께 생성된 아파트 체크
      const apt = await prisma.apartment.findFirstOrThrow({
        where: { users: { some: { id: response.body.id } } },
        include: { users: { select: { username: true } } }
      });
      expect(apt).toBeDefined();
      expect(apt).toMatchObject({
        name: '힐리아파트',
        apartmentManagementNumber: '02-111-1111',
        apartmentStatus: 'PENDING',
        users: [{ username: 'hillie' }]
      });

      // 트랜젝션으로 함께 생성된 보드 체크
      const nBoards = await prisma.board.count({
        where: { apartmentId: apt.id }
      });
      expect(nBoards).toBe(3);

      // 트랜젝션으로 함께 생성된 알림 체크
      const noti = await prisma.notification.findFirstOrThrow({
        where: { notiType: NotificationType.AUTH_ADMIN_APPLIED },
        select: { receiverId: true, targetId: true }
      });
      expect(noti).toBeDefined();
      expect(noti.targetId).toEqual(response.body.id);

      // SSE 수행 확인
      expect(notiSSE.sendToUser).toHaveBeenCalledTimes(1);
      expect(notiSSE.sendToUser).toHaveBeenCalledWith(
        noti.receiverId,
        expect.stringContaining(`[알림] 가입신청`)
      );
      jest.restoreAllMocks();
    });

    test('username, contact, apartmentName, apartmentManagementNumber 필드는 이미 사용 중이면 409 에러 생성', async () => {
      const adminData = {
        username: 'hillie',
        password: 'password0!',
        contact: '010-1111-2222',
        name: '보고싶은힐리',
        email: 'hillie2@test.com',
        description: '질서, 정리정돈, 청결 등 관리상태가 완벽한 아파트',
        startComplexNumber: 1,
        endComplexNumber: 5,
        startDongNumber: 1,
        endDongNumber: 10,
        startFloorNumber: 1,
        endFloorNumber: 25,
        startHoNumber: 1,
        endHoNumber: 10,
        role: 'ADMIN',
        apartmentName: '힐리아파트2',
        apartmentAddress: '서울시 성북구 화랑로 2277',
        apartmentManagementNumber: '02-111-2222'
      };
      const response = await request(app).post('/auth/signup/admin').send(adminData);
      expect(response.status).toBe(409);
      expect(response.body.message).toBe('이미 사용 중인 유저네임입니다.');
    });

    test('username, email, contact, apartmentManagementNumber 필드 형식이 틀리면 400 에러 생성', async () => {
      const adminData = {
        username: 'hillie2',
        password: 'password0!',
        contact: '010-1111-222233',
        name: '보고싶은힐리',
        email: 'hillie2@test.com',
        description: '질서, 정리정돈, 청결 등 관리상태가 완벽한 아파트',
        startComplexNumber: 1,
        endComplexNumber: 5,
        startDongNumber: 1,
        endDongNumber: 10,
        startFloorNumber: 1,
        endFloorNumber: 25,
        startHoNumber: 1,
        endHoNumber: 10,
        role: 'ADMIN',
        apartmentName: '힐리아파트2',
        apartmentAddress: '서울시 성북구 화랑로 2277',
        apartmentManagementNumber: '02-111-2222'
      };
      const response = await request(app).post('/auth/signup/admin').send(adminData);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('contact 값이 올바르지 않습니다.');
    });

    test('사용자가 signup하면 PENDING 상태로 (1)사용자 계정과 (2)입주민 명부에 등록하고 (3)알림 생성 후 (4)SSE 보냄', async () => {
      jest.spyOn(notiSSE, 'sendToUser');
      const userData = {
        username: 'frodo',
        password: 'password0!',
        contact: '010-7777-1111',
        name: '착한프로도',
        email: 'frodo@test.com',
        role: 'USER',
        apartmentName: '힐리아파트',
        apartmentDong: '101',
        apartmentHo: '101'
      };

      const response = await request(app).post('/auth/signup').send(userData);
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        name: '착한프로도',
        email: 'frodo@test.com',
        joinStatus: 'PENDING',
        isActive: true,
        role: 'USER'
      });

      // 트랜젝션으로 함께 생성된 resident 테스트
      const resident = await prisma.resident.findFirstOrThrow({
        where: { userId: response.body.id }
      });
      expect(resident).toBeDefined();
      expect(resident).toMatchObject({
        contact: userData.contact,
        name: response.body.name,
        email: response.body.email,
        approvalStatus: 'PENDING'
      });

      // 트랜젝션으로 함께 생성된 알림 테스트
      const noti = await prisma.notification.findFirstOrThrow({
        where: { notiType: NotificationType.AUTH_USER_APPLIED },
        select: { targetId: true, receiverId: true }
      });
      expect(noti).toBeDefined();
      expect(noti.targetId).toEqual(response.body.id);

      // SSE 수행 확인
      expect(notiSSE.sendToUser).toHaveBeenCalledTimes(1);
      expect(notiSSE.sendToUser).toHaveBeenCalledWith(
        noti.receiverId,
        expect.stringContaining(`[알림] 가입신청`)
      );
      jest.restoreAllMocks();
    });

    test('username, contact, email 필드는 이미 사용중이면 409 에러 생성', async () => {
      const userData = {
        username: 'samsam',
        password: 'password0!',
        contact: '010-7777-2222',
        name: '사랑하는샘이',
        email: 'frodo@test.com',
        role: 'USER',
        apartmentName: '힐리아파트',
        apartmentDong: '101',
        apartmentHo: '102'
      };
      const response = await request(app).post('/auth/signup').send(userData);
      expect(response.status).toBe(409);
      expect(response.body.message).toBe('이미 사용 중인 이메일입니다.');
    });

    test('승인된 명부 회원이 사용자 계정 신청하면, (1)사용자 자동 승인 생성 (2)명부 정보 수정 (3)알림 생성 후 (4)SSE 보냄', async () => {
      jest.spyOn(notiSSE, 'sendToUser');
      await registerResidentOnlyMember();

      const userData = {
        username: 'tangee',
        password: 'password0!',
        contact: '010-8888-1111',
        name: '잘지내니탱이',
        email: 'tangee@test.com',
        role: 'USER',
        apartmentName: '힐리아파트',
        apartmentDong: '201',
        apartmentHo: '101'
      };
      const response = await request(app).post('/auth/signup').send(userData);
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        name: '잘지내니탱이',
        email: 'tangee@test.com',
        joinStatus: 'APPROVED',
        isActive: true,
        role: 'USER'
      });

      // 트랜젝션으로 함께 수정된 명부 정보 확인
      const resident = await prisma.resident.findUniqueOrThrow({
        where: { userId: response.body.id }
      });
      expect(resident).toMatchObject({
        isRegistered: true,
        email: 'tangee@test.com',
        approvalStatus: 'APPROVED',
        name: '잘지내니탱이',
        contact: '010-8888-1111',
        apartmentDong: userData.apartmentDong,
        apartmentHo: userData.apartmentHo
      });

      // 트랜젝션으로 함께 생성된 알림 테스트
      const noti = await prisma.notification.findFirstOrThrow({
        where: { notiType: NotificationType.AUTH_USER_APPROVED },
        select: { targetId: true, receiverId: true }
      });
      expect(noti).toBeDefined();
      expect(noti.targetId).toEqual(response.body.id);

      // SSE 수행 확인
      expect(notiSSE.sendToUser).toHaveBeenCalledTimes(1);
      expect(notiSSE.sendToUser).toHaveBeenCalledWith(
        noti.receiverId,
        expect.stringContaining(`[알림] 가입승인`)
      );
      jest.restoreAllMocks();
    });

    test('가입신청을 하지 않은 사람이 로그인 시도하면 404 에러 생성', async () => {
      const loginData = {
        username: 'nobody',
        password: 'password0!'
      };
      const response = await request(app).post('/auth/login').send(loginData);
      expect(response.status).toBe(404);
      expect(response.body.message).toEqual(`사용자가 존재하지 않습니다`);
    });

    test('승인되지 않은 사용자가 로그인 시도하면 400 에러 생성', async () => {
      const loginData = {
        username: 'hillie',
        password: 'password0!'
      };
      const response = await request(app).post('/auth/login').send(loginData);
      expect(response.status).toBe(400);
      expect(response.body.message).toEqual(
        `계정 승인 대기 중입니다.\n승인 후 서비스 이용이 가능합니다.`
      );
    });

    test('승인된 사용자가 username과 password로 로그인 요청하면 토큰을 쿠키 헤더로 반환', async () => {
      await prisma.user.update({
        where: { username: 'hillie' },
        data: { joinStatus: JoinStatus.APPROVED } // 관리자 승인으로 상태 변경
      });
      const loginData = {
        username: 'hillie',
        password: 'password0!' // 관리자 로그인
      };
      const response = await request(app).post('/auth/login').send(loginData);
      expect(response.status).toBe(200);

      expect(response.body).toMatchObject({
        name: '보고싶은힐리',
        role: 'ADMIN',
        joinStatus: JoinStatus.APPROVED,
        contact: '010-1111-1111',
        email: 'hillie@test.com',
        boardIds: {
          COMPLAINT: expect.any(String),
          NOTICE: expect.any(String),
          POLL: expect.any(String)
        }
      });

      const rawCookies = response.headers['set-cookie'];
      expect(rawCookies).toEqual(
        expect.arrayContaining([expect.stringContaining('HttpOnly')])
      );
      expect(rawCookies).toEqual(
        expect.arrayContaining([expect.stringContaining('SameSite=Lax')])
      );
      expect(rawCookies).toEqual(
        expect.arrayContaining([expect.stringContaining('Path=/')])
      );
      expect(rawCookies).toEqual(
        expect.arrayContaining([expect.stringContaining('Path=/auth/refresh')])
      );
      const token = getCookie(rawCookies, ACCESS_TOKEN_COOKIE_NAME);
      const refreshToken = getCookie(rawCookies, REFRESH_TOKEN_COOKIE_NAME);

      const now = Math.floor(Date.now() / 1000);

      const accessPayload = jwt.verify(token!, JWT_ACCESS_TOKEN_SECRET) as tokenPayload;
      expect(accessPayload.id).toBe(response.body.id);
      expect(accessPayload.exp).toBeGreaterThan(now);

      const refreshPayload = jwt.verify(
        refreshToken!,
        JWT_REFRESH_TOKEN_SECRET
      ) as tokenPayload;
      expect(refreshPayload.id).toBe(response.body.id);
      expect(refreshPayload.exp).toBeGreaterThan(now);
    });

    test('비밀번호가 틀리면 403 에러 생성', async () => {
      const loginData = {
        username: 'hillie',
        password: 'password00!'
      };
      const response = await request(app).post('/auth/login').send(loginData);
      expect(response.status).toBe(403);
      expect(response.body.message).toEqual(`비밀번호가 틀렸습니다`);
    });

    test('로그아웃 요청하면, 토큰 만료시키고 적절한 메세지 반환', async () => {
      const loginRes = await request(app)
        .post('/auth/login')
        .send({ username: 'hillie', password: 'password0!' });

      const token = getCookie(loginRes.headers['set-cookie'], ACCESS_TOKEN_COOKIE_NAME);

      const response = await request(app)
        .post('/auth/logout')
        .set('Cookie', [`${ACCESS_TOKEN_COOKIE_NAME}=${token}`]);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('사용자가 로그아웃 하였습니다');

      const rawCookies = response.headers['set-cookie'];
      expect(rawCookies).toEqual(
        expect.arrayContaining([expect.stringContaining('access-token=;')])
      );
      expect(rawCookies).toEqual(
        expect.arrayContaining([expect.stringContaining('refresh-token=;')])
      );
      expect(rawCookies).toEqual(
        expect.arrayContaining([expect.stringContaining('Expires=Thu, 01 Jan 1970')])
      );
    });
  });

  describe('로그인을 요하는 일부 auth/resdient APIs', () => {
    const agent = request.agent(app);
    beforeAll(async () => {
      const response = await agent
        .post('/auth/login')
        .send({ username: 'hillie', password: 'password0!' });
      expect(response.status).toBe(200);
    });

    test('관리자는 PENDING 상태인 입주민 일괄 승인', async () => {
      const response = await agent
        .patch('/auth/residents/status')
        .send({ status: 'APPROVED' });

      expect(response.status).toBe(200);
      expect(response.body.message).toEqual(
        '[관리자] 힐리아파트 입주민 1명의 가입요청을 승인했습니다.'
      );
    });

    test('관리자는 CSV 파일 업로드로 입주민 생성', async () => {
      const filePath = path.join(process.cwd(), 'files/residents.csv');
      const response = await agent.post('/residents/from-file').attach('file', filePath);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        message: '2명의 입주민이 등록되었습니다.',
        count: 2
      });

      // DB에서 확인
      const nResidents = await prisma.resident.count({ where: { isRegistered: false } });
      expect(nResidents).toEqual(2);
    });

    test('업로드할 파일 없이 요청하면 404', async () => {
      const response = await agent.post('/residents/from-file');
      expect(response.status).toBe(404);
    });

    test('검색하여 입주민 목록 조회하고 CSV 파일로 다운로드', async () => {
      const res = await agent.get('/residents/file').query({
        page: 1,
        limit: 10,
        building: '101',
        unitNumber: '101',
        residenceStatus: 'RESIDENCE',
        isRegistered: true
      });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toBeDefined();
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(typeof res.text).toBe('string');
      expect(res.text).toContain('동, 호수, 이름, 연락처, 세대주여부');

      const lines = res.text.split('\n');
      expect(lines.length).toBeGreaterThan(1);
      expect(lines[0]).toContain('동, 호수, 이름, 연락처, 세대주여부');
    });

    test('검색 결과 입주민 0명 조회되면 첫줄 헤더와 200 반환', async () => {
      const res = await agent.get('/residents/file').query({
        page: 1,
        limit: 10,
        building: '501',
        unitNumber: '101',
        residenceStatus: 'RESIDENCE',
        isRegistered: true
      });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');

      const lines = res.text.split('\n');
      expect(lines.length).toBe(1);
      expect(lines[0]).toContain('동, 호수, 이름, 연락처, 세대주여부');
    });

    test('입주민 조회 권한 없으면 401 에러 생성', async () => {
      const response = await request(app).get('/residents/file');
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('로그인이 필요합니다');
    });

    test('잘못된 query면 400 에러 생성', async () => {
      const res = await agent.get('/residents/file').query({
        residenceStatus: 'MOVED_OUT' // 존재하지 않는 enum 값
      });
      expect(res.status).toBe(400);
    });
  });
});
