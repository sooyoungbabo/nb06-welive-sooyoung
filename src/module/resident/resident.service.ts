import { Resident, Prisma, HouseholdRole, ResidenceStatus, ApprovalStatus } from '@prisma/client';
import path from 'path';
import fs from 'fs/promises';
import NotFoundError from '../../middleware/errors/NotFoundError';
import ForbiddenError from '../../middleware/errors/ForbiddenError';
import prisma from '../../lib/prisma';
import residentRepo from './resident.repo';
import userRepo from '../user/user.repo';
import apartmentRepo from '../apartment/apartment.repo';
import { buildPagination, buildWhere } from '../../lib/buildQuery';
import { getTimestamp } from '../../lib/myFuns';
import {
  ResidentCreateRequestDto,
  ResidentCsvItem,
  ResidentListDto,
  ResidentQueryDto
} from './resident.dto';
import { getAptInfoByUserId, validateAptDongHo } from '../../lib/utils';
import { assert } from 'superstruct';
import { CreateResident } from './resident.struct';

// 입주민 목록 조회
async function getList(
  userId: string,
  query: ResidentQueryDto
): Promise<{
  residents: ResidentListDto[];
  totalCount: number;
}> {
  const { apartmentId } = await getAptInfoByUserId(userId);
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

  const totalCount = await residentRepo.count({ where });
  const rawResidents = await residentRepo.findMany({
    where,
    skip,
    take,
    orderBy: { createdAt: 'desc' }
  });
  const residents = buildResidentListRes(rawResidents);

  return { residents, totalCount };
}

// 입주민 리소스 생성 (개별 등록)
// user걔정이 없으면, userId, email은 null, isRegistered = false
// user계정이 있다면, userId, email은 not null, isRegistered = true
async function post(userId: string, data: ResidentCreateRequestDto): Promise<ResidentListDto> {
  // validation: 아파트, 동, 호
  const { apartmentId } = await getAptInfoByUserId(userId);
  const apt = await apartmentRepo.findFirst({
    where: { id: apartmentId },
    select: { name: true }
  });
  validateAptDongHo(apt!.name, data.apartmentDong, data.apartmentHo);

  let resident;
  const residentData = {
    ...data,
    isRegistered: false,
    apartment: { connect: { id: apartmentId } }
  };

  const user = await userRepo.find({ where: { contact: data.contact, deletedAt: null } });
  if (!user)
    resident = await residentRepo.create(prisma, {
      data: {
        ...data,
        isRegistered: false,
        apartment: { connect: { id: apartmentId } }
      }
    });
  else
    // user 생성 시 resident도 자동생성 되므로, 이런 경우는 없겠지만...
    resident = await residentRepo.create(prisma, {
      data: {
        ...data,
        email: user.email,
        isRegistered: true,
        user: { connect: { id: user.id } },
        apartment: { connect: { id: apartmentId } }
      }
    });
  return buildResidentRes(resident);
}

// 주강사님과의 협의로 안 만들기로 한 API
// async function user2resident(userId: string): Promise<Resident> {
//   const user = await userRepo.findById(userId);
//   let message: string;
//   if (!user) throw new NotFoundError('존재하지 않는 사용자입니다.');
//   if (!user.apartmentId) throw new NotFoundError('아파트ID가 없는 사용자입니다.');

//   const resident = await residentRepo.find(prisma, { where: { userId } });
//   if (resident) throw new NotFoundError('이미 입주민 명부에 추가된 사용자입니다.');

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

// 입주민 업로드용 템플릿 다운로드
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

