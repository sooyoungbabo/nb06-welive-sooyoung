import express from 'express';
import userControl from './user.control';
import withTryCatch from '../../lib/withTryCatch';
import authenticate from '../../middleware/authenticate';
import { uploadImage } from '../../middleware/multer';
import { validateParams } from '../../middleware/validateParams';
import { userParams } from './user.schema';

const userRouter = express.Router();

// 부가기능
// 사용자 목록 조회
userRouter.get('/getList', withTryCatch(userControl.getList));

// 사용자 상세 조회
userRouter.get(
  '/:userId',
  authenticate(),
  validateParams(userParams),
  withTryCatch(userControl.get)
);

// 사용자 자기 정보 조회
userRouter.get('/me/myInfo', authenticate(), withTryCatch(userControl.me));

// 인증된 유저 APIs - password와 avatar 분리
// 비밀번호 수정
userRouter.patch('/me/password', authenticate(), withTryCatch(userControl.patchPassword));

// 아바타 업로드
userRouter.patch(
  '/me/avatar',
  authenticate(),
  uploadImage.single('image'),
  withTryCatch(userControl.postAvatar)
);
export default userRouter;
