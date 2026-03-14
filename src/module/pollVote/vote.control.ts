import { NextFunction, Request, Response } from 'express';
import voteService from './vote.service';
import { requireUser } from '../../lib/require';

async function vote(req: Request, res: Response, next: NextFunction) {
  requireUser(req.user);
  const optionId = req.params.optionId as string;
  const response = await voteService.vote(req.user.id, optionId);
  res.status(200).json(response);
}

async function cancelVote(req: Request, res: Response, next: NextFunction) {
  requireUser(req.user);
  const optionId = req.params.optionId as string;
  const response = await voteService.cancelVote(req.user.id, optionId);
  res.status(200).json(response);
}

export default {
  vote,
  cancelVote
};
