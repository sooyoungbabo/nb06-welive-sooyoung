import { sendToUser } from './sse.manager';
import { NotificationType } from '@prisma/client';
import notiRepo from './notification.repo';
import prisma from '../../lib/prisma';

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
  const notification = await notiRepo.create(prisma, notiData);
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

export default {
  notify
};
