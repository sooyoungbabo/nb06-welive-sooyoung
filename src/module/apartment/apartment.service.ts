import NotFoundError from '../../middleware/errors/NotFoundError';
import ForbiddenError from '../../middleware/errors/ForbiddenError';
import { getAptInfoByUserId, isSuperAdmin } from '../../lib/utils';
import { ApprovalStatus, Apartment, UserType, Prisma } from '@prisma/client';
import { buildPagination, buildWhere } from '../../lib/buildQuery';
import aptRepo from './apartment.repo';
import {
  ApartmentQuery,
  AptListPublicResponseDto,
  AptListResponseDto,
  AptPublicResponseDto,
  AptResponseDto
} from './apartment.dto';

//--------------------------------------- 아파트 목록 조회: public
async function publicGetList(query: ApartmentQuery): Promise<AptListPublicResponseDto[]> {
  const queryParams = buildPublicListQueryParams(query);
  const where = buildWhere(queryParams);
  const apts = await aptRepo.findMany({ where, orderBy: { createdAt: 'desc' } });
  return buildPublicAptListRes(apts);
}

//--------------------------------------- 아파트 상세 조회: public
async function publicGet(aptId: string): Promise<AptPublicResponseDto> {
  const apt = await aptRepo.find({ where: { id: aptId } });
  if (!apt) throw new NotFoundError('아파트가 존재하지 않습니다.');
  return buildPublicAptRes(apt);
}

//--------------------------------------- 아파트 목록 조회: 최고관리자/관리자
async function getList(
  userId: string,
  query: ApartmentQuery
): Promise<{ apartments: AptListResponseDto[]; totalCount: number }> {
  // 쿼리 파라미터 구성
  const params = buildListQueryParams(query);
  const { skip, take } = buildPagination(params.pagination, {
    limitDefault: 20,
    limitMax: 100
  });

  let whereTerms: Prisma.ApartmentWhereInput[] = [{ deletedAt: null }];

  if (!(await isSuperAdmin(userId))) {
    const { apartmentId } = await getAptInfoByUserId(userId);
    whereTerms.push({ id: apartmentId }); // 관리자인 경우 관리 아파트만 조회 가능
  }

  const queryWhere = buildWhere(params);
  if (Object.keys(queryWhere).length > 0) whereTerms.push(queryWhere);

  let relationWhere;
  if (params.searchKey.keyword) {
    relationWhere = buildAdminRelationSearch(
      params.searchKey.keyword,
      params.relationSearch.admin
    );
    whereTerms.push(relationWhere);
  }

  const where = { AND: whereTerms };

  const args = {
    where,
    skip,
    take,
    orderBy: { createdAt: 'desc' },
    include: {
      users: {
        where: { role: UserType.ADMIN, deletedAt: null }, // 출력에 필요한 관리자 정보 가져옴
        select: { id: true, name: true, contact: true, email: true }
      }
    }
  } satisfies Prisma.ApartmentFindManyArgs;

  // DB 조회
  const totalCount = await aptRepo.count({ where });
  const apts = await aptRepo.findMany(args);

  return { apartments: buildMemberAptListRes(apts), totalCount };
}

//--------------------------------------- 아파트 상세 조회: 최고관리자/관리자
async function get(userId: string, aptId: string) {
  if (!(await isSuperAdmin(userId))) {
    const { apartmentId: adminAptId } = await getAptInfoByUserId(userId);
    const isMyApt = adminAptId === aptId;
    if (!isMyApt) throw new ForbiddenError(); // 권한: 내가 관리자인가
  }
  const apt = await aptRepo.find({
    where: { id: aptId },
    include: {
      users: {
        where: { role: UserType.ADMIN, deletedAt: null }, // 출력 시 필요한 관리자 정보 가져옴
        select: { id: true, name: true, contact: true, email: true }
      }
    }
  });
  if (!apt) throw new NotFoundError('아파트가 존재하지 않습니다.');
  return buildMemberAptRes(apt);
}

//------------------------------------- 지역 함수들
function buildPublicListQueryParams(query: ApartmentQuery) {
  const { keyword, name, address } = query;
  return {
    filters: { name, address },
    searchKey: { keyword, fields: ['name', 'address', 'description'] }
  };
}

