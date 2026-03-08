import { assign, enums, integer, literal, min, object, pattern, size, string } from 'superstruct';

//-------------------------------------------- params schema
export const authParams = object({
  adminId: string()
});
//-------------------------------------------- body schema
const usernameStruct = size(string(), 5, 50);
const passwordStruct = pattern(
  size(string(), 8, 128),
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d])[^\s<>'"`\\\/]{8,128}$/
);
const emailStruct = pattern(size(string(), 5, 254), /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/);
const str4numStruct = pattern(string(), /^\d+$/);
const contactStruct = pattern(size(string(), 11, 13), /^\d{2,3}-\d{3,4}-\d{4}$/);

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

export const statusBody = object({
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
