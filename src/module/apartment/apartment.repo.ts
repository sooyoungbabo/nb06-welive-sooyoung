import { Apartment, PrismaClient, Prisma, Resident } from '@prisma/client';
import prisma from '../../lib/prisma';
type DB = PrismaClient | Prisma.TransactionClient;

// async function getList(args: Prisma.ApartmentFindManyArgs) {
//   return prisma.apartment.findMany(args);
// }

// async function getList<T extends Prisma.ApartmentFindManyArgs>(
//   args: T
// ): Promise<Prisma.ApartmentGetPayload<T>[]> {
//   return prisma.apartment.findMany(args);
// }

async function getList<T extends Prisma.ApartmentFindManyArgs>(
  args: Prisma.SelectSubset<T, Prisma.ApartmentFindManyArgs>
): Promise<Prisma.ApartmentGetPayload<T>[]> {
  return prisma.apartment.findMany(args);
}
async function findByName(name: string): Promise<Apartment | null> {
  return prisma.apartment.findUnique({
    where: { name },
    include: { residents: true }
  });
}

async function findById(id: string): Promise<Apartment> {
  return prisma.apartment.findUniqueOrThrow({
    where: { id }
  });
}

async function find<T extends Prisma.ApartmentFindUniqueArgs>(
  args: Prisma.SelectSubset<T, Prisma.ApartmentFindUniqueArgs>
): Promise<Prisma.ApartmentGetPayload<T> | null> {
  return prisma.apartment.findUnique(args);
}

async function patch(db: DB, data: Prisma.ApartmentUpdateArgs): Promise<Apartment> {
  return db.apartment.update(data);
}

async function patchMany(
  db: DB,
  args: Prisma.ApartmentUpdateManyArgs
): Promise<Prisma.BatchPayload> {
  return db.apartment.updateMany(args);
}

async function create(db: DB, data: Prisma.ApartmentCreateInput): Promise<Apartment> {
  return db.apartment.create({ data });
}

async function deleteById(db: DB, id: string) {
  return db.apartment.delete({ where: { id } });
  //return db.apartment.update({ where: { id }, data: { deletedAt: new Date() } });
}

async function cleanup(db: DB, args: Prisma.ApartmentDeleteManyArgs): Promise<Prisma.BatchPayload> {
  return db.apartment.deleteMany(args);
}

export default {
  getList,
  findByName,
  findById,
  find,
  patch,
  patchMany,
  create,
  deleteById,
  cleanup
};
