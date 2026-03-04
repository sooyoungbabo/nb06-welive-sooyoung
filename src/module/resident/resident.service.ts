import { Resident, Prisma, ApprovalStatus, ResidenceStatus, HouseholdRole } from '@prisma/client';
import residentRepo from './resident.repo';
import prisma from '../../lib/prisma';
import userRepo from '../user/user.repo';
import NotFoundError from '../../middleware/errors/NotFoundError';
import { buildPagination, buildWhere } from '../../lib/buildQuery';
import { QueryBuilderInput, WhereInputOf } from '../../lib/buildQuery';
import { ResidentCreateRequestDto, ResidentListDto } from './resident.dto';
import aptRepo from '../apartment/apartment.repo';
import { assert } from 'node:console';
import { CreateResident } from './resident.struct';
import { NotEquals } from 'class-validator';
import BadRequestError from '../../middleware/errors/BadRequestError';

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

async function user2resident(userId: string): Promise<Resident> {
  const user = await userRepo.findById(userId);
  let message: string;
  if (!user) throw new BadRequestError('존재하지 않는 사용자입니다.');
  if (!user.apartmentId) throw new BadRequestError('아파트ID가 없는 사용자입니다.');

  const resident = await residentRepo.find(prisma, { where: { userId } });
  if (resident) throw new BadRequestError('이미 입주민 명부에 추가된 사용자입니다.');

  const data = {
    apartmentDong: '999', // user에도 중복으로 넣어야 할 듯
    apartmentHo: '999',
    contact: user.contact,
    name: user.name,
    isHouseholder: HouseholdRole.HOUSEHOLDER
  };
  assert(data, CreateResident);
  return await residentRepo.create(prisma, {
    ...data,
    apartment: { connect: { id: user.apartmentId } }
  });
}

function buildResidentTemplateCsv(): string {
  return [
    `"동","호수","이름","연락처","세대주여부"`,
    `"101","101","홍길동","01012345678","HOUSEHOLDER"`,
    `"105","2008","김길동","01043215678","MEMBER"`
  ].join('\n');
}

/* 
req.file = {
  fieldname: "file",
  originalname: "resident.csv",
  mimetype: "text/csv",
  buffer: <Buffer ... >
} */

async function createManyFromFile(aptId: string, buffer: Buffer): Promise<number> {
  const text = buffer.toString('utf-8').replace(/^\uFEFF/, '');

  let residentData = [];
  const rows = text.split('\n').slice(1);
  for (const row of rows) {
    const [dong, ho, name, contact, role] = row.replace(/"/g, '').split(',');
    const tempData = {
      apartmentId: aptId,
      apartmentDong: dong,
      apartmentHo: ho,
      name,
      contact,
      isHouseholder: role as HouseholdRole
    };
    assert(tempData, CreateResident);
    residentData.push(tempData);
  }
  const residents = await residentRepo.createMany(prisma, residentData);
  return residents.count;
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
  user2resident,
  buildResidentTemplateCsv,
  createManyFromFile,
  patch,
  del
};
