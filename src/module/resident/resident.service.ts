import { Resident, Prisma, HouseholdRole, ResidenceStatus } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import residentRepo from './resident.repo';
import prisma from '../../lib/prisma';
import userRepo from '../user/user.repo';
import NotFoundError from '../../middleware/errors/NotFoundError';
import { buildPagination, buildWhere } from '../../lib/buildQuery';
import {
  ResidentCreateRequestDto,
  ResidentCsvItem,
  ResidentListDto,
  ResidentQueryDto
} from './resident.dto';
import { assert } from 'node:console';
import { CreateResident } from './resident.struct';
import { AuthUser } from '../../type/express';
import { getTimestamp } from '../../lib/myFuns';
import ForbiddenError from '../../middleware/errors/ForbiddenError';

// type ResidentExactFilters = {
//   residenceStatus?: ResidenceStatus;
//   isRegistered?: boolean;
// };

async function getList(
  apartmentId: string,
  query: ResidentQueryDto
): Promise<{
  residents: ResidentListDto[];
  totalCount: number;
}> {
  const queryParams = buildQueryParams(query);
  const { skip, take } = buildPagination(queryParams.pagination, {
    limitDefault: 20,
    limitMax: 100
  });
  const where: Prisma.ResidentWhereInput = buildWhere({
    searchKey: queryParams.searchKey,
    filters: queryParams.filters,
    exactFilters: { ...queryParams.exactFilters, apartmentId }
  });

  const totalCount = await residentRepo.count(where);
  const rawResidents = await residentRepo.getList(where, skip, take);
  const residents = buildResidentListRes(rawResidents);

  return { residents, totalCount };
}

async function post(admin: AuthUser, data: ResidentCreateRequestDto): Promise<ResidentListDto> {
  let resident;
  const residentData = {
    ...data,
    apartment: { connect: { id: admin.apartmentId } }
  };

  const user = await userRepo.find({ where: { contact: data.contact } });

  if (!user) resident = await residentRepo.create(prisma, residentData);
  else
    // 현재는 이런 경우가 있을 수 없음. 입주민 user 계정이 만들어질 때 resident도 생성되므로
    resident = await residentRepo.create(prisma, {
      ...residentData,
      user: { connect: { id: user.id } }
    });

  return buildResidentRes(resident);
}

// 주강사님과의 협의로 안 만들기로 한 API
// async function user2resident(userId: string): Promise<Resident> {
//   const user = await userRepo.findById(userId);
//   let message: string;
//   if (!user) throw new BadRequestError('존재하지 않는 사용자입니다.');
//   if (!user.apartmentId) throw new BadRequestError('아파트ID가 없는 사용자입니다.');

//   const resident = await residentRepo.find(prisma, { where: { userId } });
//   if (resident) throw new BadRequestError('이미 입주민 명부에 추가된 사용자입니다.');

//   const data = {
//     apartmentDong: '999', // user에도 중복으로 넣어야 할 듯
//     apartmentHo: '999',
//     contact: user.contact,
//     name: user.name,
//     isHouseholder: HouseholdRole.HOUSEHOLDER
//   };
//   assert(data, CreateResident);
//   return await residentRepo.create(prisma, {
//     ...data,
//     apartment: { connect: { id: user.apartmentId } }
//   });
// }

function downloadTemplateCsv(): string {
  return (
    '\ufeff' +
    [
      `"동","호수","이름","연락처","세대주여부"`,
      `"101","101","홍길동","01012345678","HOUSEHOLDER"`,
      `"105","2008","김길동","01043215678","MEMBER"`
    ].join('\n')
  );
}

/* 
req.file = {
  fieldname: "file",
  originalname: "resident.csv",
  mimetype: "text/csv",
  buffer: <Buffer ... >
} */

