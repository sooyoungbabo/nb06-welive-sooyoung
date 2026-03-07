import 'express';
import { User, UserType } from '@prisma/client';

// service 단에서 DB 조회를 줄이기 위하여
type AuthUser = {
  id: string;
  userType: UserType;
  adminId?: string;
  apartmentId?: string;
  residentId?: string;
};

declare global {
  namespace Express {
    interface Request {
      user: AuthUser;
    }
  }
}
