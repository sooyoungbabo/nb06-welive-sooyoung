import { PollCreateRequestDto, PollPatchRequestDto, PollQuery, PollWithOptions } from './poll.dto';
import pollRepo from './poll.repo';
import { BoardType, EventType, Poll, PollStatus, Prisma, UserType } from '@prisma/client';
import { requireApartmentUser, requireUser } from '../../lib/require';
import { AuthUser } from '../../type/express';
import { getBoardId } from '../../lib/utils';
import prisma from '../../lib/prisma';
import { buildPagination, buildWhere } from '../../lib/buildQuery';
import userRepo from '../user/user.repo';
import NotFoundError from '../../middleware/errors/NotFoundError';
import BadRequestError from '../../middleware/errors/BadRequestError';
import { NODE_ENV } from '../../lib/constants';

async function create(admin: AuthUser, body: PollCreateRequestDto) {
  if (body.endDate < body.startDate)
    throw new BadRequestError('종료일은 시작일보다 이전일 수 없습니다.');
  if (body.endDate < new Date()) throw new BadRequestError('종료일은 현재보다 이전일 수 없습니다.');

  requireApartmentUser(admin);
  const boardId = await getBoardId(admin.apartmentId, BoardType.POLL);
  const pollData = buildPollData(admin.id, boardId, body);
  const eventData = {
    eventType: EventType.POLL,
    title: pollData.title,
    startDate: pollData.startDate,
    endDate: pollData.endDate
  };
  return await pollRepo.create(prisma, {
    data: { ...pollData, event: { create: eventData } },
    include: { pollOptions: true }
  });
}

async function getList(user: AuthUser, query: PollQuery) {
  requireUser(user);
  if (user.userType === UserType.USER && query.status === 'PENDING')
    throw new BadRequestError('PENDING 상태의 투표는 조회할 수 없습니다.');

  const usr = await userRepo.find({ where: { id: user.id }, select: { apartmentId: true } });
  if (!usr) throw new NotFoundError('사용자가 존재하지 않습니다.');
  if (!usr.apartmentId) throw new BadRequestError('사용자의 아파트 정보가 없습니다.');
  const boardId = await getBoardId(usr.apartmentId, BoardType.POLL);

  const params = buildPollQueryParams(query);
  const { skip, take } = buildPagination(params.pagination, {
    limitDefault: 11,
    limitMax: 100
  });

  let where = { ...buildWhere(params), deletedAt: null };
  // 최고관리자는 모든 투표 조회가능, 관리자/입주민은 해당 아파트 것만 조회 가능
  if (user.userType !== UserType.SUPER_ADMIN) where = { ...where, boardId };
  // 입주민은 PENDING 상태의 투표는 조회 불가
  if (user.userType === UserType.USER)
    where = {
      ...where,
      AND: [...(where.AND ?? []), { status: { not: PollStatus.PENDING } }]
    };

  const args: Prisma.PollFindManyArgs = {
    where,
    skip,
    take,
    orderBy: { createdAt: 'desc' }
  };
  const polls = await pollRepo.getList(args);

  where = { boardId, deletedAt: null };
  if (user.userType === UserType.USER) where = { ...where, status: { not: PollStatus.PENDING } };
  const totalCount = await pollRepo.count({ where });

  return { polls: await buildPollListRes(polls), totalCount };
}

async function get(user: AuthUser, pollId: string) {
  const poll = await pollRepo.find({
    where: { id: pollId, deletedAt: null },
    include: { pollOptions: true }
  });
  if (!poll) throw new NotFoundError('투표가 존재하지 않습니다.');

  requireUser(user);
  if (user.userType === UserType.USER && poll.status === 'PENDING')
    throw new BadRequestError('PENDING 상태의 투표는 조회할 수 없습니다.');

  return buildPollDetailRes(poll);
}

async function patch(pollId: string, body: PollPatchRequestDto) {
  const poll = await pollRepo.find({ where: { id: pollId } });
  if (!poll) throw new NotFoundError('해당 투표가 존재하지 않습니다.');
  if (poll.startDate <= new Date())
    throw new BadRequestError('진행 중이거나 종료된 투표는 수정할 수 없습니다.');

  const pollData: Prisma.PollUpdateInput = buildPollPatchData(body);
  return await pollRepo.patch(prisma, {
    where: { id: pollId },
    data: pollData
  });
}

async function del(pollId: string) {
  const poll = await pollRepo.find({ where: { id: pollId } });
  if (!poll) throw new NotFoundError('해당 투표가 존재하지 않습니다.');
  if (poll.startDate <= new Date())
    throw new BadRequestError('진행 중이거나 종료된 투표는 삭제할 수 없습니다.');

  // PollOption과 Vote는 onDelete = Cascase로 자동 삭제
  if (NODE_ENV === 'development') {
    await pollRepo.del(prisma, { where: { id: pollId } });
  } else {
    await pollRepo.patch(prisma, {
      where: { id: pollId },
      data: { deletedAt: new Date() }
    });
  }
}

//------------------------------------------ 지역함수
function buildPollData(
  adminId: string,
  boardId: string,
  body: PollCreateRequestDto
): Prisma.PollCreateInput {
  return {
    buildingPermission: body.buildingPermission,
    title: body.title,
    content: body.content,
    startDate: body.startDate,
    endDate: body.endDate,
    status: body.status,
    board: { connect: { id: boardId } },
    admin: { connect: { id: adminId } },
    pollOptions: { create: body.options }
  };
}

function buildPollQueryParams(query: PollQuery) {
  const { page, limit, buildingPermission, keyword } = query;
  const status =
    query.status === undefined || query.status === '' ? undefined : (query.status as PollStatus);

  return {
    pagination: { page, limit },
    filters: { buildingPermission },
    exactFilters: { status },
    searchKey: { keyword, fields: ['title', 'content'] }
  };
}

async function buildPollListRes(polls: Poll[]) {
  return Promise.all(
    polls.map(async (p) => {
      const admin = await userRepo.findById(p.adminId);
      if (!admin) throw new NotFoundError('관리자가 계정에 존재하지 않습니다.');

      return {
        pollId: p.id,
        userId: p.adminId,
        title: p.title,
        writerName: admin.name,
        buildingPermission: p.buildingPermission,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        startDate: p.startDate,
        endDate: p.endDate,
        status: p.status
      };
    })
  );
}

function buildPollDetailRes(poll: PollWithOptions) {
  const options = poll.pollOptions.map((o) => ({
    id: o.id,
    title: o.title,
    voteCount: o.voteCount
  }));
  return {
    pollId: poll.id,
    userId: poll.adminId,
    title: poll.title,
    buildingPermission: poll.buildingPermission,
    createdAt: poll.createdAt,
    updatedAt: poll.updatedAt,
    startDate: poll.startDate,
    endDate: poll.endDate,
    status: poll.status,
    content: poll.content,
    boardName: 'POLL',
    options
  };
}

function buildPollPatchData(body: PollPatchRequestDto): Prisma.PollUpdateInput {
  const data: Prisma.PollUpdateInput = {
    title: body.title,
    content: body.content,
    buildingPermission: body.buildingPermission,
    startDate: body.startDate,
    endDate: body.endDate,
    status: body.status
  };

  if (body.options) {
    data.pollOptions = {
      deleteMany: {},
      create: body.options
    };
  }
  return data;
}

export default {
  create,
  getList,
  get,
  patch,
  del
};
