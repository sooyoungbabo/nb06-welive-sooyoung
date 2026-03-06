import { NextFunction, Request, Response } from 'express';
import complaintService from './complaint.service';
import { requireApartmentUser, requireResidentUser, requireUser } from '../../lib/require';
import { assert } from 'node:console';
import { CreateComplaint, PatchComplaint } from './complaint.struct';
import { ComplaintStatus, UserType } from '@prisma/client';

async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  assert(req.body, CreateComplaint);
  requireResidentUser(req.user);
  const complaint = await complaintService.create(req.user, req.body);
  res.status(201).send({ message: '정상적으로 등록 처리되었습니다.' });
}

type ComplaintQuery = {
  page?: string;
  limit?: string; // default 20
  status?: string; // ComplaintStatus, 후에 변환
  isPublic: string; // boolean, 후에 변환
  dong?: string;
  ho?: string;
  keyword?: string; // title, content
};

function buildQueryParams(query: ComplaintQuery) {
  const { page, limit } = query;
  const { dong, ho } = query;
  const { keyword } = query;

  const status =
    query.status === undefined || query.status === ''
      ? undefined
      : (query.status as ComplaintStatus);

  const isPublic = query.isPublic === undefined ? undefined : query.isPublic === 'true';

  return {
    pagination: { page, limit },
    searchKey: { keyword, fields: ['title', 'content'] },
    filters: { apartmentDong: dong, apartmentHo: ho },
    exactFilters: { status, isPublic }
  };
}

async function getList(req: Request, res: Response, next: NextFunction): Promise<void> {
  const query = req.query as ComplaintQuery;
  const queryParams = buildQueryParams(query);

  const { complaints, totalCount } = await complaintService.getList(req.user, queryParams);
  res.status(200).json({ complaints, totalCount });
}

async function get(req: Request, res: Response, next: NextFunction): Promise<void> {
  requireUser(req.user);
  const complaint = await complaintService.get(req.user.id, req.params.complaintId as string);
  res.status(200).json(complaint);
}

async function patch(req: Request, res: Response, next: NextFunction): Promise<void> {
  assert(req.body, PatchComplaint);
  const complaint = await complaintService.patch(
    req.user,
    req.params.complaintId as string,
    req.body
  );
  res.status(200).json(complaint);
}

async function del(req: Request, res: Response, next: NextFunction): Promise<void> {
  const complaint = await complaintService.del(req.user, req.params.complaintId as string);
  res.status(200).send({ message: '정상적으로 삭제 처리되었습니다.' });
}

async function changeStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  requireUser(req.user);
  const complaint = await complaintService.changeStatus(
    req.user,
    req.params.complaintId as string,
    req.body.status
  );
  res.status(200).json(complaint);
}

export default {
  create,
  getList,
  get,
  patch,
  del,
  changeStatus
};
