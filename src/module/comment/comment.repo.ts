import { Prisma, PrismaClient } from '@prisma/client';
import prisma from '../../lib/prisma';
type DB = PrismaClient | Prisma.TransactionClient;

async function create<T extends Prisma.CommentCreateArgs>(
  args: Prisma.SelectSubset<T, Prisma.CommentCreateArgs>
): Promise<Prisma.CommentGetPayload<T>> {
  return prisma.comment.create(args);
}

async function find<T extends Prisma.CommentFindUniqueArgs>(
  args: Prisma.SelectSubset<T, Prisma.CommentFindUniqueArgs>
): Promise<Prisma.CommentGetPayload<T> | null> {
  return prisma.comment.findUnique(args);
}

async function findMany<T extends Prisma.CommentFindManyArgs>(
  args?: Prisma.SelectSubset<T, Prisma.CommentFindManyArgs>
): Promise<Prisma.CommentGetPayload<T>[]> {
  return prisma.comment.findMany(args);
}

async function count(args: Prisma.CommentCountArgs): Promise<number> {
  return prisma.comment.count(args);
}

async function patch<T extends Prisma.CommentUpdateArgs>(
  args: Prisma.SelectSubset<T, Prisma.CommentUpdateArgs>
): Promise<Prisma.CommentGetPayload<T> | null> {
  return prisma.comment.update(args);
}

async function del<T extends Prisma.CommentDeleteArgs>(
  args: Prisma.SelectSubset<T, Prisma.CommentDeleteArgs>
): Promise<Prisma.CommentGetPayload<T>> {
  return prisma.comment.delete(args);
}

export default {
  create,
  find,
  findMany,
  count,
  patch,
  del
};
