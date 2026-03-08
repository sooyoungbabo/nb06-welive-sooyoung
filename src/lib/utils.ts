import { UserType } from '@prisma/client';
import apartmentRepo from '../module/apartment/apartment.repo';

export async function getAdminId(userId: string) {
  const myApts = await apartmentRepo.getList({
    where: { users: { some: { id: userId, role: UserType.ADMIN, deletedAt: null } } },
    include: { users: { where: { id: userId, role: UserType.ADMIN, deletedAt: null } } }
  });
  return myApts[0].users[0].id;
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
