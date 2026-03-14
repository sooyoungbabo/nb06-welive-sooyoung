import prisma from '../../lib/prisma';

// 공동 1위를 가정한 집계
// { sum: 37, max: 12, winners: ['C안', 'A안']}
async function getPollResult(pollId: string) {
  const pollOptions = await prisma.pollOption.findMany({ where: { pollId } });
  return pollOptions.reduce(
    (acc, cur) => {
      acc.sum += cur.voteCount;

      if (cur.voteCount > acc.max) {
        acc.max = cur.voteCount;
        acc.winners = [cur.title];
      } else if (cur.voteCount === acc.max) {
        acc.winners.push(cur.title);
      }

      return acc;
    },
    { sum: 0, max: -Infinity, winners: [] as string[] }
  );
}
