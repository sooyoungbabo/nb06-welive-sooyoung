import prisma from '../../lib/prisma';
import { NODE_ENV } from '../../lib/constants';
import { getAptInfoByUserId, getNotiReceivers } from '../../lib/utils';
import { buildPagination, buildWhere } from '../../lib/buildQuery';
import { sendToUser } from '../notification/notification.sse';
import notificationRepo from '../notification/notification.repo';
import noticeRepo from './notice.repo';
import commentRepo from '../comment/comment.repo';
import eventRepo from '../event/event.repo';
import NotFoundError from '../../middleware/errors/NotFoundError';
import ForbiddenError from '../../middleware/errors/ForbiddenError';
import BadRequestError from '../../middleware/errors/BadRequestError';
import {
  NoticeCreateRequestDto,
  NoticeListResponseDto,
  NoticePatchRequestDto,
  NoticeQueryDto
} from './notice.dto';
import {
  CommentType,
  EventType,
  Notice,
  NoticeType,
  NotificationType,
  Prisma,
  Resident
} from '@prisma/client';
import { EventPatchDto } from '../event/event.dto';

//----------------------------------------------- 공지 생성: 관리자
async function create(userId: string, body: NoticeCreateRequestDto) {
  const { apartmentId: adminAptId, noticeBoardId: userBoardId } =
    await getAptInfoByUserId(userId);
  const { category, isPinned, startDate, endDate, title, content, boardId, pollId } =
    body;

  // req.body validity 검증
  const isSameBoard = boardId === userBoardId;
  if (!isSameBoard) throw new BadRequestError('boardId가 틀립니다.');
  if (endDate !== null && endDate < startDate)
    throw new BadRequestError('종료일은 시작일보다 이전일 수 없습니다.');

  // 공지 데이터 준비
  const noticeData: Prisma.NoticeCreateInput = {
    category,
    isPinned,
    startDate,
    endDate,
    title: '[공지] ' + title,
    content,
    board: { connect: { id: boardId } },
    admin: { connect: { id: userId } },
    ...(pollId && { poll: { connect: { id: pollId } } })
  };

  // 이벤트 데이터 준비
  const eventData: Prisma.EventCreateInput = {
    eventType: EventType.NOTICE,
    title: '[공지] ' + title,
    startDate: startDate,
    endDate: endDate
  };

  // 알림 수신자 준비
  const receivers = await getNotiReceivers(adminAptId);
  const userIds = receivers
    .map((r) => r.userId)
    .filter((id): id is string => id !== null);

  // 알림 데이터 준비
  const notiData = {
    notiType: NotificationType.NOTICE,
    content: `[알림] ${category}: ${title}`
  };

  // 트랜젝션: (1) Notice 생성 (2) Event 생성 (3) Notification 생성
  const notice = await prisma.$transaction(async (tx) => {
    // 공지 생성
    const notice = await noticeRepo.create(tx, noticeData);

    // 이벤트 생성: 투표를 제외하고 날짜가 있는 공지
    // 투표는 생성 시 이벤트에 올라감
    if (noticeData.startDate && noticeData.category !== NoticeType.RESIDENT_VOTE) {
      await eventRepo.create(tx, {
        data: { ...eventData, notice: { connect: { id: notice.id } } }
      });
    }
    // 알림 생성
    await Promise.all(
      userIds.map((id) =>
        notificationRepo.create(tx, {
          data: {
            ...notiData,
            targetId: notice.id,
            receiver: { connect: { id } }
          }
        })
      )
    );
    return notice;
  });

  // SSE 알림은 트랜젝션 밖에서
  for (const id of userIds) {
    sendToUser(id, notiData.content);
  }
  return notice;
}

