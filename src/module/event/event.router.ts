import express from 'express';
import { UserType } from '@prisma/client';
import withTryCatch from '../../lib/withTryCatch';
import authenticate from '../../middleware/authenticate';
import authorize from '../../middleware/authorize';
import eventControl from './event.control';
import {
  validateParams,
  validateQuery,
  validateBody
} from '../../middleware/validateReq';
import {
  eventParams,
  eventQuery,
  eventQueryShape,
  eventUpsertBody
} from './event.schema';

const eventRouter = express.Router();

// 목록 조회
// 필수: apartmentId, year, month
eventRouter.get(
  '/',
  authenticate(),
  authorize(UserType.USER, UserType.ADMIN),
  validateQuery(eventQuery, eventQueryShape),
  withTryCatch(eventControl.getList)
);

eventRouter.put(
  '/',
  authenticate(),
  authorize(UserType.ADMIN),
  validateBody(eventUpsertBody),
  withTryCatch(eventControl.put)
);

eventRouter.delete(
  '/:eventId',
  authenticate(),
  authorize(UserType.ADMIN),
  validateParams(eventParams),
  withTryCatch(eventControl.del)
);
export default eventRouter;
