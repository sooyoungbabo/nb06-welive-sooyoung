import { NextFunction, Request, Response } from 'express';
import residentService from './resident.service';
import { assert } from 'node:console';
import { PatchResident } from './resident.struct';
import { PatchUser } from '../user/user.struct';
import { Resident, ResidenceStatus } from '@prisma/client';
import { ResidentCsvItem, ResidentListDto } from './resident.dto';
import BadRequestError from '../../middleware/errors/BadRequestError';

type ResidentQuery = {
  page?: string;
  limit?: string;
  building?: string;
  unitNumber?: string;
  residenceStatus?: string;
  isRegistered?: string;
  keyword?: string; //이름, 연락처
};

function buildQueryParams(query: ResidentQuery) {
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

async function getList(req: Request<{}, {}, {}, ResidentQuery>, res: Response, next: NextFunction) {
  const queryParms = buildQueryParams(req.query);
  const { residents, totalCount } = await residentService.getList(
    req.user.apartmentId as string,
    queryParms
  );

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

async function downloadTemplate(req: Request, res: Response, next: NextFunction) {
  const csv = residentService.buildResidentTemplateCsv();
  const filename = '입주민명부_템플릿.csv';
  const encoded = encodeURIComponent(filename);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="residents.csv"; filename*=UTF-8''${encoded}`
  );
  res.send(csv);
}

async function createManyFromFile(req: Request, res: Response, next: NextFunction) {
  if (!req.file) throw new BadRequestError('파일이 없습니다.');
  const buffer = req.file.buffer;
  const count = await residentService.createManyFromFile(req.user.apartmentId as string, buffer);
  res.status(201).send({ message: `${count}명의 입주민이 등록되었습니다.`, count });
}

async function downloadList(
  req: Request<{}, {}, {}, ResidentQuery>,
  res: Response,
  next: NextFunction
) {
  const queryParms = buildQueryParams(req.query);
  const { residents } = await residentService.getList(req.user.apartmentId as string, queryParms);

  const items: ResidentCsvItem[] = residents.map((r) => ({
    apartmentDong: r.apartmentDong,
    apartmentHo: r.apartmentHo,
    name: r.name,
    contact: r.contact,
    isHouseholder: r.isHouseholder
  }));

  const csv = residentService.buildResidentListCsv(items);
  const filename = `아파트_입주민명부_${getTimestamp()}.csv`;
  const encodedFilename = encodeURIComponent(filename);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="residents.csv"; filename*=UTF-8''${encodedFilename}`
  );
  res.send(csv);
}

async function get(req: Request, res: Response, next: NextFunction) {
  const resident = await residentService.get(req.params.id as string);
  res.status(200).json(buildResidentRes(resident));
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

function getTimestamp(): string {
  const now = new Date();

  const YYYY = now.getFullYear();
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const DD = String(now.getDate()).padStart(2, '0');

  const HH = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');

  return `${YYYY}-${MM}-${DD}-${HH}${mm}${ss}`;
}

export default {
  getList,
  post,
  user2resident,
  downloadTemplate,
  createManyFromFile,
  downloadList,
  get,
  patch,
  del
};