//----------------------------------------------- 공지목록 조회: 관리자, 입주민
async function getList(userId: string, query: NoticeQueryDto) {
  const { noticeBoardId: boardId } = await getAptInfoByUserId(userId);

  // where 쿼리 파라미터 구성
  const params = buildQueryParams(query);

  let whereTerms = [{ boardId, deletedAt: null }]; // 같은 아파트 공지만

  const queryWhere = buildWhere(params);
  if (!queryWhere) whereTerms.push(queryWhere);
  if (Object.keys(queryWhere).length > 0) whereTerms.push(queryWhere);

  const where = { AND: whereTerms };

  // 페이지네이션 파라미터
  const { skip, take } = buildPagination(params.pagination, {
    limitDefault: 11,
    limitMax: 100
  });

  // DB 조회
  const notices = await noticeRepo.findMany({
    where,
    skip,
    take,
    include: { admin: { select: { name: true } } }, // 출력에 필요한 정보 포함
    orderBy: { createdAt: 'desc' }
  });
  const totalCount = await noticeRepo.count({ where });
  return { notices: await buildNoticeListRes(notices), totalCount };
}

//----------------------------------------------- 공지 상세 조회: 관리자, 입주민
async function get(userId: string, noticeId: string) {
  const { noticeBoardId: userBoardId } = await getAptInfoByUserId(userId);

  const notice = await noticeRepo.update(prisma, {
    where: { id: noticeId, deletedAt: null },
    data: { viewCount: { increment: 1 } },
    include: { admin: { select: { id: true, name: true } } }
  });
  if (!notice) throw new NotFoundError('공지 게시판이 존재하지 않습니다.');

  const isSameBoard = userBoardId === notice.boardId;
  if (!isSameBoard) throw new ForbiddenError(); // 권한: 같은 아파트

  return buildNoticeDetailRes(notice);
}

//----------------------------------------------- 공지 수정: 같은 아파트 관리자 권한
// DB 트랜젝션: (1) 공지수정 (2) 이벤트 수정 (3) 알림
// (4) SSE
async function patch(userId: string, noticeId: string, body: NoticePatchRequestDto) {
  const { apartmentId: userAptId, noticeBoardId: userBoardId } =
    await getAptInfoByUserId(userId);

  const notice = await noticeRepo.find({
    where: { id: noticeId, deletedAt: null },
    select: { boardId: true }
  });
  if (!notice) throw new NotFoundError('공지를 찾을 수 없습니다.');

  // 권한 검증: 같은 공지보드(아파트)
  const isSameBoard = userBoardId === notice.boardId;
  if (!isSameBoard) {
    throw new ForbiddenError();
  }

  const { category, title, content, boardId, isPinned, startDate, endDate } = body;

  // 요청 검증
  if (userBoardId !== boardId) throw new BadRequestError('boardId가 틀립니다.');
  if (endDate !== null && endDate < startDate)
    throw new BadRequestError('종료일은 시작일보다 이전일 수 없습니다.');
  // if (startDate < new Date())
  //   throw new BadRequestError('이미 시작되었거나 종료된 일정 공지는 수정할 수 없습니다.');

  // 데이터 준비
  const noticeData = {
    category,
    title,
    content,
    boardId,
    isPinned,
    startDate,
    endDate
  };

  const eventData = {
    title,
    startDate,
    endDate
  };

  // 수신자 ID 목록 준비: 알림과 SSE용
  const receivers = await getNotiReceivers(userAptId);

  // 트랜젝션 (1) 공지 (2) 이벤트 (3) 알림 (날짜있는 공지 경우, 과거이면 X)
  const noticeUpdated = await noticePatchTransaction(
    noticeId,
    noticeData,
    eventData,
    receivers
  );

  // (4) SSE: 트랜젝션 바깥
  // 날짜가 없거나, 있는 경우 아직 종료되지 않은 경우만
  if (!startDate || endDate > new Date()) {
    for (const r of receivers) {
      if (!r.userId) continue;
      sendToUser(r.userId, `[알림] 공지수정 (${noticeUpdated.title})`);
    }
  }
  const formattedNotice: NoticeListResponseDto[] = await buildNoticeListRes([
    noticeUpdated
  ]);
  return formattedNotice[0];
}

