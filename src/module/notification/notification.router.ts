import express from 'express';
import notiControl from './notification.control';
import authenticate from '../../middleware/authenticate';
import withTryCatch from '../../lib/withTryCatch';
import { validateBody, validateParams } from '../../middleware/validateReq';
import { notiParams, notiSendBody } from './notification.schema';

const notiRouter = express.Router();

// SSE
notiRouter.get('/SSE', authenticate(), withTryCatch(notiControl.stream));

// 개별 알림 상태변경
notiRouter.patch(
  '/:notificationId/read',
  authenticate(),
  validateParams(notiParams),
  withTryCatch(notiControl.read)
);

// 부가 기능
// 일괄 상태변경
notiRouter.patch('/read', authenticate(), withTryCatch(notiControl.readAll));

// 알림목록 조회
notiRouter.get('/', authenticate(), withTryCatch(notiControl.getList));

// 안 읽은 알림목록 조회
notiRouter.get('/unread', authenticate(), withTryCatch(notiControl.getUnreadList));

// 알림 보내기
notiRouter.post('/send', authenticate(), validateBody(notiSendBody), withTryCatch(notiControl.send));

export default notiRouter;
