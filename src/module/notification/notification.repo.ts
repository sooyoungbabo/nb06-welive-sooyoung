import { PrismaClient, Prisma, Notification } from '@prisma/client';
import prisma from '../../lib/prisma';
type DB = PrismaClient | Prisma.TransactionClient;

async function create(db: DB, data: Prisma.NotificationCreateInput): Promise<Notification> {
  return db.notification.create({ data });
}

export default {
  create
};
