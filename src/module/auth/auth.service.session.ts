import { Response } from 'express';
import { Prisma, BoardType, JoinStatus, User, UserType } from '@prisma/client';
import { generateTokens, verifyRefreshToken } from '../../lib/token';
import BadRequestError from '../../middleware/errors/BadRequestError';
import ForbiddenError from '../../middleware/errors/ForbiddenError';
import NotFoundError from '../../middleware/errors/NotFoundError';
import UnauthorizedError from '../../middleware/errors/UnauthorizedError';
import { check_passwordValidity } from '../user/user.service';
import userRepo from '../user/user.repo';
import { TokenType } from './auth.dto';
import {
  LoginDto,
  UserLoginResponseDto,
  SuperAdminLoginResponseDto,
  LoginToControlDto
} from '../user/user.dto';
import {
  NODE_ENV,
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME
} from '../../lib/constants';
import { removeJob } from '../notification/notification.scheduler';

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

function logout(userId: string, tokenData: Response): void {
  removeJob(userId);
  clearTokenCookies(tokenData);
}

async function issueTokens(refreshToken: string): Promise<TokenType> {
  const { userId } = verifyRefreshToken(refreshToken);
  const user = await verifyUserExist(userId);
  return generateTokens(user.id);
}

//-------------------------------------------------------- 지역 힘수

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

export default {
  login,
  logout,
  issueTokens,
  verifyUserExist
};
