import { BoardType, CommentType } from '@prisma/client';
import { UUID } from 'node:crypto';

export interface CommentCreateRequestDto {
  content: string;
  commentType: CommentType; // FE에서 용어를 틀리게 쓰고 있는 듯
  targetId: UUID; // targetId, FE에서 용어를 틀리게 쓰고 있는 듯
}
export type CommentPatchRequestDto = Partial<CommentCreateRequestDto>;

interface CommentDto {
  id: UUID;
  userId: UUID;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  writerName: string;
}

interface BoardDto {
  id: UUID;
  commentType: BoardType;
}

export interface CommentCreateResponseDto {
  comment: CommentDto;
  board: BoardDto;
}
