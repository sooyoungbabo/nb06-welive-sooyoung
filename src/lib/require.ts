import UnauthorizedError from '../middleware/errors/UnauthorizedError';
import { AuthUser } from '../type/express';
import ForbiddenError from '../middleware/errors/ForbiddenError';

export function requireUser(user: AuthUser): asserts user is AuthUser {
  if (!user) throw new UnauthorizedError('인증 정보가 없습니다.');
}

export function requireApartmentUser(
  user: AuthUser
): asserts user is AuthUser & { apartmentId: string } {
  if (!user) throw new UnauthorizedError('인증 정보가 없습니다.');
  if (!user.apartmentId) throw new ForbiddenError('아파트에 소속된 사용자만 이용할 수 있습니다.');
}

export function requireResidentUser(user: AuthUser): asserts user is AuthUser & {
  apartmentId: string;
  residentId: string;
  adminId: string;
} {
  if (!user) throw new UnauthorizedError('인증 정보가 없습니다.');
  if (!user.apartmentId) throw new ForbiddenError('아파트에 소속된 사용자만 이용할 수 있습니다.');
  if (!user.adminId) throw new ForbiddenError('관리자가 있는 아파트이어야 합니다.');
  if (!user.residentId) throw new ForbiddenError('입주민 명부 멤버만 이용할 수 있습니다.');
}

// export function requireApartmentUser(
//   req: Request
// ): asserts req is Request & { user: AuthUser & { apartmentId: string } } {
//   if (!req.user) throw new UnauthorizedError('인증 정보가 없습니다.');
//   if (!req.user.apartmentId)
//     throw new ForbiddenError('아파트에 소속된 사용자만 이용할 수 있습니다.');
// }

// export function requireResidentUser(req: Request): asserts req is Request & {
//   user: AuthUser & {
//     apartmentId: string;
//     residentId: string;
//     adminId: string;
//   };
// } {
//   if (!req.user) throw new UnauthorizedError('인증 정보가 없습니다.');
//   if (!req.user.apartmentId)
//     throw new ForbiddenError('아파트에 소속된 사용자만 이용할 수 있습니다.');
//   if (!req.user.adminId) throw new ForbiddenError('관리자가 있는 아파트이어야 합니다.');
//   if (!req.user.residentId) throw new ForbiddenError('입주민 명부 멤버만 이용할 수 있습니다.');
// }
