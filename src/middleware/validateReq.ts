import { Request, Response, NextFunction } from 'express';
import { Struct, StructError, assert, create } from 'superstruct';
import BadRequestError from './errors/BadRequestError';

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

export function validateQuery(
  schema: Struct<any, any>,
  shape: Record<string, any>
) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const invalidKeys = Object.keys(req.query).filter(
        (k) => !Object.prototype.hasOwnProperty.call(shape, k)
      );

      if (invalidKeys.length > 0) {
        throw new BadRequestError(
          `Invalid query keys: ${invalidKeys.join(', ')}`
        );
      }

      req.body = create(req.query, schema);

      next();
    } catch (err: any) {
      const field = err.path?.[0] ?? 'query';

      throw new BadRequestError(`${field} 값이 올바르지 않습니다.`);
    }
  };
}

export function validateBody(schema: Struct<any, any>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = create(req.body, schema);
      next();
    } catch (err) {
      if (err instanceof StructError) {
        const failure = [...err.failures()][0];

        throw new BadRequestError(`${failure.key} 값이 올바르지 않습니다.`);
      }
    }
  };
}
