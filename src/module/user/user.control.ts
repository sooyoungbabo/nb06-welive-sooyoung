import { Request, Response, NextFunction } from 'express';
import userService from './user.service';
import { NODE_ENV } from '../../lib/constants';
import BadRequestError from '../../middleware/errors/BadRequestError';
import NotFoundError from '../../middleware/errors/NotFoundError';
import { assert } from 'node:console';
import { PatchUser } from './user.struct';
import { Prisma } from '@prisma/client';

async function getList(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (NODE_ENV === 'development') {
    const sortParam = (req.query.sort as Prisma.SortOrder) ?? 'desc';
    const users = await userService.getList(sortParam);
    res.status(200).json(users);
  } else {
    res.status(200).send({ message: '개발자 옵션입니다' });
  }
}

async function get(req: Request, res: Response, next: NextFunction): Promise<void> {
  console.log(req.user.id);
  if (NODE_ENV === 'development') {
    const user = await userService.get(req.params.userId as string);
    res.status(200).json(user);
  } else {
    res.status(200).send({ message: '개발자 옵션입니다' });
  }
}

async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = await userService.get(req.user.id);
  res.status(200).json(user);
}

async function patchPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { currentPassword, newPassword } = req.body;
  assert({ password: newPassword }, PatchUser);
  const message = await userService.patchPassword(req.user.id, currentPassword, newPassword);
  res.status(200).send({ message });
}

async function postAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.file) throw new BadRequestError('이미지 화일이 존재하지 않습니다');
  const item = await userService.postAvatar(req.file, req.params.id as string);
  if (!item) throw new NotFoundError();

  res.status(201).json(item);
}

//-------------------------------------------------- local functions

export default {
  getList,
  get,
  me,
  patchPassword,
  postAvatar
};
