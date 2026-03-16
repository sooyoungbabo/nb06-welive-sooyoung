import { EventQueryDto, EventUpsertRequestDto } from './event.dto';
import eventRepo from './event.repo';
import prisma from '../../lib/prisma';
import { BoardType, Event, EventType, NoticeType } from '@prisma/client';
import { AuthUser } from '../../type/express';
import pollRepo from '../poll/poll.repo';
import noticeRepo from '../notice/notice.repo';
import NotFoundError from '../../middleware/errors/NotFoundError';
import { getAptIdByUserId, getBoardIdByUserId } from '../../lib/utils';
import ForbiddenError from '../../middleware/errors/ForbiddenError';
import dayjs from 'dayjs';

async function getList(user: AuthUser, query: EventQueryDto) {
  const apartmentId = await getAptIdByUserId(user.id);
  if (apartmentId !== query.apartmentId) throw new ForbiddenError();

  const start = dayjs(`${query.year}-${query.month}-01`).startOf('month');
  const end = start.endOf('month');

  const where = {
    startDate: { lte: end.toDate() },
    endDate: { gte: start.toDate() },
    OR: [
      { notice: { board: { apartmentId: query.apartmentId } } },
      { poll: { board: { apartmentId: query.apartmentId } } }
    ]
  };
  const include = { notice: { select: { category: true } } };

  const events = await eventRepo.findMany(prisma, { where, include });
  return buildEventListRes(events);
}

async function put(user: AuthUser, body: EventUpsertRequestDto) {
  const { boardType: eventType, boardId: targetId, startDate, endDate } = body;
  // boardType: eventType
  // boardId: pollId or noticeId
  const item =
    eventType === EventType.POLL
      ? await pollRepo.find({
          where: { id: targetId },
          select: { boardId: true, title: true }
        })
      : await noticeRepo.find({
          where: { id: targetId },
          select: { title: true, boardId: true }
        });
  if (!item)
    throw new NotFoundError('해당 이벤트의 원 공지/투표 정보가 없습니다.');
  if (
    item.boardId !== (await getBoardIdByUserId(user.id, eventType as BoardType))
  )
    throw new ForbiddenError(); // 권한 검증 (같은 아파트 소속인지)

  const updateData = {
    title: item.title,
    startDate,
    endDate
  };
  const createData = {
    pollId: eventType === EventType.POLL ? targetId : null,
    noticeId: eventType === EventType.NOTICE ? targetId : null,
    eventType: eventType,
    ...updateData
  };

  const eventArgs = {
    where:
      eventType === EventType.POLL
        ? { pollId: targetId }
        : { noticeId: targetId },
    create: createData,
    update: updateData
  };

  // upsert이지만, targetId를 요구하므로, update만 수행하게 됨
  // 따라서 트랜젝션: (1) Notice/Poll update (2) Event upsert
  const event = await prisma.$transaction(async (tx) => {
    // (1) Notice/Poll update
    if (eventType === EventType.NOTICE) {
      await noticeRepo.update(tx, {
        where: { id: targetId },
        data: { startDate, endDate }
      });
    } else {
      await pollRepo.patch(tx, {
        where: { id: targetId },
        data: { startDate, endDate }
      });
    }
    // (2) Event upsert
    const event = await eventRepo.upsert(tx, eventArgs);
    return event;
  });

  return buildEventUpsertRes(event);
}

async function del(user: AuthUser, eventId: string) {
  // 권한 검증: 같은 아파트의 이벤트인지
  let event = await eventRepo.find({
    where: { id: eventId },
    select: { eventType: true, pollId: true, noticeId: true }
  });
  if (!event) throw new NotFoundError('존재하지 않는 이벤트입니다.');
  const item =
    event.eventType === EventType.POLL
      ? await pollRepo.find({
          where: { id: event.pollId! },
          select: { boardId: true }
        })
      : await noticeRepo.find({
          where: { id: event.noticeId! },
          select: { boardId: true }
        });

  if (!item)
    throw new NotFoundError('이벤트와 연계된 공지나 투표 기록이 없습니다.');
  if (
    item.boardId !==
    (await getBoardIdByUserId(user.id, event.eventType as BoardType))
  )
    throw new ForbiddenError();

  // Event엔 soft delete 없음. 파생적 모델이라 언제든 원래 모델에서 가져올 수 있기 때문
  event = await eventRepo.del({ where: { id: eventId } });
  return buildEventDelRes(event);
}

//----------------------------------------------------- 지역함수
type EventWithNotice = Event & { notice: { category: NoticeType } | null };

function buildEventListRes(events: EventWithNotice[]) {
  return events.map((e) => {
    return {
      id: e.id,
      start: e.startDate,
      end: e.endDate,
      title: e.title,
      category: e.notice ? e.notice.category : 'RESIDENCE_VOTE',
      type: e.eventType,
      targetId: e.notice ? e.noticeId : e.pollId
    };
  });
}

function buildEventUpsertRes(event: Event) {
  return {
    id: event.id,
    start: event.startDate,
    end: event.endDate,
    title: event.title,
    type: event.eventType,
    targetId: event.eventType === 'NOTICE' ? event.noticeId : event.pollId
  };
}

function buildEventDelRes(event: Event) {
  return {
    id: event.id,
    startDate: event.startDate,
    endDate: event.endDate,
    boardType: event.eventType,
    noticeId: event.noticeId,
    pollId: event.pollId
  };
}

export default {
  getList,
  put,
  del
};
