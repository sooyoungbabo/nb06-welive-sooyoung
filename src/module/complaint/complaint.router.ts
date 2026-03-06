import express from 'express';
import { UserType } from '@prisma/client';
import withTryCatch from '../../lib/withTryCatch';
import authenticate from '../../middleware/authenticate';
import authorize from '../../middleware/authorize';
import complaintControl from './complaint.control';

// import { allowedUserKeys } from '../../lib/constants';
// import { validateReqBody } from '../../middleware/validateReqBody';

const complaintRouter = express.Router();

complaintRouter.post(
  '/',
  authenticate(),
  authorize(UserType.USER),
  withTryCatch(complaintControl.create)
);

complaintRouter.get(
  '/',
  authenticate(),
  authorize(UserType.USER, UserType.ADMIN),
  withTryCatch(complaintControl.getList)
);

complaintRouter.get(
  '/:complaintId',
  authenticate(),
  authorize(UserType.USER, UserType.ADMIN),
  withTryCatch(complaintControl.get)
);
complaintRouter.patch(
  '/:complaintId',
  authenticate(),
  authorize(UserType.USER, UserType.ADMIN),
  withTryCatch(complaintControl.patch)
);

complaintRouter.delete(
  '/:complaintId',
  authenticate(),
  authorize(UserType.USER, UserType.ADMIN),
  withTryCatch(complaintControl.del)
);
complaintRouter.patch(
  '/:complaintId/status',
  authenticate(),
  authorize(UserType.SUPER_ADMIN, UserType.ADMIN),
  withTryCatch(complaintControl.changeStatus)
);

export default complaintRouter;
