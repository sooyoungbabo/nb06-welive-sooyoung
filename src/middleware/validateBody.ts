import { Request, Response, NextFunction } from 'express';
import { Struct, StructError, assert } from 'superstruct';
import BadRequestError from './errors/BadRequestError';

export function validateBody(schema: Struct<any, any>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      assert(req.body, schema);
      next();
    } catch (err) {
      if (err instanceof StructError) {
        const failure = [...err.failures()][0];

        throw new BadRequestError(`${failure.key} 값이 올바르지 않습니다.`);
      }
    }
  };
}
