import {
  boolean,
  date,
  enums,
  object,
  optional,
  partial,
  size,
  string
} from 'superstruct';
import {
  dateFromStrStruct,
  str4numStruct,
  uuidStruct
} from '../../middleware/commonStructs';

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
    'RESIDENT_VOTE',
    'RESIDENT_COUNCIL',
    'ETC'
  ]),
  title: size(string(), 1, 200),
  content: string(),
  boardId: uuidStruct,
  isPinned: boolean(),
  startDate: dateFromStrStruct,
  endDate: dateFromStrStruct,
  pollId: optional(uuidStruct)
});

export const pollNoticeCreateBody = object({
  category: enums([
    'MAINTENANCE',
    'EMERGENCY',
    'COMMUNITY',
    'RESIDENT_VOTE',
    'RESIDENT_COUNCIL',
    'ETC'
  ]),
  title: size(string(), 1, 200),
  content: string(),
  boardId: uuidStruct,
  isPinned: boolean(),
  startDate: date(),
  endDate: date(),
  pollId: uuidStruct
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

//-------------------------------------------- Query schema
export const NoticeQueryShape = {
  page: optional(str4numStruct),
  limit: optional(str4numStruct),
  category: optional(
    enums([
      'MAINTENANCE',
      'EMERGENCY',
      'COMMUNITY',
      'RESIDENT_VOTE',
      'RESICENT_COUNCIL',
      'ETC'
    ])
  ),
  keyword: optional(size(string(), 1, 100)) // title, content
};
export const NoticeQuery = object(NoticeQueryShape);
