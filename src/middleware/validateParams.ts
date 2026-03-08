import { Request, Response, NextFunction } from 'express';
import { Struct, assert } from 'superstruct';

export function validateParams(schema: Struct<any, any>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      assert(req.params, schema);
      next();
    } catch (err) {
      next(err);
    }
  };
}
