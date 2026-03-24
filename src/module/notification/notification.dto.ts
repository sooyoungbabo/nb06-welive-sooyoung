import { NotificationType } from '@prisma/client';

export interface NotiAlarmDto {
  notificationId: string;
  content: string;
  notificationType: NotificationType;
  notifiedAt: Date;
  isChecked: boolean;
  complaintId?: string;
  noticeId?: string;
  pollId?: string;
}
