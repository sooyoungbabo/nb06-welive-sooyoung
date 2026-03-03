import authControl from './auth.control';
import withTryCatch from '../../lib/withTryCatch';
import authenticate from '../../middleware/authenticate';
import express from 'express';
// import { allowedUserKeys } from '../../lib/constants';
// import { validateReqBody } from '../../middleware/validateReqBody';

const authRouter = express.Router();

// 가입신청
authRouter.post('/signup', withTryCatch(authControl.signup));
authRouter.post('/signup/admin', withTryCatch(authControl.signupAdmin));
authRouter.post('/signup/super-admin', withTryCatch(authControl.signupSuperAdmin));

// 로그인 / 로그아웃
authRouter.post('/login', withTryCatch(authControl.login));
authRouter.post('/logout', authenticate(), withTryCatch(authControl.logout));

// 토큰 재발행
authRouter.post('/refresh', withTryCatch(authControl.issueTokens));
authRouter.get('/refresh/view', withTryCatch(authControl.viewTokens)); // 토큰 확인: 부가 기능

// admin, user 가입신청 승인
authRouter.patch(
  '/admins/:adminId/status',
  authenticate(),
  withTryCatch(authControl.changeAdminStatus)
);
authRouter.patch('/admins/status', authenticate(), withTryCatch(authControl.changeAllAdminsStatus));
authRouter.patch(
  '/residents/:residentId/status',
  authenticate(),
  withTryCatch(authControl.changeResidentStatus)
);
authRouter.patch(
  '/residents/status',
  authenticate(),
  withTryCatch(authControl.changeAllResidentsStatus)
);

authRouter.patch('/admins/:adminId', authenticate(), withTryCatch(authControl.patchAdminApt));
authRouter.delete('/admins/:adminId', authenticate(), withTryCatch(authControl.deleteAdminApt));
authRouter.post('/cleanup', authenticate(), withTryCatch(authControl.cleanup));

export default authRouter;
