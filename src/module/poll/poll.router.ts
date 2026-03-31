import express from 'express';
import pollControl from './poll.control';
import authenticate from '../../middleware/authenticate';
import withTryCatch from '../../lib/withTryCatch';
import {
  validateBody,
  validateParams,
  validateQuery
} from '../../middleware/validateReq';
import {
  pollCreateBody,
  pollListQuery,
  pollListQueryShape,
  pollParams,
  pollPatchBody
} from './poll.schema';
import { UserType } from '@prisma/client';
import authorize from '../../middleware/authorize';

const pollRouter = express.Router();

// 생성: 관리자 권한
pollRouter.post(
  '/',
  authenticate(),
  authorize(UserType.ADMIN),
  validateBody(pollCreateBody),
  withTryCatch(pollControl.create)
);
// 목록조회: 관리자, 입주민
pollRouter.get(
  '/',
  authenticate(),
  authorize(UserType.ADMIN, UserType.USER),
  validateQuery(pollListQuery, pollListQueryShape),
  withTryCatch(pollControl.getList)
);

// 상세조회: 관리자, 입주민
pollRouter.get(
  '/:pollId',
  authenticate(),
  authorize(UserType.ADMIN, UserType.USER),
  validateParams(pollParams),
  withTryCatch(pollControl.get)
);

// 수정: 관리자
pollRouter.patch(
  '/:pollId',
  authenticate(),
  authorize(UserType.ADMIN),
  validateParams(pollParams),
  validateBody(pollPatchBody),
  withTryCatch(pollControl.patch)
);

// 삭제: 관리자
pollRouter.delete(
  '/:pollId',
  authenticate(),
  authorize(UserType.ADMIN),
  validateParams(pollParams),
  withTryCatch(pollControl.del)
);

export default pollRouter;
