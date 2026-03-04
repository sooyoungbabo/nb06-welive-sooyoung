import { ApprovalStatus, HouseholdRole, ResidenceStatus } from '@prisma/client';
import { string } from 'superstruct';

export interface ResidentDetailRequestDto {
  id: string;
  userId: null;
  building: string;
  unitNumber: string;
  contact: string;
  name: string;
  email: null;
  residenceStatus: ResidenceStatus;
  isHouseholder: HouseholdRole;
  isRegistered: boolean;
  approvalStatus: ApprovalStatus;
}

export interface ResidentListDto {
  id: string;
  userId?: string | null;
  building: string;
  unitNumber: string;
  contact: string;
  name: string;
  residenceStatus: ResidenceStatus;
  isHouseholder: HouseholdRole;
  isRegistered: boolean;
  approvalStatus: ApprovalStatus;
  email?: string | null;
}

export interface ResidentQueryDto {
  page: string;
  limit: string;
  address: string;
  building: string;
  unitNumber: string;
  residenceStatus: ResidenceStatus;
  isRegistered: boolean;
  keyword: string;
}

export interface ResidentCreateRequestDto {
  apartmentDong: string;
  apartmentHo: string;
  contact: string;
  name: string;
  isHouseholder: HouseholdRole;
}

// export interface ResidentDto extends Omit<ResidentListDto, 'email'> {
//   apartmentId: string;
//   createdAt: Date;
//   updatedAt: Date;
// }

// export interface UserPatchDto {
//   contact: string;
//   name: string;
// }
// export interface ResidentPatchDto extends UserPatchDto {
//   apartmentDong: number;
//   apartmentHo: number;
//   isHouseholder: HouseholdRole;
// }