async function createManyFromFile(apartmentId: string, buffer: Buffer): Promise<number> {
  const text = buffer.toString('utf-8').replace(/^\uFEFF/, '');

  let residentData = [];
  const rows = text.split('\n').slice(1);
  for (const row of rows) {
    const [dong, ho, name, contact, role] = row.replace(/"/g, '').split(',');
    const tempData = {
      apartmentId,
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

async function downloadListCsv(apartmentId: string, query: ResidentQueryDto): Promise<string> {
  const queryParams = buildQueryParams(query);
  const { skip, take } = buildPagination(queryParams.pagination, {
    limitDefault: 20,
    limitMax: 100
  });
  const where: Prisma.ResidentWhereInput = buildWhere({
    searchKey: queryParams.searchKey,
    filters: queryParams.filters,
    exactFilters: { ...queryParams.exactFilters, apartmentId }
  });

  const residents = await residentRepo.getList(where, skip, take);

  const items: ResidentCsvItem[] = residents.map((r) => ({
    apartmentDong: r.apartmentDong,
    apartmentHo: r.apartmentHo,
    name: r.name,
    contact: r.contact,
    isHouseholder: r.isHouseholder
  }));

  if (residents.length === 0) return '입주민 명부가 없습니다.';
  const header = ['동', '호수', '이름', '연락처', '세대주여부'];

  const rows = residents.map((r) =>
    [r.apartmentDong, r.apartmentHo, r.name, r.contact, r.isHouseholder]
      .map((v) => `"${v}"`)
      .join(',')
  );

  const csv = '\ufeff' + [header.join(','), ...rows].join('\n');

  // file에 저장
  const savedFilePath = await saveCsv(csv);
  console.log(savedFilePath);

  return csv;
}

async function get(apartmentId: string, residentId: string): Promise<ResidentListDto> {
  const resident = await residentRepo.find(prisma, { where: { id: residentId } });
  if (!resident) throw new NotFoundError('입주민이 존재하지 않습니다.');
  if (resident.apartmentId != apartmentId) throw new ForbiddenError();
  return buildResidentRes(resident);
}

async function patch(
  apartmentId: string,
  residentId: string,
  residentData: Prisma.ResidentUpdateInput,
  userData: Prisma.UserUpdateInput
) {
  const resident = await residentRepo.find(prisma, { where: { id: residentId, apartmentId } });
  if (!resident) throw new NotFoundError('입주자가 존재하지 않습니다.');
  if (!resident.userId) {
    return await residentRepo.patch(prisma, {
      where: { id: residentId, apartmentId },
      data: residentData
    });
  } else {
    const patched = await prisma.$transaction(async (tx) => {
      const resident = await residentRepo.patch(tx, {
        where: { id: residentId, apartmentId },
        data: residentData
      });
      await userRepo.patch(tx, { where: { id: resident.userId!, apartmentId }, data: userData });
      return resident;
    });
    return patched;
  }
}

async function del(apartmentId: string, residentId: string) {
  const resident = await residentRepo.find(prisma, { where: { id: residentId } });
  if (!resident) throw new NotFoundError('입주자가 존재하지 않습니다.');
  if (resident.apartmentId != apartmentId) throw new ForbiddenError();

  if (!resident.userId)
    return await residentRepo.del(prisma, { where: { id: residentId, apartmentId } });
  else {
    const deleted = await prisma.$transaction(async (tx) => {
      const resident = await residentRepo.del(tx, { where: { id: residentId, apartmentId } });
      const user = await userRepo.del(tx, { where: { id: resident.userId!, apartmentId } });
      return resident;
    });
    return deleted;
  }
}

//-----------------------------------------------------------
function buildQueryParams(query: ResidentQueryDto) {
  const { page, limit } = query;
  const { keyword } = query;
  const { building: apartmentDong, unitNumber: apartmentHo } = query;

  const residenceStatus =
    query.residenceStatus === undefined || query.residenceStatus === ''
      ? undefined
      : (query.residenceStatus as ResidenceStatus);

  const isRegistered = query.isRegistered === undefined ? undefined : query.isRegistered === 'true';

  return {
    pagination: { page, limit },
    searchKey: { keyword, fields: ['name', 'contact'] },
    filters: { apartmentDong, apartmentHo },
    exactFilters: { residenceStatus, isRegistered }
  };
}

function buildResidentListRes(data: Resident[]): ResidentListDto[] {
  return data.map((d) => {
    return {
      id: d.id,
      userId: d.userId,
      building: d.apartmentDong,
      unitNumber: d.apartmentHo,
      contact: d.contact,
      name: d.name,
      residenceStatus: d.residenceStatus,
      isHouseholder: d.isHouseholder,
      isRegistered: d.isRegistered,
      approvalStatus: d.approvalStatus,
      email: d.email
    };
  });
}

function buildResidentRes(resident: Resident): ResidentListDto {
  return {
    id: resident.id,
    userId: resident.userId,
    building: resident.apartmentDong,
    unitNumber: resident.apartmentHo,
    contact: resident.contact,
    name: resident.name,
    email: resident.email,
    residenceStatus: resident.residenceStatus,
    isHouseholder: resident.isHouseholder,
    isRegistered: resident.isRegistered,
    approvalStatus: resident.approvalStatus
  };
}

async function saveCsv(csv: string) {
  const dir = path.join(process.cwd(), 'downloads');
  const filePath = path.join(dir, `아파트_입주민명부_${getTimestamp()}.csv`);

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, csv, 'utf-8');

  return filePath;
}

export default {
  getList,
  post,
  downloadTemplateCsv,
  createManyFromFile,
  downloadListCsv,
  get,
  patch,
  del
};
