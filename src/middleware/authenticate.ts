import { getDevAccessToken } from '../lib/tokenDev';
import { verifyAccessToken } from '../lib/token';
import { ACCESS_TOKEN_COOKIE_NAME, NODE_ENV } from '../lib/constants';
import { Request, Response, NextFunction } from 'express';
import authServiceSession from '../module/auth/auth.service.session';
import UnauthorizedError from './errors/UnauthorizedError';

function authenticate(options?: { optional?: boolean }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const accessToken = req.cookies[ACCESS_TOKEN_COOKIE_NAME];
      if (!accessToken) {
        if (options?.optional) return next();
        throw new UnauthorizedError();
      }

      const { userId } = verifyAccessToken(accessToken);
      const user = await authServiceSession.verifyUserExist(userId);
      req.user = user;

      // if (NODE_ENV === 'development')
      //   console.log(`${user.role} ${user.name} authenticated.`);
      next();
    } catch (err) {
      next(err);
    }
  };
}

// SSE로 연결된 client로부터 토큰 받는 함수: 개발용
// function check_accessTokenExist(cookieData: Record<string, string | undefined>) {
//   let accessToken = cookieData[ACCESS_TOKEN_COOKIE_NAME];

//   if (!accessToken && NODE_ENV === 'development') {
//     accessToken = getDevAccessToken() ?? undefined;
//   }
//   return accessToken;
// }

export default authenticate;
