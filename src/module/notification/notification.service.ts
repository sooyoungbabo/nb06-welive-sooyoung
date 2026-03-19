import { sendToUser } from './sse.manager';
import { Notification, NotificationType } from '@prisma/client';
import notiRepo from './notification.repo';
import prisma from '../../lib/prisma';
import ForbiddenError from '../../middleware/errors/ForbiddenError';
import NotFoundError from '../../middleware/errors/NotFoundError';
import userRepo from '../user/user.repo';
import notificationRepo from './notification.repo';
import { UUID } from 'node:crypto';

type NotifyArgs = {
  notiType: NotificationType;
  targetId: string;
  content: string;
};

async function notify(userId: string, data: NotifyArgs) {
  const notiData = {
    ...data,
    receiver: { connect: { id: userId } }
  };
  const notification = await notiRepo.create(prisma, { data: notiData });
  sendToUser(userId, notification.content);
}

// try {
//   sendToUser(args.receiverId, notification.content);
// } catch (err) {
//   console.error('Realtime notification failed', {
//     receiverId: args.receiverId,
//     message: err instanceof Error ? err.message : err
//   });
// }

async function read(userId: string, notiId: string) {
  const noti = await notiRepo.find({
    where: { id: notiId },
    select: { receiverId: true }
  });
  if (!noti) throw new NotFoundError('알림이 존재하지 않습니다.');

  if (userId !== noti.receiverId) throw new ForbiddenError(); // 권한: 수신자

  const notiUpdated = await notiRepo.patch({
    where: { id: notiId },
    data: { isChecked: true }
  });
  return buildNotificationRes(notiUpdated);
}

async function readAll(userId: string): Promise<string> {
  const notis = await notiRepo.patchMany({
    where: { receiverId: userId, isChecked: false },
    data: { isChecked: true }
  });
  const user = await userRepo.find({
    where: { id: userId },
    select: { name: true }
  });
  return `${user?.name}님이 ${notis.count}건의 알림을 읽음으로 처리하였습니다.`;
}

async function getList(userId: string) {
  return await notiRepo.findMany({
    where: { receiverId: userId },
    orderBy: { notifiedAt: 'desc' }
  });
}

async function getUnreadList(userId: string) {
  return await notiRepo.findMany({ where: { receiverId: userId, isChecked: false } });
}

interface NotificationSendDto extends NotifyArgs {
  receiverId: UUID;
}

async function send(body: NotificationSendDto) {
  const { receiverId, notiType, targetId, content } = body;
  const noti = await notificationRepo.create(prisma, {
    data: {
      notiType,
      targetId,
      content,
      receiver: { connect: { id: receiverId } }
    }
  });
  return noti;
}

//-------------------------------
function buildNotificationRes(noti: Notification) {
  return {
    notificationId: noti.id,
    receiverId: noti.receiverId,
    content: noti.content,
    notiType: noti.notiType,
    notifiedAt: noti.notifiedAt,
    isChecked: noti.isChecked
  };
}

export default {
  notify,
  getList,
  getUnreadList,
  read,
  readAll,
  send
};
