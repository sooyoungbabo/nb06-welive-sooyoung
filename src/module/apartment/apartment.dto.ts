import { ApprovalStatus } from '@prisma/client';

export interface AptSignupRequestDto {
  name: string;
  address: string;
  description: string;
  apartmentManagementNumber: string;
  startComplexNumber: number;
  endComplexNumber: number;
  startDongNumber: number;
  endDongNumber: number;
  startFloorNumber: number;
  endFloorNumber: number;
  startHoNumber: number;
  endHoNumber: number;
}

export interface AptListPublicResponseDto {
  id: string;
  name: string;
  address: string;
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

export interface AptResponseDto {
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
  dongRange: {
    start: number;
    end: number;
  };
  hoRange: {
    start: number;
    end: number;
  };
  apartmentStatus: ApprovalStatus;
}

export interface AptPublicResponseDto {
  id: string;
  name: string;
  address: string;
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

// export interface ListResponseDto<T> {
//   items: T[];
//   count: number;
// }
