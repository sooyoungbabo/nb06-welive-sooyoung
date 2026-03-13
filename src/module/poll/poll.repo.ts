import { PrismaClient, Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
type DB = PrismaClient | Prisma.TransactionClient;

async function create(db: DB, args: Prisma.PollCreateArgs) {
  return await db.poll.create(args);
}

async function getList(args?: Prisma.PollFindManyArgs) {
  return await prisma.poll.findMany(args);
}

async function count(args?: Prisma.PollCountArgs) {
  return await prisma.poll.count(args);
}

async function find<T extends Prisma.PollFindUniqueArgs>(
  args: Prisma.SelectSubset<T, Prisma.PollFindUniqueArgs>
): Promise<Prisma.PollGetPayload<T> | null> {
  return prisma.poll.findUnique(args);
}

async function patch(db: DB, args: Prisma.PollUpdateArgs) {
  return db.poll.update(args);
}

async function del(db: DB, args: Prisma.PollDeleteArgs) {
  return db.poll.delete(args);
}

export default {
  create,
  getList,
  count,
  find,
  patch,
  del
};
