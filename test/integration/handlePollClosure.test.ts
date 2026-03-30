import { handlePollClosure } from '../../src/module/pollScheduler/pollSchedular';
import { NoticeType, NotificationType, Poll, PollStatus, UserType } from '@prisma/client';
import prisma from '../../src/lib/prisma';
import {
  createMockData,
  createPoll,
  getPollsToClose,
  updatePoll
} from './handlePollClosure.createDB';

jest.mock('../../src/module/notification/notification.sse');
import { sendToUser } from '../../src/module/notification/notification.sse';
import { PollCreateRequestDto } from '../../src/module/poll/poll.dto';

const rawPolls: Omit<PollCreateRequestDto, 'boardId' | 'options'>[] = [
  {
    status: PollStatus.IN_PROGRESS,
    title: '투표0',
    content: '투표0 내용',
    buildingPermission: 0,
    startDate: new Date('2026-04-17 09:00:00'),
    endDate: new Date('2026-04-20 17:59:59')
  },
  {
    status: PollStatus.IN_PROGRESS,
    title: ' 투표1',
    content: '투표1 내용',
    buildingPermission: 0,
    startDate: new Date('2026-05-10 09:00:00'),
    endDate: new Date('2026-05-17 17:59:59')
  }
];

const updateData = {
  startDate: new Date('2026-03-20 09:00:00'),
  endDate: new Date('2026-03-25 17:59:59') // 시간을 과거로 update
};

let adminId: string;
let boardId: string;
let nReceivers: number;

describe('processPollClosure: 종료된 투표 처리', () => {
  beforeEach(async () => {
    ({ adminId, boardId } = await createMockData()); // no poll data in DB yet
    nReceivers = await prisma.user.count({ where: { role: UserType.USER } });

    jest.clearAllMocks();
    (sendToUser as jest.Mock).mockReset();
  });

  test('IN_PROGRESS → CLOSED 전환 시 공지/알림/SSE 생성)', async () => {
    const createdPoll = await createPoll(adminId, boardId, rawPolls[0]);
    const updatedPoll = await updatePoll(createdPoll.id, updateData);
    const closedPolls = await getPollsToClose();
    expect(closedPolls.length).toBe(1);
    await handlePollClosure(closedPolls);

    const poll = await prisma.poll.findFirstOrThrow({
      where: { status: PollStatus.CLOSED }
    });
    expect(poll.id).toEqual(updatedPoll.id);

    const notice = await prisma.notice.findFirstOrThrow({
      where: { pollId: poll.id }
    });
    expect(notice).toBeDefined();
    expect(notice.category).toEqual(NoticeType.RESIDENT_VOTE);

    const noti = await prisma.notification.findFirstOrThrow({
      where: { targetId: notice.id }
    });
    expect(noti).toBeDefined();
    expect(noti.notiType).toEqual(NotificationType.POLL_CLOSED);

    const notiCount = await prisma.notification.count({ where: { targetId: notice.id } });
    expect(notiCount).toEqual(nReceivers);

    expect(sendToUser).toHaveBeenCalledTimes(nReceivers);
  });

  test('IN_PROGRESS → CLOSED 전환되는 투표가 복수일 때도 각기 공지/알림/SSE 생성', async () => {
    let createdPolls = [];
    let updatedPolls = [];
    for (let i = 0; i < rawPolls.length; i++) {
      createdPolls[i] = await createPoll(adminId, boardId, rawPolls[i]);
      updatedPolls[i] = await updatePoll(createdPolls[i].id, updateData);
    }
    const closedPolls = await getPollsToClose();
    expect(closedPolls.length).toBe(2);
    await handlePollClosure(closedPolls);

    const polls = await prisma.poll.findMany({
      where: { status: PollStatus.CLOSED }
    });
    expect(polls).toHaveLength(updatedPolls.length);

    const updatedIds = updatedPolls.map((p) => p.id);

    for (const poll of polls) {
      expect(updatedIds).toContain(poll.id);

      const notice = await prisma.notice.findFirstOrThrow({
        where: { pollId: poll.id }
      });
      expect(notice).toBeDefined();
      expect(notice.category).toEqual(NoticeType.RESIDENT_VOTE);

      const noti = await prisma.notification.findFirstOrThrow({
        where: { targetId: notice.id }
      });
      expect(noti).toBeDefined();
      expect(noti.notiType).toEqual(NotificationType.POLL_CLOSED);

      const notiCount = await prisma.notification.count({
        where: { targetId: notice.id }
      });
      expect(notiCount).toEqual(nReceivers);
    }
    expect(sendToUser).toHaveBeenCalledTimes(nReceivers * polls.length);
  });

  test('CLOSED만 있으면 아무 일도 안 일어남', async () => {
    const createdPoll = await createPoll(adminId, boardId, rawPolls[0]);
    const updatedPoll = await updatePoll(createdPoll.id, {
      status: PollStatus.CLOSED,
      ...updateData
    });
    const closedPolls = await getPollsToClose();
    expect(closedPolls).toHaveLength(0);
    await handlePollClosure(closedPolls);

    expect(sendToUser).not.toHaveBeenCalled();
  });

  test('IN_PROGRESS만 있으면 아무 일도 안 일어남', async () => {
    const pollCreated = await createPoll(adminId, boardId, rawPolls[1]); // upcoming poll 생성
    const closedPolls = await getPollsToClose();
    expect(closedPolls).toHaveLength(0);
    await handlePollClosure(closedPolls);

    expect(sendToUser).not.toHaveBeenCalled();
  });
});
