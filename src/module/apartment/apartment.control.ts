import { NextFunction, Request, Response } from 'express';
import aptService from './apartment.service';
import { Apartment, ApprovalStatus, User } from '@prisma/client';
import {
  AptListPublicResponseDto,
  AptListResponseDto,
  AptPublicResponseDto,
  AptResponseDto
} from './apartment.dto';

type PublicAptQuery = {
  keyword?: string;
  name?: string;
  address?: string;
};

async function publicGetList(
  req: Request<{}, {}, {}, PublicAptQuery>,
  res: Response,
  next: NextFunction
) {
  const { keyword, name, address } = req.query;
  const apts = await aptService.publicGetList({ keyword, name, address });
  const apts2show = buildPublicAptListRes(apts);
  res.status(200).json({ apartments: apts2show, count: apts2show.length });
}

async function publicGet(req: Request, res: Response, next: NextFunction) {
  const apt = await aptService.publicGet(req.params.id as string);
  res.status(200).json(buildPublicAptRes(apt));
}

type AptQuery = {
  keyword?: string;
  name?: string;
  address?: string;
  apartmentStatus?: ApprovalStatus;
  page?: string;
  limit?: string;
};
async function getList(req: Request<{}, {}, {}, AptQuery>, res: Response, next: NextFunction) {
  const { keyword, name, address, apartmentStatus, page, limit } = req.query;
  const apts = await aptService.getList(
    { keyword, name, address, apartmentStatus },
    { page, limit }
  );
  const apts2show = buildMemberAptListRes(apts);
  res.status(200).json({ apartments: apts2show, count: apts2show.length });
}

async function get(req: Request, res: Response, next: NextFunction) {
  const apt = await aptService.get(req.params.id as string);
  res.status(200).json(buildMemberAptRes(apt));
}

//------------------------------------- 지역 함수들

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

function buildMemberAptListRes(apts: (Apartment & { users: User[] })[]): AptListResponseDto[] {
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
