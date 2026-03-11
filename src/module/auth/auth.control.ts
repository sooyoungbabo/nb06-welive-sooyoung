import { NextFunction, Request, Response } from 'express';
import BadRequestError from '../../middleware/errors/BadRequestError';
import authService from './auth.service';
import { getDevRefreshToken, setDevTokens } from '../../lib/tokenDev';
import {
  NODE_ENV,
  ACCESS_TOKEN_COOKIE_NAME,
  ACCESS_TOKEN_MAXAGE,
  REFRESH_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_MAXAGE
} from '../../lib/constants';

async function signup(req: Request, res: Response, next: NextFunction): Promise<void> {
  const newUser = await authService.signup(req.body);
  res.status(201).json(newUser);
}

async function signupAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const newAdmin = await authService.signupAdmin(req.body);
  res.status(201).json(newAdmin);
}

async function signupSuperAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const newSuperAdmin = await authService.signupSuperAdmin(req.body);
  res.status(201).json(newSuperAdmin);
}

async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { userRes, accessToken, refreshToken } = await authService.login(req.body);
  setTokenCookies(res, accessToken, refreshToken);
  if (NODE_ENV === 'development') setDevTokens(accessToken);
  res.status(200).json(userRes);
}

function logout(req: Request, res: Response, next: NextFunction) {
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/auth/refresh' });
  res.clearCookie('access-token', { path: '/' });
  res.clearCookie('refresh-token', { path: '/' });
  res.clearCookie('refresh-Token', { path: '/auth/refresh' });
  res.clearCookie('connect.sid', { path: '/' });
  res.clearCookie('token', { path: '/' });

  authService.logout(res);
  res.status(200).send({ message: '사용자가 로그아웃 하였습니다' });
}

function viewTokens(req: Request, res: Response, next: NextFunction) {
  let accessToken = req.cookies[ACCESS_TOKEN_COOKIE_NAME];
  let refreshToken = req.cookies[REFRESH_TOKEN_COOKIE_NAME];

  console.log('');
  // console.log('URL:', req.originalUrl);
  // console.log('RAW COOKIE HEADER:', req.headers.cookie);
  console.log(`accessToken:  ${accessToken}`);
  console.log(`refreshToken: ${refreshToken}`);
  console.log('');
}

async function issueTokens(req: Request, res: Response, next: NextFunction): Promise<void> {
  let currRefreshToken = req.cookies[REFRESH_TOKEN_COOKIE_NAME];
  const { accessToken, refreshToken } = await authService.issueTokens(currRefreshToken);
  setTokenCookies(res, accessToken, refreshToken);
  res.status(201).send({ accessToken });
}

async function getAdminList(req: Request, res: Response, next: NextFunction): Promise<void> {
  const admins = await authService.getAdminList();
  res.status(200).json(admins);
}

async function getAptList(req: Request, res: Response, next: NextFunction): Promise<void> {
  const apts = await authService.getAptList();
  res.status(200).json(apts);
}

async function changeAdminStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  const adminId = req.params.adminId as string;
  if (!adminId) throw new BadRequestError('관리자 ID가 필요합니다.');
  const message = await authService.changeAdminStatus(adminId, req.body.status);
  res.status(200).send({ message });
}

async function changeAllAdminsStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const message = await authService.changeAllAdminsStatus(req.body.status);
  res.status(200).send({ message });
}

async function changeResidentStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const residentId = req.params.residentId as string;
  if (!residentId) throw new BadRequestError('입주민 ID가 필요합니다.');
  const message = await authService.changeResidentStatus(req.user, residentId, req.body.status);
  res.status(200).send({ message });
}

async function changeAllResidentsStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const message = await authService.changeAllResidentsStatus(req.user, req.body.status);
  res.status(200).send({ message });
}

async function patchAdminApt(req: Request, res: Response, next: NextFunction): Promise<void> {
  const adminId = req.params.adminId as string;
  const adminPatched = await authService.patchAdminApt(adminId, req.body);
  res.status(200).send({ message: '작업이 성공적으로 완료되었습니다' });
}

async function deleteAdminApt(req: Request, res: Response, next: NextFunction): Promise<void> {
  const adminId = req.params.adminId as string;
  const deletedAdmin = await authService.deleteAdminApt(adminId);
  res.status(200).send({ message: '관리자/아파트/보드가 성공적으로 삭제되었습니다' });
}

async function cleanup(req: Request, res: Response, next: NextFunction): Promise<void> {
  const message = await authService.cleanup(req.user);
  res.status(201).send({ message });
}

//-------------------------------------------------- local functions

export function setTokenCookies(
  res: Response,
  accessToken: string | undefined,
  refreshToken: string | undefined
): void {
  res.cookie(ACCESS_TOKEN_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: NODE_ENV === 'production', // false: 쓸데없이 우회적인 표현
    sameSite: 'lax',
    maxAge: ACCESS_TOKEN_MAXAGE || 10 * 60 * 60 * 1000 // 1 hour
  });
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: REFRESH_TOKEN_MAXAGE || 1 * 24 * 60 * 60 * 1000, // 1 day,
    path: NODE_ENV === 'development' ? '/' : '/auth/refresh'
  });
}

export default {
  signup,
  signupAdmin,
  signupSuperAdmin,
  login,
  logout,
  viewTokens,
  issueTokens,
  getAdminList,
  getAptList,
  changeAdminStatus,
  changeAllAdminsStatus,
  changeResidentStatus,
  changeAllResidentsStatus,
  patchAdminApt,
  deleteAdminApt,
  cleanup
};
