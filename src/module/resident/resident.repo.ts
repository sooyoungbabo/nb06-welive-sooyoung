import prisma from '../../lib/prisma';
import { Prisma, PrismaClient, Resident } from '@prisma/client';

type DB = PrismaClient | Prisma.TransactionClient;

async function getList(): Promise<Resident[]> {
  return await prisma.resident.findMany({
    orderBy: { createdAt: 'desc' }
  });
}

async function create(
  tx: Prisma.TransactionClient,
  data: Prisma.ResidentCreateInput
): Promise<Resident> {
  return await tx.resident.create({ data });
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

async function cleanup(db: DB, args: Prisma.ResidentDeleteManyArgs): Promise<Prisma.BatchPayload> {
  return db.resident.deleteMany(args);
}

export default {
  getList,
  create,
  patch,
  patchMany,
  cleanup
};
