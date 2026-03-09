import { Response } from 'express';
import prisma from '../../lib/prisma';
import {
  ApprovalStatus,
  BoardType,
  HouseholdRole,
  JoinStatus,
  NotificationType,
  Prisma,
  ResidenceStatus,
  User,
  UserType
} from '@prisma/client';
import { assert } from 'superstruct';
import { CreateUser, PatchUser } from '../user/user.struct';
import { NODE_ENV, ACCESS_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME } from '../../lib/constants';
import { generateTokens, verifyRefreshToken } from '../../lib/token';
import ForbiddenError from '../../middleware/errors/ForbiddenError';
import BadRequestError from '../../middleware/errors/BadRequestError';
import NotFoundError from '../../middleware/errors/NotFoundError';
import UnauthorizedError from '../../middleware/errors/UnauthorizedError';
import { check_passwordValidity, hashingPassword } from '../user/user.service';
import notiService from '../notification/notification.service';
import aptRepo from '../apartment/apartment.repo';
import userRepo from '../user/user.repo';
import residentRepo from '../resident/resident.repo';
import boardRepo from '../board/board.repo';
import { TokenType } from './auth.dto';
import { CreateApartment, PatchApartment } from '../apartment/apartment.struct';
import { AptSignupRequestDto } from '../apartment/apartment.dto';
import ConflictError from '../../middleware/errors/ConflictError';
import { CreateResident } from '../resident/resident.struct';
import { AuthUser } from '../../type/express';
import { requireApartmentUser, requireUser } from '../../lib/require';
import {
  ensureSameApartment,
  getAdminIdByAparatmentId,
  getSuperAdminId,
  validateDongHo
} from '../../lib/utils';
import {
  UserSignupDto,
  ResidentSignupDto,
  UserSignupResponseDto,
  SuperAdminSignupRequestDto,
  LoginDto,
  UserLoginResponseDto,
  SuperAdminLoginResponseDto,
  AdminSignupRequestDto,
  LoginToControlDto,
  UserSignupRequestDto,
  PatchAdminAptRequestDto
} from '../user/user.dto';
import { CreateNotification } from '../notification/notification.struct';

async function signup(body: UserSignupRequestDto): Promise<UserSignupResponseDto> {
  // validation: (1) 아파트 (2) 동호수
  const apt = await aptRepo.findByName(body.apartmentName);
  if (!apt) throw new BadRequestError('아파트가 존재하지 않습니다.');
  validateDongHo(body.apartmentDong, body.apartmentHo, apt);

  // data transformation & validation by superstruct
  const userData = await buildSignupUserData(body);
  const residentData = await buildSignupResidentData(body);
  assert(userData, CreateUser);
  assert({ ...residentData, apartmentId: apt.id }, CreateResident);

  // DB creation
  const userCreated = await prisma.$transaction(async (tx) => {
    const userArgs = { ...userData, apartment: { connect: { id: apt.id } } };
    const user = await userRepo.create(tx, userArgs);
    const residentArgs = {
      ...residentData,
      apartment: { connect: { id: apt.id } },
      user: { connect: { id: user.id } }
    };
    await residentRepo.create(tx, residentArgs);
    return user;
  });

  // 알림 생성
  const adminId = await getAdminIdByAparatmentId(apt.id);
  const notiData = {
    notiType: NotificationType.AUTH_USER_APPLIED,
    targetId: userCreated.id,
    content: `알림: 사용자 ${userCreated.name}님 가입신청`
  };
  assert(notiData, CreateNotification);
  const noti = await notiService.notify(adminId, notiData);

  // 출력형식에 맞추 재가공하여 리턴
  return buildSignupUserRes(userCreated);
}

async function signupAdmin(body: AdminSignupRequestDto): Promise<UserSignupResponseDto> {
  // validation: 아파트
  const aptExisted = await aptRepo.find({
    where: { name: body.apartmentName, address: body.apartmentAddress }
  });
  if (aptExisted) throw new ConflictError('같은 이름과 주소를 가진 아파트가 이미 존재합니다.');

  // 데이터 가공, 검증
  const aptData = buildSignupApartmentData(body);
  const adminData = await buildSignupAdminData(body);
  assert(aptData, CreateApartment);
  assert(adminData, CreateUser);

  // DB 생성: User, Apartment, Board
  const adminCreated = await prisma.$transaction(async (tx) => {
    const apt = await aptRepo.create(tx, aptData);
    const adminArgs = {
      ...adminData,
      apartment: { connect: { id: apt.id } }
    };
    const admin = await userRepo.create(tx, adminArgs);
    const boardData = [
      { boardType: BoardType.NOTICE, apartmentId: apt.id },
      { boardType: BoardType.COMPLAINT, apartmentId: apt.id },
      { boardType: BoardType.POLL, apartmentId: apt.id }
    ];
    await boardRepo.createMany(tx, boardData);
    return admin;
  });

  // 알림 생성
  const superAdminIds = await getSuperAdminId();
  for (const id of superAdminIds) {
    const notiData = {
      notiType: NotificationType.AUTH_USER_APPLIED,
      targetId: adminCreated.id,
      content: `알림: 관리자 ${adminCreated.name}님 가입신청`
    };
    assert(notiData, CreateNotification);
    const noti = await notiService.notify(id, notiData);
  }

  // 데이터 재가공하여 리턴
  return buildSignupUserRes(adminCreated);
}

