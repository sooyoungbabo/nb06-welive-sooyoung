import authorize from '../../src/middleware/authorize';
import { Response } from 'express';
import userRepo from '../../src/module/user/user.repo';
import { User, UserType } from '@prisma/client';

jest.mock('../../src/module/user/user.repo');

describe('authorize middleware', () => {
  const next = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (userRepo.find as jest.Mock).mockReset();
  });

  const mockAdmin: User = {
    id: 'abcdefg',
    apartmentId: 'abcdefg',
    username: 'mockUser',
    password: 'password',
    contact: '02-123-4567',
    name: '관리자',
    email: 'test@test.com',
    role: 'ADMIN',
    avatar: null,
    joinStatus: 'APPROVED',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null
  };

  test('인증된 사용자의 role이 인자로 넘겨진 UserType이면 통과', async () => {
    (userRepo.find as jest.Mock).mockResolvedValue(mockAdmin);

    const req = { user: { id: 'abcdefg' } } as any;
    const res = {} as Response;

    const middleware = authorize(UserType.ADMIN);
    await middleware(req, res, next);

    expect(userRepo.find).toHaveBeenCalledWith({ where: { id: req.user.id } });
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  test('인증된 사용자의 role이 인자로 넘겨진 UserType이 아니면 에러 발생', async () => {
    (userRepo.find as jest.Mock).mockResolvedValue(mockAdmin);

    const req = { user: { id: 'abcdefg' } } as any;
    const res = {} as Response;

    const middleware = authorize(UserType.USER);
    await middleware(req, res, next);

    expect(userRepo.find).toHaveBeenCalledWith({ where: { id: req.user.id } });
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'ForbiddenError' })
    );
  });

  test('인증된 사용자가 DB에 존재하지 않는 경우 에러 발생', async () => {
    (userRepo.find as jest.Mock).mockResolvedValue(undefined);

    const req = { user: { id: 'abcdefg' } } as any;
    const res = {} as Response;

    const middleware = authorize(UserType.ADMIN);
    await middleware(req, res, next);

    expect(userRepo.find).toHaveBeenCalledWith({ where: { id: req.user.id } });
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ name: 'NotFoundError' }));
  });

  test('인증된 사용자의 role이 인자로 넘겨진 복수의 UserType에 포함되면 통과', async () => {
    (userRepo.find as jest.Mock).mockResolvedValue(mockAdmin);

    const req = { user: { id: 'abcdefg' } } as any;
    const res = {} as Response;

    const middleware = authorize(UserType.USER, UserType.ADMIN);
    await middleware(req, res, next);

    expect(userRepo.find).toHaveBeenCalledWith({ where: { id: req.user.id } });
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  test('인증된 사용자의 role이 인자로 넘겨진 복수의 UserType에 포함되지 않으면 에러 발생', async () => {
    (userRepo.find as jest.Mock).mockResolvedValue(mockAdmin);

    const req = { user: { id: 'abcdefg' } } as any;
    const res = {} as Response;

    const middleware = authorize(UserType.USER, UserType.SUPER_ADMIN);
    await middleware(req, res, next);

    expect(userRepo.find).toHaveBeenCalledWith({ where: { id: req.user.id } });
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'ForbiddenError' })
    );
  });

  test('인자가 비어있으면 모두 통과', async () => {
    (userRepo.find as jest.Mock).mockResolvedValue(mockAdmin);

    const req = { user: { id: 'abcdefg' } } as any;
    const res = {} as Response;

    const middleware = authorize();
    await middleware(req, res, next);

    expect(userRepo.find).toHaveBeenCalledWith({ where: { id: req.user.id } });
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });
});
