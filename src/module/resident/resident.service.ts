import { Resident, Prisma, ApprovalStatus, ResidenceStatus } from '@prisma/client';
import residentRepo from './resident.repo';
import prisma from '../../lib/prisma';
import userRepo from '../user/user.repo';
import NotFoundError from '../../middleware/errors/NotFoundError';
import { buildPagination, buildWhere } from '../../lib/buildQuery';
import { QueryBuilderInput, WhereInputOf } from '../../lib/buildQuery';
import { ResidentCreateRequestDto, ResidentListDto } from './resident.dto';
import aptRepo from '../apartment/apartment.repo';

type ResidentWhere = WhereInputOf<'Resident'>;

async function getList(
  apartmentId: string,
  input: QueryBuilderInput
): Promise<{
  residents: Resident[];
  totalCount: number;
}> {
  const pagination = input.pagination
    ? buildPagination(input.pagination, { limitDefault: 20, limitMax: 100 })
    : { skip: 0, take: 10 };
  const { skip, take } = pagination;

  const where: Prisma.ResidentWhereInput = buildWhere({
    searchKey: input.searchKey,
    filters: input.filters,
    exactFilters: { ...input.exactFilters, apartmentId }
  });

  const totalCount = await residentRepo.count(where);
  const residents = await residentRepo.getList(where, skip, take);
  return { residents, totalCount };
}

async function post(adminId: string, data: ResidentCreateRequestDto) {
  const admin = await userRepo.find({ where: { id: adminId }, select: { apartmentId: true } });
  if (!admin) throw new NotFoundError('관리자를 찾을 수 없습니다.');
  if (!admin.apartmentId) throw new NotFoundError('관리자 계정에 아파트 ID가 없습니다.');

  let resident;
  const residentData = {
    ...data,
    apartment: { connect: { id: admin.apartmentId } }
  };

  const user = await userRepo.find({ where: { contact: data.contact } });

  if (!user) resident = await residentRepo.create(prisma, residentData);
  else
    resident = await residentRepo.create(prisma, {
      ...residentData,
      user: { connect: { id: user.id } }
    });

  return resident;
}

async function patch(
  residentId: string,
  residentData: Prisma.ResidentUpdateInput,
  userData: Prisma.UserUpdateInput
) {
  const resident = await residentRepo.find(prisma, { where: { id: residentId } });
  if (!resident) throw new NotFoundError('입주자가 존재하지 않습니다.');
  if (!resident.userId) {
    return await residentRepo.patch(prisma, {
      where: { id: residentId },
      data: residentData
    });
  } else {
    const patched = await prisma.$transaction(async (tx) => {
      const resident = await residentRepo.patch(tx, {
        where: { id: residentId },
        data: residentData
      });
      await userRepo.patch(tx, { where: { id: resident.userId! }, data: userData });
      return resident;
    });
    return patched;
  }
}

async function del(residentId: string) {
  const resident = await residentRepo.find(prisma, { where: { id: residentId } });
  if (!resident) throw new NotFoundError('입주자가 존재하지 않습니다.');
  if (!resident.userId) return await residentRepo.del(prisma, { where: { id: residentId } });
  else {
    const deleted = await prisma.$transaction(async (tx) => {
      const resident = await residentRepo.del(tx, { where: { id: residentId } });
      const user = await userRepo.deleteById(tx, resident.userId!);
      return resident;
    });
    return deleted;
  }
}

export default {
  getList,
  post,
  patch,
  del
};
