import { getDevAccessToken } from '../lib/tokenDev';
import { verifyAccessToken } from '../lib/token';
import authService from '../module/auth/auth.service';
import { Request, Response, NextFunction } from 'express';
import UnauthorizedError from './errors/UnauthorizedError';
import { ACCESS_TOKEN_COOKIE_NAME, NODE_ENV } from '../lib/constants';
import residentRepo from '../module/resident/resident.repo';
import prisma from '../lib/prisma';
import userRepo from '../module/user/user.repo';
import { UserType } from '@prisma/client';

function authenticate(options?: { optional?: boolean }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const accessToken = check_accessTokenExist(req.cookies);
      if (!accessToken) {
        if (options?.optional) return next();
        throw new UnauthorizedError();
      }

      const { userId } = verifyAccessToken(accessToken);

      const user = await authService.verifyUserExist(userId);
      const apartmentId = user.apartmentId ?? undefined;

      let adminId: string | undefined;
      let residentId: string | undefined;
      if (apartmentId) {
        const [resident, admin] = await Promise.all([
          residentRepo.find(prisma, { where: { userId: user.id } }),
          userRepo.findFirst({
            where: { apartmentId, role: UserType.ADMIN, deletedAt: null }
          })
        ]);
        residentId = resident?.id;
        adminId = admin?.id;
      }

      req.user = {
        id: user.id,
        userType: user.role,
        apartmentId,
        residentId,
        adminId
      };
      if (NODE_ENV === 'development') console.log(`${user.role} ${user.name} authenticated.`);

      // const { userId } = verifyAccessToken(accessToken);

      // const user = await authService.verifyUserExist(userId);

      // let adminId: string | undefined;

      // if (user.apartmentId) {
      //   const admin = await userRepo.findFirst({
      //     where: {
      //       apartmentId: user.apartmentId,
      //       role: UserType.ADMIN,
      //       deletedAt: null
      //     }
      //   });

      //   adminId = admin?.id;
      // }

      // const resident = await residentRepo.find(prisma, {
      //   where: { userId: user.id }
      // });

      // req.user = {
      //   id: user.id,
      //   userType: user.role,
      //   apartmentId: user.apartmentId?? undefined,
      //   adminId,
      //   residentId: resident?.id
      // };
      next();
    } catch (err) {
      next(err);
    }
  };
}

function check_accessTokenExist(cookieData: Record<string, string | undefined>) {
  let accessToken = cookieData[ACCESS_TOKEN_COOKIE_NAME];

  if (!accessToken && NODE_ENV === 'development') {
    accessToken = getDevAccessToken() ?? undefined;
  }
  return accessToken;
}

// function check_accessTokenExist(cookieData: Record<string, string | undefined>) {
//   const accessToken = cookieData[ACCESS_TOKEN_COOKIE_NAME];
//   return accessToken;
// }

export default authenticate;
