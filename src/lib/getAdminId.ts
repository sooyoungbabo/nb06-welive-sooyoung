import { UserType } from '@prisma/client';
import apartmentRepo from '../module/apartment/apartment.repo';

export async function getAdminId(userId: string) {
  const myApts = await apartmentRepo.getList({
    where: { users: { some: { id: userId, role: UserType.ADMIN, deletedAt: null } } },
    include: { users: { where: { id: userId, role: UserType.ADMIN, deletedAt: null } } }
  });
  return myApts[0].users[0].id;
}
