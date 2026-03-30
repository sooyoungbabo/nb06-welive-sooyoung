import { boolean, enums, object, string } from 'superstruct';
import { uuidStruct } from '../../middleware/commonStructs';

export const CreateNotification = object({
  notiType: enums([
    'AUTH_ADMIN_APPLIED',
    'AUTH_USER_APPLIED',
    'AUTH_USER_APPROVED',
    'NOTICE',
    'COMPLAINT_RAISED',
    'COMPLAINT_RESOLVED',
    'POLL_CLOSED'
  ]),
  targetId: uuidStruct,
  content: string()
});