async function noticePatchTransaction(
  noticeId: string,
  noticeData: NoticeCreateRequestDto,
  eventData: EventPatchDto,
  receivers: { userId: string }[]
) {
  return await prisma.$transaction(async (tx) => {
    // (1) 공지 수정
    const notice = await noticeRepo.update(tx, {
      where: { id: noticeId },
      data: noticeData,
      include: { admin: { select: { name: true } } }
    });

    // 공지 중 RESIDENT_VOTE는 투표종료에 대한 공지로 이벤트에 올라가지 않음
    // 투표는 IN_PROGRESS로 생성될 때 이벤트에 올라감

    if (notice.category !== NoticeType.RESIDENT_VOTE) {
      // (2) 이벤트 수정
      await eventRepo.update(tx, {
        where: { noticeId },
        data: eventData
      });
      // (3) 공지수정 알림
      // 날짜가 없거나, 있는 경우 아직 종료되지 않은 것만 알림
      if (!noticeData.startDate || noticeData.endDate > new Date()) {
        const message = `[알림] 공지수정 (${notice.title})`;
        const notiData = buildNotiData(receivers, noticeId, message);
        await notificationRepo.createMany(tx, { data: notiData });
      }
    }
    return notice;
  });
}

//----------------------------------------------- 공지 삭제: 같은 아파트의 관리자
// DB 트랜젝션: (1) 이벤트 삭제 (2) 공지 삭제
// 개발환경에서는 삭제, 배포환경에서는 soft delete

async function del(userId: string, noticeId: string) {
  const { noticeBoardId: userBoardId } = await getAptInfoByUserId(userId);

  const notice = await noticeRepo.find({
    where: { id: noticeId, deletedAt: null },
    select: { boardId: true, category: true }
  });
  if (!notice) throw new NotFoundError('공지를 찾을 수 없습니다.');

  // 권한 검증: 같은 공지 보드(아파트)
  const isSameBoard = userBoardId === notice.boardId;
  if (!isSameBoard) throw new ForbiddenError();

  // 요청 검증
  // if (notice.startDate && notice.startDate < new Date())
  //   throw new BadRequestError(
  //     '이미 시작되었거나 종료된 일정이 있는 공지는 삭제할 수 없습니다.'
  //   );

  // 트랜젝션 (1) 이벤트 (2) 공지
  // 개발환경에서는 삭제, 배포환경에서는 soft delete
  if (NODE_ENV === 'development')
    await prisma.$transaction(async (tx) => {
      if (notice.category !== NoticeType.RESIDENT_VOTE)
        await eventRepo.del(tx, { where: { noticeId } }); // 이벤트 삭제
      await noticeRepo.del(tx, { where: { id: noticeId } }); // 공지 삭제
    });
  else {
    await prisma.$transaction(async (tx) => {
      if (notice.category !== NoticeType.RESIDENT_VOTE)
        await eventRepo.del(tx, { where: { noticeId } }); // 이벤트는 soft delete 없음
      await noticeRepo.update(tx, {
        where: { id: noticeId },
        data: { deletedAt: new Date() }
      });
    });
  }
}

//----------------------------------------------- 지역함수
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

type NoticeWithAdmin = Notice & {
  admin: { id: string; name: string } | null;
};

async function buildNoticeDetailRes(notice: NoticeWithAdmin) {
  if (!notice.admin) throw new NotFoundError('관리자를 찾을 수 없습니다.');
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
    writerName: notice.admin.name,
    createdAt: notice.createdAt,
    updatedAt: notice.updatedAt,
    viewsCount: notice.viewCount,
    commentsCount: comments.length,
    isPinned: notice.isPinned,
    startDate: notice.startDate, // 개발용, 나중에 뺄 것. Dto도 수정
    endDate: notice.endDate, // 개발용, 나중에 뺄 것. Dto도 수정
    content: notice.content,
    boardName: '공지사항',
    comments: formattedComments
  };
}

type ReceiverIds = Pick<Resident, 'userId'>;

function buildNotiData(receivers: ReceiverIds[], noticeId: string, content: string) {
  return receivers
    .filter((r) => r.userId != null)
    .map((r) => ({
      receiverId: r.userId!,
      targetId: noticeId,
      notiType: NotificationType.NOTICE,
      content
    }));
}

export default {
  create,
  getList,
  get,
  patch,
  del
};
