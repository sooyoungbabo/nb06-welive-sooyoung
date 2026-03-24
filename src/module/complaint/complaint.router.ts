import express from 'express';
import { UserType } from '@prisma/client';
import withTryCatch from '../../lib/withTryCatch';
import authenticate from '../../middleware/authenticate';
import authorize from '../../middleware/authorize';
import complaintControl from './complaint.control';
import { validateParams, validateQuery, validateBody } from '../../middleware/validateReq';
import {
  complaintCreateBody,
  complaintListQuery,
  complaintListQueryShape,
  complaintParams,
  complaintPatchBody,
  complaintStatusBody
} from './complaint.schema';

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
// 비공개는 작성자와 관리자만 조회 가능
complaintRouter.get(
  '/:complaintId',
  authenticate(),
  authorize(UserType.USER, UserType.ADMIN),
  validateParams(complaintParams),
  withTryCatch(complaintControl.get)
);

// 일반 유저 민원 수정: 유저
complaintRouter.patch(
  '/:complaintId',
  authenticate(),
  authorize(UserType.USER),
  validateParams(complaintParams),
  validateBody(complaintPatchBody),
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
  validateBody(complaintStatusBody),
  withTryCatch(complaintControl.changeStatus)
);

export default complaintRouter;