function buildListQueryParams(query: ApartmentQuery) {
  const { name, address, keyword, page, limit } = query;

  const apartmentStatus =
    query.apartmentStatus === undefined || query.apartmentStatus === ''
      ? undefined
      : (query.apartmentStatus as ApprovalStatus);

  return {
    pagination: { page, limit },
    filters: { name, address },
    exactFilters: { apartmentStatus },
    searchKey: { keyword, fields: ['name', 'address', 'description'] },
    relationSearch: { admin: ['name', 'email'] }
    // 관리자 이름, 관리자 이메일은 관계 필드 users에서 가져와야 함
  };
}

function buildAdminRelationSearch(keyword: string, adminFields: string[]) {
  const adminBase = {
    role: UserType.ADMIN,
    deletedAt: null
  };

  let searchTerms = [];
  for (const field of adminFields) {
    searchTerms.push({
      users: {
        some: { ...adminBase, [field]: { contains: keyword, mode: 'insensitive' } }
      }
    });
  }

  const where = { OR: searchTerms };
  return where;
}

function buildPublicAptListRes(apts: Apartment[]): AptListPublicResponseDto[] {
  return apts.map(({ id, name, address }) => ({ id, name, address }));
}

function buildPublicAptRes(apt: Apartment): AptPublicResponseDto {
  return {
    id: apt.id,
    name: apt.name,
    address: apt.address,
    startComplexNumber: apt.startComplexNumber,
    endComplexNumber: apt.endComplexNumber,
    startDongNumber: apt.startBuildingNumber,
    endDongNumber: apt.endBuildingNumber,
    startFloorNumber: apt.startFloorNumber,
    endFloorNumber: apt.endFloorNumber,
    startHoNumber: apt.startUnitNumber,
    endHoNumber: apt.endUnitNumber,
    apartmentStatus: apt.apartmentStatus,
    dongRange: {
      start: apt.startComplexNumber * 100 + apt.startBuildingNumber,
      end: apt.endComplexNumber * 100 + apt.endBuildingNumber
    },
    hoRange: {
      start: apt.startFloorNumber * 100 + apt.startUnitNumber,
      end: apt.endFloorNumber * 100 + apt.endUnitNumber
    }
  };
}

type UserWithLessInfo = { id: string; name: string; contact: string; email: string };
type ApartmentWithAdmins = Apartment & { users: UserWithLessInfo[] };

function buildMemberAptListRes(apts: ApartmentWithAdmins[]): AptListResponseDto[] {
  return apts.map((apt) => {
    const admin = apt.users[0];
    if (!admin) throw new NotFoundError('관리자를 찾을 수 없습니다.');
    return {
      id: apt.id,
      name: apt.name,
      address: apt.address,
      officeNumber: apt.apartmentManagementNumber,
      description: apt.description,
      startComplexNumber: apt.startComplexNumber,
      endComplexNumber: apt.endComplexNumber,
      startDongNumber: apt.startBuildingNumber,
      endDongNumber: apt.endBuildingNumber,
      startFloorNumber: apt.startFloorNumber,
      endFloorNumber: apt.endFloorNumber,
      startHoNumber: apt.startUnitNumber,
      endHoNumber: apt.endUnitNumber,
      apartmentStatus: apt.apartmentStatus,
      adminId: admin.id,
      adminName: admin.name,
      adminContact: admin.contact,
      adminEmail: admin.email
    };
  });
}

function buildMemberAptRes(apt: ApartmentWithAdmins): AptResponseDto {
  return {
    id: apt.id,
    name: apt.name,
    address: apt.address,
    officeNumber: apt.apartmentManagementNumber,
    description: apt.description,
    startComplexNumber: apt.startComplexNumber,
    endComplexNumber: apt.endComplexNumber,
    startDongNumber: apt.startBuildingNumber,
    endDongNumber: apt.endBuildingNumber,
    startFloorNumber: apt.startFloorNumber,
    endFloorNumber: apt.endFloorNumber,
    startHoNumber: apt.startUnitNumber,
    endHoNumber: apt.endUnitNumber,
    apartmentStatus: apt.apartmentStatus,
    adminId: apt.users[0].id,
    adminName: apt.users[0].name,
    adminContact: apt.users[0].contact,
    adminEmail: apt.users[0].email,
    dongRange: {
      start: apt.startComplexNumber * 100 + apt.startBuildingNumber,
      end: apt.endComplexNumber * 100 + apt.endBuildingNumber
    },
    hoRange: {
      start: apt.startFloorNumber * 100 + apt.startUnitNumber,
      end: apt.endFloorNumber * 100 + apt.endUnitNumber
    }
  };
}

export default {
  publicGetList,
  publicGet,
  getList,
  get
};
