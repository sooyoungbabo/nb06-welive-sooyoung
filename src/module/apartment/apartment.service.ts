import { ApprovalStatus, Prisma, Apartment, User, UserType } from '@prisma/client';
import { buildPagination, buildWhere } from '../../lib/buildQuery';
import aptRepo from './apartment.repo';
import {
  ApartmentQuery,
  AptListPublicResponseDto,
  AptListResponseDto,
  AptPublicResponseDto,
  AptResponseDto
} from './apartment.dto';
import { AuthUser } from '../../type/express';
import { requireApartmentUser, requireUser } from '../../lib/require';
import ForbiddenError from '../../middleware/errors/ForbiddenError';
import NotFoundError from '../../middleware/errors/NotFoundError';

async function publicGetList(query: ApartmentQuery): Promise<AptListPublicResponseDto[]> {
  const queryParams = buildPublicListQueryParams(query);
  const where = buildWhere(queryParams);
  const apts = await aptRepo.findMany({ where });
  return buildPublicAptListRes(apts);
}

async function publicGet(aptId: string): Promise<AptPublicResponseDto> {
  const apt = await aptRepo.find({ where: { id: aptId } });
  if (!apt) throw new NotFoundError('아파트가 존재하지 않습니다.');
  return buildPublicAptRes(apt);
}

const adminSearchBase = {
  role: UserType.ADMIN,
  deletedAt: null
};

async function getList(
  user: AuthUser,
  query: ApartmentQuery
): Promise<{ apartments: AptListResponseDto[]; totalCount: number }> {
  const params = buildListQueryParams(query);

  const { skip, take } = buildPagination(params.pagination, {
    limitDefault: 20,
    limitMax: 100
  });
  let where = buildWhere(params);

  // 관리자인 경우, 담당 아파트만 보여줌
  requireUser(user);
  if (user.userType === UserType.ADMIN)
    where = {
      AND: [where, { users: { some: { id: user.id, ...adminSearchBase } } }]
    };

  // 관계형 searchKey fields 추가: admin name/email
  if (params.searchKey?.keyword)
    addAdminRelationSearch(where, params.searchKey.keyword, params.relationSearch.admin);

  console.dir(where, { depth: null });
  const args = {
    where,
    skip,
    take,
    include: { users: { where: { role: UserType.ADMIN, deletedAt: null } } }
  };
  const totalCount = await aptRepo.count({ where });
  const apts = await aptRepo.findMany(args);
  return { apartments: buildMemberAptListRes(apts), totalCount };
}

async function get(user: AuthUser, aptId: string) {
  requireUser(user);
  if (user.userType === UserType.ADMIN) {
    requireApartmentUser(user);
    if (user.apartmentId != aptId) throw new ForbiddenError();
  }
  const apt = await aptRepo.find({
    where: { id: aptId },
    include: { users: { where: { role: UserType.ADMIN, deletedAt: null } } }
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
  const { keyword, name, address, page, limit } = query;

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

function addAdminRelationSearch(where: any, keyword: string, adminFields: string[]) {
  where.OR ??= [];

  const adminBase = {
    role: UserType.ADMIN,
    deletedAt: null
  };

  for (const field of adminFields) {
    where.OR.push({
      users: { some: { ...adminBase, [field]: { contains: keyword, mode: 'insensitive' } } }
    });
  }
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

type ApartmentWithAdmins = Apartment & { users: User[] };

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
