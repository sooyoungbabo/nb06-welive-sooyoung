import express from 'express';
import { UserType } from '@prisma/client';
import withTryCatch from '../../lib/withTryCatch';
import authenticate from '../../middleware/authenticate';
import authorize from '../../middleware/authorize';
import complaintControl from './complaint.control';
import { validateBody } from '../../middleware/validateBody';
import {
  complaintCreateBody,
  complaintListQuery,
  complaintListQueryShape,
  complaintParams
} from './complaint.schema';
import { validateParams } from '../../middleware/validateParams';
import { validateQuery } from '../../middleware/validateQuery';

const complaintRouter = express.Router();

// 민원 등록
complaintRouter.post(
  '/',
  authenticate(),
  authorize(UserType.USER),
  validateBody(complaintCreateBody),
  withTryCatch(complaintControl.create)
);

// 전체 민원 조회
complaintRouter.get(
  '/',
  authenticate(),
  authorize(UserType.USER, UserType.ADMIN),
  validateQuery(complaintListQuery, complaintListQueryShape),
  withTryCatch(complaintControl.getList)
);

// 민원 상세 조회
complaintRouter.get(
  '/:complaintId',
  authenticate(),
  authorize(UserType.USER, UserType.ADMIN),
  validateParams(complaintParams),
  withTryCatch(complaintControl.get)
);

// 일반 유저 민원 수정: 유저, 관리자
complaintRouter.patch(
  '/:complaintId',
  authenticate(),
  authorize(UserType.USER, UserType.ADMIN),
  validateParams(complaintParams),
  withTryCatch(complaintControl.patch)
);

// 민원 삭제: 유저, 관리자
complaintRouter.delete(
  '/:complaintId',
  authenticate(),
  authorize(UserType.USER, UserType.ADMIN),
  validateParams(complaintParams),
  withTryCatch(complaintControl.del)
);

// 관리자 이상 민원 수정
complaintRouter.patch(
  '/:complaintId/status',
  authenticate(),
  authorize(UserType.SUPER_ADMIN, UserType.ADMIN),
  validateParams(complaintParams),
  withTryCatch(complaintControl.changeStatus)
);

export default complaintRouter;
