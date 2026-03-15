import { CronJob } from 'cron';
import prisma from '../../lib/prisma';
import { NoticeType, NotificationType, Poll, PollStatus } from '@prisma/client';
import residentRepo from '../resident/resident.repo';
import notiRepo from '../notification/notification.repo';
import pollRepo from '../poll/poll.repo';
import { sendToUser } from '../notification/sse.manager';
import noticeRepo from '../notice/notice.repo';
import { access } from 'node:fs';
import { cursorTo } from 'node:readline';

let lastRun: Date | null = null;

export function startPollScheduler() {
  //console.log('poll scheduler started', process.pid);
  const job = new CronJob('*/37 * * * * *', async () => {
    // const start = new Date();
    // console.log('tick start', start.toLocaleTimeString());
    await runPollScheduler();
    const end = new Date();
    // console.log('tick end', end.toLocaleTimeString(), 'duration', end.getTime() - start.getTime());
    lastRun = end;
  });

  job.start();
}

export function getSchedulerStatus() {
  return lastRun;
}

async function runPollScheduler() {
  const now = new Date();

  // 투표 시작되면 해당 투표 관련 공지가 없는 경우 voters에게 시작 알림 날림
  // const startingPolls = await getStartingPolls();
  // if (startingPolls.length > 0) await sendStartPollNoti(startingPolls);

  // 투표 종료되면 poll.status 변경하고, notice에 올리고, 전체 공지하고, SSE
  const closedPolls = await getClosedPolls();
  if (closedPolls.length > 0) await sendClosedPollNoti(closedPolls);
}

//---------------------------------------------
async function getClosedPolls() {
  return prisma.poll.findMany({
    where: {
      status: 'IN_PROGRESS',
      endDate: { lte: new Date() }
    }
  });
}

async function sendClosedPollNoti(polls: Poll[]) {
  for (const poll of polls) {
    const receivers = await residentRepo.findMany(prisma, {
      where: { userId: { not: null }, deletedAt: null },
      select: { userId: true }
    }); // Resident: receivers.userId

    /* 투표 종료 공지인 경우: (1)~(3)은 트랜젝션
          (1) DB Poll
          (2) DB Notice
          (3) DB Notification
          (4) SSE: Notice용 공기 (전체)
    */

    const target = poll.buildingPermission ? `${poll.buildingPermission}동` : '전체';
    const content = `[알림] 투표종료 (${poll.title}, ${target})`;

    await prisma.$transaction(async (tx) => {
      await pollRepo.patch(tx, {
        where: { id: poll.id },
        data: { status: PollStatus.CLOSED }
      });

      const pollResult = await getPollResult(poll.id);

      await noticeRepo.create(tx, {
        category: NoticeType.RESIDENT_VOTE,
        isPinned: true,
        startDate: poll.startDate,
        endDate: poll.endDate,
        title: `[공지] 투표종결 (${poll.title}, ${target})`,
        content: `걸과: ${pollResult.maxStr} (${pollResult.max} / ${pollResult.sum})`, // 투표 결과를 넣을 것
        board: { connect: { id: poll.boardId } },
        admin: { connect: { id: poll.adminId } }
      });

      await notiRepo.createMany(tx, {
        data: receivers
          .filter((r) => r.userId != null)
          .map((r) => ({
            receiverId: r.userId!,
            targetId: poll.id,
            notiType: NotificationType.POLL_CLOSED,
            content
          }))
      });
    });

    for (const r of receivers) {
      if (!r.userId) continue;
      sendToUser(r.userId, content);
    }
  }
  console.log('');
  console.log(new Date());
  console.log('Notification sent for poll closure');
  console.log('');
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
