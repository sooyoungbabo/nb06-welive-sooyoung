import prisma from '../../lib/prisma';
import { Prisma, PrismaClient, User } from '@prisma/client';

type DB = PrismaClient | Prisma.TransactionClient;

async function getList(args: Prisma.UserFindManyArgs): Promise<User[]> {
  return prisma.user.findMany(args);
}

async function create(db: DB, data: Prisma.UserCreateInput): Promise<User> {
  return db.user.create({ data });
}

async function findByUsername(username: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { username } });
}

async function findByEmail(
  email: string
): Promise<Prisma.UserGetPayload<{ include: { notifications: true } }> | null> {
  return prisma.user.findUnique({ where: { email }, include: { notifications: true } });
}

// async function findById(id: string): Promise<User | null> {
//   return prisma.user.findUnique({ where: { id } });
// }

async function find<T extends Prisma.UserFindUniqueArgs>(
  args: Prisma.SelectSubset<T, Prisma.UserFindUniqueArgs>
): Promise<Prisma.UserGetPayload<T> | null> {
  return prisma.user.findUnique(args);
}

async function findFirst<T extends Prisma.UserFindFirstArgs>(
  args: Prisma.SelectSubset<T, Prisma.UserFindFirstArgs>
): Promise<Prisma.UserGetPayload<T> | null> {
  return prisma.user.findFirst(args);
}

type PrismaSelectIncludeWithoutWhere = Omit<Prisma.UserFindUniqueArgs, 'where'>;
async function findById(id: string, args?: PrismaSelectIncludeWithoutWhere) {
  return prisma.user.findUnique({
    where: { id },
    ...args
  });
}

async function patch(db: DB, args: Prisma.UserUpdateArgs) {
  return db.user.update(args);
}

async function patchMany(db: DB, args: Prisma.UserUpdateManyArgs): Promise<Prisma.BatchPayload> {
  return db.user.updateMany(args);
}

async function deleteById(db: DB, id: string) {
  return db.user.delete({ where: { id } });
  //return db.user.update({ where: { id }, data: { deletedAt: new Date() } }); // soft delete 적용되면
}

async function del(db: DB, args: Prisma.UserDeleteArgs) {
  return db.user.delete(args);
}

async function cleanup(db: DB, args: Prisma.UserDeleteManyArgs): Promise<Prisma.BatchPayload> {
  return db.user.deleteMany(args);
}

//-------------------------------
function filterSoftDelete1<T>(args: T): T {
  // find, update, count, aggregate 용
  const hasWhere = typeof args === 'object' && args !== null && 'where' in args;
  //사용법: return prisma.user.findUniqueOrThrow(filterSoftDelete(args));
  if (!hasWhere) {
    return {
      ...args,
      where: { deletedAt: null }
    } as T;
  }

  return {
    ...args,
    where: {
      ...(args as any).where,
      deletedAt: null
    }
  };
}

function filterSoftDelete<T extends { where?: any }>(args: T): T {
  if (!args || typeof args !== 'object') return args;

  return {
    ...args,
    where: {
      ...(args.where ?? {}),
      deletedAt: null
    }
  };
}

export default {
  getList,
  create,
  findByUsername,
  patch,
  patchMany,
  findByEmail,
  find,
  findFirst,
  findById,
  del,
  deleteById,
  cleanup
};
