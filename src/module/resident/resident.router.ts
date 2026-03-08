import residentControl from './resident.control';
import withTryCatch from '../../lib/withTryCatch';
import authenticate from '../../middleware/authenticate';
import { uploadFile } from '../../middleware/multer';
import express from 'express';
import authorize from '../../middleware/authorize';
import { UserType } from '@prisma/client';
import { validateBody } from '../../middleware/validateBody';
import {
  residentCreateBody,
  residentListQuery,
  residentListQueryShape,
  residentParams
} from './resident.schema';
import { validateQuery } from '../../middleware/validateQuery';
import { validateParams } from '../../middleware/validateParams';

const residentRouter = express.Router();

// 입주민 목록 조회
residentRouter.get(
  '/',
  authenticate(),
  authorize(UserType.ADMIN),
  validateQuery(residentListQuery, residentListQueryShape),
  withTryCatch(residentControl.getList)
);

// 입주민 리소스 생성 (개별 등록)
residentRouter.post(
  '/',
  authenticate(),
  authorize(UserType.ADMIN),
  validateBody(residentCreateBody),
  withTryCatch(residentControl.post)
);

// 사용자로부터 입주민 리소스 생성
// residentRouter.post(
//   '/from-users/:userId',
//   authenticate(),
//   authorize(UserType.ADMIN),
//   withTryCatch(residentControl.user2resident)
// );

// 입주민 업로드 템플릿 다운로다
residentRouter.get(
  '/file/template',
  authenticate(),
  authorize(UserType.ADMIN),
  withTryCatch(residentControl.downloadTemplate)
);

// 파일로부터 입주민 리소스 생성
residentRouter.post(
  '/from-file',
  authenticate(),
  authorize(UserType.ADMIN),
  uploadFile.single('file'),
  residentControl.createManyFromFile
);

// 입주민 목록 파일 다운로드
residentRouter.get(
  '/file',
  authenticate(),
  authorize(UserType.ADMIN),
  withTryCatch(residentControl.downloadList)
);

// 입주민 상세 조회
residentRouter.get(
  '/:id',
  authenticate(),
  authorize(UserType.ADMIN),
  validateParams(residentParams),
  withTryCatch(residentControl.get)
);

// 입주민 정보 수정
residentRouter.patch(
  '/:id',
  authenticate(),
  authorize(UserType.ADMIN),
  validateParams(residentParams),
  withTryCatch(residentControl.patch)
);

// 입주민 정보 삭제
residentRouter.delete(
  '/:id',
  authenticate(),
  authorize(UserType.ADMIN),
  validateParams(residentParams),
  withTryCatch(residentControl.del)
);

export default residentRouter;
