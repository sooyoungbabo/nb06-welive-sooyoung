import { BoardType, UserType } from '@prisma/client';
import prisma from './prisma';
import BadRequestError from '../middleware/errors/BadRequestError';
import userRepo from '../module/user/user.repo';
import NotFoundError from '../middleware/errors/NotFoundError';
import apartmentRepo from '../module/apartment/apartment.repo';

export async function getSuperAdminId(): Promise<string[]> {
  const superAdmins = await userRepo.findMany(prisma, {
    where: { role: UserType.SUPER_ADMIN, deletedAt: null },
    select: { id: true }
  });
  return superAdmins.map((sa) => sa.id);
}

type AptInfo = {
  apartmentId: string;
  adminId: string;
  noticeBoardId: string;
  complaintBoardId: string;
  pollBoardId: string;
};

export async function getAptInfoByUserId(userId: string): Promise<AptInfo> {
  const admin = await userRepo.findFirst({
    where: {
      role: UserType.ADMIN,
      deletedAt: null,
      apartment: { users: { some: { id: userId, deletedAt: null } } }
    },
    select: {
      id: true,
      apartment: {
        select: { id: true, boards: { select: { id: true, boardType: true } } }
      }
    }
  });

  if (!admin) throw new NotFoundError('관리자가 존재하지 않습니다.');
  if (!admin.apartment) throw new NotFoundError('관리자 계정에 아파트 정보가 없습니다.');

  const boards = Object.fromEntries(admin.apartment.boards.map((b) => [b.boardType, b.id]));
  if (!boards[BoardType.NOTICE] || !boards[BoardType.COMPLAINT] || !boards[BoardType.POLL])
    throw new NotFoundError('아파트에 3종 보드가 없습니다.');

  const aptInfo = {
    apartmentId: admin.apartment.id,
    adminId: admin.id,
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
