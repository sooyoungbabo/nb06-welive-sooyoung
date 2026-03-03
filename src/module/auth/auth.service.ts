import { Response } from 'express';
import prisma from '../../lib/prisma';
import {
  Apartment,
  ApprovalStatus,
  BoardType,
  HouseholdRole,
  JoinStatus,
  Prisma,
  ResidenceStatus,
  User,
  UserType
} from '@prisma/client';
import { assert } from 'superstruct';
import { CreateAdmin, CreateResident, CreateUser, PatchAdmin } from '../user/user.struct';
import { ACCESS_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME } from '../../lib/constants';
import { generateTokens, verifyRefreshToken } from '../../lib/token';
import ForbiddenError from '../../middleware/errors/ForbiddenError';
import NotFoundError from '../../middleware/errors/NotFoundError';
import UnauthorizedError from '../../middleware/errors/UnauthorizedError';
//import { getIO } from '../../websocket/socketIO';
import { check_passwordValidity, hashingPassword } from '../user/user.service';
import aptRepo from '../apartment/apartment.repo';
import userRepo from '../user/user.repo';
import residentRepo from '../resident/resident.repo';
import { TokenType } from './auth.dto';
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
import { CreateApartment, PatchApartment } from '../apartment/apartment.struct';
import { AptSignupRequestDto } from '../apartment/apartment.dto';
import ConflictError from '../../middleware/errors/ConflictError';
import BadRequestError from '../../middleware/errors/BadRequestError';

async function signup(body: UserSignupRequestDto): Promise<UserSignupResponseDto> {
  const aptArgs = {
    where: { name: body.apartmentName },
    select: { id: true }
  };
  const apt = await aptRepo.find(aptArgs);
  if (!apt) throw new BadRequestError('아파트가 존재하지 않습니다.');

  const userData = await buildSignupUserData(body);
  const residentData = await buildSignupResidentData(body);

  assert(userData, CreateUser);
  assert({ ...residentData, apartmentId: apt.id }, CreateResident);

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
  return buildSignupUserRes(userCreated);
}

async function signupAdmin(body: AdminSignupRequestDto): Promise<UserSignupResponseDto> {
  const aptExisted = await aptRepo.findByName(body.apartmentName);
  if (aptExisted) throw new ConflictError('같은 이름의 아파트가 이미 존재합니다.');

  const aptData = buildSignupApartmentData(body);
  const adminData = await buildSignupAdminData(body);
  assert(aptData, CreateApartment);
  assert(adminData, CreateAdmin);

  const adminCreated = await prisma.$transaction(async (tx) => {
    const apt = await aptRepo.create(tx, aptData);
    const adminArgs = {
      ...adminData,
      apartment: { connect: { id: apt.id } }
    };
    const admin = await userRepo.create(tx, adminArgs);
    return admin;
  });
  return buildSignupUserRes(adminCreated);
}

async function signupSuperAdmin(body: SuperAdminSignupRequestDto): Promise<UserSignupResponseDto> {
  const data = {
    ...body,
    password: await hashingPassword(body.password)
  };
  const superAdminCreated = await userRepo.create(prisma, data);
  return buildSignupUserRes(superAdminCreated);
}

async function login(data: LoginDto): Promise<LoginToControlDto> {
  const user = await userRepo.findByUsername(data.username);
  if (!user) throw new NotFoundError('사용자가 존재하지 않습니다');
  console.log(data.username);

  const isPasswordOk = await check_passwordValidity(data.password, user.password);
  if (!isPasswordOk) throw new ForbiddenError('비밀번호가 틀렸습니다');

  if (user.notifications.length) {
    const unreadCount = user.notifications.filter((n) => n.isChecked === false).length;
    console.log(`읽지 않은 알림이 ${unreadCount}개 있습니다.`);
  }
  const { accessToken, refreshToken } = generateTokens(user.id);

  let userRes;
  if (user.role === UserType.SUPER_ADMIN) userRes = buildLoginSuperAdminRes(user);
  else userRes = buildLoginUserRes(user);

  return { userRes, accessToken, refreshToken };
}

function logout(userId: string, tokenData: Response): void {
  clearTokenCookies(tokenData);

  // const io = getIO();
  // for (const s of io.of('/').sockets.values()) {
  //   if (s.data.userId === userId) {
  //     s.disconnect(true);
  //   }
  // }
}

async function issueTokens(refreshToken: string): Promise<TokenType> {
  const { userId } = verifyRefreshToken(refreshToken);
  const user = await verifyUserExist(userId);

  return generateTokens(user.id);
}

