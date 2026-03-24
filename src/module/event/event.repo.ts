import { PrismaClient, Prisma, Event } from '@prisma/client';
import prisma from '../../lib/prisma';
type DB = PrismaClient | Prisma.TransactionClient;

async function create(db: DB, args: Prisma.EventCreateArgs) {
  return db.event.create(args);
}

async function find<T extends Prisma.EventFindUniqueArgs>(
  args: Prisma.SelectSubset<T, Prisma.EventFindUniqueArgs>
): Promise<Prisma.EventGetPayload<T> | null> {
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

async function update(db: DB, args: Prisma.EventUpdateArgs) {
  return db.event.update(args);
}

async function del(db: DB, args: Prisma.EventDeleteArgs) {
  return db.event.delete(args);
}

export default {
  create,
  upsert,
  update,
  find,
  findMany,
  del
};
