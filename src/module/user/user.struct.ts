import * as s from 'superstruct';

const passwordStruct = s.pattern(
  s.size(s.string(), 8, 128),
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d])[^\s<>'"`\\\/]{8,128}$/
);

const emailStruct = s.pattern(
  s.size(s.string(), 5, 254),
  /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/
);

const dongHoStruct = s.pattern(s.string(), /^\d+$/);

const contactStruct = s.pattern(s.size(s.string(), 11, 13), /^\d{2,3}-\d{3,4}-\d{4}$/);

export const CreateUser = s.object({
  apartmentId: s.optional(s.string()),
  username: s.size(s.string(), 5, Infinity),
  password: s.string(),
  contact: contactStruct,
  name: s.string(),
  email: emailStruct,
  role: s.enums(['USER', 'ADMIN', 'SUPER_ADMIN']),
  joinStatus: s.enums(['PENDING', 'APPROVED', 'REJECTED', 'NEED_UPDATE', 'MOVED_OUT']),
  avatar: s.optional(s.string())
});

export const PatchUser = s.partial(CreateUser);

const str2num = s.coerce(s.number(), s.string(), (value) => Number(value));

// export const UserSignupInputStruct = s.object({
//   username: s.size(s.string(), 5, Infinity),
//   password: passwordStruct, // hashed
//   contact: contactStruct,
//   name: s.string(),
//   email: emailStruct,
//   role: s.enums(['USER', 'ADMIN', 'SUPER_ADMIN']),
//   apartmentName: s.string(),
//   apartmentDong: dongHoStruct,
//   apartmentHo: dongHoStruct
// });

// export const AdminSignupInputStruct = s.object({
//   username: s.size(s.string(), 5, Infinity),
//   password: passwordStruct,
//   contact: contactStruct,
//   name: s.string(),
//   email: emailStruct,
//   description: s.string(),
//   startComplexNumber: s.literal(1),
//   endComplexNumber: s.min(s.number(), 1),
//   startDongNumber: s.literal(1),
//   endDongNumber: s.min(s.number(), 1),
//   startFloorNumber: s.literal(1),
//   endFloorNumber: s.min(s.number(), 1),
//   startHoNumber: s.literal(1),
//   endHoNumber: s.min(s.number(), 1),
//   role: s.enums(['ADMIN']),
//   apartmentName: s.string(),
//   apartmentAddress: s.string(),
//   apartmentManagementNumber: s.string()
// });

// export const PatchAdminApt = s.partial({
//   contact: contactStruct,
//   name: s.string(),
//   email: emailStruct,
//   description: s.string(),
//   apartmentName: s.string(),
//   apartmentAddress: s.string(),
//   apartmentManagementNumber: contactStruct
// });
