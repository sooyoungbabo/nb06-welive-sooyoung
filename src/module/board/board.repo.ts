import { Prisma, PrismaClient } from '@prisma/client';
import prisma from '../../lib/prisma';
type DB = PrismaClient | Prisma.TransactionClient;

async function find<T extends Prisma.BoardFindUniqueArgs>(
  args: Prisma.SelectSubset<T, Prisma.BoardFindUniqueArgs>
): Promise<Prisma.BoardGetPayload<T> | null> {
  return prisma.board.findUnique(args);
}

async function findFirst<T extends Prisma.BoardFindFirstArgs>(
  args?: Prisma.SelectSubset<T, Prisma.BoardFindFirstArgs>
): Promise<Prisma.BoardGetPayload<T> | null> {
  return prisma.board.findFirst(args);
}

async function findMany<T extends Prisma.BoardFindManyArgs>(
  args?: Prisma.SelectSubset<T, Prisma.BoardFindManyArgs>
): Promise<Prisma.BoardGetPayload<T>[]> {
  return prisma.board.findMany(args);
}

async function createMany(
  db: DB,
  data: Prisma.BoardCreateManyInput[]
): Promise<Prisma.BatchPayload> {
  return db.board.createMany({ data });
}

async function updateMany(db: DB, args: Prisma.BoardUpdateManyArgs): Promise<Prisma.BatchPayload> {
  return db.board.updateMany(args);
}

async function deleteMany(db: DB, args: Prisma.BoardDeleteManyArgs) {
  return db.board.deleteMany(args);
}

export default {
  find,
  findFirst,
  findMany,
  createMany,
  updateMany,
  deleteMany
};
