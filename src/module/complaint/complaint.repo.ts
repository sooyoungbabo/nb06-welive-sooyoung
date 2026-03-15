import { Prisma, PrismaClient, Complaint } from '@prisma/client';
import prisma from '../../lib/prisma';
type DB = PrismaClient | Prisma.TransactionClient;

async function create(data: Prisma.ComplaintCreateInput): Promise<Complaint> {
  return prisma.complaint.create({ data });
}

async function find<T extends Prisma.ComplaintFindUniqueArgs>(
  args: Prisma.SelectSubset<T, Prisma.ComplaintFindUniqueArgs>
): Promise<Prisma.ComplaintGetPayload<T> | null> {
  return prisma.complaint.findUnique(args);
}

async function findMany(
  where: Prisma.ComplaintWhereInput,
  skip?: number,
  take?: number
): Promise<Complaint[]> {
  return await prisma.complaint.findMany({
    where,
    skip: skip ?? 0,
    take: take ?? 20,
    orderBy: { createdAt: 'desc' }
  });
}

async function count(args: Prisma.ComplaintCountArgs): Promise<number> {
  return await prisma.complaint.count(args);
}

async function patch(data: Prisma.ComplaintUpdateArgs): Promise<Complaint> {
  return prisma.complaint.update(data);
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
