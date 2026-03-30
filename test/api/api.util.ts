import { ApprovalStatus, UserType } from '@prisma/client';
import prisma from '../../src/lib/prisma';
import NotFoundError from '../../src/middleware/errors/NotFoundError';

export async function registerResidentOnlyMember() {
  const residentData = {
    apartmentDong: '201',
    apartmentHo: '101',
    contact: '010-8888-1111',
    name: '잘지내니탱이',
    isRegistered: false,
    approvalStatus: ApprovalStatus.APPROVED
  };

  const admin = await prisma.user.findFirstOrThrow({
    where: { role: UserType.ADMIN },
    select: { id: true, apartmentId: true }
  });
  if (!admin.apartmentId) throw new NotFoundError('관리자 계정에 아파트 ID가 없습니다.');
  const apt = await prisma.apartment.findUniqueOrThrow({
    where: { id: admin.apartmentId }
  });
  await prisma.resident.create({
    data: { ...residentData, apartment: { connect: { id: apt.id } } }
  });
}

export function getCookie(raw: unknown, name: string): string | undefined {
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];

  if (cookies.length === 0) return undefined;

  for (const c of cookies) {
    if (typeof c !== 'string') continue;
    if (c.startsWith(`${name}=`)) return c.match(new RegExp(`${name}=([^;]+)`))?.[1];
  }
  return undefined;
}

export async function clearDB() {
  (await prisma.notification.deleteMany(),
    await prisma.comment.deleteMany(),
    await prisma.vote.deleteMany(),
    await prisma.pollOption.deleteMany(),
    await prisma.poll.deleteMany(),
    await prisma.notice.deleteMany(),
    await prisma.complaint.deleteMany(),
    await prisma.board.deleteMany(),
    await prisma.event.deleteMany(),
    await prisma.resident.deleteMany(),
    await prisma.user.deleteMany(),
    await prisma.apartment.deleteMany());
}
