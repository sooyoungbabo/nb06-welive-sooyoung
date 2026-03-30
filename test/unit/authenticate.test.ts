import authenticate from '../../src/middleware/authenticate';
import authServiceSession from '../../src/module/auth/auth.service.session';
import { verifyAccessToken } from '../../src/lib/token';
import { Response } from 'express';
import { ACCESS_TOKEN_COOKIE_NAME } from '../../src/lib/constants';
import { User } from '@prisma/client';
import jwt from 'jsonwebtoken';

jest.mock('../../src/lib/token');
jest.mock('../../src/module/auth/auth.service.session');

describe('authenticate middleware', () => {
  const next = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (authServiceSession.verifyUserExist as jest.Mock).mockReset();
    (verifyAccessToken as jest.Mock).mockReset();
  });

  test('쿠키헤더에 바른 토큰이 있으면 next() 호출', async () => {
    const mockUser: User = {
      id: 'abcdefg',
      apartmentId: 'abcdefg',
      username: 'mockUser',
      password: 'password',
      contact: '02-123-4567',
      name: '가짜유저',
      email: 'test@test.com',
      role: 'USER',
      avatar: null,
      joinStatus: 'APPROVED',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null
    };

    (verifyAccessToken as jest.Mock).mockReturnValue({ userId: 'abcdefg' });
    (authServiceSession.verifyUserExist as jest.Mock).mockResolvedValue(mockUser);

    const req = {
      cookies: { [ACCESS_TOKEN_COOKIE_NAME]: 'accessToken_abcdefg' }
    } as any;
    const res = {} as Response;

    const middleware = authenticate();
    await middleware(req, res, next);

    expect(verifyAccessToken).toHaveBeenCalledWith('accessToken_abcdefg');
    expect(authServiceSession.verifyUserExist).toHaveBeenCalledWith('abcdefg');
    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('쿠키헤더에 토큰이 없으면 에러 생성', async () => {
    const req = {
      cookies: {}
    } as any;
    const res = {} as Response;

    const middleware = authenticate();
    await middleware(req, res, next);

    expect(verifyAccessToken).not.toHaveBeenCalled();
    expect(authServiceSession.verifyUserExist).not.toHaveBeenCalled();
    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  test('쿠키헤더에 만료된 토큰이 있으면 에러 생성', async () => {
    (verifyAccessToken as jest.Mock).mockImplementation(() => {
      throw new jwt.TokenExpiredError('jwt expired', new Date());
    });
    const req = {
      cookies: { [ACCESS_TOKEN_COOKIE_NAME]: 'expired_token' }
    } as any;
    const res = {} as Response;

    const middleware = authenticate();
    await middleware(req, res, next);

    expect(verifyAccessToken).toHaveBeenCalledWith('expired_token');
    expect(authServiceSession.verifyUserExist).not.toHaveBeenCalled();
    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'TokenExpiredError' })
    );
  });

  test('토큰 없고 optional이면 통과', async () => {
    const req = {
      cookies: {}
    } as any;
    const res = {} as Response;

    const middleware = authenticate({ optional: true });
    await middleware(req, res, next);

    expect(verifyAccessToken).not.toHaveBeenCalled();
    expect(authServiceSession.verifyUserExist).not.toHaveBeenCalled();
    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
