import { BoardType, UserType } from '@prisma/client';
import prisma from './prisma';
import BadRequestError from '../middleware/errors/BadRequestError';
import userRepo from '../module/user/user.repo';
import NotFoundError from '../middleware/errors/NotFoundError';
import apartmentRepo from '../module/apartment/apartment.repo';
import residentRepo from '../module/resident/resident.repo';
import InternalServerError from '../middleware/errors/internalServerError';

export async function getNotiReceivers(adminAptId: string) {
  const receivers = await residentRepo.findMany({
    where: {
      apartmentId: adminAptId,
      deletedAt: null,
      userId: { not: null }
    },
    select: { userId: true }
  });
  return receivers.filter((r): r is { userId: string } => r.userId !== null);
}

export async function isSuperAdmin(userId: string): Promise<boolean> {
  const user = await userRepo.find({
    where: { id: userId },
    select: { role: true }
  });
  if (!user) throw new NotFoundError('사용자가 존재하지 않습니다.');
  return user.role === UserType.SUPER_ADMIN;
}

export async function getSuperAdminId(): Promise<string[]> {
  const superAdmins = await userRepo.findMany(prisma, {
    where: { role: UserType.SUPER_ADMIN, deletedAt: null },
    select: { id: true }
  });
  return superAdmins.map((sa) => sa.id);
}

type AptInfoByUserId = {
  apartmentId: string;
  apartmentName: string;
  adminId: string;
  noticeBoardId: string;
  complaintBoardId: string;
  pollBoardId: string;
};

export async function getAptInfoByUserId(userId: string): Promise<AptInfoByUserId> {
  const adminsFound = await userRepo.findMany(prisma, {
    where: {
      role: UserType.ADMIN,
      deletedAt: null,
      apartment: { users: { some: { id: userId, deletedAt: null } } }
    },
    select: {
      id: true,
      apartment: {
        select: {
          id: true,
          name: true,
          boards: { select: { id: true, boardType: true } }
        }
      }
    }
  });

  if (adminsFound.length === 0) throw new NotFoundError('관리자가 존재하지 않습니다.');
  if (adminsFound.length > 1) throw new InternalServerError('관리자가 2명 이상입니다.');
  const admin = adminsFound[0];

  if (!admin.apartment) throw new NotFoundError('관리자 계정에 아파트 정보가 없습니다.');

  const boards = Object.fromEntries(
    admin.apartment.boards.map((b) => [b.boardType, b.id])
  );
  if (
    !boards[BoardType.NOTICE] ||
    !boards[BoardType.COMPLAINT] ||
    !boards[BoardType.POLL]
  )
    throw new NotFoundError('아파트에 3종 보드가 없습니다.');

  const aptInfo = {
    apartmentId: admin.apartment.id,
    apartmentName: admin.apartment.name,
    adminId: admin.id,
    noticeBoardId: boards[BoardType.NOTICE],
    complaintBoardId: boards[BoardType.COMPLAINT],
    pollBoardId: boards[BoardType.POLL]
  };
  return aptInfo;
}

interface AptInfoByResidentId extends AptInfoByUserId {
  userId?: string;
}

export async function getAptInfoByResidentId(
  residentId: string
): Promise<AptInfoByResidentId> {
  const resident = await residentRepo.find(prisma, {
    where: { id: residentId },
    select: {
      userId: true,
      apartment: {
        select: {
          id: true,
          name: true,
          users: {
            where: { role: UserType.ADMIN, deletedAt: null },
            select: { id: true }
          },
          boards: { select: { id: true, boardType: true } }
        }
      }
    }
  });
  if (!resident) throw new NotFoundError('입주민을 찾을 수 없습니다.');
  if (resident.apartment.users.length === 0)
    throw new NotFoundError('관리자가 없습니다.');
  if (resident.apartment.users.length > 1)
    throw new InternalServerError('관리자가 2명 이상입니다.');

  const admin = resident.apartment.users[0];

  const boards = Object.fromEntries(
    resident.apartment.boards.map((b) => [b.boardType, b.id])
  );

  const aptInfo = {
    apartmentId: resident.apartment.id,
    apartmentName: resident.apartment.name,
    adminId: admin.id,
    ...(resident.userId && { userId: resident.userId }),
    noticeBoardId: boards[BoardType.NOTICE],
    complaintBoardId: boards[BoardType.COMPLAINT],
    pollBoardId: boards[BoardType.POLL]
  };
  return aptInfo;
}

export async function getAdminIdByAptId(aptId: string) {
  const admin = await userRepo.findFirst({
    where: { apartmentId: aptId, role: UserType.ADMIN, deletedAt: null },
    select: { id: true }
  });
  if (!admin) throw new NotFoundError('해당 아파트에는 관리자가 없습니다.');
  return admin.id;
}

export function getDongRange(maxComplex: number, maxBuilding: number): number[] {
  const dongRange = [0];
  for (let k = 1; k <= maxComplex; k++) {
    for (let l = 1; l <= maxBuilding; l++) {
      dongRange.push(k * 100 + l);
    }
  }
  return dongRange;
}

export function getHoRange(maxFloor: number, maxUnit: number): number[] {
  const hoRange = [0];

  for (let m = 1; m <= maxFloor; m++) {
    for (let n = 1; n <= maxUnit; n++) {
      hoRange.push(m * 100 + n);
    }
  }
  return hoRange;
}

export async function validateAptDongHo(
  aptName: string,
  dong: string,
  ho: string
): Promise<{ aptId: string; adminId: string }> {
  const apt = await apartmentRepo.findFirst({
    where: { name: aptName, deletedAt: null },
    include: {
      users: {
        where: { role: UserType.ADMIN, deletedAt: null },
        select: { id: true }
      }
    }
  });
  if (!apt) throw new NotFoundError('해당 이름을 가진 아파트가 존재하지 않습니다.');
  if (!apt.users) throw new NotFoundError('해당 아파트에 관리자가 없습니다.');
  const aptId = apt.id;
  const adminId = apt.users[0].id;

  const dongRange = getDongRange(apt.endComplexNumber, apt.endBuildingNumber);
  const hoRange = getHoRange(apt.endFloorNumber, apt.endUnitNumber);
  if (!dongRange.includes(Number(dong)))
    throw new BadRequestError('아파트 동 번호가 범위를 벗어났습니다.');
  if (!hoRange.includes(Number(ho)))
    throw new BadRequestError('아파트 호수가 범위를 벗어났습니다.');
  return { aptId, adminId };
}

export function formatKST(date: Date) {
  const kst = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));

  const yyyy = kst.getFullYear();
  const MM = String(kst.getMonth() + 1).padStart(2, '0');
  const dd = String(kst.getDate()).padStart(2, '0');

  const hh = String(kst.getHours()).padStart(2, '0');
  const mm = String(kst.getMinutes()).padStart(2, '0');
  const ss = String(kst.getSeconds()).padStart(2, '0');

  return `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}`;
}
