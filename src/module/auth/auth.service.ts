import { Response } from 'express';
import prisma from '../../lib/prisma';
import { assert } from 'superstruct';
import {
  NODE_ENV,
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME
} from '../../lib/constants';
import { generateTokens, verifyRefreshToken } from '../../lib/token';
import BadRequestError from '../../middleware/errors/BadRequestError';
import ForbiddenError from '../../middleware/errors/ForbiddenError';
import NotFoundError from '../../middleware/errors/NotFoundError';
import UnauthorizedError from '../../middleware/errors/UnauthorizedError';
import { check_passwordValidity, hashingPassword } from '../user/user.service';
import notificationRepo from '../notification/notification.repo';
import aptRepo from '../apartment/apartment.repo';
import userRepo from '../user/user.repo';
import residentRepo from '../resident/resident.repo';
import boardRepo from '../board/board.repo';
import { TokenType } from './auth.dto';
import { AptSignupRequestDto } from '../apartment/apartment.dto';
import ConflictError from '../../middleware/errors/ConflictError';
import { CreateNotification } from '../notification/notification.struct';
import { sendToUser } from '../notification/sse.manager';
import { getAptInfoByUserId, getSuperAdminId, validateAptDongHo } from '../../lib/utils';
import {
  UserSignupRequestDto,
  ResidentRegistrationDto,
  UserSignupResponseDto,
  SuperAdminSignupRequestDto,
  LoginDto,
  UserLoginResponseDto,
  SuperAdminLoginResponseDto,
  AdminSignupRequestDto,
  LoginToControlDto,
  PatchAdminAptRequestDto,
  UserRegistrationDto
} from '../user/user.dto';
import {
  Apartment,
  ApprovalStatus,
  BoardType,
  HouseholdRole,
  JoinStatus,
  NotificationType,
  Prisma,
  ResidenceStatus,
  Resident,
  User,
  UserType
} from '@prisma/client';

// USER 가입신청
async function signup(body: UserSignupRequestDto): Promise<UserSignupResponseDto> {
  // unique fields로 DB 존재여부 판단하고 이미 존재하면 ConflictError 던짐
  await validateExistingUser(body);

  // rea.body 데이터 로직 검토: (1) 아파트 (2) 동호수
  const { aptId, adminId } = await validateAptDongHo(
    body.apartmentName,
    body.apartmentDong,
    body.apartmentHo
  );

  // 입주민 명부에 승인상태로 존재하면, 사용자 계정은 승인상태로 등록
  const { joinStatus, approvalStatus } = await decideSignupStatus(aptId, body);

  // 데이터 가공
  const userData = await buildSignupUserData(body, joinStatus);
  const residentData = await buildSignupResidentData(body, approvalStatus);

  // DB creation: 트랜젝션 (1) user 생성 (2) resident 생성 (3) 알림 생성
  const userCreated = await userSignupTransaction({
    userData,
    residentData,
    aptId,
    adminId,
    body
  });

  // SSE to admin: 트랜젝션 바깥에서
  sendToUser(adminId, `[알림] 가입신청 (${userCreated.name}님)`);

  // 출력형식에 맞추 재가공하여 리턴
  return buildSignupUserRes(userCreated);
}

