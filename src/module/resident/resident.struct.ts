import * as s from 'superstruct';

export const CreateResident = s.object({
  userId: s.optional(s.string()),
  apartmentId: s.string(),
  apartmentDong: s.string(),
  apartmentHo: s.string(),
  contact: s.string(),
  name: s.string(),
  email: s.optional(s.string()),
  isRegistered: s.boolean(),
  isHouseholder: s.enums(['HOUSEHOLDER', 'MEMBER']),
  residenceStatus: s.enums(['RESIDENCE', 'NO_RESIDENCE']),
  approvalStatus: s.enums(['PENDING', 'APPROVED', 'REJECTED'])
});

export const PatchResident = s.partial(CreateResident);

export const ResidentQueryStruct = s.partial({
  page: s.string(),
  limit: s.string(),
  building: s.string(),
  unitNumber: s.string(),
  residenceStatus: s.enums(['RESIDENCE', 'NO_RESIDENCE']),
  isRegistered: s.boolean(),
  keyword: s.string()
});
