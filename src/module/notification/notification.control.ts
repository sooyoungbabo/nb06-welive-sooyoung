import { NextFunction, Request, Response } from 'express';
import { CronJob } from 'cron';
import { addClient, getClient, removeClient, sendToUser } from './notification.sse';
import notiService from './notification.service';
import { setDevTokens } from '../../lib/tokenDev';
import { ACCESS_TOKEN_COOKIE_NAME } from '../../lib/constants';
import { cleanupUser, removeJob } from './notification.scheduler';
import UnauthorizedError from '../../middleware/errors/UnauthorizedError';

const jobs = new Map<string, CronJob>();

//------------------------------------------ 클라이언트 요청에 의한 SSE 연결
function stream(req: Request, res: Response) {
  const user = req.user;
  if (!user) throw new UnauthorizedError();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  addClient(user.id, res);

  const access = req.cookies?.[ACCESS_TOKEN_COOKIE_NAME];

  res.write(': connected\n\n');

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    cleanupUser(user.id);
  });
}

//------------------------------------------ 클라이언트 요청에 의한 cron job
//                                           매 30초마다 안 읽은 알림목록 SSE 전송
async function startNotiScheduler(req: Request, res: Response) {
  const user = req.user;
  if (!user) throw new UnauthorizedError();
  const userId = req.user.id;
  const role = req.user.role;

  if (!jobs.has(userId)) {
    console.log('JOB CREATED:', role, Date.now());
    let isRunning = false;

    const job = new CronJob('*/30 * * * * *', async () => {
      console.log('JOB RUN:', role, Date.now());
      if (isRunning) return;
      isRunning = true;

      let data;
      try {
        if (!getClient(userId)) {
          console.log('No SSE connected');
          removeJob(userId);
          return;
        }

        data = await notiService.getUnreadList(userId);
        sendToUser(userId, data);
      } catch (err) {
        console.error('notiScheduler error:', err);
      } finally {
        isRunning = false;
        if (data) console.log('SEND TRY:', userId, data.data.length);
      }
    });

    jobs.set(userId, job);
    job.start();
  }
  res.status(200).json({ mesage: 'Notification Scheduler Started' });
}

//------------------------------------------ 추가 기능: 알림 목록 조회
async function getList(req: Request, res: Response, next: NextFunction) {
  const notis = await notiService.getList(req.user.id);
  res.status(200).json({ notifications: notis, count: notis?.length });
}
//------------------------------------------ 추가 기능: 안 읽은 알림 목록 조회
async function getUnreadList(req: Request, res: Response, next: NextFunction) {
  const notis = await notiService.getUnreadList(req.user.id);
  res.status(200).json(notis);
}
//------------------------------------------ 개별 알림 읽음 처리
async function read(req: Request, res: Response, next: NextFunction) {
  const notiId = req.params.notificationId as string;
  const notification = await notiService.read(req.user.id, notiId);
  res.status(200).json(notification);
}
//------------------------------------------ 일괄 알림 읽음 처리
async function readAll(req: Request, res: Response, next: NextFunction) {
  const message = await notiService.readAll(req.user.id);
  res.status(200).send({ message });
}
//------------------------------------------ 추가기능: 알림 보내기
async function send(req: Request, res: Response, next: NextFunction) {
  const noti = await notiService.send(req.body);
  res.status(200).json(noti);
}

export default {
  stream,
  startNotiScheduler,
  read,
  getList,
  getUnreadList,
  readAll,
  send
};