// Admin 가입신청
async function signupAdmin(body: AdminSignupRequestDto): Promise<UserSignupResponseDto> {
  // validation: 아파트
  const aptExisted = await aptRepo.find({
    where: { name: body.apartmentName, address: body.apartmentAddress }
  });
  if (aptExisted)
    throw new ConflictError('같은 이름과 주소를 가진 아파트가 이미 존재합니다.');

  // 데이터 가공, 검증
  const aptData = buildSignupApartmentData(body);
  const adminData = await buildSignupAdminData(body);
  const superAdminIds = await getSuperAdminId();

  // DB 생성: 트렌젝션 (1) Apartment (2) Board (3) User (4) Notification
  const adminCreated = await prisma.$transaction(async (tx) => {
    const apt = await aptRepo.create(tx, { data: aptData }); // apt 생성
    const boardData = [
      { boardType: BoardType.NOTICE, apartmentId: apt.id },
      { boardType: BoardType.COMPLAINT, apartmentId: apt.id },
      { boardType: BoardType.POLL, apartmentId: apt.id }
    ];
    await boardRepo.createMany(tx, boardData); // 3종 보드 생성
    const admin = await userRepo.create(tx, {
      data: { ...adminData, apartment: { connect: { id: apt.id } } } // admin 생성
    });

    for (const id of superAdminIds) {
      const notiData = {
        notiType: NotificationType.AUTH_ADMIN_APPLIED,
        targetId: admin.id,
        content: `[알림] 가입신청 (${admin.name}님)`
      };
      assert(notiData, CreateNotification);
      const noti = await notificationRepo.create(tx, {
        data: { ...notiData, receiver: { connect: { id } } } // 알림 생성
      });
    }
    return admin;
  });

  // SSE to superAdmins: 트렌젝션 바깥
  for (const id of superAdminIds) {
    sendToUser(id, `[알림] 가입신청 (${adminCreated.name}님)`);
  }
  // 데이터 재가공하여 리턴
  return buildSignupUserRes(adminCreated);
}

// SuperAdmin 등록: APPROVED로 등록
async function signupSuperAdmin(
  body: SuperAdminSignupRequestDto
): Promise<UserSignupResponseDto> {
  const data = {
    ...body,
    password: await hashingPassword(body.password)
  };
  const superAdminCreated = await userRepo.create(prisma, { data });
  return buildSignupUserRes(superAdminCreated);
}

async function login(data: LoginDto): Promise<LoginToControlDto> {
  const requiredUserInfo = {
    where: { username: data.username },
    include: {
      notifications: true,
      apartment: { include: { boards: true } }
    }
  };
  const user = await userRepo.find(requiredUserInfo);
  if (!user) throw new NotFoundError('사용자가 존재하지 않습니다');

  if (user.joinStatus === JoinStatus.PENDING)
    throw new BadRequestError(
      `계정 승인 대기 중입니다.\n승인 후 서비스 이용이 가능합니다.`
    );

  const isPasswordOk = await check_passwordValidity(data.password, user.password);
  if (!isPasswordOk) throw new ForbiddenError('비밀번호가 틀렸습니다');

  console.log('');
  console.log(`${user.role} ${user.name}님이 로그인하셨습니다.`);

  if (user.notifications.length) {
    const unreadCount = user.notifications.filter((n) => n.isChecked === false).length;
    if (NODE_ENV === 'development') {
      console.log(`읽지 않은 알림이 ${unreadCount}개 있습니다.`);
      console.log('');
    }
  }
  const { accessToken, refreshToken } = generateTokens(user.id); // 토큰 발급 (쿠키헤더)

  let userRes;
  if (user.role === UserType.SUPER_ADMIN) userRes = buildLoginSuperAdminRes(user);
  else userRes = buildLoginUserRes(user);

  return { userRes, accessToken, refreshToken };
}

function logout(tokenData: Response): void {
  clearTokenCookies(tokenData);
}

async function issueTokens(refreshToken: string): Promise<TokenType> {
  const { userId } = verifyRefreshToken(refreshToken);
  const user = await verifyUserExist(userId);
  return generateTokens(user.id);
}

// 관리자 목록 조회: 최고관리자 부가 기능
async function getAdminList(): Promise<User[]> {
  return await userRepo.findMany(prisma, {
    where: { role: UserType.ADMIN },
    orderBy: { createdAt: 'desc' }
  });
}
// 아파트 목록 조회: 최고관리자 부가 기능
async function getAptList(): Promise<Apartment[]> {
  return await aptRepo.findMany({ orderBy: { createdAt: 'desc' } });
}

