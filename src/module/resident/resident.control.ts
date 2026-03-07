import { NextFunction, Request, Response } from 'express';
import residentService from './resident.service';
import { assert } from 'node:console';
import { PatchResident } from './resident.struct';
import { PatchUser } from '../user/user.struct';
import { ResidentQueryDto } from './resident.dto';
import BadRequestError from '../../middleware/errors/BadRequestError';
import { requireApartmentUser } from '../../lib/require';
import { getTimestamp } from '../../lib/myFuns';

async function getList(req: Request, res: Response, next: NextFunction) {
  requireApartmentUser(req.user);
  const query = req.query as ResidentQueryDto;
  const { residents, totalCount } = await residentService.getList(req.user.apartmentId, query);
  const count = residents.length;
  const message =
    count === 0 ? `조회된 입주민 결과가 없습니다.` : `조회된 입주민 결과가 ${count}건입니다.`;

  res.status(200).json({ residents, message, count, totalCount });
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
  requireApartmentUser(req.user);
  const resident = await residentService.post(req.user, data);
  res.status(201).json(resident);
}

// async function user2resident(req: Request, res: Response, next: NextFunction) {
//   const resident = await residentService.user2resident(req.params.id as string);
//   res.status(201).json(buildResidentRes(resident));
// }

async function downloadTemplate(req: Request, res: Response, next: NextFunction) {
  const csv = residentService.downloadTemplateCsv();
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
  requireApartmentUser(req.user);
  const buffer = req.file.buffer;
  const count = await residentService.createManyFromFile(req.user.apartmentId, buffer);
  res.status(201).send({ message: `${count}명의 입주민이 등록되었습니다.`, count });
}

async function downloadList(req: Request, res: Response, next: NextFunction) {
  const query = req.query as ResidentQueryDto;
  requireApartmentUser(req.user);
  const csv = await residentService.downloadListCsv(req.user.apartmentId, query);

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
  requireApartmentUser(req.user);
  const resident = await residentService.get(req.user.apartmentId, req.params.id as string);
  res.status(200).json(resident);
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
  requireApartmentUser(req.user);
  const resident = await residentService.patch(
    req.user.apartmentId,
    req.params.id as string,
    residentData,
    userData
  );
  res.status(201).json(resident);
}

async function del(req: Request, res: Response, next: NextFunction) {
  requireApartmentUser(req.user);
  const resident = await residentService.del(req.user.apartmentId, req.params.id as string);
  res.status(200).send({ message: '작업이 성공적으로 완료되었습니다.' });
}

export default {
  getList,
  post,
  downloadTemplate,
  createManyFromFile,
  downloadList,
  get,
  patch,
  del
};
