import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';

async function create(args: Prisma.VoteCreateArgs) {
  return prisma.vote.create(args);
}

async function deleteMany(args: Prisma.VoteDeleteManyArgs) {
  return prisma.vote.deleteMany(args);
}

export default {
  create,
  deleteMany
};
