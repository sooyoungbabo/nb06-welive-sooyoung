import { NextFunction, Request, Response } from 'express';
import eventService from './event.service';

async function getList(req: Request, res: Response, next: NextFunction) {
  const events = await eventService.getList(req.user.id, req.body);
  res.status(200).json(events);
}

async function put(req: Request, res: Response, next: NextFunction) {
  const event = await eventService.put(req.user.id, req.body);
  res.status(200).json(event);
}

async function del(req: Request, res: Response, next: NextFunction) {
  const eventId = req.params.eventId as string;
  const event = await eventService.del(req.user.id, eventId);
  res.status(200).json(event);
}

export default {
  getList,
  put,
  del
};
