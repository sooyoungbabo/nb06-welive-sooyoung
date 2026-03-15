import { PrismaClient, Prisma, Notification } from '@prisma/client';
import prisma from '../../lib/prisma';
type DB = PrismaClient | Prisma.TransactionClient;

async function create<T extends Prisma.NotificationCreateArgs>(
  db: DB,
  args: Prisma.SelectSubset<T, Prisma.NotificationCreateArgs>
): Promise<Prisma.NotificationGetPayload<T>> {
  return db.notification.create(args);
}

async function createMany<T extends Prisma.NotificationCreateManyArgs>(
  db: DB,
  args: Prisma.SelectSubset<T, Prisma.NotificationCreateManyArgs>
): Promise<Prisma.BatchPayload> {
  return db.notification.createMany(args);
}

async function find<T extends Prisma.NotificationFindUniqueArgs>(
  args: Prisma.SelectSubset<T, Prisma.NotificationFindUniqueArgs>
): Promise<Prisma.NotificationGetPayload<T> | null> {
  return prisma.notification.findUnique(args);
}

async function findFirst<T extends Prisma.NotificationFindFirstArgs>(
  args: Prisma.SelectSubset<T, Prisma.NotificationFindFirstArgs>
): Promise<Prisma.NotificationGetPayload<T> | null> {
  return prisma.notification.findFirst(args);
}

async function findMany<T extends Prisma.NotificationFindManyArgs>(
  args: Prisma.SelectSubset<T, Prisma.NotificationFindManyArgs>
): Promise<Prisma.NotificationGetPayload<T>[]> {
  return prisma.notification.findMany(args);
}

async function patch<T extends Prisma.NotificationUpdateArgs>(
  args: Prisma.SelectSubset<T, Prisma.NotificationUpdateArgs>
): Promise<Prisma.NotificationGetPayload<T>> {
  return prisma.notification.update(args);
}

async function patchMany<T extends Prisma.NotificationUpdateManyArgs>(
  args: Prisma.SelectSubset<T, Prisma.NotificationUpdateManyArgs>
): Promise<Prisma.BatchPayload> {
  return prisma.notification.updateMany(args);
}

export default {
  create,
  createMany,
  find,
  findFirst,
  findMany,
  patch,
  patchMany
};
