import { enums, object, string } from 'superstruct';
import { uuidStruct } from '../../middleware/commonStructs';

//-------------------------------------------- Params schema
export const notiParams = object({
  notificationId: string()
});

//-------------------------------------------- Boey schema
export const notiSendBody = object({
  receiverId: uuidStruct,
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
