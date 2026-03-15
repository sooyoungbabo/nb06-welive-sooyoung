import { PrismaClient, Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
type DB = PrismaClient | Prisma.TransactionClient;

async function create<T extends Prisma.PollCreateArgs>(
  db: DB,
  args: Prisma.SelectSubset<T, Prisma.PollCreateArgs>
): Promise<Prisma.PollGetPayload<T>> {
  return await db.poll.create(args);
}

async function findMany<T extends Prisma.PollFindManyArgs>(
  args?: Prisma.SelectSubset<T, Prisma.PollFindManyArgs>
): Promise<Prisma.PollGetPayload<T>[]> {
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

async function findFirst<T extends Prisma.PollFindFirstArgs>(
  args: Prisma.SelectSubset<T, Prisma.PollFindFirstArgs>
): Promise<Prisma.PollGetPayload<T> | null> {
  return prisma.poll.findFirst(args);
}

async function patch<T extends Prisma.PollUpdateArgs>(
  db: DB,
  args: Prisma.SelectSubset<T, Prisma.PollUpdateArgs>
): Promise<Prisma.PollGetPayload<T>> {
  return db.poll.update(args);
}

async function del(db: DB, args: Prisma.PollDeleteArgs) {
  return db.poll.delete(args);
}

export default {
  create,
  findMany,
  count,
  find,
  findFirst,
  patch,
  del
};
