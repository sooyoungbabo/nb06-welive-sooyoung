import bcrypt from 'bcrypt';
import path from 'path';
import prisma from '../../lib/prisma';
import { assert } from 'superstruct';
import { Prisma, User } from '@prisma/client';
import BadRequestError from '../../middleware/errors/BadRequestError';
import NotFoundError from '../../middleware/errors/NotFoundError';
import ForbiddenError from '../../middleware/errors/ForbiddenError';
import { PatchUser } from './user.struct';
import imgStorage from '../../storage/image.storage';
import userRepo from './user.repo';
import { BASE_URL, STATIC_IMG_PATH } from '../../lib/constants';

async function getList(sortParam: Prisma.SortOrder) {
  const users = await userRepo.getList({ orderBy: { createdAt: sortParam } });
  if (users.length === 0) throw new NotFoundError();
  return filterPassword(users);
}

async function get(id: string) {
  const user = await userRepo.find({
    where: { id },
    include: { resident: true, apartment: true }
  });
  if (!user) throw new NotFoundError('사용자를 찾을 수 없습니다.');
  const { password, ...rest } = user;
  return rest;
}

async function patchPassword(id: string, oldPassword: string, newPassword: string) {
  if (oldPassword === newPassword) throw new BadRequestError('비밀번호가 같습니다.');

  const user = await userRepo.find({
    where: { id },
    select: { password: true, name: true }
  });
  if (!user) throw new NotFoundError('사용자가 존재하지 않습니다.');

  if (!(await check_passwordValidity(oldPassword, user.password)))
    throw new ForbiddenError('현재 비밀번호가 틀렸습니다.');

  const userData = { password: await hashingPassword(newPassword) };
  assert(userData, PatchUser);
  const newUser = await userRepo.patch(prisma, { where: { id }, data: userData });

  const message = `${user.name}님의 비밀번호가 성공적으로 업데이트되었습니다. 다시 로그인해주세요.`;
  return message;
}

async function postAvatar(file: Express.Multer.File, id: string) {
  // AWS S3에 이미지 저장
  const ext = path.extname(file.originalname);
  const normalizedExt = ext.toLowerCase().startsWith('.')
    ? ext.toLowerCase()
    : `.${ext.toLowerCase()}`;

  const user = await userRepo.find({ where: { id }, select: { username: true, name: true } });
  if (!user) throw new NotFoundError('사용자가 존재하지 않습니다.');
  const key = `${user.username}${normalizedExt}`;

  await imgStorage.saveImg(key, file); // 서버가 업로드
  const newImageUrl = `${BASE_URL}/images/${key}`; // app.use 에서 선언한 가짜 url을 여기서 만듬

  // DB에 새 imageUrl 저장
  await userRepo.patch(prisma, { where: { id }, data: { avatar: newImageUrl } });

  // 출력 문구;
  const message = `${user.name}님의 프로필 이미지가 성공적으로 업데이트되었습니다.`;
  return message;
}

//----------------------------------------------------------------
function filterPassword(users: User[]) {
  return users.map(({ password, ...rest }) => rest);
}

export async function hashingPassword(textPassword: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(textPassword, salt);
}

export async function check_passwordValidity(
  textPassword: string,
  savedPassword: string
): Promise<Boolean> {
  const isPasswordSame = await bcrypt.compare(textPassword, savedPassword);
  return isPasswordSame;
}

export default {
  getList,
  get,
  patchPassword,
  postAvatar
};
