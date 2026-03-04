import prisma from '../../lib/prisma';
import { Prisma, PrismaClient, Resident } from '@prisma/client';

type DB = PrismaClient | Prisma.TransactionClient;

async function getList(
  where: Prisma.ResidentWhereInput,
  skip?: number,
  take?: number
): Promise<Resident[]> {
  return await prisma.resident.findMany({
    where,
    skip: skip ?? 0,
    take: take ?? 10,
    orderBy: { createdAt: 'desc' }
  });
}

async function count(where: Prisma.ResidentWhereInput): Promise<number> {
  return await prisma.resident.count({ where });
}

async function create(
  tx: Prisma.TransactionClient,
  data: Prisma.ResidentCreateInput
): Promise<Resident> {
  return await tx.resident.create({ data });
}

async function find(db: DB, args: Prisma.ResidentFindUniqueArgs) {
  return db.resident.findUnique(args);
}

async function patch(db: DB, args: Prisma.ResidentUpdateArgs) {
  return db.resident.update(args);
}

async function patchMany(
  db: DB,
  args: Prisma.ResidentUpdateManyArgs
): Promise<Prisma.BatchPayload> {
  return db.resident.updateMany(args);
}

async function del(db: DB, args: Prisma.ResidentDeleteArgs) {
  return db.resident.delete(args);
}

async function cleanup(db: DB, args: Prisma.ResidentDeleteManyArgs): Promise<Prisma.BatchPayload> {
  return db.resident.deleteMany(args);
}

export default {
  find,
  getList,
  count,
  create,
  patch,
  patchMany,
  del,
  cleanup
};
