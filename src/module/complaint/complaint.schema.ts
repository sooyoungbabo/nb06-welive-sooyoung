import { boolean, enums, object, optional, pattern, size, string } from 'superstruct';

//-------------------------------------------- Params schema
export const complaintParams = object({
  complaintId: string()
});

//-------------------------------------------- Body schema
export const complaintCreateBody = object({
  title: string(),
  content: string(),
  isPublic: boolean(),
  boardId: string(),
  status: enums(['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'])
});

//-------------------------------------------- Query schema
const str4numStruct = pattern(string(), /^\d+$/);

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
