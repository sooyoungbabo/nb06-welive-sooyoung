import { ApprovalStatus, BoardType, JoinStatus, UserType } from '@prisma/client';
import prisma from '../../src/lib/prisma';
import { hashingPassword } from '../../src/module/user/user.service';

const aptData = {
  name: '힐리아파트',
  address: '화랑로 777',
  apartmentManagementNumber: '77-777-7777',
  description: '배산임수의 청정하고 조용한 전원 아파트',
  startComplexNumber: 1,
  endComplexNumber: 2,
  startBuildingNumber: 1,
  endBuildingNumber: 7,
  startFloorNumber: 1,
  endFloorNumber: 2,
  startUnitNumber: 1,
  endUnitNumber: 2,
  apartmentStatus: ApprovalStatus.APPROVED
};

async function createWelive() {
  console.log('Deleting old data...');
  console.log('');
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.vote.deleteMany(),
    prisma.pollOption.deleteMany(),
    prisma.poll.deleteMany(),
    prisma.notice.deleteMany(),
    prisma.complaint.deleteMany(),
    prisma.board.deleteMany(),
    prisma.event.deleteMany(),
    prisma.resident.deleteMany(),
    prisma.user.deleteMany(),
    prisma.apartment.deleteMany()
  ]);

  console.log('🌱 Seeding superAdmin...');
  const superadmin = await prisma.user.create({
    data: {
      username: 'superadmin',
      password: await hashingPassword('password0!'),
      contact: '999-9999-9999',
      name: '최고관리자',
      email: 'superadmin@test.com',
      role: UserType.SUPER_ADMIN,
      joinStatus: JoinStatus.APPROVED
    }
  });

  console.log('🌱 Seeding apartment...');
  const apt = await prisma.apartment.create({ data: aptData });

  console.log('🌱 Seeding boards...');
  await prisma.board.create({
    data: { boardType: BoardType.COMPLAINT, apartment: { connect: { id: apt.id } } }
  });
  await prisma.board.create({
    data: { boardType: BoardType.POLL, apartment: { connect: { id: apt.id } } }
  });
  await prisma.board.create({
    data: { boardType: BoardType.NOTICE, apartment: { connect: { id: apt.id } } }
  });

  console.log('🌱 Seeding admin...');
  const admin = await prisma.user.create({
    data: {
      username: 'hillie',
      password: await hashingPassword('password0!'),
      contact: '777-7777-7777',
      name: '보고싶은힐리',
      email: 'hillie@test.com',
      role: UserType.ADMIN,
      joinStatus: JoinStatus.APPROVED,
      apartment: { connect: { id: apt.id } }
    }
  });

  console.log('🌱 Seeding users...');
  const usernames = ['frodo', 'samsam', 'pearl'];
  const names = ['착한프로도', '사랑하는샘이', '가엾은진주'];

  const userData = await Promise.all(
    usernames.map(async (u, i) => ({
      apartmentId: apt.id,
      username: u,
      password: await hashingPassword('password0!'),
      contact: `010-1111-${1111 * (i + 1)}`,
      name: names[i],
      email: `${u}@test.com`,
      role: UserType.USER,
      joinStatus: JoinStatus.APPROVED
    }))
  );
  const users = await prisma.user.createMany({ data: userData });

  const residentData = await Promise.all(
    usernames.map(async (u, i) => ({
      apartmentDong: String(101 * (i + 1)),
      apartmentHo: '101',
      contact: `010-1111-${1111 * (i + 1)}`,
      name: names[i],
      email: `${u}@test.com`,
      isRegistered: true,
      approvalStatus: ApprovalStatus.APPROVED,
      apartment: { connect: { id: apt.id } }
    }))
  );

  for (const r of residentData) {
    const user = await prisma.user.findUniqueOrThrow({
      where: { contact: r.contact },
      select: { id: true }
    });

    await prisma.resident.create({
      data: {
        ...r,
        user: { connect: { id: user.id } }
      }
    });
  }

  console.log('');
  console.log('Done!');
  console.log('');
}

export default createWelive;
