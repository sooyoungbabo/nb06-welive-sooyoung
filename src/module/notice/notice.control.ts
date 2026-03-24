import { NextFunction, Request, Response } from 'express';
import noticeService from './notice.service';

async function create(req: Request, res: Response, next: NextFunction) {
  const notice = await noticeService.create(req.user.id, req.body);
  res.status(200).send({ message: '정상적으로 등록 처리되었습니다.' });
}

async function getList(req: Request, res: Response, next: NextFunction) {
  const query = req.query;
  const { notices, totalCount } = await noticeService.getList(req.user.id, query);
  res.status(200).json({ notices, totalCount });
}

async function get(req: Request, res: Response, next: NextFunction) {
  const noticeId = req.params.noticeId as string;
  const notice = await noticeService.get(req.user.id, noticeId);
  res.status(200).json(notice);
}

async function patch(req: Request, res: Response, next: NextFunction) {
  const noticeId = req.params.noticeId as string;
  const notice = await noticeService.patch(req.user.id, noticeId, req.body);
  res.status(200).json(notice);
}

async function del(req: Request, res: Response, next: NextFunction) {
  const noticeId = req.params.noticeId as string;
  const notice = await noticeService.del(req.user.id, noticeId);
  res.status(200).send({ message: '정상적으로 삭제 처리되었습니다.' });
}

export default {
  create,
  getList,
  get,
  patch,
  del
};
