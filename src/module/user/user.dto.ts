import { BoardType, HouseholdRole, JoinStatus, UserType } from '@prisma/client';

interface UserBaseDto {
  contact: string;
  name: string;
  email: string;
}
export interface UserRegistrationDto extends UserBaseDto {
  //USER
  username: string;
  password: string;
  role: UserType;
}

export interface ResidentRegistrationDto extends UserBaseDto {
  apartmentDong: string;
  apartmentHo: string;
}

export interface UserSignupRequestDto extends UserRegistrationDto {
  //USER
  apartmentName: string;
  apartmentDong: string;
  apartmentHo: string;
}

export interface AdminSignupRequestDto extends UserRegistrationDto {
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

export interface SuperAdminSignupRequestDto extends UserRegistrationDto {
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

export interface SuperAdminLoginResponseDto extends UserSignupResponseDto {
  username: string;
  contact: string;
  avatar: string | null;
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

export interface PatchAdminAptRequestDto extends UserBaseDto {
  description: string;
  apartmentName: string;
  apartmentAddress: string;
  apartmentManagementNumber: string;
}

export interface ResidentPatchDto {
  apartmentDong: number;
  apartmentHo: number;
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
