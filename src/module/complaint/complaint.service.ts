import prisma from '../../lib/prisma';
import ForbiddenError from '../../middleware/errors/ForbiddenError';
import BadRequestError from '../../middleware/errors/BadRequestError';
import NotFoundError from '../../middleware/errors/NotFoundError';
import notificationRepo from '../notification/notification.repo';
import userRepo from '../user/user.repo';
import complaintRepo from './complaint.repo';
import commentRepo from '../comment/comment.repo';
import residentRepo from '../resident/resident.repo';
import notiService from '../notification/notification.service';
import { assert } from 'node:console';
import { CreateNotification } from '../notification/notification.struct';
import { sendToUser } from '../notification/sse.manager';
import { buildPagination, buildWhere } from '../../lib/buildQuery';
import { getAptInfoByUserId } from '../../lib/utils';
import { NODE_ENV } from '../../lib/constants';
import {
  CommentResDto,
  ComplaintCreateRequestDto,
  ComplaintDetailResDto,
  ComplaintListResDto,
  ComplaintPatchRequestDto,
  ComplaintPatchResDto,
  ComplaintQueryDto
} from './complaint.dto';
import {
  BoardType,
  Complaint,
  Prisma,
  Comment,
  CommentType,
  ComplaintStatus,
  NotificationType
} from '@prisma/client';

// 민원 등록
async function create(userId: string, data: ComplaintCreateRequestDto) {
  console.log(userId);
  const { adminId, complaintBoardId: boardId } = await getAptInfoByUserId(userId);
  if (boardId !== data.boardId) throw new BadRequestError('boardId가 틀립니다.');

  const complaintData = {
    title: data.title,
    content: data.content,
    isPublic: data.isPublic,
    status: data.status,
    creator: { connect: { id: userId } },
    board: { connect: { id: data.boardId } },
    admin: { connect: { id: adminId } }
  };

  // DB 생성: 트랜젝션 (1) 민원등록 (2) 알림생성
  const complaint = await prisma.$transaction(async (tx) => {
    // (1) 민원등록
    const complaint = await complaintRepo.create(tx, {
      data: complaintData,
      include: { creator: { select: { name: true } } }
    });
    // (2) 알림생성
    const notiData = {
      notiType: NotificationType.COMPLAINT_RAISED,
      targetId: complaint.id,
      content: `[알림] 민원접수 (${complaint.creator.name}님, ${complaint.title})`
    };
    assert(notiData, CreateNotification);
    await notificationRepo.create(tx, {
      data: { ...notiData, receiver: { connect: { id: adminId } } }
    });
    return complaint;
  });

  // SSE to admin
  sendToUser(adminId, `[알림] 민원접수 (${complaint.creator.name}님, ${complaint.title})`);

  return complaint;
}

// 전체 민원 조회
async function getList(
  userId: string,
  query: ComplaintQueryDto
): Promise<{ complaints: ComplaintListResDto[]; totalCount: number }> {
  const queryParams = buildQueryParams(query);
  const { skip, take } = buildPagination(queryParams.pagination, {
    limitDefault: 20,
    limitMax: 100
  });

  const { adminId, complaintBoardId: boardId } = await getAptInfoByUserId(userId);

  let where: Prisma.ComplaintWhereInput = buildWhere({
    searchKey: queryParams.searchKey,
    exactFilters: { ...queryParams.exactFilters, boardId }
  });

  //filters: dong, ho  // 관계형 필드 추가
  const { apartmentDong, apartmentHo } = queryParams.filters ?? {};
  if (apartmentDong || apartmentHo) {
    where = {
      ...where,
      creator: {
        resident: {
          apartmentDong: apartmentDong ?? undefined,
          apartmentHo: apartmentHo ?? undefined
        }
      }
    };
  }

  const totalCount = await complaintRepo.count({ where });
  const rawComplaints = await complaintRepo.findMany({
    where,
    skip,
    take,
    orderBy: { createdAt: 'desc' }
  });

  return { complaints: await buildComplaintListRes(rawComplaints), totalCount };
}

