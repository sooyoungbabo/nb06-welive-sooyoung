import prisma from '../../lib/prisma';
import { assert } from 'superstruct';
import BadRequestError from '../../middleware/errors/BadRequestError';
import NotFoundError from '../../middleware/errors/NotFoundError';
import { hashingPassword } from '../user/user.service';
import notificationRepo from '../notification/notification.repo';
import aptRepo from '../apartment/apartment.repo';
import userRepo from '../user/user.repo';
import residentRepo from '../resident/resident.repo';
import boardRepo from '../board/board.repo';
import { AptRegistrationDto } from '../apartment/apartment.dto';
import ConflictError from '../../middleware/errors/ConflictError';
import { CreateNotification } from '../notification/notification.struct';
import { sendToUser } from '../notification/notification.sse';
import { getSuperAdminId, validateAptDongHo } from '../../lib/utils';
import {
  UserSignupRequestDto,
  ResidentRegistrationDto,
  UserSignupResponseDto,
  SuperAdminSignupRequestDto,
  AdminSignupRequestDto,
  UserRegistrationDto
} from '../user/user.dto';
import {
  ApprovalStatus,
  BoardType,
  HouseholdRole,
  JoinStatus,
  NotificationType,
  ResidenceStatus,
  Resident,
  User,
  UserType
} from '@prisma/client';
import InternalServerError from '../../middleware/errors/internalServerError';

//----------------------- USER 가입신청
async function signup(body: UserSignupRequestDto): Promise<UserSignupResponseDto> {
  const { username, contact, email, apartmentName, apartmentDong, apartmentHo } = body;

  // unique fields로 DB 존재여부 판단하고 이미 존재하면 409 에러 던짐
  await validateExistingUserOrThrow({ username, contact, email });

  // rea.body 데이터 로직 검토: (1) 아파트 (2) 동호수
  const { aptId, adminId } = await validateAptDongHo(
    apartmentName,
    apartmentDong,
    apartmentHo
  );

  // 입주민 명부에 승인상태로 존재하면, 사용자 계정은 승인상태로 등록
  const { joinStatus, approvalStatus } = await decideSignupStatus(aptId, body);

  // 데이터 가공
  const userData = await buildSignupUserData(body, joinStatus);
  const residentData = await buildSignupResidentData(body, approvalStatus);

  // DB creation: 트랜젝션 user/resident/notification 생성
  const userCreated = await userSignupTransaction({
    userData,
    residentData,
    aptId,
    adminId
  });

  // SSE to admin: 트랜젝션 바깥에서
  sendToUser(adminId, `[알림] 가입신청 (${userCreated.name}님)`);

  // 출력형식에 맞게 재가공하여 리턴
  return buildSignupUserRes(userCreated);
}

//-------------------------- Admin 가입신청
async function signupAdmin(body: AdminSignupRequestDto): Promise<UserSignupResponseDto> {
  // 신청자와 아파트 이름/주소 조합이 이미 존재하는지 체크하고 존재하면 409 에러 던짐
  await validateExistingAptAdminOrThrow(body);

  // 데이터 가공, 검증
  const aptData = buildSignupApartmentData(body);
  const adminData = await buildSignupAdminData(body);
  const superAdminIds = await getSuperAdminId();

  // DB 생성: 트렌젝션 (1) Apartment (2) Board (3) User (4) Notification
  const adminCreated = await adminSignupTransaction({
    aptData,
    adminData,
    superAdminIds
  });

  // SSE to superAdmins: 트렌젝션 바깥
  for (const id of superAdminIds) {
    sendToUser(id, `[알림] 가입신청 (${adminCreated.name}님)`);
  }
  // 데이터 재가공하여 리턴
  return buildSignupUserRes(adminCreated);
}

//---------------------------- SuperAdmin 등록: APPROVED로 등록
async function signupSuperAdmin(
  body: SuperAdminSignupRequestDto
): Promise<UserSignupResponseDto> {
  const data = {
    ...body,
    password: await hashingPassword(body.password)
  };
  const superAdminCreated = await userRepo.create(prisma, { data });
  return buildSignupUserRes(superAdminCreated);
}

//-------------------------------------------------------- 지역 힘수
type UniqueUserFields = {
  username: string;
  contact: string;
  email: string;
};

async function validateExistingUserOrThrow(fields: UniqueUserFields) {
  const { username, contact, email } = fields;
  const exist = await userRepo.findFirst({
    where: {
      OR: [{ contact }, { username }, { email: email }]
    },
    select: { contact: true, username: true, email: true }
  });

  if (!exist) return;
  if (exist.contact === contact) throw new ConflictError('이미 사용 중인 연락처입니다.');
  if (exist.username === username)
    throw new ConflictError('이미 사용 중인 유저네임입니다.');
  if (exist.email === email) throw new ConflictError('이미 사용 중인 이메일입니다.');
}

