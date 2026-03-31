import express from 'express';
import { UserType } from '@prisma/client';
import withTryCatch from '../../lib/withTryCatch';
import authenticate from '../../middleware/authenticate';
import authorize from '../../middleware/authorize';
import commentControl from './comment.control';
import { validateParams, validateBody } from '../../middleware/validateReq';
import { commentCreateBody, commentParams, commentPatchBody } from './comment.schema';

const commentRouter = express.Router();

// 댓글 등록
commentRouter.post(
  '/',
  authenticate(),
  authorize(UserType.USER, UserType.ADMIN),
  validateBody(commentCreateBody),
  withTryCatch(commentControl.create)
);

// 댓글 수정
commentRouter.patch(
  '/:commentId',
  authenticate(),
  authorize(UserType.USER, UserType.ADMIN),
  validateParams(commentParams),
  validateBody(commentPatchBody),
  withTryCatch(commentControl.patch)
);

// 댓글 삭제
commentRouter.delete(
  '/:commentId',
  authenticate(),
  authorize(UserType.USER, UserType.ADMIN),
  validateParams(commentParams),
  withTryCatch(commentControl.del)
);

export default commentRouter;
