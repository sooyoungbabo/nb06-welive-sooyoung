import {
  BoardType,
  CommentType,
  EventType,
  Notice,
  NoticeType,
  NotificationType
} from '@prisma/client';
import BadRequestError from '../../middleware/errors/BadRequestError';
import { AuthUser } from '../../type/express';
import noticeRepo from './notice.repo';
import { buildPagination, buildWhere } from '../../lib/buildQuery';
import { getBoardIdByUserId } from '../../lib/utils';
import commentRepo from '../comment/comment.repo';
import userRepo from '../user/user.repo';
import NotFoundError from '../../middleware/errors/NotFoundError';
import ForbiddenError from '../../middleware/errors/ForbiddenError';
import { NODE_ENV } from '../../lib/constants';
import prisma from '../../lib/prisma';
import {
  NoticeCreateRequestDto,
  NoticeListResponseDto,
  NoticePatchRequestDto,
  NoticeQueryDto
} from './notice.dto';
import notificationRepo from '../notification/notification.repo';
import residentRepo from '../resident/resident.repo';
import { requireApartmentUser } from '../../lib/require';
import { sendToUser } from '../notification/sse.manager';
import eventRepo from '../event/event.repo';

async function create(user: AuthUser, body: NoticeCreateRequestDto) {
  const { category, isPinned, startDate, endDate, title, content, boardId } = body;
  if (endDate !== null && endDate < startDate)
    throw new BadRequestError('종료일은 시작일보다 이전일 수 없습니다.');

  const noticeData = {
    category,
    isPinned,
    startDate,
    endDate,
    title,
    content,
    board: { connect: { id: boardId } },
    admin: { connect: { id: user.id } }
  };

  // 알림 수신자 미리 준비
  requireApartmentUser(user);
  const receivers = await residentRepo.findMany(prisma, {
    where: { apartmentId: user.apartmentId, deletedAt: null, userId: { not: null } },
    select: { userId: true }
  });
  const userIds = receivers.map((r) => r.userId).filter((id): id is string => id !== null);

  // 트랜젝션: (1) Notice 생성 (2) Event 생성 (3) Notification 생성
  const notice = await prisma.$transaction(async (tx) => {
    // (1) 공지 생성
    const notice = await noticeRepo.create(tx, noticeData);

    // (2) 이벤트 생성: 날짜가 있는 공지 경우
    if (noticeData.startDate) {
      const eventData = {
        eventType: EventType.NOTICE,
        title: noticeData.title,
        startDate: noticeData.startDate,
        endDate: noticeData.endDate,
        notice: { connect: { id: notice.id } }
      };
      await eventRepo.create(tx, { data: eventData });
    }
    // (3) 알림 생성
    const notiData = {
      notiType: NotificationType.NOTICE,
      targetId: notice.id,
      content: notice.title
    };

    await Promise.all(
      userIds.map((id) =>
        notificationRepo.create(tx, { ...notiData, receiver: { connect: { id } } })
      )
    );
    return notice;
  });

  // 실시간 알림은 트랜젝션 밖에서
  for (const id of userIds) {
    sendToUser(id, notice.content);
  }
}

async function getList(user: AuthUser, query: NoticeQueryDto) {
  const params = buildQueryParams(query);
  const { skip, take } = buildPagination(params.pagination, {
    limitDefault: 11,
    limitMax: 100
  });
  const boardId = await getBoardIdByUserId(user.id, BoardType.NOTICE);
  const where = { ...buildWhere(params), boardId, deletedAt: null };

  const notices = await noticeRepo.findMany({
    where,
    include: { admin: { select: { name: true } } },
    orderBy: { createdAt: 'desc' }
  });
  const totalCount = await noticeRepo.count({ where: { boardId, deletedAt: null } });
  return { notices: await buildNoticeListRes(notices), totalCount };
}

async function get(user: AuthUser, noticeId: string) {
  const boardId = await getBoardIdByUserId(user.id, BoardType.NOTICE);
  const notice = await noticeRepo.update({
    where: { id: noticeId, deletedAt: null },
    data: { viewCount: { increment: 1 } }
  });
  if (!notice) throw new NotFoundError('공지 게시판이 존재하지 않습니다.');
  if (notice.boardId !== boardId) throw new ForbiddenError('보드 아이디가 틀립니다.'); // 권한 검증
  return buildNoticeDetailRes(notice);
}

