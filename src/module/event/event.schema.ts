import { enums, object, optional, size, string } from 'superstruct';
import {
  dateFromStrStruct,
  str2numStruct,
  uuidStruct
} from '../../middleware/commonStructs';

//-------------------------------------------- Params schema
export const eventParams = object({
  eventId: string()
});

//-------------------------------------------- Body schema
export const eventUpsertBody = object({
  boardType: enums(['NOTICE', 'POLL']),
  boardId: uuidStruct, // pollId or noticeId
  startDate: dateFromStrStruct,
  endDate: dateFromStrStruct
});

//-------------------------------------------- Query schema
export const eventQueryShape = {
  apartmentId: uuidStruct,
  year: size(str2numStruct, 2025, 2027),
  month: size(str2numStruct, 1, 12)
};
export const eventQuery = object(eventQueryShape);
