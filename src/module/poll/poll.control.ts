import { NextFunction, Request, Response } from 'express';
import pollService from './poll.service';
import { PollQuery } from './poll.dto';

async function create(req: Request, res: Response, next: NextFunction) {
  const poll = await pollService.create(req.user, req.body);
  res.status(201).send({ message: '정상적으로 등록처리되었습니다.' });
}

async function getList(req: Request, res: Response, next: NextFunction) {
  const query = req.query as PollQuery;
  const { polls, totalCount } = await pollService.getList(req.user, query);
  res.status(200).json({ polls, totalCount });
}

async function get(req: Request, res: Response, next: NextFunction) {
  const pollId = req.params.pollId as string;
  const poll = await pollService.get(req.user, pollId);
  res.status(200).json(poll);
}

async function patch(req: Request, res: Response, next: NextFunction) {
  const pollId = req.params.pollId as string;
  const poll = await pollService.patch(req.user, pollId, req.body);
  res.status(200).send({ message: '정상적으로 수정되었습니다.' });
}

async function del(req: Request, res: Response, next: NextFunction) {
  const pollId = req.params.pollId as string;
  const poll = await pollService.del(req.user, pollId);
  res.status(200).send({ message: '정상적으로 삭제처리되었습니다.' });
}

export default {
  create,
  getList,
  get,
  patch,
  del
};
