import path from 'path';
import fs from 'fs/promises';
import NotFoundError from '../../middleware/errors/NotFoundError';
import ForbiddenError from '../../middleware/errors/ForbiddenError';
import prisma from '../../lib/prisma';
import residentRepo from './resident.repo';
import userRepo from '../user/user.repo';
import {
  getAptInfoByResidentId,
  getAptInfoByUserId,
  validateAptDongHo
} from '../../lib/utils';
import { buildPagination, buildWhere } from '../../lib/buildQuery';
import { getTimestamp } from '../../lib/myFuns';
import { CreateResident } from './resident.struct';
import { assert } from 'superstruct';
import {
  Resident,
  Prisma,
  HouseholdRole,
  ResidenceStatus,
  ApprovalStatus
} from '@prisma/client';
import {
  ResidentCreateRequestDto,
  ResidentCsvItem,
  ResidentListDto,
  ResidentQueryDto
} from './resident.dto';

//---------------------------------------- 입주민 목록 조회
// page, limit (default 20, max 100)
// filters: building, unitNumber
// exactFilters: residenceStatus, isRegistered
// keyword 검색: 검색필드는 name, ontact
async function getList(
  userId: string,
  query: ResidentQueryDto
): Promise<{
  residents: ResidentListDto[];
  totalCount: number;
}> {
  const { apartmentId } = await getAptInfoByUserId(userId);

  const baseWhere = {
    apartmentId,
    deletedAt: null
  };

  // 검색 파라미터 구성
  const queryParams = buildQueryParams(query);
  const { skip, take } = buildPagination(queryParams.pagination, {
    limitDefault: 20,
    limitMax: 100
  });

  const queryWhere: Prisma.ResidentWhereInput =
    buildWhere({
      searchKey: queryParams.searchKey,
      filters: queryParams.filters,
      exactFilters: queryParams.exactFilters
    }) ?? {};

  // 최종 where
  const where: Prisma.ResidentWhereInput = {
    AND: [baseWhere, queryWhere]
  };

  const totalCount = await residentRepo.count({ where });
  const rawResidents = await residentRepo.findMany({
    where,
    skip,
    take,
    orderBy: { createdAt: 'desc' }
  });

  return {
    residents: buildResidentListRes(rawResidents),
    totalCount
  };
}

//---------------------------------------- 명부only 입주민 리소스 생성 (개별 등록)
// userId, email은 null, isRegistered = false
// 승인 절차가 따로 없고 user계정 등록할 때 트랜젝션으로 함께 승인
//                     그러면 userId, email = nn, isRegistered = true
async function post(
  userId: string,
  data: ResidentCreateRequestDto
): Promise<ResidentListDto> {
  // validation: 아파트, 동, 호
  const { apartmentId, apartmentName } = await getAptInfoByUserId(userId);
  validateAptDongHo(apartmentName, data.apartmentDong, data.apartmentHo);

  // DB Resident 생성
  const resident = await residentRepo.create(prisma, {
    data: {
      ...data,
      isRegistered: false, // 명부only
      apartment: { connect: { id: apartmentId } }
    }
  });
  // 출력 양식에 맞춰 포맷하고 리턴
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

//---------------------------------------- 입주민 업로드용 템플릿 다운로드
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

//---------------------------------------- 파일로부터 입주민 리소스 생성
async function createManyFromFile(userId: string, buffer: Buffer): Promise<number> {
  const text = buffer.toString('utf-8').replace(/^\uFEFF/, '');

  const { apartmentId, apartmentName } = await getAptInfoByUserId(userId);

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
    validateAptDongHo(apartmentName, dong, ho);

    assert(tempData, CreateResident);
    residentData.push(tempData);
  }
  const residents = await residentRepo.createMany(prisma, residentData);
  return residents.count;
}

