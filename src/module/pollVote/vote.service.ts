import prisma from '../../lib/prisma';
import NotFoundError from '../../middleware/errors/NotFoundError';
import pollRepo from '../poll/poll.repo';
import voteRepo from './vote.repo';
import BadRequestError from '../../middleware/errors/BadRequestError';
import { VoteOptionDto, VoteResDto } from '../poll/poll.dto';

async function vote(voterId: string, optionId: string) {
  const poll = await pollRepo.findFirst({
    where: { pollOptions: { some: { id: optionId } } }
  });
  if (!poll) throw new NotFoundError('해당 선택지를 갖는 투표가 없습니다.');
  if (poll.startDate > new Date()) throw new BadRequestError('아직 투표시작 전입니다.');
  if (poll.endDate <= new Date()) throw new BadRequestError('종료된 투표입니다.');

  const voteData = {
    poll: { connect: { id: poll.id } },
    options: { connect: { id: optionId } },
    voter: { connect: { id: voterId } }
  };
  const vote = await voteRepo.create({ data: voteData });
  return buildVoteRes(poll.id, vote.optionId);
}

async function cancelVote(voterId: string, optionId: string) {
  const option = await prisma.pollOption.findFirst({
    where: { id: optionId },
    select: { pollId: true }
  });
  if (!option) throw new NotFoundError('해당 선택지를 갖는 투표가 존재하지 않습니다.');
  const poll = await pollRepo.find({ where: { id: option.pollId } });
  if (!poll) throw new NotFoundError('해당 투표가 존재하지 않습니다.');
  if (poll.endDate <= new Date()) throw new BadRequestError('종료된 투표입니다.');

  await voteRepo.deleteMany({ where: { voterId, pollId: option.pollId } });
  return await buildCancelVoteRes(option.pollId, optionId);
}

async function buildCancelVoteRes(pollId: string, voteOptionId: string) {
  const option = await prisma.pollOption.findFirst({
    where: { id: voteOptionId },
    include: { votes: true }
  });
  if (!option) throw new NotFoundError('취소한 선택지가 존재햐지 않습니다.');
  option.voteCount = option.votes.length;

  return {
    message: '취소한 선택지 집계 현황',
    updatedOption: {
      id: option.id,
      title: option.title,
      votes: option.voteCount
    }
  };
}
//------------------------------------------
// 공동 1위를 가정한 집계
// { sum: 37, max: 12, winnerOption: PollOption[]}
async function buildVoteRes(pollId: string, voteOptionId: string): Promise<VoteResDto> {
  // pollOptions와 votes를 가져와서, 집계하고, DB에 저장
  const pollOptions = await prisma.pollOption.findMany({
    where: { pollId },
    include: { votes: true }
  });
  pollOptions.map((o) => (o.voteCount = o.votes.length)); // 집계
  await Promise.all(
    pollOptions.map((o) =>
      prisma.pollOption.update({
        where: { id: o.id },
        data: { voteCount: o.voteCount }
      })
    )
  );

  // 실시간 투표 결과 계산
  const result = pollOptions.reduce(
    (acc, cur, idx) => {
      acc.sum += cur.voteCount;

      if (cur.voteCount > acc.max) {
        acc.max = cur.voteCount;
        acc.winnerIdx = [idx];
        acc.winnerTitle = [cur.title];
      } else if (cur.voteCount === acc.max) {
        acc.winnerIdx.push(idx);
        acc.winnerTitle.push(cur.title);
      }
      return acc;
    },
    { sum: 0, max: -Infinity, winnerTitle: [] as string[], winnerIdx: [] as number[] }
  );

  // 출력 포맷에 맞추어 데이터 가공
  const votedOption = pollOptions.find((po) => po.id === voteOptionId);
  if (!votedOption) throw new NotFoundError('투표한 선택지가 없습니다.');
  const updatedOption: VoteOptionDto = {
    id: votedOption.id,
    title: votedOption.title,
    votes: votedOption.voteCount
  };

  const message =
    result.winnerTitle.length > 1
      ? `실시간 공동 1위: ${result.winnerIdx.map((w) => pollOptions[w].title).join(', ')}`
      : `실시간 1위: ${pollOptions[result.winnerIdx[0]].title}`;

  const winnerOption: VoteOptionDto = {
    id: pollOptions[result.winnerIdx[0]].id,
    title: pollOptions[result.winnerIdx[0]].title,
    votes: pollOptions[result.winnerIdx[0]].voteCount
  };

  const options = pollOptions.map((o) => ({
    id: o.id,
    title: o.title,
    votes: o.voteCount
  }));

  return {
    message,
    updatedOption,
    winnerOption,
    options
  };
}

export default {
  vote,
  cancelVote
};
