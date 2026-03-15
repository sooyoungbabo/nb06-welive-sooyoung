import { NextFunction, Request, Response } from 'express';
import residentService from './resident.service';
import { ResidentQueryDto } from './resident.dto';
import BadRequestError from '../../middleware/errors/BadRequestError';
import { requireApartmentUser } from '../../lib/require';
import { getTimestamp } from '../../lib/myFuns';
import { NODE_ENV } from '../../lib/constants';

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
  const { building, unitNumber, contact, name, isHouseholder } = req.body;
  const data = {
    apartmentDong: building,
    apartmentHo: unitNumber,
    contact,
    name,
    isHouseholder
  };
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
  const buffer = req.file.buffer;
  requireApartmentUser(req.user);
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
  const residentId = req.params.id as string;
  requireApartmentUser(req.user);
  const resident = await residentService.get(req.user.apartmentId, residentId);
  res.status(200).json(resident);
}

async function patch(req: Request, res: Response, next: NextFunction) {
  const residentId = req.params.id as string;
  const { name, contact, building, unitNumber, isHouseholder } = req.body;
  const residentData = {
    name,
    contact,
    apartmentDong: building,
    apartmentHo: unitNumber,
    isHouseholder
  };
  const userData = {
    name,
    contact
  };

  requireApartmentUser(req.user);
  const resident = await residentService.patch(
    req.user.apartmentId,
    residentId,
    residentData,
    userData
  );
  res.status(200).json(resident);
}

async function del(req: Request, res: Response, next: NextFunction) {
  const residentId = req.params.id as string;
  requireApartmentUser(req.user);
  if (NODE_ENV === 'development') await residentService.del(req.user.apartmentId, residentId);
  else await residentService.softDel(req.user.apartmentId, residentId);
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