async function signupSuperAdmin(body: SuperAdminSignupRequestDto): Promise<UserSignupResponseDto> {
  const data = {
    ...body,
    password: await hashingPassword(body.password)
  };
  assert(data, CreateUser);
  const superAdminCreated = await userRepo.create(prisma, data);
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

  const isPasswordOk = await check_passwordValidity(data.password, user.password);
  if (!isPasswordOk) throw new ForbiddenError('비밀번호가 틀렸습니다');

  if (user.notifications.length) {
    const unreadCount = user.notifications.filter((n) => n.isChecked === false).length;
    if (NODE_ENV === 'development') console.log(`읽지 않은 알림이 ${unreadCount}개 있습니다.`);
  }
  const { accessToken, refreshToken } = generateTokens(user.id);

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

async function changeAdminStatus(adminId: string, status: JoinStatus) {
  const apartmentStatus = getApprovalStatus(status);
  const admin = await userRepo.find({ where: { id: adminId }, select: { apartmentId: true } });
  if (!admin) throw new NotFoundError('관리자가 존재하지 않습니다.');
  const aptId = admin.apartmentId;
  if (!aptId) throw new NotFoundError('관리자 계정에 아파트 ID가 존재하지 않습니다.');

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

async function changeAllAdminsStatus(status: JoinStatus) {
  const apartmentStatus = getApprovalStatus(status);
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
    const apts = await aptRepo.patchMany(tx, aptArgs);
    return admins;
  });
  if (status === JoinStatus.APPROVED)
    return `[슈퍼관리자] 관리자 ${adminsApproved.count}명의 가입신청을 승인했습니다.`;
  else return `[슈퍼관리자] 관리자 ${adminsApproved.count}명의 가입신청을 기각했습니다.`;
}

async function changeResidentStatus(user: AuthUser, residentId: string, status: JoinStatus) {
  requireApartmentUser(user);
  await ensureSameApartment(user.apartmentId, residentId); // 권한 검증

  const approvalStatus = getApprovalStatus(status);
  const residentApproved = await prisma.$transaction(async (tx) => {
    const resident = await residentRepo.patch(tx, {
      where: { id: residentId, isRegistered: true }, // 명부only 입주민은 대상에서 제외
      data: { approvalStatus }
    });
    if (!resident) throw new NotFoundError('입주민 정보를 찾을 수 없습니다.');
    if (!resident.userId) throw new NotFoundError('입주민 ID가 존재하지 않습니다.');

    // 사용자 계정이 있는 경우
    if (resident.isRegistered === true)
      await userRepo.patch(tx, { where: { id: resident.userId }, data: { joinStatus: status } });
    return resident;
  });

  const apt = await aptRepo.find({ where: { id: user.apartmentId }, select: { name: true } });
  if (!apt) throw new NotFoundError('아파트가 존재하지 않습니다.');
  if (status === JoinStatus.APPROVED)
    return `[관리자] ${apt.name}관리자가 ${residentApproved.name}의 가입요청을 승인했습니다.`;
  else return `[관리자] ${apt.name}관리자가 ${residentApproved.name}의 가입요청을 기각했습니다.`;
}

async function changeAllResidentsStatus(user: AuthUser, status: JoinStatus) {
  requireApartmentUser(user);
  const approvalStatus = getApprovalStatus(status);

  const userArgs = {
    where: {
      apartmentId: user.apartmentId,
      role: UserType.USER,
      joinStatus: JoinStatus.PENDING
    },
    data: { joinStatus: status }
  };
  const residentArgs = {
    where: {
      apartmentId: user.apartmentId,
      isRegistered: true, // 명부only 입주민 제외
      approvalStatus: ApprovalStatus.PENDING
    },
    data: { approvalStatus }
  };
  const residentApproved = await prisma.$transaction(async (tx) => {
    await userRepo.patchMany(tx, userArgs);
    const resident = await residentRepo.patchMany(tx, residentArgs);
    return resident;
  });

  const apt = await aptRepo.find({ where: { id: user.apartmentId }, select: { name: true } });
  if (!apt) throw new NotFoundError('아파트가 존재하지 않습니다.');
  if (status === JoinStatus.APPROVED)
    return `[관리자] ${apt.name}관리자가 입주민 ${residentApproved.count}명의 가입요청을 승인했습니다.`;
  else
    return `[관리자] ${apt.name}관리자가 입주민 ${residentApproved.count}명의 가입요청을 기각했습니다.`;
}

