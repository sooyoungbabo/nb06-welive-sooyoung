import prisma from '../../lib/prisma';
import aptRepo from '../apartment/apartment.repo';
import userRepo from '../user/user.repo';
import residentRepo from '../resident/resident.repo';
import boardRepo from '../board/board.repo';
import { getAptInfoByUserId } from '../../lib/utils';
import { ApprovalStatus, JoinStatus, User, UserType } from '@prisma/client';
import NotFoundError from '../../middleware/errors/NotFoundError';

// 개발용 관리자 삭제 (아파트, 보드도 삭제): 최고관리자 권한
async function deleteAdmin(adminId: string): Promise<User> {
  const { apartmentId } = await getAptInfoByUserId(adminId);

  // 트렌젝션: user, apartment, boards
  return prisma.$transaction(async (tx) => {
    await boardRepo.deleteMany(tx, { where: { apartmentId } }); // 3종 보드 삭제
    const admin = await userRepo.del(tx, { where: { id: adminId } }); // 관리자 삭제
    await aptRepo.del(tx, { where: { id: apartmentId } }); // 아파트 삭제
    return admin;
  });
}

// 배포용 관리자 soft delete (아파트, 보드도): 최고관리자 권한
async function softDeleteAdmin(adminId: string): Promise<User> {
  const { apartmentId } = await getAptInfoByUserId(adminId);

  // 트렌젝션: user, apartment, boards
  return prisma.$transaction(async (tx) => {
    await boardRepo.updateMany(tx, {
      where: { apartmentId },
      data: { deletedAt: new Date() }
    });
    const admin = await userRepo.patch(tx, {
      where: { id: adminId },
      data: { deletedAt: new Date() }
    });
    await aptRepo.patch(tx, {
      where: { id: apartmentId },
      data: { deletedAt: new Date() }
    });
    return admin;
  });
}

// 거절된 사용자 일괄 삭제: 최고관리자/관리자 분지
async function cleanup(userId: string): Promise<string> {
  const user = await userRepo.find({ where: { id: userId }, select: { role: true } });
  if (!user) throw new NotFoundError('사용자가 존재하지 않습니다.');
  if (user.role === UserType.ADMIN) return cleanupByAdmin(userId);
  return cleanupBySuperAdmin();
}

// 거절된 관리자 일괄 삭제: 최고관리자 권한
async function cleanupBySuperAdmin(): Promise<string> {
  console.log('최고관리자 영역');
  const aptArgs = { where: { apartmentStatus: ApprovalStatus.REJECTED } };
  const boardArgs = {
    where: { apartment: { apartmentStatus: ApprovalStatus.REJECTED } }
  };
  const userArgs = { where: { role: UserType.ADMIN, joinStatus: JoinStatus.REJECTED } };

  // 트랜젝션: (1)User (2)Board (3)Apartment
  const deleted = await prisma.$transaction(async (tx) => {
    const users = await userRepo.deleteMany(tx, userArgs);
    await boardRepo.deleteMany(tx, boardArgs);
    await aptRepo.deleteMany(tx, aptArgs);
    return users;
  });
  return `[슈퍼관리자] 거절된 관리자 가입신청 ${deleted.count}건이 일괄정리되었습니다.`;
}

async function cleanupByAdmin(userId: string): Promise<string> {
  const { apartmentId } = await getAptInfoByUserId(userId);
  const userArgs = {
    where: {
      apartmentId,
      role: UserType.USER,
      joinStatus: JoinStatus.REJECTED
    }
  };
  const residentArgs = {
    where: {
      apartmentId,
      isRegistered: true, // 명부only 입주민 제외
      approvalStatus: ApprovalStatus.REJECTED
    }
  };
  const deleted = await prisma.$transaction(async (tx) => {
    const residents = await residentRepo.deleteMany(tx, residentArgs);
    await userRepo.deleteMany(tx, userArgs);
    return residents;
  });
  return `[관리자] 거절된 사용자 가입신청 ${deleted.count}건이 일괄정리되었습니다.`;
}

//-------------------------------------------------------- 지역 힘수

export default {
  deleteAdmin,
  softDeleteAdmin,
  cleanup
};
