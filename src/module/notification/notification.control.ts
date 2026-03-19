import { NextFunction, Request, Response } from 'express';
import { addClient, removeClient } from './sse.manager';
import notiService from './notification.service';
import { setDevTokens } from '../../lib/tokenDev';
import { ACCESS_TOKEN_COOKIE_NAME } from '../../lib/constants';

function stream(req: Request, res: Response) {
  const user = req.user;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  res.flushHeaders();

  addClient(user.id, res);
  console.log('SSE connected:', req.user.role);
  const access = req.cookies?.[ACCESS_TOKEN_COOKIE_NAME];
  setDevTokens(access);
  console.log('');

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  res.write(`data: connected\n\n`);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeClient(user.id);
  });
}

async function getList(req: Request, res: Response, next: NextFunction) {
  const notis = await notiService.getList(req.user.id);
  res.status(200).json({ notifications: notis, count: notis?.length });
}

async function getUnreadList(req: Request, res: Response, next: NextFunction) {
  const notis = await notiService.getUnreadList(req.user.id);
  res.status(200).json({ notifications: notis, count: notis?.length });
}

async function read(req: Request, res: Response, next: NextFunction) {
  const notiId = req.params.notificationId as string;
  const notification = await notiService.read(req.user.id, notiId);
  res.status(200).json(notification);
}

async function readAll(req: Request, res: Response, next: NextFunction) {
  const message = await notiService.readAll(req.user.id);
  res.status(200).send({ message });
}

async function send(req: Request, res: Response, next: NextFunction) {
  const noti = await notiService.send(req.body);
  res.status(200).json(noti);
}

export default {
  stream,
  read,
  getList,
  getUnreadList,
  readAll,
  send
};