async function decideSignupStatus(aptId: string, body: UserSignupRequestDto) {
  const isAutoApproved = await validateResidentSignupOrThrow(aptId, body);

  return {
    joinStatus: isAutoApproved ? JoinStatus.APPROVED : JoinStatus.PENDING,
    approvalStatus: isAutoApproved ? ApprovalStatus.APPROVED : ApprovalStatus.PENDING
  };
}

async function validateResidentSignupOrThrow(
  aptId: string,
  body: UserSignupRequestDto
): Promise<boolean> {
  const resident = await residentRepo.find(prisma, {
    where: { contact: body.contact },
    include: {
      apartment: {
        select: {
          users: {
            where: { role: UserType.ADMIN, deletedAt: null },
            select: { name: true, contact: true },
            take: 1
          }
        }
      }
    }
  });

  // (1) 명부 가입자 아님 --> 일반 사용자 가입 절차로 gogo
  if (!resident) return false;

  const admin = resident.apartment.users[0];
  if (!admin) throw new NotFoundError('관리자가 없습니다.');

  // (2) 명부 가입자인데 사용자 계정이 승인되지 않은 경우
  if (resident.isRegistered === true) {
    //if (!resident.userId) throw new NotFoundError('승인된 계정이나 사용자 Id가 없습니다.');

    const user = await userRepo.find({
      where: { contact: resident.contact },
      select: { joinStatus: true, id: true }
    });
    if (!user) throw new NotFoundError('사용자가 존재하지 않습니다.');
    throwJoinStatusError(user.joinStatus, admin);
  }
  // (3) 명부 정보와 합치 여부 검증
  validateResidentInfo(resident, aptId, body);

  // (4) 사용자 계정 자동 승인 허용
  return true;
}

type AdminWithLessInfo = Pick<User, 'name' | 'contact'>;

function throwJoinStatusError(joinStatus: JoinStatus, admin: AdminWithLessInfo) {
  switch (joinStatus) {
    case JoinStatus.PENDING:
      throw new BadRequestError('관리자가 검토 중입니다.');

    case JoinStatus.REJECTED:
      throw new BadRequestError(
        `가입신청이 거절되었습니다. 관리자에게 문의해주세요.\n(${admin.name}, ${admin.contact})`
      );

    case JoinStatus.NEED_UPDATE:
      throw new BadRequestError(
        `정보 수정 후 다시 제출해주세요.\n(${admin.name}, ${admin.contact})`
      );

    case JoinStatus.APPROVED:
      throw new BadRequestError('이미 가입된 사용자입니다.');

    default:
      throw new BadRequestError(
        `문제가 있습니다. 관리자에게 문의하세요\n(${admin.name}, ${admin.contact})`
      );
  }
}

function validateResidentInfo(
  resident: Resident,
  aptId: string,
  body: UserSignupRequestDto
) {
  if (resident.name !== body.name) {
    throw new BadRequestError('이름이 명부와 일치하지 않습니다.');
  }
  if (resident.apartmentId !== aptId)
    throw new BadRequestError('아파트가 명부와 일치하지 않습니다.');

  if (resident.apartmentDong !== body.apartmentDong)
    throw new BadRequestError('동이 일치하지 않습니다.');

  if (resident.apartmentHo !== body.apartmentHo)
    throw new BadRequestError('호수가 일치하지 않습니다.');
}

async function buildSignupUserData(body: UserRegistrationDto, joinStatus: JoinStatus) {
  return {
    username: body.username,
    password: await hashingPassword(body.password),
    contact: body.contact,
    name: body.name,
    email: body.email,
    role: body.role,
    joinStatus
  };
}

async function buildSignupResidentData(
  body: ResidentRegistrationDto,
  approvalStatus: ApprovalStatus
) {
  return {
    contact: body.contact,
    name: body.name,
    email: body.email,
    apartmentDong: body.apartmentDong,
    apartmentHo: body.apartmentHo,
    isRegistered: true,
    isHouseholder: HouseholdRole.HOUSEHOLDER,
    residenceStatus: ResidenceStatus.RESIDENCE,
    approvalStatus
  };
}

type UserSignupTransactionData = {
  userData: UserRegistrationDto & { joinStatus: JoinStatus };
  residentData: ResidentRegistrationDto & { approvalStatus: ApprovalStatus };
  aptId: string;
  adminId: string;
};

