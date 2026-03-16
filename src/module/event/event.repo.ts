import { PrismaClient, Prisma, Event } from '@prisma/client';
import prisma from '../../lib/prisma';
type DB = PrismaClient | Prisma.TransactionClient;

async function create(db: DB, args: Prisma.EventCreateArgs) {
  return db.event.create(args);
}

async function find(args: Prisma.EventFindUniqueArgs) {
  return prisma.event.findUnique(args);
}

async function findMany<T extends Prisma.EventFindManyArgs>(
  db: DB,
  args: Prisma.SelectSubset<T, Prisma.EventFindManyArgs>
): Promise<Prisma.EventGetPayload<T>[]> {
  return db.event.findMany(args);
}

async function upsert(db: DB, args: Prisma.EventUpsertArgs) {
  return db.event.upsert(args);
}

async function del(args: Prisma.EventDeleteArgs) {
  return prisma.event.delete(args);
}

export default {
  create,
  upsert,
  find,
  findMany,
  del
};
