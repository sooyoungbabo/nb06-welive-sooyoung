import residentControl from './resident.control';
import withTryCatch from '../../lib/withTryCatch';
import authenticate from '../../middleware/authenticate';
import express from 'express';
// import { allowedUserKeys } from '../../lib/constants';
// import { validateReqBody } from '../../middleware/validateReqBody';

const residentRouter = express.Router();

residentRouter.get('/', authenticate(), withTryCatch(residentControl.getList));
residentRouter.post('/', authenticate(), withTryCatch(residentControl.post));

residentRouter.patch('/:id', authenticate(), withTryCatch(residentControl.patch));
residentRouter.delete('/:id', authenticate(), withTryCatch(residentControl.del));

export default residentRouter;
