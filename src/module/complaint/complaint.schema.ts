import { boolean, enums, object, optional, size, string } from 'superstruct';
import { str4numStruct } from '../../middleware/commonStructs';

//-------------------------------------------- Params schema
export const complaintParams = object({
  complaintId: string()
});

//-------------------------------------------- Body schema
export const complaintCreateBody = object({
  title: string(),
  content: string(),
  isPublic: boolean(),
  status: enums(['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'])
});

export const complaintStatusBody = object({
  status: enums(['APPROVED', 'RESOLVED', 'REJECTED'])
});

//-------------------------------------------- Query schema
export const complaintListQueryShape = {
  page: optional(str4numStruct),
  limit: optional(str4numStruct),
  status: optional(enums(['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'])),
  isPublic: optional(enums(['true', 'false'])),
  dong: optional(str4numStruct),
  ho: optional(str4numStruct),
  keyword: optional(size(string(), 1, 100))
};
export const complaintListQuery = object(complaintListQueryShape);
