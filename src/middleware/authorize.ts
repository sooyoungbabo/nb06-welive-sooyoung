import userRepo from '../module/user/user.repo';
import { Request, Response, NextFunction } from 'express';
import { UserType } from '@prisma/client';
import ForbiddenError from './errors/ForbiddenError';
import NotFoundError from './errors/NotFoundError';
import { requireUser } from '../lib/require';

function authorize(...allowedRoles: UserType[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 인증을 거치지만, 한번 더 DB에서 체크함
      requireUser(req.user);
      const user = await userRepo.find({ where: { id: req.user.id }, select: { role: true } });
      if (!user) throw new NotFoundError('사용자를 찾을 수 없습니다.');

      if (!allowedRoles.includes(req.user.userType)) {
        throw new ForbiddenError('권한이 없습니다');
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

export default authorize;