// 관리자 상태 변경: 최고관리자 권한
async function changeAdminStatus(adminId: string, status: JoinStatus) {
  const apartmentStatus = getApprovalStatus(status);
  const admin = await userRepo.find({
    where: { id: adminId },
    select: { apartmentId: true }
  });
  if (!admin) throw new NotFoundError('관리자가 존재하지 않습니다.');
  const aptId = admin.apartmentId;
  if (!aptId) throw new NotFoundError('관리자 계정에 아파트 ID가 존재하지 않습니다.');

  // DB 승인상태 변경, 트랜젝션: (1) User (2) Apartment
  const adminApproved = await prisma.$transaction(async (tx) => {
    const admin = await userRepo.patch(tx, {
      where: { id: adminId },
      data: { joinStatus: status }
    });
    await aptRepo.patch(tx, {
      where: { id: aptId },
      data: { apartmentStatus }
    });
    return admin;
  });
  if (status === JoinStatus.APPROVED)
    return `[슈퍼관리자] 관리자 ${adminApproved.name}의 가입요청을 승인했습니다.`;
  else return `[슈퍼관리자] 관리자 ${adminApproved.name}의 가입요청을 기각했습니다.`;
}

// 관리자 상태 일괄 변경: 최고관리자 권한
async function changeAllAdminsStatus(status: JoinStatus) {
  const apartmentStatus = getApprovalStatus(status);

  // DB 승인상태 변경, 트랜젝션: (1) User (2) Apartment
  const adminsApproved = await prisma.$transaction(async (tx) => {
    const adminArgs = {
      where: { role: UserType.ADMIN, joinStatus: JoinStatus.PENDING },
      data: { joinStatus: status }
    };
    const admins = await userRepo.patchMany(tx, adminArgs);
    const aptArgs = {
      where: { apartmentStatus: ApprovalStatus.PENDING },
      data: { apartmentStatus }
    };
    await aptRepo.patchMany(tx, aptArgs);
    return admins;
  });
  if (status === JoinStatus.APPROVED)
    return `[슈퍼관리자] 관리자 ${adminsApproved.count}명의 가입신청을 승인했습니다.`;
  else return `[슈퍼관리자] 관리자 ${adminsApproved.count}명의 가입신청을 기각했습니다.`;
}

// 입주민 1명 가입상태 변경: 관리자 권한
async function changeResidentStatus(
  userId: string,
  residentId: string,
  status: JoinStatus
) {
  const { adminId, apartmentId } = await getAptInfoByUserId(residentId);
  if (adminId !== userId) throw new ForbiddenError(); // 권한 검증: 주민의 관리자가 나인가

  const approvalStatus = getApprovalStatus(status);

  // DB 상태변경, 트랜젝션: (1) Resident (2) User
  const residentApproved = await prisma.$transaction(async (tx) => {
    const resident = await residentRepo.patch(tx, {
      where: { id: residentId, isRegistered: true }, // 명부only 입주민은 대상에서 제외
      data: { approvalStatus },
      select: { isRegistered: true, userId: true, name: true }
    });
    if (!resident) throw new NotFoundError('입주민 정보를 찾을 수 없습니다.');
    if (!resident.userId) throw new NotFoundError('입주민 ID가 존재하지 않습니다.');

    await userRepo.patch(tx, {
      where: { id: resident.userId },
      data: { joinStatus: status }
    });
    return resident;
  });

  const apt = await aptRepo.find({ where: { id: apartmentId }, select: { name: true } });
  if (status === JoinStatus.APPROVED)
    return `[관리자] ${apt!.name}관리자가 ${residentApproved.name}의 가입요청을 승인했습니다.`;
  else
    return `[관리자] ${apt!.name}관리자가 ${residentApproved.name}의 가입요청을 기각했습니다.`;
}

