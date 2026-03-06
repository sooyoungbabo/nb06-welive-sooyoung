import { Prisma, PrismaClient, Complaint } from '@prisma/client';
import prisma from '../../lib/prisma';
type DB = PrismaClient | Prisma.TransactionClient;

async function findMany<T extends Prisma.CommentFindManyArgs>(
  args?: Prisma.SelectSubset<T, Prisma.CommentFindManyArgs>
): Promise<Prisma.CommentGetPayload<T>[]> {
  return prisma.comment.findMany(args);
}

async function count(args: Prisma.CommentCountArgs): Promise<number> {
  return prisma.comment.count(args);
}

export default {
  findMany,
  count
};
