import { PrismaClient, Prisma, Event } from '@prisma/client';
import prisma from '../../lib/prisma';
type DB = PrismaClient | Prisma.TransactionClient;

async function create(db: DB, args: Prisma.EventCreateArgs) {
  return db.event.create(args);
}

export default {
  create
};
