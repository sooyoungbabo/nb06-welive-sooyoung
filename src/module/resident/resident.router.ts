import residentControl from './resident.control';
import withTryCatch from '../../lib/withTryCatch';
import authenticate from '../../middleware/authenticate';
import { uploadFile } from '../../middleware/multer';
import express from 'express';
import authorize from '../../middleware/authorize';
import { UserType } from '@prisma/client';
// import { allowedUserKeys } from '../../lib/constants';
// import { validateReqBody } from '../../middleware/validateReqBody';

const residentRouter = express.Router();

residentRouter.get(
  '/',
  authenticate(),
  authorize(UserType.ADMIN),
  withTryCatch(residentControl.getList)
);
residentRouter.post(
  '/',
  authenticate(),
  authorize(UserType.ADMIN),
  withTryCatch(residentControl.post)
);
// residentRouter.post(
//   '/from-users/:userId',
//   authenticate(),
//   authorize(UserType.ADMIN),
//   withTryCatch(residentControl.user2resident)
// );

residentRouter.get(
  '/file/template',
  authenticate(),
  authorize(UserType.ADMIN),
  withTryCatch(residentControl.downloadTemplate)
);

residentRouter.post(
  '/from-file',
  authenticate(),
  authorize(UserType.ADMIN),
  uploadFile.single('file'),
  residentControl.createManyFromFile
);

residentRouter.get(
  '/file',
  authenticate(),
  authorize(UserType.ADMIN),
  withTryCatch(residentControl.downloadList)
);

residentRouter.get(
  '/:id',
  authenticate(),
  authorize(UserType.ADMIN),
  withTryCatch(residentControl.get)
);
residentRouter.patch(
  '/:id',
  authenticate(),
  authorize(UserType.ADMIN),
  withTryCatch(residentControl.patch)
);
residentRouter.delete(
  '/:id',
  authenticate(),
  authorize(UserType.ADMIN),
  withTryCatch(residentControl.del)
);

export default residentRouter;
