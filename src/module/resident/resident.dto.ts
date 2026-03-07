import { ApprovalStatus, HouseholdRole, ResidenceStatus } from '@prisma/client';

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

export interface ResidentCreateRequestDto {
  apartmentDong: string;
  apartmentHo: string;
  contact: string;
  name: string;
  isHouseholder: HouseholdRole;
}

export type ResidentCsvItem = {
  apartmentDong: string;
  apartmentHo: string;
  name: string;
  contact: string;
  isHouseholder: string;
};

export type ResidentQueryDto = {
  page?: string;
  limit?: string;
  building?: string;
  unitNumber?: string;
  residenceStatus?: string;
  isRegistered?: string;
  keyword?: string; //이름, 연락처
};
