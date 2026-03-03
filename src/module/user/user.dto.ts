import {
  ApprovalStatus,
  BoardType,
  HouseholdRole,
  JoinStatus,
  ResidenceStatus,
  UserType
} from '@prisma/client';

export interface UserSignupRequestDto {
  //USER
  username: string;
  password: string;
  contact: string;
  name: string;
  email: string;
  role: UserType;
  apartmentName: string;
  apartmentDong: string;
  apartmentHo: string;
}

export interface UserSignupDto {
  //USER
  username: string;
  password: string;
  contact: string;
  name: string;
  email: string;
  role: UserType;
}

export interface ResidentSignupDto {
  contact: string;
  name: string;
  email: string;
  apartmentDong: string;
  apartmentHo: string;
}

export interface AdminSignupRequestDto extends UserSignupDto {
  description: string;
  startComplexNumber: number;
  endComplexNumber: number;
  startDongNumber: number;
  endDongNumber: number;
  startFloorNumber: number;
  endFloorNumber: number;
  startHoNumber: number;
  endHoNumber: number;
  apartmentName: string;
  apartmentAddress: string;
  apartmentManagementNumber: string;
}

export interface SuperAdminSignupRequestDto extends UserSignupDto {
  joinStatus: JoinStatus;
}

export interface UserSignupResponseDto {
  //USER, ADMIN, SUPER_ADMIN
  id: string;
  name: string;
  role: UserType;
  email: string;
  joinStatus: JoinStatus;
  isActive: boolean;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface SuperAdminLoginResponseDto {
  id: string;
  name: string;
  email: string;
  role: UserType;
  username: string;
  contact: string;
  avatar: string | null;
  joinStatus: JoinStatus;
  isActive: boolean;
}

export interface UserLoginResponseDto extends SuperAdminLoginResponseDto {
  apartmentId: string;
  apartmentName: string;
  boardIds: Record<BoardType, string>;
}

export type LoginToControlDto = {
  userRes: SuperAdminLoginResponseDto | UserLoginResponseDto;
  accessToken: string;
  refreshToken: string;
};

export type PatchAdminAptRequestDto = {
  contact: string;
  name: string;
  email: string;
  description: string;
  apartmentName: string;
  apartmentAddress: string;
  apartmentManagementNumber: string;
};

// export interface UserDeleteManyResponseDto {
//   deletedAdmins: number;
//   deletedUsers: number;
//   deletedResidents: number;
// }

export interface ResidentListDto {
  id: string;
  userId: string;
  building: number;
  unitNumber: number;
  contact: string;
  name: string;
  residenceStatus: ResidenceStatus;
  isHouseHolder: HouseholdRole;
  isRegistered: boolean;
  approvalStatus: ApprovalStatus;
  email: string;
}

export interface ResidentDto extends Omit<ResidentListDto, 'emaili'> {
  apartmentId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResidentPatchDto {
  building: number;
  unitNumber: number;
  contact: string;
  name: string;
  isHouseholder: HouseholdRole;
}

// 이미지 관련
export interface ImageFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
  destination: string;
  filename: string;
}

// 이미지 관련

export type ImgUploadParams = {
  id: string;
  //type: ImgSourceType;
};

export interface ImagePostInput {
  //type: ImgSourceType;
  id: number;
  baseUrl: string;
  file: ImageFile;
}

export interface ImageResult {
  body: Buffer;
  contentType: string;
}
