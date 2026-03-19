import 'express';
import { User, UserType } from '@prisma/client';
import { ResourceLimits } from 'node:worker_threads';
import { UUID } from 'node:crypto';

declare global {
  namespace Express {
    interface Request {
      user: User;
    }
  }
}