// 입주민 가입상태 일괄 변경: 관리자 권한
async function changeAllResidentsStatus(userId: string, status: JoinStatus) {
  const { apartmentId } = await getAptInfoByUserId(userId);
  const approvalStatus = getApprovalStatus(status);

  const userArgs = {
    where: {
      apartmentId,
      role: UserType.USER,
      joinStatus: JoinStatus.PENDING
    },
    data: { joinStatus: status }
  };
  const residentArgs = {
    where: {
      apartmentId,
      isRegistered: true, // 명부only 입주민 제외
      approvalStatus: ApprovalStatus.PENDING
    },
    data: { approvalStatus }
  };
  const residentApproved = await prisma.$transaction(async (tx) => {
    const resident = await residentRepo.patchMany(tx, residentArgs);
    await userRepo.patchMany(tx, userArgs);
    return resident;
  });

  const apt = await aptRepo.find({ where: { id: apartmentId }, select: { name: true } });
  if (status === JoinStatus.APPROVED)
    return `[관리자] ${apt!.name}관리자가 입주민 ${residentApproved.count}명의 가입요청을 승인했습니다.`;
  else
    return `[관리자] ${apt!.name}관리자가 입주민 ${residentApproved.count}명의 가입요청을 기각했습니다.`;
}

// 관리자 정보 수정: 최고관리자 권한
async function patchAdminApt(
  adminId: string,
  body: PatchAdminAptRequestDto
): Promise<User> {
  const adminData = buildPatchAdminData(body);
  const aptData = buildPatchAptData(body);

  return prisma.$transaction(async (tx) => {
    const admin = await userRepo.patch(tx, { where: { id: adminId }, data: adminData });
    await aptRepo.patch(tx, { where: { id: admin.apartmentId! }, data: aptData });
    return admin;
  });
}

// 개발용 관리자 삭제 (아파트, 보드도 삭제): 최고관리자 권한
async function deleteAdmin(adminId: string): Promise<User> {
  const { apartmentId } = await getAptInfoByUserId(adminId);

  // 트렌젝션: user, apartment, boards
  return prisma.$transaction(async (tx) => {
    await boardRepo.deleteMany(tx, { where: { apartmentId } }); // 3종 보드 삭제
    const admin = await userRepo.del(tx, { where: { id: adminId } }); // 관리자 삭제
    await aptRepo.del(tx, { where: { id: apartmentId } }); // 아파트 삭제
    return admin;
  });
}

// 배포용 관리자 soft delete (아파트, 보드도): 최고관리자 권한
async function softDeleteAdmin(adminId: string): Promise<User> {
  const { apartmentId } = await getAptInfoByUserId(adminId);

  // 트렌젝션: user, apartment, boards
  return prisma.$transaction(async (tx) => {
    await boardRepo.updateMany(tx, {
      where: { apartmentId },
      data: { deletedAt: new Date() }
    });
    const admin = await userRepo.patch(tx, {
      where: { id: adminId },
      data: { deletedAt: new Date() }
    });
    await aptRepo.patch(tx, {
      where: { id: apartmentId },
      data: { deletedAt: new Date() }
    });
    return admin;
  });
}

// 거절된 사용자 일괄 삭제: 최고관리자/관리자 분지
async function cleanup(userId: string): Promise<string> {
  const { adminId, apartmentId } = await getAptInfoByUserId(userId);
  if (adminId === userId) return cleanupByAdmin(apartmentId);
  return cleanupBySuperAdmin();
}

// 거절된 관리자 일괄 삭제: 최고관리자 권한
async function cleanupBySuperAdmin(): Promise<string> {
  const aptArgs = { where: { apartmentStatus: ApprovalStatus.REJECTED } };
  const boardArgs = {
    where: { apartment: { apartmentStatus: ApprovalStatus.REJECTED } }
  };
  const userArgs = { where: { role: UserType.ADMIN, joinStatus: JoinStatus.REJECTED } };

  // 트랜젝션: (1)User (2)Board (3)Apartment
  const deleted = await prisma.$transaction(async (tx) => {
    const users = await userRepo.deleteMany(tx, userArgs);
    await boardRepo.deleteMany(tx, boardArgs);
    await aptRepo.deleteMany(tx, aptArgs);
    return users;
  });
  return `[슈퍼관리자] 거절된 관리자 가입신청 ${deleted.count}건이 일괄정리되었습니다.`;
}

