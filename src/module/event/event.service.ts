import prisma from '../../lib/prisma';
import dayjs from 'dayjs';
import { Event, EventType, NoticeType } from '@prisma/client';
import { EventQueryDto, EventUpsertRequestDto } from './event.dto';
import { NODE_ENV } from '../../lib/constants';
import { getAptInfoByUserId } from '../../lib/utils';
import ForbiddenError from '../../middleware/errors/ForbiddenError';
import pollRepo from '../poll/poll.repo';
import noticeRepo from '../notice/notice.repo';
import eventRepo from './event.repo';
import NotFoundError from '../../middleware/errors/NotFoundError';

async function getList(userId: string, query: EventQueryDto) {
  const { apartmentId } = await getAptInfoByUserId(userId);
  if (apartmentId !== query.apartmentId) throw new ForbiddenError(); // 권한: 같은 아파트

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

// 이벤트는 파생 테이블이라서, 여기서 수정/삭제하는 건 바람직하지 않음
// 일단 API는 만들겠음.
async function put(userId: string, body: EventUpsertRequestDto) {
  const { pollBoardId, noticeBoardId } = await getAptInfoByUserId(userId);
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
  if (!item) throw new NotFoundError('원 게시물이 존재하지 않거나 타입이 바르지 않습니다.');
  if (item.boardId !== (eventType === EventType.NOTICE ? noticeBoardId : pollBoardId))
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
    where: eventType === EventType.POLL ? { pollId: targetId } : { noticeId: targetId },
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

// 이벤트 삭제
// 개발환경에서는 공지/투표도 삭제, 배포환경에서는 soft delete
async function del(userId: string, eventId: string) {
  const { apartmentId, pollBoardId, noticeBoardId } = await getAptInfoByUserId(userId);

  // 권한 검증: 같은 아파트의 이벤트인지
  const event = await eventRepo.find({
    where: { id: eventId },
    select: {
      eventType: true,
      poll: { select: { boardId: true } },
      notice: { select: { boardId: true } }
    }
  });
  if (!event) throw new NotFoundError('존재하지 않는 이벤트입니다.');
  if (event.eventType === EventType.NOTICE)
    if (!event.notice || event.notice.boardId !== noticeBoardId) throw new ForbiddenError();
  if (event.eventType === EventType.POLL)
    if (!event.poll || event.poll.boardId !== pollBoardId) throw new ForbiddenError();

  // 트랜젝션: (1) 이벤트 삭제 (2) 공지/투표 삭제
  const eventDeleted = await prisma.$transaction(async (tx) => {
    // 이벤트 삭제
    const event = await eventRepo.del(tx, { where: { id: eventId } });
    // 공지/투표 삭제:  개발단계에서는 hard delete, 배포시엔 soft delete
    if (NODE_ENV === 'development') {
      event.eventType === EventType.POLL
        ? await pollRepo.del(tx, { where: { id: event.pollId! } })
        : await noticeRepo.del(tx, { where: { id: event.noticeId! } });
    } else {
      event.eventType === EventType.POLL
        ? await pollRepo.patch(tx, {
            where: { id: event.pollId! },
            data: { deletedAt: new Date() }
          })
        : await noticeRepo.update(tx, {
            where: { id: event.noticeId! },
            data: { deletedAt: new Date() }
          });
    }
    return event;
  });
  return buildEventDelRes(eventDeleted);
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
