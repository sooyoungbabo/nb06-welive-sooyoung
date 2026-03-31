"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateNotification = void 0;
const superstruct_1 = require("superstruct");
const commonStructs_1 = require("../../middleware/commonStructs");
exports.CreateNotification = (0, superstruct_1.object)({
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