async function cleanupByAdmin(apartmentId: string): Promise<string> {
  const userArgs = {
    where: {
      apartmentId,
      role: UserType.USER,
      joinStatus: JoinStatus.REJECTED
    }
  };
  const residentArgs = {
    where: {
      apartmentId,
      isRegistered: true, // 명부only 입주민 제외
      approvalStatus: ApprovalStatus.REJECTED
    }
  };
  const deleted = await prisma.$transaction(async (tx) => {
    const residents = await residentRepo.deleteMany(tx, residentArgs);
    await userRepo.deleteMany(tx, userArgs);
    return residents;
  });
  return `[관리자] 거절된 사용자 가입신청 ${deleted.count}건이 일괄정리되었습니다.`;
}

//-------------------------------------------------------- 지역 힘수
async function validateExistingUser(body: UserSignupRequestDto) {
  const exist = await userRepo.findFirst({
    where: {
      OR: [{ contact: body.contact }, { username: body.username }, { email: body.email }]
    },
    select: { contact: true, username: true, email: true }
  });

  if (!exist) return;
  if (exist.contact === body.contact)
    throw new ConflictError('이미 사용 중인 연락처입니다.');
  if (exist.username === body.username)
    throw new ConflictError('이미 사용 중인 유저네임입니다.');
  if (exist.email === body.email) throw new ConflictError('이미 사용 중인 이메일입니다.');
}

async function validateResidentSignupOrThrow(
  aptId: string,
  body: UserSignupRequestDto
): Promise<boolean> {
  const resident = await residentRepo.find(prisma, {
    where: { contact: body.contact },
    include: {
      apartment: {
        select: {
          users: {
            where: { role: UserType.ADMIN, deletedAt: null },
            select: { name: true, contact: true },
            take: 1
          }
        }
      }
    }
  });

  // (1) 명부 가입자 아님 --> 일반 사용자 가입 절차로 gogo
  if (!resident) return false;

  const admin = resident.apartment.users[0];
  if (!admin) throw new NotFoundError('관리자가 없습니다.');

  // (2) 명부 가입자인데 사용자 계정이 승인되지 않은 경우
  if (resident.isRegistered === true) {
    //if (!resident.userId) throw new NotFoundError('승인된 계정이나 사용자 Id가 없습니다.');

    const user = await userRepo.find({
      where: { contact: resident.contact },
      select: { joinStatus: true, id: true }
    });
    if (!user) throw new NotFoundError('사용자가 존재하지 않습니다.');
    throwJoinStatusError(user.joinStatus, admin);
  }
  // (3) 명부 정보와 합치 여부 검증
  validateResidentInfo(resident, aptId, body);

  // (4) 사용자 계정 자동 승인 허용
  return true;
}

type AdminWithLessInfo = Pick<User, 'name' | 'contact'>;

function throwJoinStatusError(joinStatus: JoinStatus, admin: AdminWithLessInfo) {
  switch (joinStatus) {
    case JoinStatus.PENDING:
      throw new BadRequestError('관리자가 검토 중입니다.');

    case JoinStatus.REJECTED:
      throw new BadRequestError(
        `가입신청이 거절되었습니다. 관리자에게 문의해주세요.\n(${admin.name}, ${admin.contact})`
      );

    case JoinStatus.NEED_UPDATE:
      throw new BadRequestError(
        `정보 수정 후 다시 제출해주세요.\n(${admin.name}, ${admin.contact})`
      );

    case JoinStatus.APPROVED:
      throw new BadRequestError('이미 가입된 사용자입니다.');

    default:
      throw new BadRequestError(
        `문제가 있습니다. 관리자에게 문의하세요\n(${admin.name}, ${admin.contact})`
      );
  }
}

