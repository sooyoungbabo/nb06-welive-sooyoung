import { ResidenceStatus } from '@prisma/client';
import { object, string, pattern, enums, optional, size } from 'superstruct';

//------------------------------------------------- params schema
export const residentParams = object({
  id: string()
});

//------------------------------------------------- query schema
const str4numStruct = pattern(string(), /^\d+$/);
const contactStruct = pattern(size(string(), 11, 13), /^\d{2,3}-\d{3,4}-\d{4}$/);

export const residentListQueryShape = {
  page: optional(str4numStruct),
  limit: optional(str4numStruct),
  building: optional(str4numStruct),
  unitNumber: optional(str4numStruct),
  residenceStatus: optional(enums(['RESIDENCE', 'NO_RESIDENCE'])),
  isRegistered: optional(enums(['true', 'false'])),
  keyword: optional(size(string(), 1, 100))
};
export const residentListQuery = object(residentListQueryShape);

//------------------------------------------------- body schema
export const residentCreateBody = object({
  building: str4numStruct,
  unitNumber: str4numStruct,
  contact: contactStruct,
  name: string(),
  isHouseholder: enums(['HOUSEHOLDER', 'MEMBER'])
});
