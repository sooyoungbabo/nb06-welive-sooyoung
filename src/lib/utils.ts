import { Apartment, UserType } from '@prisma/client';
import prisma from './prisma';
import apartmentRepo from '../module/apartment/apartment.repo';
import residentRepo from '../module/resident/resident.repo';
import ForbiddenError from '../middleware/errors/ForbiddenError';
import BadRequestError from '../middleware/errors/BadRequestError';
import userRepo from '../module/user/user.repo';
import NotFoundError from '../middleware/errors/NotFoundError';

export async function ensureSameApartment(apartmentId: string, residentId: string) {
  const resident = await residentRepo.find(prisma, {
    where: { id: residentId },
    select: { apartmentId: true }
  });

  console.log(resident?.apartmentId, apartmentId);
  if (resident?.apartmentId !== apartmentId) throw new ForbiddenError();
}

export async function getSuperAdminId(): Promise<string[]> {
  const superAdmins = await userRepo.findMany(prisma, {
    where: { role: UserType.SUPER_ADMIN, deletedAt: null },
    select: { id: true }
  });
  return superAdmins.map((sa) => sa.id);
}

export async function getAdminId(userId: string) {
  const myApts = await apartmentRepo.getList({
    where: { users: { some: { id: userId, role: UserType.ADMIN, deletedAt: null } } },
    include: { users: { where: { id: userId, role: UserType.ADMIN, deletedAt: null } } }
  });
  return myApts[0].users[0].id;
}

export async function getAdminIdByAparatmentId(apartmentId: string): Promise<string> {
  const admin = await userRepo.findFirst({
    where: { apartmentId, role: UserType.ADMIN, deletedAt: null }
  });
  if (!admin) throw new NotFoundError('해당 아파트의 관리자를 찾을 수 없습니다.');
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

export function validateDongHo(dong: string, ho: string, apt: Apartment) {
  const dongRange = getDongRange(apt.endComplexNumber, apt.endBuildingNumber);
  const hoRange = getHoRange(apt.endFloorNumber, apt.endUnitNumber);

  if (!dongRange.includes(Number(dong)))
    throw new BadRequestError('아파트 동 번호가 범위를 벗어났습니다.');

  if (!hoRange.includes(Number(ho)))
    throw new BadRequestError('아파트 호수가 범위를 벗어났습니다.');
}
