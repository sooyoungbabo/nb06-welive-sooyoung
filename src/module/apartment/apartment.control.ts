import { NextFunction, Request, Response } from 'express';
import aptService from './apartment.service';
import { ApartmentQuery } from './apartment.dto';

async function publicGetList(req: Request, res: Response, next: NextFunction) {
  const query: ApartmentQuery = req.query as ApartmentQuery;
  const apts = await aptService.publicGetList(query);
  res.status(200).json({ apartments: apts, count: apts.length });
}

async function publicGet(req: Request, res: Response, next: NextFunction) {
  const apt = await aptService.publicGet(req.params.id as string);
  res.status(200).json(apt);
}

async function getList(req: Request, res: Response, next: NextFunction) {
  const query = req.query as ApartmentQuery;
  const { apartments, totalCount } = await aptService.getList(req.user.id, query);
  res.status(200).json({ apartments, totalCount });
}

async function get(req: Request, res: Response, next: NextFunction) {
  const apt = await aptService.get(req.user.id, req.params.id as string);
  res.status(200).json(apt);
}

export default {
  publicGetList,
  publicGet,
  getList,
  get
};