async function changeAdminStatus(adminId: string, status: JoinStatus) {
  const apartmentStatus = getApprovalStatus(status);
  const admin = await userRepo.find({ where: { id: adminId }, select: { apartmentId: true } });
  const aptId = admin.apartmentId;
  if (!aptId) throw new NotFoundError('아파트 ID가 존재하지 않습니다.');

  const adminApproved = await prisma.$transaction(async (tx) => {
    const admin = await userRepo.patch(tx, {
      where: { id: adminId },
      data: { joinStatus: status }
    });
    const apt = await aptRepo.patch(tx, {
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
  // console.log(adminsApproved);
  if (status === JoinStatus.APPROVED)
    return `[슈퍼관리자] 관리자 ${adminsApproved.count}명의 가입신청을 승인했습니다.`;
  else return `[슈퍼관리자] 관리자 ${adminsApproved.count}명의 가입신청을 기각했습니다.`;
}

async function changeResidentStatus(residentId: string, status: JoinStatus) {
  const approvalStatus = getApprovalStatus(status);
  const residentApproved = await prisma.$transaction(async (tx) => {
    const resident = await residentRepo.patch(tx, {
      where: { id: residentId },
      data: { approvalStatus }
    });
    if (!resident.userId) throw new NotFoundError('입주민 ID가 존재하지 않습니다.');
    const user = await userRepo.patch(tx, {
      where: { id: resident.userId },
      data: { joinStatus: status }
    });
    return resident;
  });

  const apt = await aptRepo.findById(residentApproved.apartmentId);
  if (status === JoinStatus.APPROVED)
    return `[관리자] ${apt.name}관리자가 ${residentApproved.name}의 가입요청을 승인했습니다.`;
  else return `[관리자] ${apt.name}관리자가 ${residentApproved.name}의 가입요청을 기각했습니다.`;
}

async function changeAllResidentsStatus(adminId: string, status: JoinStatus) {
  /* 현재 로직 상 강요할 수 있는 관계는...
      (1) joinStatus.approved --> approvalStatus.approved
      (2) approvalStatus.approved --> joinStatus.pending/approved
       + approvalStatus.rejected --> joinStatus.rejected (?)
  */
  const approvalStatus = getApprovalStatus(status);
  const user = await userRepo.find({ where: { id: adminId }, select: { apartmentId: true } });
  const apartmentId = user.apartmentId;
  if (!apartmentId) throw new NotFoundError('아파트가 존재하지 않습니다.');
  const apt = await aptRepo.find({ where: { id: apartmentId } });

  const userArgs = {
    where: { apartmentId, role: UserType.USER, joinStatus: JoinStatus.PENDING },
    data: { joinStatus: status }
  };
  const residentArgs = {
    where: {
      apartmentId,
      isRegistered: true,
      approvalStatus: ApprovalStatus.PENDING
    },
    data: { approvalStatus }
  };
  const residentApproved = await prisma.$transaction(async (tx) => {
    const user = await userRepo.patchMany(tx, userArgs);
    const resident = await residentRepo.patchMany(tx, residentArgs);
    return resident;
  });
  if (status === JoinStatus.APPROVED)
    return `[관리자] ${apt.name}관리자가 입주민 ${residentApproved.count}명의 가입요청을 승인했습니다.`;
  else
    return `[관리자] ${apt.name}관리자가 입주민 ${residentApproved.count}명의 가입요청을 기각했습니다.`;
}

async function patchAdminApt(adminId: string, body: PatchAdminAptRequestDto): Promise<void> {
  const adminData = buildPatchAdminData(body);
  const aptData = buildPatchAptData(body);
  assert(adminData, PatchAdmin);
  assert(aptData, PatchApartment);

  const adminPatched = await prisma.$transaction(async (tx) => {
    const admin = await userRepo.patch(tx, { where: { id: adminId }, data: adminData });
    const apt = await aptRepo.patch(tx, { where: { id: admin.apartmentId! }, data: aptData });
    return admin;
  });
}

async function deleteAdminApt(adminId: string): Promise<User> {
  const admin = await userRepo.find({ where: { id: adminId }, select: { apartmentId: true } });
  const aptId = admin.apartmentId;
  if (!aptId) throw new NotFoundError('아파트 ID가 존재하지 않습니다.');
  const adminSoftDeleted = await prisma.$transaction(async (tx) => {
    const apt = await aptRepo.deleteById(tx, aptId);
    const admin = await userRepo.deleteById(tx, adminId);
    return admin;
  });
  return adminSoftDeleted;
}

async function cleanup(id: string): Promise<string> {
  const user = await userRepo.findById(id);
  let userArgs: Prisma.UserDeleteManyArgs;
  let deleted;
  let message;
  if (user.role === UserType.SUPER_ADMIN) {
    //user와 apt 정리
    userArgs = { where: { role: UserType.ADMIN, joinStatus: JoinStatus.REJECTED } };
    const aptArgs = { where: { apartmentStatus: ApprovalStatus.REJECTED } };
    message = '[슈퍼관리자] 가입신청이 거절된 관리자 ';
    deleted = await prisma.$transaction(async (tx) => {
      const users = await userRepo.cleanup(tx, userArgs);
      const apts = await aptRepo.cleanup(tx, aptArgs);
      return users;
    });
  } else {
    // user와 resident 정리
    if (!user.apartmentId) throw new NotFoundError();
    const apt = await aptRepo.findById(user.apartmentId);
    userArgs = {
      where: { apartmentId: apt.id, role: UserType.USER, joinStatus: JoinStatus.REJECTED }
    };
    const residentArgs = {
      where: { apartmentId: apt.id, approvalStatus: ApprovalStatus.REJECTED }
    };
    deleted = await prisma.$transaction(async (tx) => {
      const users = await userRepo.cleanup(tx, userArgs);
      const residents = await residentRepo.cleanup(tx, residentArgs);
      return residents;
    });
    message = '[관리자] 가입신청이 거절된 사용자 ';
  }

  message += `${deleted.count}건이 일괄정리되었습니다.`;
  return message;
}

//-------------------------------------------------------- local functions
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
  if (!user) {
    throw new UnauthorizedError();
  }
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
