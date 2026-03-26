import { NextFunction, Request, Response } from 'express';
import BadRequestError from '../../middleware/errors/BadRequestError';
import { setDevTokens } from '../../lib/tokenDev';
import authServiceSignup from './auth.service.signup';
import authServiceSession from './auth.service.session';
import authServiceApproval from './auth.service.approval';
import authServiceCleanup from './auth.service.cleanup';
import {
  NODE_ENV,
  ACCESS_TOKEN_COOKIE_NAME,
  ACCESS_TOKEN_MAXAGE,
  REFRESH_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_MAXAGE
} from '../../lib/constants';

async function signup(req: Request, res: Response, next: NextFunction): Promise<void> {
  const newUser = await authServiceSignup.signup(req.body);
  res.status(201).json(newUser);
}

async function signupAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const newAdmin = await authServiceSignup.signupAdmin(req.body);
  res.status(201).json(newAdmin);
}

async function signupSuperAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const newSuperAdmin = await authServiceSignup.signupSuperAdmin(req.body);
  res.status(201).json(newSuperAdmin);
}

async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { userRes, accessToken, refreshToken } = await authServiceSession.login(req.body);
  setTokenCookies(res, accessToken, refreshToken);
  if (!accessToken && NODE_ENV === 'development') setDevTokens(accessToken);
  res.status(200).json(userRes);
}

function logout(req: Request, res: Response, next: NextFunction) {
  authServiceSession.logout(req.user.id, res);
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

async function issueTokens(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  let currRefreshToken = req.cookies[REFRESH_TOKEN_COOKIE_NAME];
  const { accessToken, refreshToken } =
    await authServiceSession.issueTokens(currRefreshToken);
  setTokenCookies(res, accessToken, refreshToken);
  res.status(201).send({ accessToken });
}

async function getAdminList(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const admins = await authServiceApproval.getAdminList();
  res.status(200).json({ count: admins.length, admins });
}

async function getAptList(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const apts = await authServiceApproval.getAptList();
  res.status(200).json({ count: apts.length, apts });
}

async function changeAdminStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const adminId = req.params.adminId as string;
  if (!adminId) throw new BadRequestError('관리자 ID가 필요합니다.');
  const message = await authServiceApproval.changeAdminStatus(adminId, req.body.status);
  res.status(200).send({ message });
}

async function changeAllAdminsStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const message = await authServiceApproval.changeAllAdminsStatus(req.body.status);
  res.status(200).send({ message });
}

async function changeResidentStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const residentId = req.params.residentId as string;
  if (!residentId) throw new BadRequestError('입주민 ID가 필요합니다.');
  const message = await authServiceApproval.changeResidentStatus(
    req.user.id,
    residentId,
    req.body.status
  );
  res.status(200).send({ message });
}

async function changeAllResidentsStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const message = await authServiceApproval.changeAllResidentsStatus(
    req.user.id,
    req.body.status
  );
  res.status(200).send({ message });
}

async function patchAdminApt(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const adminId = req.params.adminId as string;
  const adminPatched = await authServiceApproval.patchAdminApt(adminId, req.body);
  res.status(200).send({ message: '작업이 성공적으로 완료되었습니다' });
}

async function deleteAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const adminId = req.params.adminId as string;
  if (NODE_ENV === 'development') await authServiceCleanup.deleteAdmin(adminId);
  else await authServiceCleanup.softDeleteAdmin(adminId);
  res.status(200).send({ message: '관리자/아파트/보드가 성공적으로 삭제되었습니다' });
}

async function cleanup(req: Request, res: Response, next: NextFunction): Promise<void> {
  const message = await authServiceCleanup.cleanup(req.user.id);
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
  deleteAdmin,
  cleanup
};
