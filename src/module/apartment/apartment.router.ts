import aptControl from './apartment.control';
import withTryCatch from '../../lib/withTryCatch';
import authenticate from '../../middleware/authenticate';
import authorize from '../../middleware/authorize';
import express from 'express';
import { UserType } from '@prisma/client';
import {
  apartmentListQuery,
  apartmentListQueryShape,
  apartmentParams,
  publicApartmentListQuery,
  publicApartmentListQueryShape
} from './apartment.schema';
import { validateParams, validateQuery } from '../../middleware/validateReq';

const aptRouter = express.Router();

// 아파트 목록 조회: 공개
aptRouter.get(
  '/public',
  validateQuery(publicApartmentListQuery, publicApartmentListQueryShape),
  withTryCatch(aptControl.publicGetList)
);

// 아파트 상세 조회: 공개
aptRouter.get('/public/:id', validateParams(apartmentParams), withTryCatch(aptControl.publicGet));

// 아파트 목록 조회
aptRouter.get(
  '/',
  authenticate(),
  authorize(UserType.ADMIN, UserType.SUPER_ADMIN),
  validateQuery(apartmentListQuery, apartmentListQueryShape),
  withTryCatch(aptControl.getList)
);

// 아파트 상세 조회
aptRouter.get(
  '/:id',
  authenticate(),
  authorize(UserType.ADMIN, UserType.SUPER_ADMIN),
  validateParams(apartmentParams),
  withTryCatch(aptControl.get)
);

export default aptRouter;
