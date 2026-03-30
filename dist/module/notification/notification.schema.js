"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notiSendBody = exports.notiParams = void 0;
const superstruct_1 = require("superstruct");
const commonStructs_1 = require("../../middleware/commonStructs");
//-------------------------------------------- Params schema
exports.notiParams = (0, superstruct_1.object)({
    notificationId: (0, superstruct_1.string)()
});
//-------------------------------------------- Boey schema
exports.notiSendBody = (0, superstruct_1.object)({
    receiverId: commonStructs_1.uuidStruct,
    notiType: (0, superstruct_1.enums)([
        'AUTH_ADMIN_APPLIED',
        'AUTH_USER_APPLIED',
        'AUTH_USER_APPROVED',
        'NOTICE',
        'COMPLAINT_RAISED',
        'COMPLAINT_RESOLVED',
        'POLL_CLOSED'
    ]),
    targetId: commonStructs_1.uuidStruct,
    content: (0, superstruct_1.string)()
});
