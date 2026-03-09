import { NextFunction, Request, Response } from 'express';
import { addClient, removeClient } from './sse.manager';
import notiService from './notification.service';

function stream(req: Request, res: Response) {
  const user = req.user; // middleware에서 세팅된 사용자

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  res.flushHeaders();

  addClient(user.id, res);
  console.log('SSE connected:', req.user.id);

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  res.write(`data: connected\n\n`);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeClient(user.id);
  });
}

async function notify(req: Request, res: Response) {
  const noti = await notiService.notify(req.user.id, req.body);
  res.status(200).json(noti);
}

export default {
  stream,
  notify
};
