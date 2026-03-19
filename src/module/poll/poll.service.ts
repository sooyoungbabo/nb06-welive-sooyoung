import { PollCreateRequestDto, PollPatchRequestDto, PollQuery, PollWithOptions } from './poll.dto';
import pollRepo from './poll.repo';
import { EventType, Poll, PollStatus, Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { buildPagination, buildWhere } from '../../lib/buildQuery';
import userRepo from '../user/user.repo';
import NotFoundError from '../../middleware/errors/NotFoundError';
import BadRequestError from '../../middleware/errors/BadRequestError';
import { NODE_ENV } from '../../lib/constants';
import ForbiddenError from '../../middleware/errors/ForbiddenError';
import eventRepo from '../event/event.repo';
import voteRepo from '../pollVote/vote.repo';
import { getAptInfoByUserId } from '../../lib/utils';

// 투표 생성: 관리자
async function create(userId: string, body: PollCreateRequestDto) {
  const { adminId, pollBoardId: boardId } = await getAptInfoByUserId(userId);

  // req.body 데이터 로직 점검
  if (boardId !== body.boardId) throw new BadRequestError('boardId가 틀립니다.');
  if (body.endDate < body.startDate)
    throw new BadRequestError('종료일은 시작일보다 이전일 수 없습니다.');
  if (body.endDate < new Date()) throw new BadRequestError('종료일은 현재보다 이전일 수 없습니다.');

  // 데이터 가공
  const pollData = buildPollData(adminId, boardId, body);
  const eventData = {
    eventType: EventType.POLL,
    title: pollData.title,
    startDate: pollData.startDate,
    endDate: pollData.endDate
  };
  // DB 생성
  // 트랜젝션 (1) poll (2) event
  const poll = await prisma.$transaction(async (tx) => {
    const poll = await pollRepo.create(tx, {
      data: { ...pollData, event: { create: eventData } },
      include: { pollOptions: true }
    });
    const eventArgs = {
      data: {
        eventType: EventType.POLL,
        title: poll.title,
        startDate: poll.startDate,
        endDate: poll.endDate,
        poll: { connect: { id: poll.id } }
      }
    };
    await eventRepo.create(tx, eventArgs);
    return poll;
  });

  return poll;
}

// 투표 목록 조회: 관리자, 입주자
// 입주민은 Pending 상태의 투표는 조회 불가
async function getList(userId: string, query: PollQuery) {
  const { adminId, pollBoardId: boardId } = await getAptInfoByUserId(userId);
  if (userId !== adminId && query.status === 'PENDING')
    throw new BadRequestError('PENDING 상태의 투표는 조회할 수 없습니다.');

  const params = buildPollQueryParams(query);
  const { skip, take } = buildPagination(params.pagination, {
    limitDefault: 11,
    limitMax: 100
  });

  let where = { ...buildWhere(params), deletedAt: null, boardId }; // 자기 아파트 것만 조회 가능
  if (userId! == adminId)
    where = {
      ...where, // 사용자는 pending 상태의 polls는 조회 못 함
      AND: [...(where.AND ?? []), { status: { not: PollStatus.PENDING } }]
    };

  const args: Prisma.PollFindManyArgs = {
    where,
    skip,
    take,
    orderBy: { createdAt: 'desc' }
  };
  const polls = await pollRepo.findMany(args); // 검색 결과

  where = { boardId, deletedAt: null }; // totalCount 위한 새로운 query
  if (userId !== adminId) where = { ...where, status: { not: PollStatus.PENDING } };
  const totalCount = await pollRepo.count({ where });

  return { polls: await buildPollListRes(polls), totalCount };
}

// 투표 상세 조회: 관리자, 입주자
// 입주민은 Pending 상태의 투표는 조회 불가
async function get(userId: string, pollId: string) {
  const poll = await pollRepo.find({
    where: { id: pollId, deletedAt: null },
    include: { pollOptions: true }
  });
  if (!poll) throw new NotFoundError('투표가 존재하지 않습니다.');

  const { adminId, pollBoardId: userBoardId } = await getAptInfoByUserId(userId);
  if (poll.boardId !== userBoardId) throw new ForbiddenError(); // 권한: 같은 아파트 소속

  if (userId !== adminId && poll.status === 'PENDING')
    throw new BadRequestError('PENDING 상태의 투표는 조회할 수 없습니다.');

  return buildPollDetailRes(poll);
}

// 투표 수정: 관리자
// 개시 전의 투표만 수정 가능
async function patch(userId: string, pollId: string, body: PollPatchRequestDto) {
  const poll = await pollRepo.find({ where: { id: pollId, deletedAt: null } });
  if (!poll) throw new NotFoundError('해당 투표가 존재하지 않습니다.');
  if (poll.adminId !== userId) throw new ForbiddenError(); // 권한: 관리자

  if (poll.startDate <= new Date())
    throw new BadRequestError('진행 중이거나 종료된 투표는 수정할 수 없습니다.');

  const pollData: Prisma.PollUpdateInput = buildPollPatchData(body);

  // 트랜젝션: (1) 투표 수정 (2) 이벤트 수정
  const pollPatched = await prisma.$transaction(async (tx) => {
    const poll = await pollRepo.patch(tx, {
      where: { id: pollId },
      data: pollData
    });
    await eventRepo.update(tx, {
      where: { pollId },
      data: {
        title: poll.title,
        startDate: poll.startDate,
        endDate: poll.endDate
      }
    });
    return poll;
  });
  return pollPatched;
}

// 투표 삭졔: 관리자
// 개시 전의 투표만 삭제 가능
// 개발환경에서는 삭제, 배포환경에서는 soft delete
async function del(userId: string, pollId: string) {
  const poll = await pollRepo.find({ where: { id: pollId, deletedAt: null } });
  if (!poll) throw new NotFoundError('해당 투표가 존재하지 않습니다.');
  if (poll.adminId !== userId) throw new ForbiddenError(); // 권한: 관리자
  if (poll.startDate <= new Date())
    throw new BadRequestError('진행 중이거나 종료된 투표는 삭제할 수 없습니다.');

  if (NODE_ENV === 'development') {
    await prisma.$transaction(async (tx) => {
      await tx.pollOption.deleteMany({ where: { pollId } });
      await voteRepo.deleteMany(tx, { where: { pollId } });
      await eventRepo.del(tx, { where: { pollId } });
      await pollRepo.del(tx, { where: { id: pollId } });
    });
  } else {
    await prisma.$transaction(async (tx) => {
      await pollRepo.patch(tx, {
        where: { id: pollId },
        data: { deletedAt: new Date() }
      });
      await eventRepo.del(tx, { where: { pollId } }); // hard delete만 있음
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
      const admin = await userRepo.find({ where: { id: p.adminId } });
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