function validateResidentInfo(
  resident: Resident,
  aptId: string,
  body: UserSignupRequestDto
) {
  if (resident.name !== body.name) {
    throw new BadRequestError('이름이 명부와 일치하지 않습니다.');
  }
  if (resident.apartmentId !== aptId)
    throw new BadRequestError('아파트가 명부와 일치하지 않습니다.');

  if (resident.apartmentDong !== body.apartmentDong)
    throw new BadRequestError('동이 일치하지 않습니다.');

  if (resident.apartmentHo !== body.apartmentHo)
    throw new BadRequestError('호수가 일치하지 않습니다.');
}

async function buildSignupUserData(body: UserRegistrationDto, joinStatus: JoinStatus) {
  return {
    username: body.username,
    password: await hashingPassword(body.password),
    contact: body.contact,
    name: body.name,
    email: body.email,
    role: body.role,
    joinStatus
  };
}

async function buildSignupResidentData(
  body: ResidentRegistrationDto,
  approvalStatus: ApprovalStatus
) {
  return {
    contact: body.contact,
    name: body.name,
    email: body.email,
    apartmentDong: body.apartmentDong,
    apartmentHo: body.apartmentHo,
    isRegistered: true,
    isHouseholder: HouseholdRole.HOUSEHOLDER,
    residenceStatus: ResidenceStatus.RESIDENCE,
    approvalStatus
  };
}

async function decideSignupStatus(aptId: string, body: UserSignupRequestDto) {
  const isAutoApproved = await validateResidentSignupOrThrow(aptId, body);

  return {
    joinStatus: isAutoApproved ? JoinStatus.APPROVED : JoinStatus.PENDING,
    approvalStatus: isAutoApproved ? ApprovalStatus.APPROVED : ApprovalStatus.PENDING
  };
}

type TransactionData = {
  userData: UserRegistrationDto & { joinStatus: JoinStatus };
  residentData: ResidentRegistrationDto & { approvalStatus: ApprovalStatus };
  aptId: string;
  adminId: string;
  body: UserSignupRequestDto;
};

async function userSignupTransaction(data: TransactionData) {
  const { userData, residentData, aptId, adminId, body } = data;

  const userCreated = await prisma.$transaction(async (tx) => {
    const user = await userRepo.create(tx, {
      data: { ...userData, apartment: { connect: { id: aptId } } } // user 생성
    });
    const createResidentData = {
      ...residentData,
      apartmentId: aptId,
      userId: user.id
    };
    await residentRepo.upsert(tx, {
      where: { contact: body.contact },
      create: createResidentData,
      update: { ...residentData, userId: user.id }
    }); // resident 생성

    // 알림 생성
    const notiData = {
      notiType: NotificationType.AUTH_USER_APPLIED,
      targetId: user.id,
      content: `[알림] 가입신청 (${body.name}님)`
    };
    assert(notiData, CreateNotification);
    await notificationRepo.create(tx, {
      data: { ...notiData, receiver: { connect: { id: adminId } } }
    });
    return user;
  });
  return userCreated;
}

function buildSignupUserRes(user: User): UserSignupResponseDto {
  //USER, ADMIN, SUPER_ADMIN
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    joinStatus: user.joinStatus,
    isActive: true,
    role: user.role
  };
}

