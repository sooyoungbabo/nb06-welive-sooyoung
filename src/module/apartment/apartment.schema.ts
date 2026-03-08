import { object, string, pattern, enums, optional } from 'superstruct';

//------------------------------------------------- params schema
export const apartmentParams = object({
  id: string()
});

//------------------------------------------------- query schema
const str4numStruct = pattern(string(), /^\d+$/);

export const publicApartmentListQueryShape = {
  keyword: optional(string()),
  name: optional(string()),
  address: optional(string())
};
export const publicApartmentListQuery = object(publicApartmentListQueryShape);

export const apartmentListQueryShape = {
  name: optional(string()),
  address: optional(string()),
  keyword: optional(string()),
  apartmentStatus: optional(enums(['PENDING', 'APPROVED', 'REJECTED'])),
  page: optional(str4numStruct),
  limit: optional(str4numStruct)
};
export const apartmentListQuery = object(apartmentListQueryShape);
