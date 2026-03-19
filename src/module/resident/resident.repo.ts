import prisma from '../../lib/prisma';
import { Prisma, PrismaClient } from '@prisma/client';

type DB = PrismaClient | Prisma.TransactionClient;

async function find<T extends Prisma.ResidentFindUniqueArgs>(
  db: DB,
  args: Prisma.SelectSubset<T, Prisma.ResidentFindUniqueArgs>
): Promise<Prisma.ResidentGetPayload<T> | null> {
  return db.resident.findUnique(args);
}

async function findFirst<T extends Prisma.ResidentFindFirstArgs>(
  db: DB,
  args: Prisma.SelectSubset<T, Prisma.ResidentFindFirstArgs>
): Promise<Prisma.ResidentGetPayload<T> | null> {
  return db.resident.findFirst(args);
}

async function findMany<T extends Prisma.ResidentFindManyArgs>(
  args: Prisma.SelectSubset<T, Prisma.ResidentFindManyArgs>
): Promise<Prisma.ResidentGetPayload<T>[]> {
  return prisma.resident.findMany(args);
}

async function count(args: Prisma.ResidentCountArgs): Promise<number> {
  return await prisma.resident.count(args);
}

async function create<T extends Prisma.ResidentCreateArgs>(
  db: DB,
  args: Prisma.SelectSubset<T, Prisma.ResidentCreateArgs>
): Promise<Prisma.ResidentGetPayload<T>> {
  return await db.resident.create(args);
}

async function createMany(
  db: DB,
  data: Prisma.ResidentCreateManyInput[]
): Promise<Prisma.BatchPayload> {
  return await db.resident.createMany({ data });
}

async function upsert<T extends Prisma.ResidentUpsertArgs>(
  db: DB,
  args: Prisma.SelectSubset<T, Prisma.ResidentUpsertArgs>
): Promise<Prisma.ResidentGetPayload<T>> {
  return db.resident.upsert(args);
}

async function patch<T extends Prisma.ResidentUpdateArgs>(
  db: DB,
  args: Prisma.SelectSubset<T, Prisma.ResidentUpdateArgs>
): Promise<Prisma.ResidentGetPayload<T>> {
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

async function deleteMany(
  db: DB,
  args: Prisma.ResidentDeleteManyArgs
): Promise<Prisma.BatchPayload> {
  return db.resident.deleteMany(args);
}

export default {
  find,
  findFirst,
  findMany,
  count,
  create,
  createMany,
  upsert,
  patch,
  patchMany,
  del,
  deleteMany
};
