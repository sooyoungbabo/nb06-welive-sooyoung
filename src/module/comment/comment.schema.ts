import { enums, object, partial, string } from 'superstruct';
import { uuidStruct } from '../../middleware/commonStructs';

//-------------------------------------------- Params schema
export const commentParams = object({
  commentId: string()
});

//-------------------------------------------- Body schema
export const commentCreateBody = object({
  content: string(),
  targetType: enums(['NOTICE', 'COMPLAINT']),
  targetId: uuidStruct
});

export const commentPatchBody = partial({
  content: string(),
  targetType: enums(['NOTICE', 'COMPLAINT']),
  targetId: uuidStruct
});
