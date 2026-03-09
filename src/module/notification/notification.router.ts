import express, { NextFunction, Response, Request } from 'express';
import notiControl from './notification.control';
import authenticate from '../../middleware/authenticate';
import withTryCatch from '../../lib/withTryCatch';

const notiRouter = express.Router();

notiRouter.get('/stream', authenticate(), withTryCatch(notiControl.stream));
notiRouter.post('/test', authenticate(), withTryCatch(notiControl.notify));

export default notiRouter;
