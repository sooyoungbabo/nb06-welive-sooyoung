import { ApprovalStatus, Prisma, UserType } from '@prisma/client';
import aptRepo from './apartment.repo';
import { ListBucketMetricsConfigurationsOutput$, ListMultipartUploads$ } from '@aws-sdk/client-s3';

async function publicGetList(filters: { keyword?: string; name?: string; address?: string }) {
  const where: Prisma.ApartmentWhereInput = buildPublicWhereQuery(filters);
  return await aptRepo.getList({ where });
}

async function publicGet(aptId: string) {
  return await aptRepo.find({ where: { id: aptId } });
}

async function getList(
  filters: {
    keyword?: string;
    name?: string;
    address?: string;
    apartmentStatus?: ApprovalStatus;
  },
  pagination: {
    page?: string;
    limit?: string;
  }
) {
  const where: Prisma.ApartmentWhereInput = buildWhereQuery(filters);
  const { skip, take } = buildPagination(pagination);
  const args = {
    skip,
    take,
    include: { users: { where: { role: UserType.ADMIN, deletedAt: null } } }
  };
  return await aptRepo.getList({ where, ...args });
}

async function get(aptId: string) {
  return await aptRepo.find({ where: { id: aptId } });
}

//--------------------------------------------
function buildPublicWhereQuery(filters: {
  keyword?: string;
  name?: string;
  address?: string;
}): Prisma.ApartmentWhereInput {
  return {
    AND: [
      filters.keyword
        ? {
            OR: [
              { name: { contains: filters.keyword, mode: 'insensitive' } },
              { address: { contains: filters.keyword, mode: 'insensitive' } },
              { description: { contains: filters.keyword, mode: 'insensitive' } }
            ]
          }
        : {},
      filters.name ? { name: { contains: filters.name, mode: 'insensitive' } } : {},
      filters.address ? { address: { contains: filters.address, mode: 'insensitive' } } : {}
    ]
  };
}

function buildPagination(params: { page?: string; limit?: string }): {
  skip?: number;
  take?: number;
} {
  const page = Math.max(1, parseInt(params.page ?? '1', 10));
  const limit = Math.max(1, parseInt(params.limit ?? '10', 10));
  const skip = (page - 1) * limit;
  return { skip, take: limit };
}

function buildWhereQuery(filters: {
  keyword?: string;
  name?: string;
  address?: string;
  apartmentStatus?: ApprovalStatus;
}): Prisma.ApartmentWhereInput {
  return {
    AND: [
      filters.keyword
        ? {
            OR: [
              { name: { contains: filters.keyword, mode: 'insensitive' } },
              { address: { contains: filters.keyword, mode: 'insensitive' } },
              {
                users: {
                  some: { name: { contains: filters.keyword, mode: 'insensitive' } }
                }
              },
              {
                users: {
                  some: { email: { contains: filters.keyword, mode: 'insensitive' } }
                }
              }
            ]
          }
        : {},
      filters.name ? { name: { contains: filters.name, mode: 'insensitive' } } : {},
      filters.address ? { address: { contains: filters.address, mode: 'insensitive' } } : {},
      filters.apartmentStatus ? { apartmentStatus: filters.apartmentStatus } : {}
    ]
  };
}

export default {
  publicGetList,
  publicGet,
  getList,
  get
};
