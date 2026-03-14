import { boolean, enums, object, optional, partial, size, string } from 'superstruct';
import { dateFromStrStruct, str4numStruct, uuidStruct } from '../../middleware/commonStructs';

//-------------------------------------------- Params schema
export const noticeParams = object({
  noticeId: string()
});

//-------------------------------------------- Body schema
export const noticeCreateBody = object({
  category: enums([
    'MAINTENANCE',
    'EMERGENCY',
    'COMMUNITY',
    'RESIDENCE_VOTE',
    'RESIDENCE_COUNCIL',
    'ETC'
  ]),
  title: size(string(), 1, 200),
  content: string(),
  boardId: uuidStruct,
  isPinned: boolean(),
  startDate: dateFromStrStruct,
  endDate: dateFromStrStruct
});

export const noticePatchBody = partial({
  category: enums([
    'MAINTENANCE',
    'EMERGENCY',
    'COMMUNITY',
    'RESIDENCE_VOTE',
    'RESIDENCE_COUNCIL',
    'ETC'
  ]),
  title: size(string(), 1, 200),
  content: string(),
  boardId: uuidStruct,
  isPinned: boolean(),
  startDate: dateFromStrStruct,
  endDate: dateFromStrStruct,
  userId: uuidStruct
});

// export const NoticeTypeBody = object({
//   status: enums(['PENDING', 'IN_PROGRESS', 'CLOSED'])
// });

//-------------------------------------------- Query schema
export const NoticeQueryShape = {
  page: optional(str4numStruct),
  limit: optional(str4numStruct),
  category: optional(
    enums(['MAINTENANCE', 'EMERGENCY', 'COMMUNITY', 'RESIDENCE_VOTE', 'RESICENCE_COUNCIL', 'ETC'])
  ),
  keyword: optional(size(string(), 1, 100)) // title, content
};
export const NoticeQuery = object(NoticeQueryShape);
