import { PollStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

export interface PollOptionDto {
  title: string;
}
export interface PollCreateRequestDto {
  boardId: string;
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

export type PollWithOptions = Prisma.PollGetPayload<{
  include: { pollOptions: true };
}>;

export interface VoteOptionDto {
  id: string;
  title: string;
  votes: number;
}
export interface VoteResDto {
  message: string;
  updatedOption: VoteOptionDto;
  winnerOption: VoteOptionDto;
  options: VoteOptionDto[];
}
