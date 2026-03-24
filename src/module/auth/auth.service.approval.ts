import prisma from '../../lib/prisma';
import ForbiddenError from '../../middleware/errors/ForbiddenError';
import NotFoundError from '../../middleware/errors/NotFoundError';
import aptRepo from '../apartment/apartment.repo';
import userRepo from '../user/user.repo';
import residentRepo from '../resident/resident.repo';
import { getAptInfoByResidentId, getAptInfoByUserId } from '../../lib/utils';
import { PatchAdminAptRequestDto } from '../user/user.dto';
import { Apartment, ApprovalStatus, JoinStatus, User, UserType } from '@prisma/client';

// 관리자 목록 조회: 최고관리자 부가 기능
async function getAdminList(): Promise<User[]> {
  return await userRepo.findMany(prisma, {
    where: { role: UserType.ADMIN },
    orderBy: { createdAt: 'desc' }
  });
}
// 아파트 목록 조회: 최고관리자 부가 기능
async function getAptList(): Promise<Apartment[]> {
  return await aptRepo.findMany({ orderBy: { createdAt: 'desc' } });
}

// 관리자 상태 변경: 최고관리자 권한
async function changeAdminStatus(adminId: string, status: JoinStatus) {
  const apartmentStatus = getApprovalStatus(status);
  const admin = await userRepo.find({
    where: { id: adminId },
    select: { apartmentId: true }
  });
  if (!admin) throw new NotFoundError('관리자가 존재하지 않습니다.');
  const aptId = admin.apartmentId;
  if (!aptId) throw new NotFoundError('관리자 계정에 아파트 ID가 존재하지 않습니다.');

  // DB 승인상태 변경, 트랜젝션: (1) User (2) Apartment
  const adminApproved = await prisma.$transaction(async (tx) => {
    const admin = await userRepo.patch(tx, {
      where: { id: adminId },
      data: { joinStatus: status }
    });
    await aptRepo.patch(tx, {
      where: { id: aptId },
      data: { apartmentStatus }
    });
    return admin;
  });
  if (status === JoinStatus.APPROVED)
    return `[슈퍼관리자] 관리자 ${adminApproved.name}의 가입요청을 승인했습니다.`;
  else return `[슈퍼관리자] 관리자 ${adminApproved.name}의 가입요청을 기각했습니다.`;
}

// 관리자 상태 일괄 변경: 최고관리자 권한
async function changeAllAdminsStatus(status: JoinStatus) {
  const apartmentStatus = getApprovalStatus(status);

  // DB 승인상태 변경, 트랜젝션: (1) User (2) Apartment
  const adminsApproved = await prisma.$transaction(async (tx) => {
    const adminArgs = {
      where: { role: UserType.ADMIN, joinStatus: JoinStatus.PENDING },
      data: { joinStatus: status }
    };
    const admins = await userRepo.patchMany(tx, adminArgs);
    const aptArgs = {
      where: { apartmentStatus: ApprovalStatus.PENDING },
      data: { apartmentStatus }
    };
    await aptRepo.patchMany(tx, aptArgs);
    return admins;
  });
  if (status === JoinStatus.APPROVED)
    return `[슈퍼관리자] 관리자 ${adminsApproved.count}명의 가입신청을 승인했습니다.`;
  else return `[슈퍼관리자] 관리자 ${adminsApproved.count}명의 가입신청을 기각했습니다.`;
}

// 입주민 1명 가입상태 변경: 관리자 권한
async function changeResidentStatus(
  userId: string,
  residentId: string,
  status: JoinStatus
) {
  const { adminId: residentAdminId, apartmentId: residentAptId } =
    await getAptInfoByResidentId(residentId);

  const isMyResident = userId === residentAdminId;
  if (!isMyResident) throw new ForbiddenError(); // 권한 검증: 주민의 관리자가 나인가

  const approvalStatus = getApprovalStatus(status);

  // DB 상태변경, 트랜젝션: (1) Resident (2) User
  const residentApproved = await prisma.$transaction(async (tx) => {
    const resident = await residentRepo.patch(tx, {
      where: { id: residentId, isRegistered: true }, // 명부only 입주민은 대상에서 제외
      data: { approvalStatus },
      select: { isRegistered: true, userId: true, name: true }
    });
    if (!resident) throw new NotFoundError('입주민 정보를 찾을 수 없습니다.');
    if (!resident.userId) throw new NotFoundError('입주민의 사용자 ID가 없습니다.');

    await userRepo.patch(tx, {
      where: { id: resident.userId },
      data: { joinStatus: status }
    });
    return resident;
  });

  const apt = await aptRepo.find({
    where: { id: residentAptId },
    select: { name: true }
  });
  if (status === JoinStatus.APPROVED)
    return `[관리자] ${apt!.name}관리자가 ${residentApproved.name}의 가입요청을 승인했습니다.`;
  else
    return `[관리자] ${apt!.name}관리자가 ${residentApproved.name}의 가입요청을 기각했습니다.`;
}

// 입주민 가입상태 일괄 변경: 관리자 권한
async function changeAllResidentsStatus(userId: string, status: JoinStatus) {
  const { apartmentId } = await getAptInfoByUserId(userId);
  const approvalStatus = getApprovalStatus(status);

  const userArgs = {
    where: {
      apartmentId,
      role: UserType.USER,
      joinStatus: JoinStatus.PENDING
    },
    data: { joinStatus: status }
  };
  const residentArgs = {
    where: {
      apartmentId,
      isRegistered: true, // 명부only 입주민 제외
      approvalStatus: ApprovalStatus.PENDING
    },
    data: { approvalStatus }
  };
  const residentApproved = await prisma.$transaction(async (tx) => {
    const resident = await residentRepo.patchMany(tx, residentArgs);
    await userRepo.patchMany(tx, userArgs);
    return resident;
  });

  const apt = await aptRepo.find({ where: { id: apartmentId }, select: { name: true } });
  if (status === JoinStatus.APPROVED)
    return `[관리자] ${apt!.name}관리자가 입주민 ${residentApproved.count}명의 가입요청을 승인했습니다.`;
  else
    return `[관리자] ${apt!.name}관리자가 입주민 ${residentApproved.count}명의 가입요청을 기각했습니다.`;
}

// 관리자 정보 수정: 최고관리자 권한
async function patchAdminApt(
  adminId: string,
  body: PatchAdminAptRequestDto
): Promise<User> {
  const adminData = buildPatchAdminData(body);
  const aptData = buildPatchAptData(body);

  return prisma.$transaction(async (tx) => {
    const admin = await userRepo.patch(tx, {
      where: { id: adminId, role: UserType.ADMIN },
      data: adminData
    });
    await aptRepo.patch(tx, { where: { id: admin.apartmentId! }, data: aptData });
    return admin;
  });
}

//-------------------------------------------------------- 지역 힘수
function buildPatchAdminData(body: PatchAdminAptRequestDto) {
  return {
    contact: body.contact,
    name: body.name,
    email: body.email
  };
}

function buildPatchAptData(body: PatchAdminAptRequestDto) {
  return {
    description: body.description,
    name: body.apartmentName,
    address: body.apartmentAddress,
    apartmentManagementNumber: body.apartmentManagementNumber
  };
}

function getApprovalStatus(state: JoinStatus): ApprovalStatus {
  if (state === JoinStatus.APPROVED) return ApprovalStatus.APPROVED;
  else return ApprovalStatus.REJECTED;
}

export default {
  getAdminList,
  getAptList,
  changeAdminStatus,
  changeAllAdminsStatus,
  changeResidentStatus,
  changeAllResidentsStatus,
  patchAdminApt
};
