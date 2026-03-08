import * as s from 'superstruct';
import {
  contactStruct,
  emailStruct,
  urlStruct,
  usernameStruct
} from '../../middleware/commonStructs';

export const CreateUser = s.object({
  apartmentId: s.optional(s.string()),
  username: usernameStruct,
  password: s.string(), // hashing 후, 비번 제약은 미들웨어 validateBody에서 이미 했음
  contact: contactStruct,
  name: s.string(),
  email: emailStruct,
  role: s.enums(['USER', 'ADMIN', 'SUPER_ADMIN']),
  joinStatus: s.enums(['PENDING', 'APPROVED', 'REJECTED', 'NEED_UPDATE', 'MOVED_OUT']),
  avatar: s.optional(urlStruct)
});

export const PatchUser = s.partial(CreateUser);
