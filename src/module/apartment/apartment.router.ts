import aptControl from './apartment.control';
import withTryCatch from '../../lib/withTryCatch';
import authenticate from '../../middleware/authenticate';
import express from 'express';
// import { allowedUserKeys } from '../../lib/constants';
// import { validateReqBody } from '../../middleware/validateReqBody';

const aptRouter = express.Router();

// 가입신청
aptRouter.get('/public', withTryCatch(aptControl.publicGetList));
aptRouter.get('/public/:id', withTryCatch(aptControl.publicGet));
aptRouter.get('/', authenticate(), withTryCatch(aptControl.getList));
aptRouter.get('/:id', authenticate(), withTryCatch(aptControl.get));

export default aptRouter;
