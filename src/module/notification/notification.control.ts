import { NextFunction, Request, Response } from 'express';
import { CronJob } from 'cron';
import { addClient, getClient, removeClient, sendToUser } from './notification.sse';
import notiService from './notification.service';
import { setDevTokens } from '../../lib/tokenDev';
import { ACCESS_TOKEN_COOKIE_NAME } from '../../lib/constants';
import { cleanupUser, removeJob } from './notification.scheduler';

const jobs = new Map<string, CronJob>();

//------------------------------------------ 클라이언트 요청에 의한 SSE 연결
function stream(req: Request, res: Response) {
  const user = req.user;

  // SSE 헤더
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // 클라이언트 등록
  addClient(user.id, res);
  console.log('SSE connected:', req.user.role);

  const access = req.cookies?.[ACCESS_TOKEN_COOKIE_NAME];
  setDevTokens(access);

  // 초기 연결 메시지
  res.write(`data: connected\n\n`);
  (res as any).flush();

  // heartbeat
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
    (res as any).flush();
  }, 30000);

  // Step 3: 연결 즉시 ping + 1초 간격 ping
  res.write(`data: ping\n\n`); // 연결되자마자 전송
  const pingInterval = setInterval(() => {
    res.write(`data: ping ${new Date().toISOString()}\n\n`);
  }, 1000);

  // 클라이언트 연결 종료 처리
  req.on('close', () => {
    clearInterval(heartbeat);
    clearInterval(pingInterval);
    cleanupUser(user.id);
    console.log('SSE disconnected:', req.user.role);
  });
}

// function stream(req: Request, res: Response) {
//   const user = req.user;

//   // SSE 헤더
//   res.setHeader('Content-Type', 'text/event-stream');
//   res.setHeader('Cache-Control', 'no-cache');
//   res.setHeader('Connection', 'keep-alive');
//   res.flushHeaders();

//   // 클라이언트 등록
//   addClient(user.id, res);
//   console.log('SSE connected:', req.user.role);

//   const access = req.cookies?.[ACCESS_TOKEN_COOKIE_NAME];
//   setDevTokens(access);

//   // 초기 연결 메시지
//   res.write(`data: connected\n\n`);
//   (res as any).flush();

//   // heartbeat
//   const heartbeat = setInterval(() => {
//     res.write(': heartbeat\n\n');
//     (res as any).flush();
//   }, 30000);

//   // 클라이언트 연결 종료 처리
//   req.on('close', () => {
//     clearInterval(heartbeat);
//     cleanupUser(user.id);
//     console.log('SSE disconnected:', req.user.role);
//   });
// }
// function stream(req: Request, res: Response) {
//   const user = req.user;

//   res.setHeader('Content-Type', 'text/event-stream');
//   res.setHeader('Cache-Control', 'no-cache');
//   res.setHeader('Connection', 'keep-alive');
//   res.flushHeaders();

//   addClient(user.id, res);
//   console.log('SSE connected:', req.user.role);
//   const access = req.cookies?.[ACCESS_TOKEN_COOKIE_NAME];
//   setDevTokens(access);
//   console.log('');

//   const heartbeat = setInterval(() => {
//     res.write(': heartbeat\n\n');
//   }, 30000);

//   res.write(`data: connected\n\n`);
//   (res as any).flush();

//   req.on('close', () => {
//     clearInterval(heartbeat);
//     cleanupUser(user.id);
//   });
// }

//------------------------------------------ 클라이언트 요청에 의한 cron job
//                                           매 30초마다 안 읽은 알림목록 SSE 전송
async function startNotiScheduler(req: Request, res: Response) {
  const userId = req.user.id;
  const role = req.user.role;

  if (!jobs.has(userId)) {
    console.log('JOB CREATED:', role, Date.now());
    let isRunning = false;

    const job = new CronJob('*/30 * * * * *', async () => {
      console.log('JOB RUN:', role, Date.now());
      if (isRunning) return;
      isRunning = true;

      try {
        if (!getClient(userId)) {
          removeJob(userId); // SSE 연결이 없으면 cron job 삭제
          return;
        }

        const data = await notiService.getUnreadList(userId);
        sendToUser(userId, data);
      } catch (err) {
        console.error('notiScheduler error:', err);
      } finally {
        isRunning = false;
      }
    });

    jobs.set(userId, job);
    job.start();
  }

  res.status(200).json({ message: 'Notification Scheduler Started' });
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
