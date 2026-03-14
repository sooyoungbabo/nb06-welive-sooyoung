import express from 'express';
import noticeControl from './notice.control';
import authenticate from '../../middleware/authenticate';
import withTryCatch from '../../lib/withTryCatch';
import authorize from '../../middleware/authorize';
import { UserType } from '@prisma/client';
import { validateBody, validateParams, validateQuery } from '../../middleware/validateReq';
import {
  noticeCreateBody,
  noticeParams,
  noticePatchBody,
  NoticeQuery,
  NoticeQueryShape
} from './notice.schema';

const noticeRouter = express.Router();

// 공지사항 등록
noticeRouter.post(
  '/',
  authenticate(),
  authorize(UserType.ADMIN),
  validateBody(noticeCreateBody),
  withTryCatch(noticeControl.create)
);

// 공지사항 조회: 검색
noticeRouter.get(
  '/',
  authenticate(),
  authorize(UserType.ADMIN, UserType.USER),
  validateQuery(NoticeQuery, NoticeQueryShape),
  withTryCatch(noticeControl.getList)
);

// 공지사항 상세 조회
noticeRouter.get(
  '/:noticeId',
  authenticate(),
  authorize(UserType.ADMIN, UserType.USER),
  validateParams(noticeParams),
  withTryCatch(noticeControl.get)
);

// 공지사항 수정
noticeRouter.patch(
  '/:noticeId',
  authenticate(),
  authorize(UserType.ADMIN),
  validateParams(noticeParams),
  validateBody(noticePatchBody),
  withTryCatch(noticeControl.patch)
);

// 공지사항 삭제
noticeRouter.delete(
  '/:noticeId',
  authenticate(),
  authorize(UserType.ADMIN),
  validateParams(noticeParams),
  withTryCatch(noticeControl.del)
);

export default noticeRouter;
