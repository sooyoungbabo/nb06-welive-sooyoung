import { PollStatus } from '@prisma/client';
import { optional } from 'superstruct';

export interface PollOptionDto {
  title: string;
}
export interface PollCreateRequestDto {
  status: PollStatus;
  title: string;
  content: string;
  buildingPermission: number;
  startDate: Date;
  endDate: Date;
  options: PollOptionDto[];
}

export type PollPatchRequestDto = Partial<PollCreateRequestDto>;

export interface PollQuery {
  page?: string;
  limit?: string;
  buildingPermission?: string;
  status?: string;
  keyword?: string;
}
