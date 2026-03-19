import { NextFunction, Request, Response } from 'express';
import complaintService from './complaint.service';
import { assert } from 'node:console';
import { CreateComplaint, PatchComplaint } from './complaint.struct';
import { ComplaintQueryDto } from './complaint.dto';

async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  assert(req.body, CreateComplaint);
  const complaint = await complaintService.create(req.user.id, req.body);
  res.status(201).send({ message: '정상적으로 등록 처리되었습니다.' });
}

async function getList(req: Request, res: Response, next: NextFunction): Promise<void> {
  const query = req.query as ComplaintQueryDto;
  const { complaints, totalCount } = await complaintService.getList(req.user.id, query);
  res.status(200).json({ complaints, count: complaints.length, totalCount });
}

async function get(req: Request, res: Response, next: NextFunction): Promise<void> {
  const complaint = await complaintService.get(req.user.id, req.params.complaintId as string);
  res.status(200).json(complaint);
}

async function patch(req: Request, res: Response, next: NextFunction): Promise<void> {
  assert(req.body, PatchComplaint);
  const complaint = await complaintService.patch(req.user.id, req.params.complaintId as string, req.body);
  res.status(200).json(complaint);
}

async function del(req: Request, res: Response, next: NextFunction): Promise<void> {
  const complaint = await complaintService.del(req.user.id, req.params.complaintId as string);
  res.status(200).send({ message: '정상적으로 삭제 처리되었습니다.' });
}

async function changeStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  const complaint = await complaintService.changeStatus(
    req.user.id,
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
