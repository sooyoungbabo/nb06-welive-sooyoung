import userRepo from '../module/user/user.repo';
import { Request, Response, NextFunction } from 'express';
import { UserType } from '@prisma/client';
import ForbiddenError from './errors/ForbiddenError';
import NotFoundError from './errors/NotFoundError';

function authorize(...allowedRoles: UserType[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await userRepo.find({ where: { id: req.user.id } });
      if (!user) throw new NotFoundError('사용자를 찾을 수 없습니다.');

      if (allowedRoles.length === 0) {
        return next();
      }

      if (!allowedRoles.includes(user.role)) {
        throw new ForbiddenError('권한이 없습니다');
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

export default authorize;
