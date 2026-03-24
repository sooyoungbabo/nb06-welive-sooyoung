import { ApprovalStatus } from '@prisma/client';

export interface AptRegistrationDto {
  name: string;
  address: string;
  description: string;
  apartmentManagementNumber: string;
  startComplexNumber: number;
  endComplexNumber: number;
  startBuildingNumber: number;
  endBuildingNumber: number;
  startFloorNumber: number;
  endFloorNumber: number;
  startUnitNumber: number;
  endUnitNumber: number;
}

export interface AptListPublicResponseDto {
  id: string;
  name: string;
  address: string;
}

export interface AptPublicResponseDto extends AptListPublicResponseDto {
  startComplexNumber: number;
  endComplexNumber: number;
  startDongNumber: number;
  endDongNumber: number;
  startFloorNumber: number;
  endFloorNumber: number;
  startHoNumber: number;
  endHoNumber: number;
  apartmentStatus: ApprovalStatus;
  dongRange: {
    start: number;
    end: number;
  };
  hoRange: {
    start: number;
    end: number;
  };
}

export interface AptListResponseDto {
  id: string;
  name: string;
  address: string;
  officeNumber: string;
  description: string;
  startComplexNumber: number;
  endComplexNumber: number;
  startDongNumber: number;
  endDongNumber: number;
  startFloorNumber: number;
  endFloorNumber: number;
  startHoNumber: number;
  endHoNumber: number;
  apartmentStatus: ApprovalStatus;
  adminId: string;
  adminName: string;
  adminContact: string;
  adminEmail: string;
}

export interface AptResponseDto extends AptListResponseDto {
  dongRange: {
    start: number;
    end: number;
  };
  hoRange: {
    start: number;
    end: number;
  };
}

export type ApartmentQuery = {
  keyword?: string;
  name?: string;
  address?: string;
  apartmentStatus?: string;
  page?: string;
  limit?: string;
};
