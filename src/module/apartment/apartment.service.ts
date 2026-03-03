import { UserType } from '@prisma/client';
import aptRepo from './apartment.repo';

async function publicGetList() {
  return await aptRepo.getList();
}

async function publicGet(aptId: string) {
  return await aptRepo.find({ where: { id: aptId } });
}

async function getList() {
  const args = { include: { users: { where: { role: UserType.ADMIN, deletedAt: null } } } };
  return await aptRepo.getList(args);
}

async function get(aptId: string) {
  return await aptRepo.find({ where: { id: aptId } });
}
export default {
  publicGetList,
  publicGet,
  getList,
  get
};
