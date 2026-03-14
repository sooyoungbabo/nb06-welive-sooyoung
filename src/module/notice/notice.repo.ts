import { PrismaClient, Prisma, Notice } from '@prisma/client';
import prisma from '../../lib/prisma';
type DB = PrismaClient | Prisma.TransactionClient;

async function create(db: DB, data: Prisma.NoticeCreateInput): Promise<Notice> {
  return db.notice.create({ data });
}

export default {
  create
};
