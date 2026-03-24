import { PrismaClient, Prisma, Notice } from '@prisma/client';
import prisma from '../../lib/prisma';
type DB = PrismaClient | Prisma.TransactionClient;

async function create(db: DB, data: Prisma.NoticeCreateInput): Promise<Notice> {
  return db.notice.create({ data });
}

async function findMany<T extends Prisma.NoticeFindManyArgs>(
  args?: Prisma.SelectSubset<T, Prisma.NoticeFindManyArgs>
): Promise<Prisma.NoticeGetPayload<T>[]> {
  return prisma.notice.findMany(args);
}

async function count(args: Prisma.NoticeCountArgs): Promise<number> {
  return await prisma.notice.count(args);
}

async function find(args: Prisma.NoticeFindUniqueArgs) {
  return prisma.notice.findUnique(args);
}

async function update<T extends Prisma.NoticeUpdateArgs>(
  db: DB,
  args: Prisma.SelectSubset<T, Prisma.NoticeUpdateArgs>
): Promise<Prisma.NoticeGetPayload<T>> {
  return db.notice.update(args);
}

async function del(db: DB, args: Prisma.NoticeDeleteArgs) {
  return db.notice.delete(args);
}

export default {
  create,
  findMany,
  count,
  find,
  update,
  del
};
