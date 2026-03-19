import { NextFunction, Request, Response } from 'express';
import commentService from './comment.service';

async function create(req: Request, res: Response, next: NextFunction) {
  const comment = await commentService.create(req.user.id, req.body);
  res.status(201).json(comment);
}

async function patch(req: Request, res: Response, next: NextFunction) {
  const commentId = req.params.commentId as string;
  const comment = await commentService.patch(req.user.id, commentId, req.body);
  res.status(200).json(comment);
}

async function del(req: Request, res: Response, next: NextFunction) {
  const commentId = req.params.commentId as string;
  await commentService.del(req.user.id, commentId);
  res.status(200).send({ message: '정상적으로 삭제 처리되었습니다.' });
}

export default {
  create,
  patch,
  del
};
