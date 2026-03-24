import prisma from '../../lib/prisma';
import ForbiddenError from '../../middleware/errors/ForbiddenError';
import BadRequestError from '../../middleware/errors/BadRequestError';
import NotFoundError from '../../middleware/errors/NotFoundError';
import notificationRepo from '../notification/notification.repo';
import userRepo from '../user/user.repo';
import complaintRepo from './complaint.repo';
import commentRepo from '../comment/comment.repo';
import notiService from '../notification/notification.service';
import { assert } from 'node:console';
import { CreateNotification } from '../notification/notification.struct';
import { sendToUser } from '../notification/notification.sse';
import { buildPagination, buildWhere } from '../../lib/buildQuery';
import { getAptInfoByUserId, isSuperAdmin } from '../../lib/utils';
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

//----------------------------------------------------- 민원 등록
async function create(userId: string, body: ComplaintCreateRequestDto) {
  const { adminId, complaintBoardId } = await getAptInfoByUserId(userId);

  const isBoardIdCorrect = body.boardId === complaintBoardId;
  if (!isBoardIdCorrect) throw new BadRequestError('boardId가 틀립니다.');

  const complaintData = {
    title: body.title,
    content: body.content,
    isPublic: body.isPublic,
    status: body.status,
    creator: { connect: { id: userId } },
    board: { connect: { id: complaintBoardId } },
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
  sendToUser(
    adminId,
    `[알림] 민원접수 (${complaint.creator.name}님, ${complaint.title})`
  );

  return complaint;
}

//----------------------------------------------------- 전체 민원 조회
async function getList(
  userId: string,
  query: ComplaintQueryDto
): Promise<{ complaints: ComplaintListResDto[]; totalCount: number }> {
  const { complaintBoardId } = await getAptInfoByUserId(userId);

  // 쿼리 파라미터 구성
  let whereTerms: Prisma.ComplaintWhereInput[] = [
    {
      boardId: complaintBoardId, // 같은 아파트의 민원 보드로 한정
      deletedAt: null
    }
  ];
  const queryParams = buildQueryParams(query);
  const { skip, take } = buildPagination(queryParams.pagination, {
    limitDefault: 20,
    limitMax: 100
  });

  // query where
  const queryWhere = buildWhere({
    searchKey: queryParams.searchKey,
    exactFilters: queryParams.exactFilters
  });
  if (Object.keys(queryWhere).length > 0) whereTerms.push(queryWhere);

  //관계형 필터 조회 추가: filters - dong, ho
  let residentFilters: Prisma.ResidentWhereInput = {};
  const { apartmentDong, apartmentHo } = queryParams.filters ?? {};
  if (apartmentDong) residentFilters.apartmentDong = apartmentDong;
  if (apartmentHo) residentFilters.apartmentHo = apartmentHo;
  if (Object.keys(residentFilters).length > 0) {
    whereTerms.push({
      creator: { resident: residentFilters }
    });
  }

  // 최종 where
  const where = { AND: whereTerms };

  // 출력에 필요한 민원인 정보 include
  const include = {
    creator: {
      select: {
        resident: {
          select: { name: true, apartmentDong: true, apartmentHo: true }
        }
      }
    }
  };

  // DB 민원 조회
  const totalCount = await complaintRepo.count({ where });
  const rawComplaints = await complaintRepo.findMany({
    where,
    include,
    skip,
    take,
    orderBy: { createdAt: 'desc' }
  });

  // DB 댓글 조회: 댓글수 민원 필드에 추가
  const comlaints = await addCommentsCountField(rawComplaints);

  return {
    complaints: await buildComplaintListRes(comlaints),
    totalCount
  };
}

//----------------------------------------------------- 민원 상세 조회
async function get(userId: string, complaintId: string): Promise<ComplaintDetailResDto> {
  const { adminId: userAdminId, complaintBoardId: userBoardId } =
    await getAptInfoByUserId(userId);

  const complaint = await complaintRepo.find({
    where: { id: complaintId },
    select: { creatorId: true, boardId: true, isPublic: true }
  });
  if (!complaint) throw new NotFoundError('존재하지 않는 민원입니다.');

  const isSameBoard = userBoardId === complaint.boardId;
  const amIAdmin = userId === userAdminId;
  const amIAuthor = userId === complaint.creatorId;

  if (!isSameBoard) throw new ForbiddenError(); // 권한: 같은 아파트 민원인가
  if (!amIAdmin && complaint.isPublic === false)
    if (!amIAuthor)
      // 사용자는, 비밀민원인 경우 저자만 조회 가능
      throw new ForbiddenError('비공개 민원입니다.');

  // DB: viewCount 1 증가하고 상세 조회 내려줌
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

//----------------------------------------------------- 일반 유저 민원 수정: 유저, 관리자
async function patch(
  userId: string,
  complaintId: string,
  body: ComplaintPatchRequestDto
): Promise<ComplaintPatchResDto> {
  const { adminId: userAdminId, complaintBoardId: userBoardId } =
    await getAptInfoByUserId(userId);

  const complaint = await complaintRepo.find({
    where: { id: complaintId },
    select: { boardId: true, status: true, creatorId: true }
  });
  if (!complaint) throw new NotFoundError('존재하지 않는 민원입니다.');

  const isSameBoard = userBoardId === complaint.boardId;
  const amIAdmin = userId === userAdminId;
  const amIAuthor = userId === complaint.creatorId;

  if (!isSameBoard) throw new ForbiddenError(); // 권한
  if (!amIAdmin && !amIAuthor)
    throw new ForbiddenError('본인이 작성한 민원만 수정할 수 있습니다.');

  if (complaint.status !== ComplaintStatus.PENDING)
    throw new BadRequestError('처리 중이거나 종결된 민원은 수정할 수 없습니다.');

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

//----------------------------------------------------- 민원 삭제: 개발환경에서는 삭제, 배포환경에서는 soft delete
async function del(userId: string, complaintId: string): Promise<void> {
  const { adminId: userAdminId, complaintBoardId: userBoardId } =
    await getAptInfoByUserId(userId);

  const complaint = await complaintRepo.find({
    where: { id: complaintId },
    select: { boardId: true, status: true, creatorId: true }
  });
  if (!complaint) throw new NotFoundError('존재하지 않는 민원입니다.');

  if (complaint.status !== ComplaintStatus.PENDING)
    throw new BadRequestError('처리 중이거나 종결된 민원은 삭제할 수 없습니다.');

  const isSameBoard = userBoardId === complaint.boardId;
  const amIAdmin = (userId = userAdminId);
  const amIAuthor = (userId = complaint.creatorId);

  if (!isSameBoard) throw new ForbiddenError(); // 권한
  if (!amIAdmin && !amIAuthor)
    throw new ForbiddenError('본인이 작성한 민원만 삭제할 수 있습니다.');

  if (NODE_ENV === 'development') {
    await complaintRepo.del({ where: { id: complaintId } });
    // comment는 삭제하지 않겠음
  } else
    await complaintRepo.patch(prisma, {
      where: { id: complaintId },
      data: { deletedAt: new Date() }
    });
  // comment는 soft delete 없음
}

//----------------------------------------------------- 관리자 이상 민원 수정 : 상태 변경
async function changeStatus(
  userId: string,
  complaintId: string,
  status: ComplaintStatus
): Promise<ComplaintDetailResDto> {
  const complaint = await complaintRepo.find({
    where: { id: complaintId },
    select: { boardId: true, status: true, creatorId: true }
  });
  if (!complaint) throw new NotFoundError('존재하지 않는 민원입니다.');
  if (complaint.status !== ComplaintStatus.PENDING)
    throw new BadRequestError('처리 중이거나 종결된 민원은 삭제할 수 없습니다.');

  if (!isSuperAdmin(userId)) {
    const { adminId: userAdminId, complaintBoardId: userBoardId } =
      await getAptInfoByUserId(userId);

    const isSameBoard = userBoardId === complaint.boardId;
    const amIAdmin = (userId = userAdminId);

    if (amIAdmin && !isSameBoard) throw new ForbiddenError(); // admin은 자기 아파트이어야
  }
  // DB 트랜젝션: (1) Complaint 상태 변경 (2) 알림
  const complaintPatched: ComplaintWithCreator = await complaintStatusTransaction(
    complaintId,
    status
  );

  if (!complaintPatched.creator.resident)
    throw new NotFoundError('민원 작성자가 입주민 명부에 없습니다.');

  // SSE to 민원 작성자
  sendToUser(
    complaint.creatorId,
    `[알림] ${complaintPatched.creator.resident.name}님 민원종결`
  );

  // 댓글 가져오고, 데이터 가공 후 리턴
  const comments = await commentRepo.findMany({
    where: { targetId: complaintId, targetType: CommentType.COMPLAINT }
  });
  return buildComplaintRes(complaintPatched, comments);
}

//----------------------------------------------------- 지역 함수
async function complaintStatusTransaction(
  complaintId: string,
  status: ComplaintStatus
): Promise<ComplaintWithCreator> {
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
  return complaintPatched;
}

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

interface ComplaintWithCreator extends Complaint {
  creator: {
    resident: {
      name: string;
      apartmentDong: string;
      apartmentHo: string;
    } | null;
  };
}

async function buildComplaintRes(
  complaint: ComplaintWithCreator,
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

async function addCommentsCountField(
  complaints: ComplaintWithCreator[]
): Promise<ComplaintWithMeta[]> {
  const counts = await prisma.comment.groupBy({
    by: ['targetId'],
    where: {
      targetType: CommentType.COMPLAINT,
      targetId: { in: complaints.map((c) => c.id) }
    },
    _count: true
  });
  const countMap = new Map(counts.map((c) => [c.targetId, c._count]));
  const result = complaints.map((c) => ({
    ...c,
    commentsCount: countMap.get(c.id) ?? 0
  }));
  return result;
}

interface ComplaintWithMeta extends ComplaintWithCreator {
  commentsCount: number;
}

async function buildComplaintListRes(
  complaints: ComplaintWithMeta[]
): Promise<ComplaintListResDto[]> {
  return complaints.map((c) => {
    const writer = c.creator.resident;
    if (!writer) throw new NotFoundError('민원인 정보를 찾을 수 없습니다.');
    return {
      complaintId: c.id,
      userId: c.creatorId,
      title: c.title,
      writerName: writer.name,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      isPublic: c.isPublic,
      viewsCount: c.viewCount,
      commentsCount: c.commentsCount,
      status: c.status,
      dong: writer.apartmentDong,
      ho: writer.apartmentHo
    };
  });
}

export default {
  create,
  getList,
  get,
  patch,
  del,
  changeStatus
};
