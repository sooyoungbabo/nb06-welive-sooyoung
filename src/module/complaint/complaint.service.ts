import {
  BoardType,
  Complaint,
  Prisma,
  Comment,
  Resident,
  CommentType,
  ComplaintStatus,
  UserType
} from '@prisma/client';
import userRepo from '../user/user.repo';
import complaintRepo from './complaint.repo';
import commentRepo from '../comment/comment.repo';
import residentRepo from '../resident/resident.repo';
import boardRepo from '../board/board.repo';
import { buildPagination, buildWhere } from '../../lib/buildQuery';
import {
  CommentResDto,
  ComplaintCreateRequestDto,
  ComplaintDetailResDto,
  ComplaintListResDto,
  ComplaintPatchRequestDto,
  ComplaintPatchResDto,
  ComplaintQueryDto
} from './complaint.dto';
import NotFoundError from '../../middleware/errors/NotFoundError';
import prisma from '../../lib/prisma';
import { AuthUser } from '../../type/express';
import { requireApartmentUser, requireResidentUser, requireUser } from '../../lib/require';
import ForbiddenError from '../../middleware/errors/ForbiddenError';

async function create(user: AuthUser, data: ComplaintCreateRequestDto) {
  requireResidentUser(user);
  const boardId = await getBoardId(user.apartmentId, CommentType.COMPLAINT);
  const complaintData: Prisma.ComplaintCreateInput = {
    title: data.title,
    content: data.content,
    isPublic: data.isPublic,
    status: data.status,
    creator: { connect: { id: user.id } },
    board: { connect: { id: boardId } },
    admin: { connect: { id: user.adminId } }
  };
  return await complaintRepo.create(complaintData);
}

async function getList(
  user: AuthUser,
  query: ComplaintQueryDto
): Promise<{ complaints: ComplaintListResDto[]; totalCount: number }> {
  const queryParams = buildQueryParams(query);
  const { skip, take } = buildPagination(queryParams.pagination, {
    limitDefault: 20,
    limitMax: 100
  });

  requireApartmentUser(user);
  const boardId = await getBoardId(user.apartmentId, BoardType.COMPLAINT);

  let where: Prisma.ComplaintWhereInput = buildWhere({
    searchKey: queryParams.searchKey,
    //filters: queryParams.filters, // 관계형 필드
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

  const totalCount = await complaintRepo.count(where);
  const rawComplaints = await complaintRepo.findMany(where, skip, take);

  return { complaints: await buildComplaintListRes(rawComplaints), totalCount };
}

async function get(userId: string, complaintId: string): Promise<ComplaintDetailResDto> {
  if (!(await isMyComplaint(userId, complaintId))) throw new ForbiddenError();

  const complaint = await complaintRepo.patch({
    where: { id: complaintId },
    data: { viewCount: { increment: 1 } } // viewCount 증가하고 상세 조회 내려줌
  });
  if (!complaint)
    throw new NotFoundError('민원이 존재하지 않습니다. 다른 아파트의 민원인지 확인해 보세요.');

  const comments = await commentRepo.findMany({
    where: { targetId: complaint.id, targetType: CommentType.COMPLAINT }
  });
  const creator = await residentRepo.find(prisma, { where: { userId: complaint.creatorId } });
  if (!creator) throw new NotFoundError('민원 작성자가 존재하지 않습니다.');

  return buildComplaintRes(complaint, comments, creator);
}

async function patch(
  user: AuthUser,
  complaintId: string,
  body: ComplaintPatchRequestDto
): Promise<ComplaintPatchResDto> {
  requireApartmentUser(user);
  if (!(await isMyApartment(user.id, complaintId))) throw new ForbiddenError();
  if (!(await isMyComplaint(user.id, complaintId))) throw new ForbiddenError();

  const complaint = await complaintRepo.patch({
    where: { id: complaintId },
    data: { ...body }
  });
  if (!complaint) throw new NotFoundError('민원이 존재하지 않습니다.');

  const resident = await residentRepo.find(prisma, { where: { userId: complaint.creatorId } });
  if (!resident) throw new NotFoundError('민원 작성자가 입주민 명부에 존재하지 않습니다.');

  const comments = await commentRepo.findMany({
    where: { targetId: complaint.id, targetType: CommentType.COMPLAINT }
  });

  const { writerName, ...rest } = await buildComplaintRes(complaint, comments, resident);
  return rest;
}

async function del(user: AuthUser, complaintId: string): Promise<void> {
  requireApartmentUser(user);
  if (!(await isMyApartment(user.id, complaintId))) throw new ForbiddenError();
  if (!(await isMyComplaint(user.id, complaintId))) throw new ForbiddenError();

  const complaint = await complaintRepo.find({
    where: { id: complaintId },
    select: { creatorId: true }
  });
  if (!complaint) throw new NotFoundError('민원이 존재하지 않습니다.');

  await complaintRepo.del({ where: { id: complaintId } });
}

async function changeStatus(
  user: AuthUser,
  complaintId: string,
  status: ComplaintStatus
): Promise<ComplaintDetailResDto> {
  requireUser(user);
  if (!(await isMyApartment(user.id, complaintId)) && user.userType !== UserType.SUPER_ADMIN)
    throw new ForbiddenError();

  const complaint = await complaintRepo.patch({
    where: { id: complaintId },
    data: { status },
    select: { creatorId: true }
  });
  const resident = await residentRepo.find(prisma, {
    where: { userId: complaint.creatorId }
  });
  if (!resident) throw new NotFoundError('민원 작성자가 입주민 명부에 존재하지 않습니다.');
  const comments = await commentRepo.findMany({
    where: { targetId: complaintId, targetType: CommentType.COMPLAINT }
  });

  return buildComplaintRes(complaint, comments, resident);
}

//------------------------------------------
async function isMyComplaint(userId: string, complaintId: string) {
  const complaint = await complaintRepo.find({
    where: { id: complaintId },
    select: { creatorId: true }
  });
  return userId === complaint?.creatorId;
}
async function isMyApartment(userId: string, complaintId: string): Promise<boolean> {
  const complaint = await complaintRepo.find({
    where: { id: complaintId },
    select: { creatorId: true, adminId: true }
  });
  return complaint?.adminId === userId;
}

async function getBoardId(apartmentId: string, boardType: BoardType): Promise<string> {
  const board = await boardRepo.findMany({
    where: { apartmentId, boardType }
  });
  if (!board) throw new NotFoundError('민원 보드가 없습니다.');
  return board[0].id;
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

async function buildComplaintRes(
  complaint: Complaint,
  comments: Prisma.CommentGetPayload<Prisma.CommentFindManyArgs>[],
  creator: Resident
): Promise<ComplaintDetailResDto> {
  return {
    complaintId: complaint.id,
    userId: creator.id,
    title: complaint.title,
    writerName: creator.name,
    createdAt: complaint.createdAt,
    updatedAt: complaint.updatedAt,
    isPublic: complaint.isPublic,
    viewsCount: complaint.viewCount,
    commentsCount: comments.length,
    status: complaint.status,
    dong: creator.apartmentDong,
    ho: creator.apartmentHo,
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
      const writer = await residentRepo.find(prisma, { where: { userId: c.creatorId } });
      if (!writer) throw new NotFoundError('댓글 작성 입주민이 존재하지 않습니다.');

      const commentsCount = await commentRepo.count({ where: { targetId: c.id } });

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
