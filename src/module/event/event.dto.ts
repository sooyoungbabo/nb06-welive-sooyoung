import { EventType } from '@prisma/client';
import { UUID } from 'node:crypto';

export interface EventQueryDto {
  apartmentId: UUID;
  year: number;
  month: number;
}

export interface EventUpsertRequestDto {
  boardType: EventType;
  boardId: UUID;
  startDate: Date;
  endDate: Date;
}

export interface EventPatchDto {
  title: string;
  startDate: Date;
  endDate: Date;
}
