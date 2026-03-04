import { NextFunction, Request, Response } from 'express';
import residentService from './resident.service';
import { assert } from 'node:console';
import { PatchResident, ResidentQueryStruct } from './resident.struct';
import { PatchUser } from '../user/user.struct';
import { Resident, ResidenceStatus } from '@prisma/client';
import { ResidentListDto } from './resident.dto';
import { GetBucketEncryptionRequest$ } from '@aws-sdk/client-s3';

type ResidentQuery = {
  page?: string;
  limit?: string;
  building?: string;
  unitNumber?: string;
  residenceStatus?: ResidenceStatus;
  isRegistered?: boolean;
  keyword?: string; //이름, 연락처
};
async function getList(req: Request<{}, {}, {}, ResidentQuery>, res: Response, next: NextFunction) {
  const { page, limit } = req.query;
  const { keyword } = req.query;
  const { building: apartmentDong, unitNumber: apartmentHo } = req.query;
  const { residenceStatus, isRegistered } = req.query;

  const { residents, totalCount } = await residentService.getList(req.user.apartmentId as string, {
    pagination: { page, limit },
    searchKey: { keyword, fields: ['name', 'contact'] },
    filters: { apartmentDong, apartmentHo },
    exactFilters: { residenceStatus, isRegistered }
  });

  const resident2show = buildResidentListRes(residents);
  const count = resident2show.length;
  const message =
    count === 0 ? `조회된 입주민 결과가 없습니다.` : `조회된 입주민 결과가 ${count}건입니다.`;

  res.status(200).json({ residents: resident2show, message, count, totalCount });
}

async function post(req: Request, res: Response, next: NextFunction) {
  const data = {
    apartmentDong: req.body.building,
    apartmentHo: req.body.unitNumber,
    contact: req.body.contact,
    name: req.body.name,
    isHouseholder: req.body.isHouseholder
  };
  assert(data, PatchResident);
  const resident = await residentService.post(req.user.id, data);
  res.status(201).json(buildResidentRes(resident));
}

async function user2resident(req: Request, res: Response, next: NextFunction) {
  const resident = await residentService.user2resident(req.params.id as string);
  res.status(201).json(buildResidentRes(resident));
}

async function patch(req: Request, res: Response, next: NextFunction) {
  const residentData = {
    name: req.body.name ?? undefined,
    contact: req.body.contact ?? undefined,
    apartmentDong: req.body.building ?? undefined,
    apartmentHo: req.body.unitNumber ?? undefined,
    isHouseholder: req.body.isHouseholder ?? undefined
  };
  const userData = {
    name: req.body.name ?? undefined,
    contact: req.body.contact ?? undefined
  };
  assert(residentData, PatchResident);
  assert(userData, PatchUser);
  const resident = await residentService.patch(req.params.id as string, residentData, userData);
  res.status(201).json(resident);
}

async function del(req: Request, res: Response, next: NextFunction) {
  const resident = await residentService.del(req.params.id as string);
  res.status(200).send({ message: '작업이 성공적으로 완료되었습니다.' });
}

//------------------------------------------------

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

export default {
  getList,
  post,
  user2resident,
  patch,
  del
};