//---------------------------------------- 입주민 목록 파일 다운로드
async function downloadListCsv(userId: string, query: ResidentQueryDto): Promise<string> {
  const { apartmentId } = await getAptInfoByUserId(userId);

  // 쿼리 파라미터 구성
  const queryParams = buildQueryParams(query);
  const { skip, take } = buildPagination(queryParams.pagination, {
    limitDefault: 20,
    limitMax: 100
  });

  const baseWhere = {
    apartmentId, // 관리 중인 아파트로 한정
    deletedAt: null
  };

  const queryWhere =
    buildWhere({
      searchKey: queryParams.searchKey,
      filters: queryParams.filters,
      exactFilters: queryParams.exactFilters
    }) ?? {};

  const where: Prisma.ResidentWhereInput = {
    AND: [baseWhere, queryWhere]
  };

  // DB 조회
  const residents = await residentRepo.findMany({
    where,
    skip,
    take,
    orderBy: { createdAt: 'desc' }
  });

  // 출력용 데이터로 재가공
  const items: ResidentCsvItem[] = residents.map((r) => ({
    apartmentDong: r.apartmentDong,
    apartmentHo: r.apartmentHo,
    name: r.name,
    contact: r.contact,
    isHouseholder: r.isHouseholder
  }));

  const header = ['동', ' 호수', ' 이름', ' 연락처', ' 세대주여부'];

  const rows = residents.map((r) =>
    [r.apartmentDong, r.apartmentHo, r.name, r.contact, r.isHouseholder]
      .map((v) => `"${v}"`)
      .join(',')
  );

  const csv = '\ufeff' + [header.join(','), ...rows].join('\n');

  // file에 저장
  const savedFilePath = await saveCsv(csv);
  //console.log(savedFilePath);

  return csv;
}

//---------------------------------------- 입주민 상세 조회
async function get(userId: string, residentId: string): Promise<ResidentListDto> {
  const { adminId: residentAdminId } = await getAptInfoByResidentId(residentId);

  const isAdmin = userId === residentAdminId;
  if (!isAdmin) throw new ForbiddenError(); // 권한: 나 = 입주민 아파트 관리자

  const resident = await residentRepo.find(prisma, {
    where: { id: residentId, deletedAt: null }
  });
  if (!resident) throw new NotFoundError('입주민이 존재하지 않습니다.');
  return buildResidentRes(resident);
}

//---------------------------------------- 입주민 정보 수정
async function patch(
  userId: string,
  residentId: string,
  residentData: Prisma.ResidentUpdateInput,
  userData: Prisma.UserUpdateInput
) {
  // 권한 체크: 나 = 입주민 아파트 관리자이어야 함
  const {
    adminId: residentAdminId,
    userId: residentUserId,
    apartmentId
  } = await getAptInfoByResidentId(residentId);

  const isAdmin = userId === residentAdminId;
  if (!isAdmin) throw new ForbiddenError();

  // DB 트랜젝션: Resident/User 수정
  return prisma.$transaction(async (tx) => {
    const resident = await residentRepo.patch(tx, {
      where: { id: residentId, apartmentId },
      data: residentData
    });

    // User 계정이 있는 명부 입주민인 경우
    if (residentUserId)
      await userRepo.patch(tx, {
        where: { id: residentUserId, apartmentId },
        data: userData
      });
    return resident;
  });
}

//---------------------------------------- 입주민 정보 삭제
// 개발환경에서는 진짜 삭제
async function del(userId: string, residentId: string) {
  const { adminId: residentAdminId, userId: residentUserId } =
    await getAptInfoByResidentId(residentId);

  const isAdmin = userId === residentAdminId;
  if (!isAdmin) throw new ForbiddenError();

  await prisma.$transaction(async (tx) => {
    const resident = await residentRepo.del(tx, {
      where: { id: residentId }
    });
    // 사용자 계정이 있는 입주민인 경우
    if (residentUserId)
      await userRepo.del(tx, {
        where: { id: residentUserId }
      });
  });
}

// 배포 환경에서는 soft-delete
async function softDel(userId: string, residentId: string) {
  const { adminId: residentAdminId, userId: residentUserId } =
    await getAptInfoByResidentId(residentId);

  const isAdmin = userId === residentAdminId;
  if (!isAdmin) throw new ForbiddenError();

  await prisma.$transaction(async (tx) => {
    const resident = await residentRepo.patch(prisma, {
      where: { id: residentId },
      data: { deletedAt: new Date() }
    });
    if (residentUserId)
      await userRepo.patch(tx, {
        where: { id: residentUserId },
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

  const isRegistered =
    query.isRegistered === undefined ? undefined : query.isRegistered === 'true';

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
