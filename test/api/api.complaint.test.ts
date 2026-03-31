import request, { Agent } from 'supertest';
import app from '../../src/app';
import prisma from '../../src/lib/prisma';
import {
  BoardType,
  CommentType,
  ComplaintStatus,
  NotificationType,
  UserType
} from '@prisma/client';
import createWelive from './api.createDB';
import { clearDB } from './api.util';
import * as notiSSE from '../../src/module/notification/notification.sse';

beforeAll(async () => {
  await prisma.$connect();
  await clearDB();
  await createWelive();
});

afterAll(async () => {
  await clearDB();
  await prisma.$disconnect();
});

describe('welive 통합 테스트: Complaint', () => {
  describe('민원을 둘러싼 입주민과 관리자 간의 순차적 상호작용', () => {
    let client: Agent;

    let adminId: string;
    let complaintantId: string;
    let complaintBoardId: string;
    let targetId: string;

    beforeEach(async () => {
      client = request.agent(app); // 매번 새로 생성

      const admin = await client
        .post('/auth/login')
        .send({ username: 'hillie', password: 'password0!' });
      expect(admin.status).toBe(200);
      expect(admin.body.role).toEqual(UserType.ADMIN);
      adminId = admin.body.id;

      jest.spyOn(notiSSE, 'sendToUser');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test('입주민이 민원을 등록', async () => {
      const creator = await client
        .post('/auth/login')
        .send({ username: 'frodo', password: 'password0!' });
      expect(creator.status).toBe(200);

      complaintantId = creator.body.id;
      complaintBoardId = creator.body.boardIds[BoardType.COMPLAINT];

      const complaintData = {
        boardId: complaintBoardId,
        title: '망사창 교체',
        content: '구멍난 망사창 교체 부탁드려요~',
        isPublic: false,
        status: ComplaintStatus.PENDING
      };
      const response = await client.post('/complaints').send(complaintData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('정상적으로 등록 처리되었습니다.');

      // 민원 DB 확인
      const complaint = await prisma.complaint.findFirstOrThrow({
        where: {
          creatorId: complaintantId,
          boardId: complaintBoardId,
          adminId,
          title: complaintData.title
        }
      });
      targetId = complaint.id;

      expect(complaint).toMatchObject({
        boardId: complaintBoardId,
        creatorId: complaintantId,
        adminId,
        title: complaintData.title,
        content: complaintData.content,
        isPublic: complaintData.isPublic,
        status: ComplaintStatus.PENDING,
        viewCount: 0
      });

      // 트랜젝션으로 함께 생성된 Notification 확인
      const notis = await prisma.notification.findMany({
        where: { targetId }
      });
      expect(notis).toHaveLength(1);
      expect(notis[0]).toMatchObject({
        receiverId: adminId,
        notiType: NotificationType.COMPLAINT_RAISED,
        targetId
      });

      // SSE 수행 확인
      expect(notiSSE.sendToUser).toHaveBeenCalledTimes(1);
      expect(notiSSE.sendToUser).toHaveBeenCalledWith(
        adminId,
        expect.stringContaining(`[알림] 민원접수`)
      );
    });

    test('입주민이 민원을 수정', async () => {
      const creator = await client
        .post('/auth/login')
        .send({ username: 'frodo', password: 'password0!' });
      expect(creator.status).toBe(200);

      const response = await client
        .patch(`/complaints/${targetId}`)
        .send({ isPublic: true });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        complaintId: targetId,
        userId: complaintantId,
        title: expect.stringContaining('망사창'),
        isPublic: true,
        viewsCount: 0,
        commentsCount: 0
      });
    });

    test('다른 입주민이 댓글을 등록', async () => {
      const commentor = await client
        .post('/auth/login')
        .send({ username: 'samsam', password: 'password0!' });
      expect(commentor.status).toBe(200);

      const commentData = {
        content: '날이 따스해지니 날벌레들이 보이네요. 더 많아지기 전에 빨리 부탁드려요.',
        targetType: 'COMPLAINT',
        targetId
      };
      const response = await client.post('/comments').send(commentData);

      expect(response.status).toBe(201);
      expect(response.body.comment).toMatchObject({
        userId: commentor.body.id,
        content: expect.stringContaining('날벌레'),
        writerName: commentor.body.name
      });
      expect(response.body.board).toMatchObject({
        id: targetId,
        targetType: commentData.targetType
      });
    });

    test('관리자가 민원 상세 조회하고 댓글 남김', async () => {
      let response = await client.get(`/complaints/${targetId}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        userId: complaintantId,
        viewsCount: 1,
        commentsCount: 1,
        status: ComplaintStatus.PENDING,
        title: expect.stringContaining('망사창'),
        boardType: BoardType.COMPLAINT,
        comments: [
          expect.objectContaining({
            content: expect.stringContaining('날벌레')
          })
        ]
      });

      const commentData = {
        content:
          '[관리자] 4월 중순에 망사창 점검 후 교체 작업 계획 있습니다. 4월초에 공지 나갑니다.',
        targetType: CommentType.COMPLAINT,
        targetId
      };
      response = await client.post('/comments').send(commentData);

      expect(response.status).toBe(201);
      expect(response.body.comment).toMatchObject({
        userId: adminId,
        content: expect.stringContaining('[관리자]')
      });
      expect(response.body.board).toMatchObject({
        id: targetId,
        targetType: CommentType.COMPLAINT
      });
    });

    test('민원작성자가 민원 상세 조회 후 댓글 남김', async () => {
      const creator = await client
        .post('/auth/login')
        .send({ username: 'frodo', password: 'password0!' });
      expect(creator.status).toBe(200);

      let response = await client.get(`/complaints/${targetId}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        userId: complaintantId,
        viewsCount: 2,
        commentsCount: 2,
        status: ComplaintStatus.PENDING,
        title: expect.stringContaining('망사창'),
        boardType: BoardType.COMPLAINT,
        comments: [
          expect.objectContaining({
            content: expect.stringContaining('날벌레')
          }),
          expect.objectContaining({
            content: expect.stringContaining('망사창 점검 후 교체')
          })
        ]
      });

      const commentData = {
        content: '4월 중순이면 모기 많이 나타나긴 전이라 시기적절하네요. 감사합니다.',
        targetType: 'COMPLAINT',
        targetId
      };
      response = await client.post('/comments').send(commentData);

      expect(response.status).toBe(201);
      expect(response.body.comment).toMatchObject({
        userId: creator.body.id,
        content: expect.stringContaining('감사')
      });
      expect(response.body.board).toMatchObject({
        id: targetId,
        targetType: CommentType.COMPLAINT
      });
    });

    test('관리자가 (1)민원 상세 조회 (2)댓글 생성 (3)민원 상태 수정', async () => {
      let response = await client.get(`/complaints/${targetId}`);

      // 민원 상세 조회
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        userId: complaintantId,
        viewsCount: 3,
        commentsCount: 3,
        status: ComplaintStatus.PENDING,
        title: expect.stringContaining('망사창'),
        boardType: BoardType.COMPLAINT,
        comments: [
          expect.objectContaining({
            content: expect.stringContaining('날벌레')
          }),
          expect.objectContaining({
            content: expect.stringContaining('망사창 점검 후 교체')
          }),
          expect.objectContaining({
            content: expect.stringContaining('감사합니다')
          })
        ]
      });

      // 댓글 생성
      const commentData = {
        content: '[관리자] 본 민원은 종결합니다.',
        targetType: 'COMPLAINT',
        targetId
      };
      response = await client.post('/comments').send(commentData);

      expect(response.status).toBe(201);
      expect(response.body.comment).toMatchObject({
        userId: adminId,
        content: expect.stringContaining('종결')
      });
      expect(response.body.board).toMatchObject({
        id: targetId,
        targetType: CommentType.COMPLAINT
      });

      // 민원 상태를 종결로 수정
      response = await client
        .patch(`/complaints/${targetId}/status`)
        .send({ status: ComplaintStatus.RESOLVED });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        complaintId: targetId,
        userId: complaintantId,
        title: expect.stringContaining('망사창'),
        isPublic: true,
        viewsCount: 3,
        commentsCount: 4,
        status: ComplaintStatus.RESOLVED,
        boardType: BoardType.COMPLAINT,
        comments: [
          expect.objectContaining({
            content: expect.stringContaining('날벌레')
          }),
          expect.objectContaining({
            content: expect.stringContaining('망사창 점검 후 교체')
          }),
          expect.objectContaining({
            content: expect.stringContaining('감사합니다')
          }),
          expect.objectContaining({
            content: expect.stringContaining('종결')
          })
        ]
      });

      // 트랜젝션으로 함께 생성된 Notification 확인
      const notis = await prisma.notification.findMany({
        where: { targetId }
      });

      expect(notis).toHaveLength(2);
      expect(notis[0]).toMatchObject({
        receiverId: adminId,
        notiType: NotificationType.COMPLAINT_RAISED,
        content: expect.stringContaining('민원접수'),
        targetId
      });
      expect(notis[1]).toMatchObject({
        receiverId: complaintantId,
        notiType: NotificationType.COMPLAINT_RESOLVED,
        content: expect.stringContaining('민원종결'),
        targetId
      });

      // SSE 발송 확인
      expect(notiSSE.sendToUser).toHaveBeenCalledTimes(1);
      expect(notiSSE.sendToUser).toHaveBeenCalledWith(
        complaintantId,
        expect.stringContaining(`민원종결`)
      );
    });

    test('민원 생성 시 boardId나 boardType이 틀리면 401 에러 발생', async () => {
      const creator = await client
        .post('/auth/login')
        .send({ username: 'pearl', password: 'password0!' });
      expect(creator.status).toBe(200);

      complaintantId = creator.body.id;
      const pollBoardId = creator.body.boardIds[BoardType.POLL];

      const complaintData = {
        boardId: pollBoardId,
        title: '망사창 교체',
        content: '구멍난 망사창 교체 부탁드려요~',
        isPublic: true,
        status: ComplaintStatus.PENDING
      };
      const response = await client.post('/complaints').send(complaintData);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('boardId가 틀립니다.');
    });

    test('작성자가 아닌 입주민이 비공개 민원을 상세 조회하면 403 에러 발생', async () => {
      const pearl = await client
        .post('/auth/login')
        .send({ username: 'pearl', password: 'password0!' });
      expect(pearl.status).toBe(200);

      const complaintData = {
        boardId: complaintBoardId,
        title: '201호 한밤중에 피아노 연주',
        content: '시끄러워서 밤잠을 설칩니다.',
        isPublic: false,
        status: ComplaintStatus.PENDING
      };
      const complaintRes = await client.post('/complaints').send(complaintData);
      expect(complaintRes.status).toBe(201);

      const complaint = await prisma.complaint.findFirstOrThrow({
        where: {
          creatorId: pearl.body.id,
          adminId,
          boardId: complaintBoardId
        },
        select: { id: true }
      });

      client = request.agent(app); // 다시 생성
      const frodo = await client
        .post('/auth/login')
        .send({ username: 'frodo', password: 'password0!' });
      expect(frodo.status).toBe(200);

      const response = await client.get(`/complaints/${complaint.id}`);
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('비공개 민원입니다.');
    });

    test('입주민 본인이 작성하지 않은 민원을 수정하려 하면 403 에러 발생', async () => {
      const pearl = await client
        .post('/auth/login')
        .send({ username: 'pearl', password: 'password0!' });
      expect(pearl.status).toBe(200);

      const response = await client
        .patch(`/complaints/${targetId}`)
        .send({ isPublic: false });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('본인이 작성한 민원만 수정할 수 있습니다.');
    });

    test('처리 중이거나 종결된 민원을 작성자 본인이 수정하려 시도하면 400 에러 발생', async () => {
      const frodo = await client
        .post('/auth/login')
        .send({ username: 'frodo', password: 'password0!' });
      expect(frodo.status).toBe(200);

      const response = await client
        .patch(`/complaints/${targetId}`)
        .send({ isPublic: false });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        '처리 중이거나 종결된 민원은 수정할 수 없습니다.'
      );
    });

    test('처리 중이거나 종결된 민원을 작성자 본인이 삭제하려 시도하면 400 에러 발생', async () => {
      const frodo = await client
        .post('/auth/login')
        .send({ username: 'frodo', password: 'password0!' });
      expect(frodo.status).toBe(200);

      const response = await client
        .delete(`/complaints/${targetId}`)
        .send({ isPublic: false });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        '처리 중이거나 종결된 민원은 삭제할 수 없습니다.'
      );
    });

    test('관리자가 민원 상태 외의 민원 정보 수정을 시도하려 하면 403 에러 발생', async () => {
      const response = await client
        .delete(`/complaints/${targetId}`)
        .send({ isPublic: false });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('권한이 없습니다');
    });
  });
});