function buildSignupApartmentData(body: AdminSignupRequestDto) {
  const raw: AptSignupRequestDto = {
    name: body.apartmentName,
    address: body.apartmentAddress,
    description: body.description,
    apartmentManagementNumber: body.apartmentManagementNumber,
    startComplexNumber: body.startComplexNumber,
    endComplexNumber: body.endComplexNumber,
    startDongNumber: body.startDongNumber,
    endDongNumber: body.endDongNumber,
    startFloorNumber: body.startFloorNumber,
    endFloorNumber: body.endFloorNumber,
    startHoNumber: body.startHoNumber,
    endHoNumber: body.endHoNumber
  };

  const {
    startDongNumber: startBuildingNumber,
    endDongNumber: endBuildingNumber,
    startHoNumber: startUnitNumber,
    endHoNumber: endUnitNumber,
    ...rest
  } = raw;

  return {
    startBuildingNumber,
    endBuildingNumber,
    startUnitNumber,
    endUnitNumber,
    ...rest
  };
}

async function buildSignupAdminData(body: AdminSignupRequestDto) {
  return {
    username: body.username,
    password: await hashingPassword(body.password),
    contact: body.contact,
    name: body.name,
    email: body.email,
    role: body.role,
    joinStatus: JoinStatus.PENDING
  };
}

function buildLoginSuperAdminRes(user: User): SuperAdminLoginResponseDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    username: user.username,
    contact: user.contact,
    avatar: user.avatar,
    joinStatus: user.joinStatus,
    isActive: true
  };
}

type UserWithApartmentBoard = Prisma.UserGetPayload<{
  include: {
    notifications: true;
    apartment: { include: { boards: true } };
  };
}>;

function buildLoginUserRes(user: UserWithApartmentBoard): UserLoginResponseDto {
  if (!user.apartment) throw new NotFoundError('관련된 아파트 정보가 없습니다');
  if (!user.apartment.boards) throw new NotFoundError('아파트 게시판이 없습니다');
  if (user.apartment.boards.length !== 3)
    throw new NotFoundError('아파트 게시판 수가 3이 아닙니다');

  const boardIds: Record<BoardType, string> = {
    [BoardType.NOTICE]: user.apartment.boards.find(
      (b) => b.boardType === BoardType.NOTICE
    )!.id,
    [BoardType.COMPLAINT]: user.apartment.boards.find(
      (b) => b.boardType === BoardType.COMPLAINT
    )!.id,
    [BoardType.POLL]: user.apartment.boards.find((b) => b.boardType === BoardType.POLL)!
      .id
  };

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    username: user.username,
    contact: user.contact,
    avatar: user.avatar,
    joinStatus: user.joinStatus,
    isActive: true,
    apartmentId: user.apartment.id,
    apartmentName: user.apartment.name,
    boardIds
  };
}

function buildPatchAdminData(body: PatchAdminAptRequestDto) {
  return {
    contact: body.contact,
    name: body.name,
    email: body.email
  };
}

function buildPatchAptData(body: PatchAdminAptRequestDto) {
  return {
    description: body.description,
    name: body.apartmentName,
    address: body.apartmentAddress,
    apartmentManagementNumber: body.apartmentManagementNumber
  };
}

function getApprovalStatus(state: JoinStatus): ApprovalStatus {
  if (state === JoinStatus.APPROVED) return ApprovalStatus.APPROVED;
  else return ApprovalStatus.REJECTED;
}

async function verifyUserExist(userId: string): Promise<User> {
  const user = await userRepo.find({ where: { id: userId } });
  if (!user) throw new UnauthorizedError();
  return user;
}

function clearTokenCookies(tokenData: Response): void {
  tokenData.clearCookie(ACCESS_TOKEN_COOKIE_NAME);
  tokenData.clearCookie(REFRESH_TOKEN_COOKIE_NAME, { path: '/auth/refresh' });
  // refreshToken은 지정된 path가 있음
}

export default {
  signup,
  signupAdmin,
  signupSuperAdmin,
  login,
  logout,
  issueTokens,
  getAdminList,
  getAptList,
  changeAdminStatus,
  changeAllAdminsStatus,
  changeResidentStatus,
  changeAllResidentsStatus,
  verifyUserExist,
  patchAdminApt,
  deleteAdmin,
  softDeleteAdmin,
  cleanup
};
