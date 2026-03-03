import { verifyAccessToken } from '../lib/token';
import authService from '../module/auth/auth.service';
import { Request, Response, NextFunction } from 'express';
import UnauthorizedError from './errors/UnauthorizedError';
import { ACCESS_TOKEN_COOKIE_NAME } from '../lib/constants';

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
      req.user = user;
      next();
    } catch (err) {
      next(err);
    }
  };
}

function check_accessTokenExist(cookieData: Record<string, string | undefined>) {
  const accessToken = cookieData[ACCESS_TOKEN_COOKIE_NAME];
  return accessToken;
}

export default authenticate;
