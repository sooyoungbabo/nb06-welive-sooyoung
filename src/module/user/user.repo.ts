import prisma from '../../lib/prisma';
import { Prisma, PrismaClient, User } from '@prisma/client';

type DB = PrismaClient | Prisma.TransactionClient;

async function getList<T extends Prisma.UserFindManyArgs>(
  args: Prisma.SelectSubset<T, Prisma.UserFindManyArgs>
): Promise<Prisma.UserGetPayload<T>[]> {
  return prisma.user.findMany(args);
}

async function create<T extends Prisma.UserCreateArgs>(
  db: DB,
  args: Prisma.SelectSubset<T, Prisma.UserCreateArgs>
): Promise<Prisma.UserGetPayload<T>> {
  return db.user.create(args);
}

async function find<T extends Prisma.UserFindUniqueArgs>(
  args: Prisma.SelectSubset<T, Prisma.UserFindUniqueArgs>
): Promise<Prisma.UserGetPayload<T> | null> {
  return prisma.user.findUnique(args);
}

async function findFirst<T extends Prisma.UserFindFirstArgs>(
  args: Prisma.SelectSubset<T, Prisma.UserFindFirstArgs>
): Promise<Prisma.UserGetPayload<T> | null> {
  return prisma.user.findFirst(args);
}

async function findMany<T extends Prisma.UserFindManyArgs>(
  db: DB,
  args: Prisma.SelectSubset<T, Prisma.UserFindManyArgs>
): Promise<Prisma.UserGetPayload<T>[]> {
  return db.user.findMany(args);
}

async function patch<T extends Prisma.UserUpdateArgs>(
  db: DB,
  args: Prisma.SelectSubset<T, Prisma.UserUpdateArgs>
): Promise<Prisma.UserGetPayload<T>> {
  return db.user.update(args);
}

async function patchMany<T extends Prisma.UserUpdateManyArgs>(
  db: DB,
  args: Prisma.SelectSubset<T, Prisma.UserUpdateManyArgs>
): Promise<Prisma.BatchPayload> {
  return db.user.updateMany(args);
}

async function del<T extends Prisma.UserDeleteArgs>(
  db: DB,
  args: Prisma.SelectSubset<T, Prisma.UserDeleteArgs>
): Promise<Prisma.UserGetPayload<T>> {
  return db.user.delete(args);
}

async function softDel<T extends Prisma.UserUpdateArgs>(
  db: DB,
  args: Prisma.SelectSubset<T, Prisma.UserUpdateArgs>
): Promise<Prisma.UserGetPayload<T>> {
  return db.user.update(args);
}

async function cleanup<T extends Prisma.UserDeleteManyArgs>(
  db: DB,
  args: Prisma.SelectSubset<T, Prisma.UserDeleteManyArgs>
): Promise<Prisma.BatchPayload> {
  return db.user.deleteMany(args);
}

export default {
  getList,
  create,
  patch,
  patchMany,
  find,
  findFirst,
  findMany,
  del,
  softDel,
  cleanup
};