// 민원 상세 조회
async function get(userId: string, complaintId: string): Promise<ComplaintDetailResDto> {
  const { adminId, complaintBoardId: userBoardId } = await getAptInfoByUserId(userId);
  const complaint = await complaintRepo.find({
    where: { id: complaintId },
    select: { creatorId: true, boardId: true, isPublic: true }
  });
  if (!complaint) throw new NotFoundError('존재하지 않는 민원입니다.');
  if (complaint.boardId !== userBoardId) throw new ForbiddenError(); // 권한
  if (userId !== adminId && complaint.isPublic === false)
    if (userId != complaint.creatorId) throw new ForbiddenError('비공개 민원입니다.');

  // viewCount 1 증가하고 상세 조회 내려줌
  const complaintUpdated = await complaintRepo.patch(prisma, {
    where: { id: complaintId },
    data: { viewCount: { increment: 1 } },
    include: {
      creator: {
        select: {
          resident: {
            select: { name: true, apartmentDong: true, apartmentHo: true }
          }
        }
      }
    }
  });

  const comments = await commentRepo.findMany({
    where: { targetId: complaintId, targetType: CommentType.COMPLAINT }
  });
  return buildComplaintRes(complaintUpdated, comments);
}

// 일반 유저 민원 수정: 유저, 관리자
async function patch(
  userId: string,
  complaintId: string,
  body: ComplaintPatchRequestDto
): Promise<ComplaintPatchResDto> {
  const { adminId, complaintBoardId: userBoardId } = await getAptInfoByUserId(userId);
  const complaint = await complaintRepo.find({
    where: { id: complaintId },
    select: { boardId: true, status: true, creatorId: true }
  });
  if (!complaint) throw new NotFoundError('존재하지 않는 민원입니다.');
  if (complaint.boardId !== userBoardId) throw new ForbiddenError(); // 권한
  if (userId !== adminId && userId !== complaint.creatorId)
    throw new ForbiddenError('본인이 작성한 민원만 수정할 수 있습니다.');
  if (complaint.status !== ComplaintStatus.PENDING)
    throw new BadRequestError('처리 중이거나 처리 완료된 민원은 수정할 수 없습니다.');

  const complaintUpdated = await complaintRepo.patch(prisma, {
    where: { id: complaintId },
    data: { ...body },
    include: {
      creator: {
        select: {
          resident: {
            select: { name: true, apartmentDong: true, apartmentHo: true }
          }
        }
      }
    }
  });

  const comments = await commentRepo.findMany({
    where: { targetId: complaintUpdated.id, targetType: CommentType.COMPLAINT }
  });

  const { writerName, ...rest } = await buildComplaintRes(complaintUpdated, comments);
  return rest;
}

// 민원 삭제: 개발환경에서는 삭제, 배포환경에서는 soft delete
async function del(userId: string, complaintId: string): Promise<void> {
  const { adminId, complaintBoardId: userBoardId } = await getAptInfoByUserId(userId);
  const complaint = await complaintRepo.find({
    where: { id: complaintId },
    select: { boardId: true, status: true, creatorId: true }
  });
  if (!complaint) throw new NotFoundError('존재하지 않는 민원입니다.');
  if (complaint.boardId !== userBoardId) throw new ForbiddenError(); // 권한
  if (userId !== adminId && userId !== complaint.creatorId)
    throw new ForbiddenError('본인이 작성한 민원만 삭제할 수 있습니다.');

  if (NODE_ENV === 'development') await complaintRepo.del({ where: { id: complaintId } });
  else
    await complaintRepo.patch(prisma, {
      where: { id: complaintId },
      data: { deletedAt: new Date() }
    });
}

