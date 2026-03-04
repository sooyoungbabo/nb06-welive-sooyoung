import residentControl from './resident.control';
import withTryCatch from '../../lib/withTryCatch';
import authenticate from '../../middleware/authenticate';
import { uploadFile } from '../../middleware/multer';
import express from 'express';
// import { allowedUserKeys } from '../../lib/constants';
// import { validateReqBody } from '../../middleware/validateReqBody';

const residentRouter = express.Router();

residentRouter.get('/', authenticate(), withTryCatch(residentControl.getList));
residentRouter.post('/', authenticate(), withTryCatch(residentControl.post));
residentRouter.post(
  '/from-users/:userId',
  authenticate(),
  withTryCatch(residentControl.user2resident)
);

residentRouter.get(
  '/file/template',
  authenticate(),
  withTryCatch(residentControl.downloadTemplate)
);

residentRouter.post(
  '/from-file',
  authenticate(),
  uploadFile.single('file'),
  residentControl.createManyFromFile
);

residentRouter.patch('/:id', authenticate(), withTryCatch(residentControl.patch));
residentRouter.delete('/:id', authenticate(), withTryCatch(residentControl.del));

export default residentRouter;