async function userSignupTransaction(data: UserSignupTransactionData) {
  // DB creation: 트랜젝션 (1) user 생성 (2) resident 생성 (3) 알림 생성
  const { userData, residentData, aptId, adminId } = data;

  const userCreated = await prisma.$transaction(async (tx) => {
    const user = await userRepo.create(tx, {
      data: { ...userData, apartment: { connect: { id: aptId } } } // user 생성
    });
    const createResidentData = {
      ...residentData,
      apartmentId: aptId,
      userId: user.id
    };
    await residentRepo.upsert(tx, {
      where: { contact: residentData.contact },
      create: createResidentData,
      update: { ...residentData, userId: user.id }
    }); // resident 생성

    const notiData = {
      notiType: NotificationType.AUTH_USER_APPLIED,
      targetId: user.id,
      content: `[알림] 가입신청 (${residentData.name}님)`
    };
    assert(notiData, CreateNotification);
    await notificationRepo.create(tx, {
      data: { ...notiData, receiver: { connect: { id: adminId } } } // notification 생성
    });
    return user;
  });
  return userCreated;
}

function buildSignupUserRes(user: User): UserSignupResponseDto {
  //USER, ADMIN, SUPER_ADMIN
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    joinStatus: user.joinStatus,
    isActive: true,
    role: user.role
  };
}

async function validateExistingAptAdminOrThrow(body: AdminSignupRequestDto) {
  const { username, contact, email, apartmentName, apartmentAddress } = body;
  await validateExistingUserOrThrow({ username, contact, email });
  const aptExisted = await aptRepo.find({
    where: { name: apartmentName, address: apartmentAddress }
  });
  if (aptExisted)
    throw new ConflictError('같은 이름과 주소를 가진 아파트가 이미 존재합니다.');
}

function buildSignupApartmentData(body: AdminSignupRequestDto) {
  const raw = {
    name: body.apartmentName,
    address: body.apartmentAddress,
    description: body.description,
    apartmentManagementNumber: body.apartmentManagementNumber,
    startComplexNumber: body.startComplexNumber,
    endComplexNumber: body.endComplexNumber,
    startDongNumber: body.startDongNumber,
    endDongNumber: body.endDongNumber,
    startFloorNumber: body.startFloorNumber,
    endFloorNumber: body.endFloorNumber,
    startHoNumber: body.startHoNumber,
    endHoNumber: body.endHoNumber
  };

  const {
    startDongNumber: startBuildingNumber,
    endDongNumber: endBuildingNumber,
    startHoNumber: startUnitNumber,
    endHoNumber: endUnitNumber,
    ...rest
  } = raw;

  return {
    startBuildingNumber,
    endBuildingNumber,
    startUnitNumber,
    endUnitNumber,
    ...rest
  };
}

async function buildSignupAdminData(body: AdminSignupRequestDto) {
  return {
    username: body.username,
    password: await hashingPassword(body.password),
    contact: body.contact,
    name: body.name,
    email: body.email,
    role: body.role,
    joinStatus: JoinStatus.PENDING
  };
}

type AdminSignupTransactionData = {
  aptData: AptRegistrationDto;
  adminData: UserRegistrationDto & { joinStatus: JoinStatus };
  superAdminIds: string[];
};
async function adminSignupTransaction(data: AdminSignupTransactionData) {
  const { aptData, adminData, superAdminIds } = data;
  const adminCreated = await prisma.$transaction(async (tx) => {
    const apt = await aptRepo.create(tx, { data: aptData }); // apt 생성
    const boardData = [
      { boardType: BoardType.NOTICE, apartmentId: apt.id },
      { boardType: BoardType.COMPLAINT, apartmentId: apt.id },
      { boardType: BoardType.POLL, apartmentId: apt.id }
    ];
    const boards = await boardRepo.createMany(tx, boardData); // 3종 보드 생성
    if (boards.count !== 3)
      throw new InternalServerError('3개 보드가 다 만들어지지 않았습니다.');

    const admin = await userRepo.create(tx, {
      data: { ...adminData, apartment: { connect: { id: apt.id } } } // admin 생성
    });

    for (const id of superAdminIds) {
      const notiData = {
        notiType: NotificationType.AUTH_ADMIN_APPLIED,
        targetId: admin.id,
        content: `[알림] 가입신청 (${admin.name}님)`
      };
      assert(notiData, CreateNotification);
      const noti = await notificationRepo.create(tx, {
        data: { ...notiData, receiver: { connect: { id } } } // 알림 생성
      });
    }
    return admin;
  });
  return adminCreated;
}

export default {
  signup,
  signupAdmin,
  signupSuperAdmin
};
