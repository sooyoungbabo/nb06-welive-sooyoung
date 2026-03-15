import authControl from './auth.control';
import withTryCatch from '../../lib/withTryCatch';
import authenticate from '../../middleware/authenticate';
import authorize from '../../middleware/authorize';
import express from 'express';
import { UserType } from '@prisma/client';
import { validateParams, validateBody } from '../../middleware/validateReq';
import {
  adminSignupBody,
  authParams,
  authStatusBody,
  loginBody,
  patchAdminBody,
  superAdminSignupBody,
  userSignupBody
} from './auth.schema';

const authRouter = express.Router();

// 가입신청
authRouter.post('/signup', validateBody(userSignupBody), withTryCatch(authControl.signup));
authRouter.post(
  '/signup/admin',
  validateBody(adminSignupBody),
  withTryCatch(authControl.signupAdmin)
);
authRouter.post(
  '/signup/super-admin',
  validateBody(superAdminSignupBody),
  withTryCatch(authControl.signupSuperAdmin)
);

// 로그인 / 로그아웃
authRouter.post('/login', validateBody(loginBody), withTryCatch(authControl.login));
authRouter.post('/logout', withTryCatch(authControl.logout));

// 토큰 재발행
authRouter.post('/refresh', withTryCatch(authControl.issueTokens));
authRouter.get('/refresh/view', withTryCatch(authControl.viewTokens)); // 토큰 확인: 부가 기능

// 최고관리자: 관리자 목록조회: 부가 기능
authRouter.get(
  '/admins',
  authenticate(),
  authorize(UserType.SUPER_ADMIN),
  withTryCatch(authControl.getAdminList)
);

// 최고관리자: 관리자 목록조회: 부가 기능
authRouter.get(
  '/apartments',
  authenticate(),
  authorize(UserType.SUPER_ADMIN),
  withTryCatch(authControl.getAptList)
);

// 최고관리자: 관리자 가입상태 변경: PENDING -> 승인/거절
authRouter.patch(
  '/admins/:adminId/status',
  authenticate(),
  authorize(UserType.SUPER_ADMIN),
  validateParams(authParams),
  validateBody(authStatusBody),
  withTryCatch(authControl.changeAdminStatus)
);

// 최고관리자: 관리자 가입상태 일괄 변경: PENDING -> 승인/거절
authRouter.patch(
  '/admins/status',
  authenticate(),
  authorize(UserType.SUPER_ADMIN),
  validateBody(authStatusBody),
  withTryCatch(authControl.changeAllAdminsStatus)
);

// 최고관리자: 관리자 정보 수정
authRouter.patch(
  '/admins/:adminId',
  authenticate(),
  authorize(UserType.SUPER_ADMIN),
  validateParams(authParams),
  validateBody(patchAdminBody),
  withTryCatch(authControl.patchAdminApt)
);

// 최고관리자: 관리자 정보 삭제
authRouter.delete(
  '/admins/:adminId',
  authenticate(),
  authorize(UserType.SUPER_ADMIN),
  validateParams(authParams),
  withTryCatch(authControl.deleteAdmin)
);

// 관라지: 주민 관리상태 변경: PENDING --> 승인/거절
authRouter.patch(
  '/residents/:residentId/status',
  authenticate(),
  authorize(UserType.ADMIN),
  validateParams(authParams),
  validateBody(authStatusBody),
  withTryCatch(authControl.changeResidentStatus)
);

// 관라지: 주민 관리상태 일괄변경: PENDING --> 승인/거절
authRouter.patch(
  '/residents/status',
  authenticate(),
  authorize(UserType.ADMIN),
  validateBody(authStatusBody),
  withTryCatch(authControl.changeAllResidentsStatus)
);

// 최고관리자/관리자: 거절된 관리자/주민 일괄 정리
authRouter.post(
  '/cleanup',
  authenticate(),
  authorize(UserType.SUPER_ADMIN, UserType.ADMIN),
  withTryCatch(authControl.cleanup)
);

export default authRouter;