// 파일로부터 입주민 리소스 생성
async function createManyFromFile(userId: string, buffer: Buffer): Promise<number> {
  const text = buffer.toString('utf-8').replace(/^\uFEFF/, '');

  const { apartmentId } = await getAptInfoByUserId(userId);
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
      isHouseholder: role as HouseholdRole,
      isRegistered: false,
      residenceStatus: ResidenceStatus.RESIDENCE,
      approvalStatus: ApprovalStatus.PENDING
    };

    // validation: 아파트, 동, 호
    const apt = await apartmentRepo.find({ where: { id: apartmentId }, select: { name: true } });
    validateAptDongHo(apt!.name, dong, ho);

    assert(tempData, CreateResident);
    residentData.push(tempData);
  }
  const residents = await residentRepo.createMany(prisma, residentData);
  return residents.count;
}

// 입주민 목록 파일 다운로드
async function downloadListCsv(userId: string, query: ResidentQueryDto): Promise<string> {
  const { apartmentId } = await getAptInfoByUserId(userId);
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

  const residents = await residentRepo.findMany({
    where,
    skip,
    take,
    orderBy: { createdAt: 'desc' }
  });

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

// 입주민 상세 조회
async function get(userId: string, residentId: string): Promise<ResidentListDto> {
  const { apartmentId } = await getAptInfoByUserId(userId);
  const resident = await residentRepo.find(prisma, { where: { id: residentId } });
  if (!resident) throw new NotFoundError('입주민이 존재하지 않습니다.');
  if (resident.apartmentId != apartmentId) throw new ForbiddenError(); // 권한
  return buildResidentRes(resident);
}

// 입주민 정보 수정
async function patch(
  userId: string,
  residentId: string,
  residentData: Prisma.ResidentUpdateInput,
  userData: Prisma.UserUpdateInput
) {
  const { apartmentId } = await getAptInfoByUserId(userId);
  const resident = await residentRepo.find(prisma, { where: { id: residentId } });
  if (!resident) throw new NotFoundError('입주자가 존재하지 않습니다.');
  if (apartmentId !== resident.apartmentId) throw new ForbiddenError();

  if (!resident.userId) {
    // 계정이 없는 입주민인 경우
    return residentRepo.patch(prisma, {
      where: { id: residentId, apartmentId, deletedAt: null },
      data: residentData
    });
  } else {
    // 계정이 있는 입주민인 경우
    return prisma.$transaction(async (tx) => {
      const resident = await residentRepo.patch(tx, {
        where: { id: residentId, apartmentId },
        data: residentData
      });
      await userRepo.patch(tx, {
        where: { id: resident.userId!, apartmentId },
        data: userData
      });
      return resident;
    });
  }
}

// 입주민 정보 삭제
// 개발환경에서는 진짜 삭제, 배포 환경에서는 soft-delete
async function del(userId: string, residentId: string) {
  const { apartmentId } = await getAptInfoByUserId(userId);
  const resident = await residentRepo.find(prisma, {
    where: { id: residentId },
    select: { apartmentId: true }
  });
  if (!resident) throw new NotFoundError('입주민이 존재하지 않습니다.');
  if (resident.apartmentId != apartmentId) throw new ForbiddenError(); // 권한

  await prisma.$transaction(async (tx) => {
    const resident = await residentRepo.del(tx, {
      where: { id: residentId }
    });
    if (resident.userId)
      await userRepo.del(tx, {
        where: { id: resident.userId }
      });
  });
}

async function softDel(userId: string, residentId: string) {
  const { apartmentId } = await getAptInfoByUserId(userId);
  const resident = await residentRepo.find(prisma, {
    where: { id: residentId },
    select: { apartmentId: true }
  });
  if (!resident) throw new NotFoundError('입주자가 존재하지 않습니다.');
  if (resident.apartmentId != apartmentId) throw new ForbiddenError(); // 권한

  await prisma.$transaction(async (tx) => {
    const resident = await residentRepo.patch(prisma, {
      where: { id: residentId, apartmentId },
      data: { deletedAt: new Date() }
    });
    if (resident.userId)
      await userRepo.patch(tx, {
        where: { id: resident.userId },
        data: { deletedAt: new Date() }
      });
  });
}
//----------------------------------------------------------- 지역 함수

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
  del,
  softDel
};
