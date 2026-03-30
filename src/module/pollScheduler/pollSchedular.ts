import { BoardType, NoticeType, Poll, PollStatus } from '@prisma/client';
import prisma from '../../lib/prisma';
import pollRepo from '../poll/poll.repo';
import noticeService from '../notice/notice.service';
import { noticeCreateBody } from '../notice/notice.schema';
import { assert } from 'superstruct';
import boardRepo from '../board/board.repo';
import NotFoundError from '../../middleware/errors/NotFoundError';

export async function getClosedPolls() {
  return prisma.poll.findMany({
    where: {
      status: PollStatus.IN_PROGRESS,
      endDate: { lte: new Date() }
    }
  });
}

export async function handlePollClosure(polls: Poll[]) {
  for (const poll of polls) {
    // 투표 상태 변경: 종료
    await pollRepo.patch(prisma, {
      where: { id: poll.id },
      data: { status: PollStatus.CLOSED }
    });

    console.log('');
    console.log(new Date());
    console.log(`poll closed: ${poll.title}`);
    console.log('');

    // 투료종료 공지 생성
    // 공지용 게시판 아이디 가져오기
    const pollBoard = await boardRepo.find({
      where: { id: poll.boardId },
      select: { apartmentId: true }
    });
    if (!pollBoard) throw new NotFoundError('투표 게시판을 찾을 수 없습니다.');
    const noticeBoard = await boardRepo.findFirst({
      where: { apartmentId: pollBoard.apartmentId, boardType: BoardType.NOTICE }
    });
    if (!noticeBoard) throw new NotFoundError('공지 게시판을 찾을 수 없습니다.');

    // 공지 서비스로 보낼 데이터 가공
    const result = await getPollResult(poll.id);
    const noticeBody = {
      category: NoticeType.RESIDENT_VOTE,
      title: `투표종료 (${poll.title})`,
      content: `[결과] ${result.maxStr} (${result.max}/${result.sum})`,
      boardId: noticeBoard.id,
      isPinned: true,
      startDate: poll.startDate,
      endDate: poll.endDate,
      pollId: poll.id
    };
    assert(noticeBody, noticeCreateBody);
    await noticeService.create(poll.adminId, noticeBody);
  }
}

async function getPollResult(pollId: string) {
  const pollOptions = await prisma.pollOption.findMany({ where: { pollId } });
  return pollOptions.reduce(
    (acc, cur) => {
      acc.sum += cur.voteCount;
      if (cur.voteCount > acc.max) {
        acc.max = cur.voteCount;
        acc.maxStr = cur.title;
      }
      return acc;
    },
    { sum: 0, max: -Infinity, maxStr: '' }
  );
}
