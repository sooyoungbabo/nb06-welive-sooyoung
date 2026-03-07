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
import apartmentRepo from './apartment.repo';
import UnauthorizedError from '../../middleware/errors/UnauthorizedError';
import ForbiddenError from '../../middleware/errors/ForbiddenError';

async function publicGetList(query: ApartmentQuery): Promise<AptListPublicResponseDto[]> {
  const queryParams = buildPublicListQueryParams(query);
  const where = buildWhere(queryParams);
  console.log(where);
  const apts = await aptRepo.getList({ where });
  return buildPublicAptListRes(apts);
}

async function publicGet(aptId: string): Promise<AptPublicResponseDto> {
  const apt = await aptRepo.find({ where: { id: aptId } });
  return buildPublicAptRes(apt);
}

async function getList(user: AuthUser, query: ApartmentQuery): Promise<AptListResponseDto[]> {
  const queryParams = buildListQueryParams(query);

  const { skip, take } = buildPagination(queryParams.pagination, {
    limitDefault: 20,
    limitMax: 100
  });
  let where = buildWhere(queryParams);

  requireUser(user);
  // 관리자인 경우, 담당 아파트만 보여줌
  if (user.userType === UserType.ADMIN)
    where = {
      AND: [where, { users: { some: { id: user.id, role: UserType.ADMIN, deletedAt: null } } }]
    };

  const args: Prisma.ApartmentFindManyArgs = {
    where,
    skip,
    take,
    include: { users: true },
    orderBy: { createdAt: 'desc' }
  };

  const apts = await aptRepo.getList(args);
  return buildMemberAptListRes(apts as ApartmentWithUsers[]);
}

async function get(user: AuthUser, aptId: string) {
  requireUser(user);
  if (user.userType === UserType.ADMIN) {
    requireApartmentUser(user);
    if (user.apartmentId != aptId) throw new ForbiddenError();
  }
  return await aptRepo.find({ where: { id: aptId } });
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
    searchKey: { keyword, fields: ['name', 'address', 'description'] }
  };
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

type ApartmentWithUsers = Apartment & { users: User[] };

function buildMemberAptListRes(apts: ApartmentWithUsers[]): AptListResponseDto[] {
  return apts.map((apt) => {
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
      adminEmail: apt.users[0].email
    };
  });
}

function buildMemberAptRes(apt: Apartment): AptResponseDto {
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
    dongRange: {
      start: apt.startComplexNumber * 100 + apt.startBuildingNumber,
      end: apt.endComplexNumber * 100 + apt.endBuildingNumber
    },
    hoRange: {
      start: apt.startFloorNumber * 100 + apt.startUnitNumber,
      end: apt.endFloorNumber * 100 + apt.endUnitNumber
    },
    apartmentStatus: apt.apartmentStatus
  };
}

export default {
  publicGetList,
  publicGet,
  getList,
  get
};
