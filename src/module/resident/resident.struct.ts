import * as s from 'superstruct';

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

const str2num = s.coerce(s.number(), s.string(), (v) => (v === '' ? undefined : Number(v)));
const str2bool = s.coerce(s.boolean(), s.string(), (v) => {
  if (v === 'true') return true;
  if (v === 'false') return false;
  return v;
});

export const ResidentQueryStruct = s.partial({
  // page: s.min(str2num, 1),
  // limit: s.max(s.min(str2num, 1), 100),
  page: s.string(),
  limit: s.string(),
  building: s.string(),
  unitNumber: s.string(),
  residenceStatus: s.enums(['RESIDENCE', 'NO_RESIDENCE']),
  isRegistered: s.boolean(),
  // isRegistered: str2bool,
  keyword: s.string()
});
