import { Request, Response, NextFunction } from 'express';
import { Struct, assert } from 'superstruct';
import BadRequestError from './errors/BadRequestError';

export function validateQuery(schema: Struct<any, any>, shape: Record<string, any>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const invalidKeys = Object.keys(req.query).filter(
        (k) => !Object.prototype.hasOwnProperty.call(shape, k)
      );

      if (invalidKeys.length > 0) {
        throw new BadRequestError(`Invalid query keys: ${invalidKeys.join(', ')}`);
      }

      assert(req.query, schema);

      next();
    } catch (err: any) {
      const field = err.path?.[0] ?? 'query';

      throw new BadRequestError(`${field} 값이 올바르지 않습니다.`);
    }
  };
}
