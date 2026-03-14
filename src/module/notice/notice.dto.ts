import { NoticeType } from '@prisma/client';

export interface NoticeCreateRequestDto {
  category: NoticeType;
  title: string;
  content: string;
  boardId: string;
  isPinned: boolean;
  startDate: Date;
  endDate: Date;
}

export interface NoticeQueryDto {
  page?: string;
  limit?: string;
  category?: string;
  keyword?: string; // title, content
}

export interface NoticeListResponseDto {
  noticeId: string;
  userId: string;
  category: NoticeType;
  title: string;
  writerName: string;
  createdAt: Date;
  updatedAt: Date;
  viewsCount: number;
  commentsCount: number;
  isPinned: boolean;
}

interface CommentDto {
  id: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  writerName: string;
}

export interface NoticeDetailResponsDto extends NoticeListResponseDto {
  content: string;
  boardName: string;
  comments: CommentDto[];
}

export interface NoticePatchRequestDto extends NoticeCreateRequestDto {
  userId: string;
}
