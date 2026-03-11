import express from 'express';
import notiControl from './notification.control';
import authenticate from '../../middleware/authenticate';
import withTryCatch from '../../lib/withTryCatch';

const notiRouter = express.Router();

notiRouter.get('/SSE', authenticate(), withTryCatch(notiControl.stream));

notiRouter.patch('/:notificationId/read', authenticate(), withTryCatch(notiControl.read));
notiRouter.patch('/read', authenticate(), withTryCatch(notiControl.readAll)); // 부가 기능
notiRouter.get('/', authenticate(), withTryCatch(notiControl.getList));
notiRouter.get('/unread', authenticate(), withTryCatch(notiControl.getUnreadList));

export default notiRouter;
