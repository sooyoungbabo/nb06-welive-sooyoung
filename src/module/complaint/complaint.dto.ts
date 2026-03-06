import { BoardType, ComplaintStatus } from '@prisma/client';

export interface ComplaintCreateRequestDto {
  title: string;
  content: string;
  isPublic: boolean;
  boardId: string;
  status: ComplaintStatus;
}

export interface CommentResDto {
  id: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  writerName: string;
}

export interface ComplaintDetailResDto {
  complaintId: string;
  userId: string;
  title: string;
  writerName: string;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  viewsCount: number;
  commentsCount: number;
  status: ComplaintStatus;
  dong: string;
  ho: string;
  content: string;
  boardType: BoardType;
  comments: CommentResDto[];
}

export interface ComplaintListResDto {
  complaintId: string;
  userId: string;
  title: string;
  writerName: string;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  viewsCount: number;
  commentsCount: number;
  status: ComplaintStatus;
  dong: string;
  ho: string;
}

export interface ComplaintPatchRequestDto {
  title: string;
  content: string;
  isPublic: boolean;
}

export type ComplaintPatchResDto = Omit<ComplaintDetailResDto, 'writerName'>;
