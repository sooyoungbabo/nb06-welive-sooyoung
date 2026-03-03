import { JoinStatus } from '@prisma/client';
import * as s from 'superstruct';

export const CreateUser = s.object({
  apartmentId: s.optional(s.string()),
  username: s.string(),
  password: s.string(), // hashed
  contact: s.string(),
  name: s.string(),
  email: s.string(),
  role: s.enums(['USER', 'ADMIN', 'SUPER_ADMIN']),
  joinStatus: s.enums(['PENDING', 'APPROVED', 'REJECTED', 'NEED_UPDATE', 'MOVED_OUT']),
  avatar: s.optional(s.string())
});

export const PatchUser = s.partial(CreateUser);

export const CreateResident = s.object({
  userId: s.optional(s.string()),
  apartmentId: s.string(),
  apartmentDong: s.string(),
  apartmentHo: s.string(),
  contact: s.string(),
  name: s.string(),
  email: s.string(),
  isRegistered: s.literal(true),
  isHouseholder: s.enums(['HOUSEHOLDER', 'MEMBER']),
  residenceStatus: s.enums(['RESIDENCE', 'NO_RESIDENCE']),
  approvalStatus: s.enums(['PENDING', 'APPROVED', 'REJECTED'])
});

export const PatchResident = s.partial(CreateResident);

export const CreateAdmin = s.object({
  username: s.string(),
  password: s.string(), // hashed
  contact: s.string(),
  name: s.string(),
  email: s.string(),
  role: s.enums(['USER', 'ADMIN', 'SUPER_ADMIN']),
  joinStatus: s.enums(['PENDING', 'APPROVED', 'REJECTED', 'NEED_UPDATE', 'MOVED_OUT'])
});

export const PatchAdmin = s.partial(CreateAdmin);

export const CreateSuperAdmin = s.object({
  username: s.string(),
  password: s.string(), // hashed
  contact: s.string(),
  name: s.string(),
  email: s.string(),
  role: s.enums(['USER', 'ADMIN', 'SUPER_ADMIN']),
  joinStatus: s.enums(['PENDING', 'APPROVED', 'REJECTED', 'NEED_UPDATE', 'MOVED_OUT'])
});
export const PatchSuperAdmin = s.partial(CreateSuperAdmin);

export const UserSignupInputStruct = s.object({
  username: s.string(),
  password: s.string(), // hashed
  contact: s.string(),
  name: s.string(),
  email: s.string(),
  role: s.enums(['USER', 'ADMIN', 'SUPER_ADMIN']),
  apartmentName: s.string(),
  apartmentDong: s.string(),
  apartmentHo: s.string()
});

export const AdminSignupInputStruct = s.object({
  username: s.string(),
  password: s.string(),
  contact: s.string(),
  name: s.string(),
  email: s.string(),
  description: s.string(),
  startComplexNumber: s.literal(1),
  endComplexNumber: s.min(s.number(), 1),
  startDongNumber: s.literal(1),
  endDongNumber: s.min(s.number(), 1),
  startFloorNumber: s.literal(1),
  endFloorNumber: s.min(s.number(), 1),
  startHoNumber: s.literal(1),
  endHoNumber: s.min(s.number(), 1),
  role: s.enums(['ADMIN']),
  apartmentName: s.string(),
  apartmentAddress: s.string(),
  apartmentManagementNumber: s.string()
});

export const SuperAdminInpuStruct = s.object({
  username: s.string(),
  password: s.string(), // hashed
  contact: s.string(),
  name: s.string(),
  email: s.string(),
  role: s.enums(['USER', 'ADMIN', 'SUPER_ADMIN']),
  joinStatus: s.literal(JoinStatus.APPROVED)
});

export const PatchAdminApt = s.partial({
  contact: s.string(),
  name: s.string(),
  email: s.string(),
  description: s.string(),
  apartmentName: s.string(),
  apartmentAddress: s.string(),
  apartmentManagementNumber: s.string()
});
