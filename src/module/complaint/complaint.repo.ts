import { Prisma, PrismaClient, Complaint } from '@prisma/client';
import prisma from '../../lib/prisma';
type DB = PrismaClient | Prisma.TransactionClient;

async function create<T extends Prisma.ComplaintCreateArgs>(
  db: DB,
  args: Prisma.SelectSubset<T, Prisma.ComplaintCreateArgs>
): Promise<Prisma.ComplaintGetPayload<T>> {
  return db.complaint.create(args);
}

async function find<T extends Prisma.ComplaintFindUniqueArgs>(
  args: Prisma.SelectSubset<T, Prisma.ComplaintFindUniqueArgs>
): Promise<Prisma.ComplaintGetPayload<T> | null> {
  return prisma.complaint.findUnique(args);
}

async function findMany<T extends Prisma.ComplaintFindManyArgs>(
  args: Prisma.SelectSubset<T, Prisma.ComplaintFindManyArgs>
): Promise<Prisma.ComplaintGetPayload<T>[]> {
  return await prisma.complaint.findMany(args);
}

async function count(args: Prisma.ComplaintCountArgs): Promise<number> {
  return await prisma.complaint.count(args);
}

async function patch<T extends Prisma.ComplaintUpdateArgs>(
  db: DB,
  args: Prisma.SelectSubset<T, Prisma.ComplaintUpdateArgs>
): Promise<Prisma.ComplaintGetPayload<T>> {
  return db.complaint.update(args);
}

async function del(data: Prisma.ComplaintDeleteArgs): Promise<Complaint> {
  return prisma.complaint.delete(data);
}

export default {
  create,
  find,
  findMany,
  count,
  patch,
  del
};
