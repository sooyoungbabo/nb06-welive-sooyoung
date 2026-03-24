import { array, enums, integer, min, object, optional, partial, size, string } from 'superstruct';
import { dateFromStrStruct, str4numStruct, uuidStruct } from '../../middleware/commonStructs';

//-------------------------------------------- Params schema
export const pollParams = object({
  pollId: string()
});

//-------------------------------------------- Body schema
const pollOption = object({
  title: string()
});

export const pollCreateBody = object({
  boardId: uuidStruct,
  status: enums(['PENDING', 'IN_PROGRESS', 'CLOSED']),
  title: size(string(), 1, 200),
  content: string(),
  buildingPermission: min(integer(), 0),
  startDate: dateFromStrStruct,
  endDate: dateFromStrStruct,
  options: size(array(pollOption), 2, 50)
});

export const pollPatchBody = partial(pollCreateBody);

//-------------------------------------------- Query schema
export const pollListQueryShape = {
  page: optional(str4numStruct),
  limit: optional(str4numStruct),
  buildingPermission: optional(str4numStruct),
  status: optional(enums(['PENDING', 'IN_PROGRESS', 'CLOSED'])),
  keyword: optional(size(string(), 1, 100)) // 투표 제목, 설명
};
export const pollListQuery = object(pollListQueryShape);
