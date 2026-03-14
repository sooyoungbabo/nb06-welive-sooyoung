import express from 'express';
import voteControl from './vote.control';
import { UserType } from '@prisma/client';
import { validateParams } from '../../middleware/validateReq';
import authenticate from '../../middleware/authenticate';
import authorize from '../../middleware/authorize';
import { voteParams } from './vote.schema';

const voteRouter = express.Router();

// 투표하기
voteRouter.post(
  '/:optionId/vote',
  authenticate(),
  authorize(UserType.USER),
  validateParams(voteParams),
  voteControl.vote
);
// 투표 취소
voteRouter.delete(
  '/:optionId/vote',
  authenticate(),
  authorize(UserType.USER),
  validateParams(voteParams),
  voteControl.cancelVote
);

export default voteRouter;
