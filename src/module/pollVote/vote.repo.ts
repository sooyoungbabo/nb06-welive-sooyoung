import { Prisma, PrismaClient } from '@prisma/client';
import prisma from '../../lib/prisma';
type DB = PrismaClient | Prisma.TransactionClient;

async function create(args: Prisma.VoteCreateArgs) {
  return prisma.vote.create(args);
}

async function deleteMany(db: DB, args: Prisma.VoteDeleteManyArgs) {
  return db.vote.deleteMany(args);
}

export default {
  create,
  deleteMany
};
