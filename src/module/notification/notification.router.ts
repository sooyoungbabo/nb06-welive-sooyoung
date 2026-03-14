import express from 'express';
import notiControl from './notification.control';
import authenticate from '../../middleware/authenticate';
import withTryCatch from '../../lib/withTryCatch';
import authorize from '../../middleware/authorize';
import { UserType } from '@prisma/client';

const notiRouter = express.Router();

notiRouter.get('/SSE', authenticate(), withTryCatch(notiControl.stream));

notiRouter.patch(
  '/:notificationId/read',
  authenticate(),
  authorize(UserType.USER, UserType.ADMIN),
  withTryCatch(notiControl.read)
);
notiRouter.patch(
  '/read',
  authenticate(),
  authorize(UserType.USER, UserType.ADMIN),
  withTryCatch(notiControl.readAll)
); // 부가 기능
notiRouter.get(
  '/',
  authenticate(),
  authorize(UserType.USER, UserType.ADMIN),
  withTryCatch(notiControl.getList)
);
notiRouter.get(
  '/unread',
  authenticate(),
  authorize(UserType.USER, UserType.ADMIN),
  withTryCatch(notiControl.getUnreadList)
);

export default notiRouter;
