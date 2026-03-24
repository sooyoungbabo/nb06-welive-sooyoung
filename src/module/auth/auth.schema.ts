import { assign, enums, integer, literal, min, object, string } from 'superstruct';
import {
  contactStruct,
  emailStruct,
  passwordStruct,
  str4numStruct,
  usernameStruct
} from '../../middleware/commonStructs';

//-------------------------------------------- params schema
export const authAdminParams = object({
  adminId: string()
});

export const authResidentParams = object({
  residentId: string()
});
//-------------------------------------------- body schema

export const baseSignupBody = object({
  username: usernameStruct,
  password: passwordStruct,
  contact: contactStruct,
  name: string(),
  email: emailStruct
});

export const userSignupBody = assign(
  baseSignupBody,
  object({
    role: literal('USER'),
    apartmentName: string(),
    apartmentDong: str4numStruct,
    apartmentHo: str4numStruct
  })
);

export const adminSignupBody = assign(
  baseSignupBody,
  object({
    description: string(),
    startComplexNumber: literal(1),
    startDongNumber: literal(1),
    startFloorNumber: literal(1),
    startHoNumber: literal(1),
    endComplexNumber: min(integer(), 1),
    endDongNumber: min(integer(), 1),
    endFloorNumber: min(integer(), 1),
    endHoNumber: min(integer(), 1),
    role: literal('ADMIN'),
    apartmentName: string(),
    apartmentAddress: string(),
    apartmentManagementNumber: contactStruct
  })
);

export const superAdminSignupBody = assign(
  baseSignupBody,
  object({
    role: literal('SUPER_ADMIN'),
    joinStatus: literal('APPROVED')
  })
);

export const loginBody = object({
  username: usernameStruct,
  password: passwordStruct
});

export const authStatusBody = object({
  status: enums(['APPROVED', 'REJECTED'])
});

export const patchAdminBody = object({
  contact: contactStruct,
  name: string(),
  email: emailStruct,
  description: string(),
  apartmentName: string(),
  apartmentAddress: string(),
  apartmentManagementNumber: contactStruct
});
