import { PrismaClient, Prisma, Notification } from '@prisma/client';
import prisma from '../../lib/prisma';
type DB = PrismaClient | Prisma.TransactionClient;

async function create(db: DB, data: Prisma.NotificationCreateInput): Promise<Notification> {
  return db.notification.create({ data });
}

async function createMany(
  db: DB,
  data: Prisma.NotificationCreateManyInput[]
): Promise<Prisma.BatchPayload> {
  return db.notification.createMany({ data });
}

async function findById(id: string): Promise<Notification | null> {
  return prisma.notification.findUnique({ where: { id }, include: { receiver: true } });
}

async function findFirst(args: Prisma.NotificationFindFirstArgs): Promise<Notification | null> {
  return prisma.notification.findFirst(args);
}

async function findMany(args?: Prisma.NotificationFindManyArgs): Promise<Notification[] | null> {
  return prisma.notification.findMany({ ...args, orderBy: { notifiedAt: 'desc' } });
}

async function patch(data: Prisma.NotificationUpdateArgs): Promise<Notification> {
  return prisma.notification.update({ ...data, include: { receiver: true } });
}

async function patchMany(args: Prisma.NotificationUpdateManyArgs): Promise<Prisma.BatchPayload> {
  return prisma.notification.updateMany(args);
}

export default {
  create,
  createMany,
  findById,
  findFirst,
  findMany,
  patch,
  patchMany
};
