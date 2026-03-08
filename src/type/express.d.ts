import 'express';
import { User, UserType } from '@prisma/client';
import { ResourceLimits } from 'node:worker_threads';

// service 단에서 DB 조회를 줄이기 위하여
type AuthUser = {
  id: string;
  userType: UserType;
  adminId?: string;
  apartmentId?: string;
  residentId?: string;
};

type Resource = {
  complaint?: Complaint;
  poll?: Poll;
  comment?: Comment;
};

declare global {
  namespace Express {
    interface Request {
      user: AuthUser;
      resource?: Resource;
    }
  }
}
