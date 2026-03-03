import express from 'express';
import { Request, Response, NextFunction } from 'express';
import userControl from './user.control';
import withTryCatch from '../../lib/withTryCatch';
import authenticate from '../../middleware/authenticate';
import upload from '../../middleware/multer';
//import { allowedUserKeys } from '../../lib/constants';
//import { validateReqBody } from '../../middleware/validateReqBody';

const userRouter = express.Router();

// 부가기능
userRouter.get('/getList', withTryCatch(userControl.getList));
userRouter.get('/:userId', authenticate(), withTryCatch(userControl.get));
userRouter.get('/me/myInfo', authenticate(), withTryCatch(userControl.me.bind(userControl)));

// 인증된 유저 APIs - password와 avatar 분리
userRouter.patch('/me/password', authenticate(), withTryCatch(userControl.patchPassword)); // 토큰 인증 정보 수정, 비번 제외
userRouter.post(
  'me/avatar',
  authenticate(),
  upload.single('image'),
  withTryCatch(userControl.postAvatar)
);
export default userRouter;