// 관리자 이상 민원 수정 : 상태 변경
async function changeStatus(
  userId: string,
  complaintId: string,
  status: ComplaintStatus
): Promise<ComplaintDetailResDto> {
  const { adminId, complaintBoardId: userBoardId } = await getAptInfoByUserId(userId);
  const complaint = await complaintRepo.find({
    where: { id: complaintId },
    select: { boardId: true, status: true, creatorId: true }
  });
  if (!complaint) throw new NotFoundError('존재하지 않는 민원입니다.');
  if (complaint.boardId !== userBoardId) throw new ForbiddenError(); // admin 권한
  if (userId !== adminId && userId !== complaint.creatorId)
    throw new ForbiddenError('본인이 작성한 민원만 수정할 수 있습니다.'); // user 권한

  // DB 트랜젝션: (1) Complaint 상태 변경 (2) 알림
  const complaintPatched = await prisma.$transaction(async (tx) => {
    // complaint 상태 변경
    const complaint = await complaintRepo.patch(tx, {
      where: { id: complaintId },
      data: { status },
      include: {
        creator: {
          select: {
            resident: {
              select: { name: true, apartmentDong: true, apartmentHo: true }
            }
          }
        }
      }
    });
    if (!complaint.creator.resident)
      throw new NotFoundError('민원 작성자가 입주민 명부에 없습니다.');
    // (2) DB 알림 생성
    const notiData = {
      notiType: NotificationType.AUTH_USER_APPLIED,
      targetId: complaintId,
      content: `[알림] ${complaint.creator.resident.name}님 민원종결`
    };
    assert(notiData, CreateNotification);
    const noti = await notiService.notify(complaint.creatorId, notiData);
    return complaint;
  });

  // SSE to 민원 작성자
  if (!complaintPatched.creator.resident)
    throw new NotFoundError('민원 작성자가 입주민 명부에 없습니다.');
  sendToUser(complaint.creatorId, `[알림] ${complaintPatched.creator.resident.name}님 민원종결`);

  // 데이터 가공 후 리턴
  const comments = await commentRepo.findMany({
    where: { targetId: complaintId, targetType: CommentType.COMPLAINT }
  });
  return buildComplaintRes(complaintPatched, comments);
}

//------------------------------------------
function buildQueryParams(query: ComplaintQueryDto) {
  const { page, limit } = query;
  const { dong, ho } = query;
  const { keyword } = query;

  const status =
    query.status === undefined || query.status === ''
      ? undefined
      : (query.status as ComplaintStatus);

  const isPublic = query.isPublic === undefined ? undefined : query.isPublic === 'true';

  return {
    pagination: { page, limit },
    searchKey: { keyword, fields: ['title', 'content'] },
    filters: { apartmentDong: dong, apartmentHo: ho },
    exactFilters: { status, isPublic }
  };
}

type ComplaintWithResidentInfo = Complaint & {
  creator: {
    resident: {
      name: string;
      apartmentDong: string;
      apartmentHo: string;
    } | null;
  };
};

async function buildComplaintRes(
  complaint: ComplaintWithResidentInfo,
  comments: Prisma.CommentGetPayload<Prisma.CommentFindManyArgs>[]
): Promise<ComplaintDetailResDto> {
  if (!complaint.creator.resident) throw new NotFoundError();
  return {
    complaintId: complaint.id,
    userId: complaint.creatorId,
    title: complaint.title,
    writerName: complaint.creator.resident.name,
    createdAt: complaint.createdAt,
    updatedAt: complaint.updatedAt,
    isPublic: complaint.isPublic,
    viewsCount: complaint.viewCount,
    commentsCount: comments.length,
    status: complaint.status,
    dong: complaint.creator.resident.apartmentDong,
    ho: complaint.creator.resident.apartmentHo,
    content: complaint.content,
    boardType: BoardType.COMPLAINT,
    comments: await buildCommentRes(comments)
  };
}

async function buildCommentRes(comments: Comment[]): Promise<CommentResDto[]> {
  return Promise.all(
    comments.map(async (c) => {
      const writer = await userRepo.find({ where: { id: c.creatorId } });
      if (!writer) throw new NotFoundError('댓글 작성 사용자가 존재하지 않습니다.');

      return {
        id: c.id,
        userId: c.creatorId,
        content: c.content,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        writerName: writer.name
      };
    })
  );
}

async function buildComplaintListRes(complaints: Complaint[]): Promise<ComplaintListResDto[]> {
  return Promise.all(
    complaints.map(async (c) => {
      const writer = await residentRepo.find(prisma, {
        where: { userId: c.creatorId }
      });
      if (!writer) throw new NotFoundError('댓글 작성 입주민이 존재하지 않습니다.');

      const commentsCount = await commentRepo.count({
        where: { targetId: c.id }
      });

      return {
        complaintId: c.id,
        userId: c.creatorId,
        title: c.title,
        writerName: writer.name,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        isPublic: c.isPublic,
        viewsCount: c.viewCount,
        commentsCount,
        status: c.status,
        dong: writer.apartmentDong,
        ho: writer.apartmentHo
      };
    })
  );
}

export default {
  create,
  getList,
  get,
  patch,
  del,
  changeStatus
};
