import { PrismaClient, Prisma, Resident } from '@prisma/client';
import prisma from '../../lib/prisma';
type DB = PrismaClient | Prisma.TransactionClient;

async function findMany<T extends Prisma.ApartmentFindManyArgs>(
  args?: Prisma.SelectSubset<T, Prisma.ApartmentFindManyArgs>
): Promise<Prisma.ApartmentGetPayload<T>[]> {
  return prisma.apartment.findMany(args);
}

async function count(args: Prisma.ApartmentCountArgs): Promise<number> {
  return prisma.apartment.count(args);
}

async function find<T extends Prisma.ApartmentFindUniqueArgs>(
  args: Prisma.SelectSubset<T, Prisma.ApartmentFindUniqueArgs>
): Promise<Prisma.ApartmentGetPayload<T> | null> {
  return prisma.apartment.findUnique(args);
}

async function findFirst<T extends Prisma.ApartmentFindFirstArgs>(
  args: Prisma.SelectSubset<T, Prisma.ApartmentFindFirstArgs>
): Promise<Prisma.ApartmentGetPayload<T> | null> {
  return prisma.apartment.findFirst(args);
}

async function patch<T extends Prisma.ApartmentUpdateArgs>(
  db: DB,
  args: Prisma.SelectSubset<T, Prisma.ApartmentUpdateArgs>
): Promise<Prisma.ApartmentGetPayload<T>> {
  return db.apartment.update(args);
}

async function patchMany<T extends Prisma.ApartmentUpdateManyArgs>(
  db: DB,
  args: Prisma.SelectSubset<T, Prisma.ApartmentUpdateManyArgs>
): Promise<Prisma.BatchPayload> {
  return db.apartment.updateMany(args);
}

async function create<T extends Prisma.ApartmentCreateArgs>(
  db: DB,
  args: Prisma.SelectSubset<T, Prisma.ApartmentCreateArgs>
): Promise<Prisma.ApartmentGetPayload<T>> {
  return db.apartment.create(args);
}

async function del(db: DB, args: Prisma.ApartmentDeleteArgs) {
  return db.apartment.delete(args);
}

async function deleteMany(
  db: DB,
  args: Prisma.ApartmentDeleteManyArgs
): Promise<Prisma.BatchPayload> {
  return db.apartment.deleteMany(args);
}

export default {
  findMany,
  count,
  find,
  findFirst,
  patch,
  patchMany,
  create,
  del,
  deleteMany
};