async function patch(user: AuthUser, noticeId: string, body: NoticePatchRequestDto) {
  const { category, title, content, boardId, isPinned, startDate, endDate } = body;

  // 권한 검증
  const userBoardId = await getBoardIdByUserId(user.id, BoardType.NOTICE);
  const notice = await noticeRepo.find({
    where: { id: noticeId, deletedAt: null },
    select: { boardId: true }
  });
  if (!notice) throw new BadRequestError('해당 공지가 존재하지 않습니다.');
  if (userBoardId !== notice.boardId) throw new ForbiddenError();

  // req.body내 로직 검증
  if (boardId !== notice.boardId) throw new BadRequestError('boardId가 틀립니다.');
  if (endDate !== null && endDate < startDate)
    throw new BadRequestError('종료일은 시작일보다 이전일 수 없습니다.');

  const noticeData = {
    category,
    title,
    content,
    boardId,
    isPinned,
    startDate,
    endDate
  };

  const noticeUpdated = await noticeRepo.update({
    where: { id: noticeId },
    data: noticeData,
    include: { admin: { select: { name: true } } }
  });

  const formattedNotice: NoticeListResponseDto[] = await buildNoticeListRes([noticeUpdated]);
  return formattedNotice[0];
}

async function del(user: AuthUser, noticeId: string) {
  // 권한 검증
  const userBoardId = await getBoardIdByUserId(user.id, BoardType.NOTICE);
  const notice = await noticeRepo.find({
    where: { id: noticeId, deletedAt: null },
    select: { boardId: true }
  });
  if (!notice) throw new BadRequestError('해당 공지가 존재하지 않습니다.');
  if (userBoardId !== notice.boardId) throw new ForbiddenError();

  if (NODE_ENV === 'development') await noticeRepo.del({ where: { id: noticeId } });
  else await noticeRepo.update({ where: { id: noticeId }, data: { deletedAt: new Date() } });
}

//--------------------------------------------------- 지역함수
function buildQueryParams(query: NoticeQueryDto) {
  const { page, limit, keyword } = query;

  const category =
    query.category === undefined || query.category === ''
      ? undefined
      : (query.category as NoticeType);

  return {
    pagination: { page, limit },
    exactFilters: { category },
    searchKey: { keyword, fields: ['title', 'content'] }
  };
}

type NoticeWithAdminName = Notice & { admin: { name: string } };

async function buildNoticeListRes(
  notices: NoticeWithAdminName[]
): Promise<NoticeListResponseDto[]> {
  return Promise.all(
    notices.map(async (n) => {
      const comments = await commentRepo.findMany({
        where: { targetId: n.id, targetType: CommentType.NOTICE }
      });
      return {
        noticeId: n.id,
        userId: n.adminId,
        category: n.category,
        title: n.title,
        writerName: n.admin.name,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
        viewsCount: n.viewCount,
        commentsCount: comments.length,
        isPinned: n.isPinned
      };
    })
  );
}

async function buildNoticeDetailRes(notice: Notice) {
  const admin = await userRepo.find({ where: { id: notice.adminId }, select: { name: true } });
  if (!admin) throw new NotFoundError('관리자가 존재하지 않습니다.');
  const comments = await commentRepo.findMany({
    where: { targetId: notice.id, targetType: CommentType.NOTICE },
    include: { creator: { select: { name: true } } }
  });
  const formattedComments = comments.map((c) => {
    return {
      id: c.id,
      userId: c.creatorId,
      content: c.content,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      writerName: c.creator.name
    };
  });
  return {
    noticeId: notice.id,
    userId: notice.adminId,
    category: notice.category,
    title: notice.title,
    writerName: admin.name,
    createdAt: notice.createdAt,
    updatedAt: notice.updatedAt,
    viewsCount: notice.viewCount,
    commentsCount: comments.length,
    isPinned: notice.isPinned,
    content: notice.content,
    boardName: '공지사항',
    comments: formattedComments
  };
}

export default {
  create,
  getList,
  get,
  patch,
  del
};
