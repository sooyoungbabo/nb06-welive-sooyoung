import {
  ApprovalStatus,
  BoardType,
  HouseholdRole,
  JoinStatus,
  Poll,
  PollStatus,
  ResidenceStatus,
  UserType
} from '@prisma/client';
import pollService from '../../src/module/poll/poll.service';
import prisma from '../../src/lib/prisma';
import NotFoundError from '../../src/middleware/errors/NotFoundError';
import {
  PollCreateRequestDto,
  PollPatchRequestDto
} from '../../src/module/poll/poll.dto';

export async function createMockData() {
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.pollOption.deleteMany(),
    prisma.poll.deleteMany(),
    prisma.notice.deleteMany(),
    prisma.board.deleteMany(),
    prisma.event.deleteMany(),
    prisma.resident.deleteMany(),
    prisma.user.deleteMany(),
    prisma.apartment.deleteMany()
  ]);

  const adminData = {
    username: 'soraebi',
    password: 'password0!',
    contact: '010-7777-7777',
    name: '소래비',
    email: 'soraebi@test.com',
    role: UserType.ADMIN,
    joinStatus: JoinStatus.APPROVED
  };

  const aptData = {
    name: '소래비전원주택',
    address: '소래비로 777',
    description: '소래비로에 위치한 전원주택 단지',
    apartmentManagementNumber: '031-777-7777',
    startComplexNumber: 1,
    endComplexNumber: 3,
    startBuildingNumber: 1,
    endBuildingNumber: 5,
    startFloorNumber: 1,
    endFloorNumber: 2,
    startUnitNumber: 1,
    endUnitNumber: 2,
    apartmentStatus: ApprovalStatus.APPROVED,
    deletedAt: null
  };

  const apt = await prisma.apartment.create({ data: aptData, select: { id: true } });
  const admin = await prisma.user.create({
    data: { ...adminData, apartment: { connect: { id: apt.id } } },
    select: { id: true }
  });

  const pollBoard = await prisma.board.create({
    data: {
      apartment: { connect: { id: apt.id } },
      boardType: BoardType.POLL
    },
    select: { id: true }
  });

  const noticeBoard = await prisma.board.create({
    data: {
      apartment: { connect: { id: apt.id } },
      boardType: BoardType.NOTICE
    },
    select: { id: true }
  });
  const complaintBoard = await prisma.board.create({
    data: {
      apartment: { connect: { id: apt.id } },
      boardType: BoardType.COMPLAINT
    },
    select: { id: true }
  });

  const userData = {
    username: 'user',
    password: 'password0!',
    contact: '010-1111-1111',
    name: '입주민',
    email: 'user@test.com',
    role: UserType.USER,
    joinStatus: JoinStatus.APPROVED
  };

  const user = await prisma.user.create({
    data: { ...userData, apartment: { connect: { id: apt.id } } }
  });

  const residentData = {
    apartmentDong: '101',
    apartmentHo: '101',
    contact: user.contact,
    name: user.name,
    email: user.email,
    isRegistered: true,
    isHouseholder: HouseholdRole.HOUSEHOLDER,
    residenceStatus: ResidenceStatus.RESIDENCE,
    approvalStatus: ApprovalStatus.APPROVED
  };

  await prisma.resident.create({
    data: {
      ...residentData,
      user: { connect: { id: user.id } },
      apartment: { connect: { id: apt.id } }
    }
  });
  return { adminId: admin.id, boardId: pollBoard.id };
}

export async function createPoll(
  adminId: string,
  boardId: string,
  poll: Omit<PollCreateRequestDto, 'boardId' | 'options'>
) {
  const pollData = {
    ...poll,
    admin: { connect: { id: adminId } },
    board: { connect: { id: boardId } }
  };
  return await prisma.poll.create({ data: pollData });
}
export async function updatePoll(pollId: string, data: PollPatchRequestDto) {
  return await prisma.poll.update({
    where: { id: pollId },
    data
  });
}

export async function getPollsToClose() {
  return await prisma.poll.findMany({
    where: {
      status: PollStatus.IN_PROGRESS,
      endDate: { lte: new Date() }
    }
  });
}