async function patchAdminApt(adminId: string, body: PatchAdminAptRequestDto): Promise<User> {
  const adminData = buildPatchAdminData(body);
  const aptData = buildPatchAptData(body);
  assert(adminData, PatchUser);
  assert(aptData, PatchApartment);

  return prisma.$transaction(async (tx) => {
    const admin = await userRepo.patch(tx, { where: { id: adminId }, data: adminData });
    await aptRepo.patch(tx, { where: { id: admin.apartmentId! }, data: aptData });
    return admin;
  });
}

async function deleteAdminApt(adminId: string): Promise<User> {
  return prisma.$transaction(async (tx) => {
    const admin = await userRepo.deleteById(tx, adminId);
    if (!admin.apartmentId) throw new NotFoundError('관리자 계정에 아파트 ID가 존재하지 않습니다.');
    await boardRepo.deleteMany(tx, { where: { apartmentId: admin.apartmentId } });
    await aptRepo.deleteById(tx, admin.apartmentId);
    return admin;
  });
}

async function cleanup(user: AuthUser): Promise<string> {
  requireUser(user);
  if (user.userType === UserType.SUPER_ADMIN) return cleanupSuperAdmin();
  return cleanupAdmin(user);
}

async function cleanupSuperAdmin(): Promise<string> {
  const aptArgs = { where: { apartmentStatus: ApprovalStatus.REJECTED } };
  const boardArgs = { where: { apartment: { apartmentStatus: ApprovalStatus.REJECTED } } };
  const userArgs = { where: { role: UserType.ADMIN, joinStatus: JoinStatus.REJECTED } };

  const deleted = await prisma.$transaction(async (tx) => {
    const users = await userRepo.cleanup(tx, userArgs);
    const boards = await boardRepo.deleteMany(tx, boardArgs);
    const apts = await aptRepo.cleanup(tx, aptArgs);
    return users;
  });
  return `[슈퍼관리자] 거절된 관리자 가입신청 ${deleted.count}건이 일괄정리되었습니다.`;
}

async function cleanupAdmin(user: AuthUser): Promise<string> {
  requireApartmentUser(user);
  const userArgs = {
    where: {
      apartmentId: user.apartmentId,
      role: UserType.USER,
      joinStatus: JoinStatus.REJECTED
    }
  };
  const residentArgs = {
    where: {
      apartmentId: user.apartmentId,
      isRegistered: true, // 명부only 입주민 제외
      approvalStatus: ApprovalStatus.REJECTED
    }
  };
  const deleted = await prisma.$transaction(async (tx) => {
    const users = await userRepo.cleanup(tx, userArgs);
    const residents = await residentRepo.cleanup(tx, residentArgs);
    return residents;
  });
  return `[관리자] 거절된 사용자 가입신청 ${deleted.count}건이 일괄정리되었습니다.`;
}

//-------------------------------------------------------- 지역 합수

async function buildSignupUserData(body: UserSignupDto) {
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

async function buildSignupResidentData(body: ResidentSignupDto) {
  return {
    contact: body.contact,
    name: body.name,
    email: body.email,
    apartmentDong: body.apartmentDong,
    apartmentHo: body.apartmentHo,
    isRegistered: true,
    isHouseholder: HouseholdRole.HOUSEHOLDER,
    residenceStatus: ResidenceStatus.RESIDENCE,
    approvalStatus: ApprovalStatus.PENDING
  };
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

function buildSignupApartmentData(body: AdminSignupRequestDto): Prisma.ApartmentCreateInput {
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
    [BoardType.NOTICE]: user.apartment.boards.find((b) => b.boardType === BoardType.NOTICE)!.id,
    [BoardType.COMPLAINT]: user.apartment.boards.find((b) => b.boardType === BoardType.COMPLAINT)!
      .id,
    [BoardType.POLL]: user.apartment.boards.find((b) => b.boardType === BoardType.POLL)!.id
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
  const user = await userRepo.findById(userId);
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
  changeAdminStatus,
  changeAllAdminsStatus,
  changeResidentStatus,
  changeAllResidentsStatus,
  verifyUserExist,
  patchAdminApt,
  deleteAdminApt,
  cleanup
};
