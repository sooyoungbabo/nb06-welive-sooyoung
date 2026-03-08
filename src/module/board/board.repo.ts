import { Prisma, PrismaClient, Board } from '@prisma/client';
import prisma from '../../lib/prisma';
type DB = PrismaClient | Prisma.TransactionClient;

async function findMany<T extends Prisma.BoardFindManyArgs>(
  args?: Prisma.SelectSubset<T, Prisma.BoardFindManyArgs>
): Promise<Prisma.BoardGetPayload<T>[]> {
  return prisma.board.findMany(args);
}

async function createMany(
  db: DB,
  data: Prisma.BoardCreateManyInput[]
): Promise<Prisma.BatchPayload> {
  return await db.board.createMany({ data });
}

async function deleteMany(db: DB, args: Prisma.BoardDeleteManyArgs): Promise<Prisma.BatchPayload> {
  return db.board.deleteMany(args);
}

export default {
  findMany,
  createMany,
  deleteMany
};
