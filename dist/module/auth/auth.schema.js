"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patchAdminBody = exports.authStatusBody = exports.loginBody = exports.superAdminSignupBody = exports.adminSignupBody = exports.userSignupBody = exports.baseSignupBody = exports.authResidentParams = exports.authAdminParams = void 0;
const superstruct_1 = require("superstruct");
const commonStructs_1 = require("../../middleware/commonStructs");
//-------------------------------------------- params schema
exports.authAdminParams = (0, superstruct_1.object)({
    adminId: (0, superstruct_1.string)()
});
exports.authResidentParams = (0, superstruct_1.object)({
    residentId: (0, superstruct_1.string)()
});
//-------------------------------------------- body schema
exports.baseSignupBody = (0, superstruct_1.object)({
    username: commonStructs_1.usernameStruct,
    password: commonStructs_1.passwordStruct,
    contact: commonStructs_1.contactStruct,
    name: (0, superstruct_1.string)(),
    email: commonStructs_1.emailStruct
});
exports.userSignupBody = (0, superstruct_1.assign)(exports.baseSignupBody, (0, superstruct_1.object)({
    role: (0, superstruct_1.literal)('USER'),
    apartmentName: (0, superstruct_1.string)(),
    apartmentDong: commonStructs_1.str4numStruct,
    apartmentHo: commonStructs_1.str4numStruct
}));
exports.adminSignupBody = (0, superstruct_1.assign)(exports.baseSignupBody, (0, superstruct_1.object)({
    description: (0, superstruct_1.string)(),
    startComplexNumber: (0, superstruct_1.literal)(1),
    startDongNumber: (0, superstruct_1.literal)(1),
    startFloorNumber: (0, superstruct_1.literal)(1),
    startHoNumber: (0, superstruct_1.literal)(1),
    endComplexNumber: (0, superstruct_1.min)((0, superstruct_1.integer)(), 1),
    endDongNumber: (0, superstruct_1.min)((0, superstruct_1.integer)(), 1),
    endFloorNumber: (0, superstruct_1.min)((0, superstruct_1.integer)(), 1),
    endHoNumber: (0, superstruct_1.min)((0, superstruct_1.integer)(), 1),
    role: (0, superstruct_1.literal)('ADMIN'),
    apartmentName: (0, superstruct_1.string)(),
    apartmentAddress: (0, superstruct_1.string)(),
    apartmentManagementNumber: commonStructs_1.contactStruct
}));
exports.superAdminSignupBody = (0, superstruct_1.assign)(exports.baseSignupBody, (0, superstruct_1.object)({
    role: (0, superstruct_1.literal)('SUPER_ADMIN'),
    joinStatus: (0, superstruct_1.literal)('APPROVED')
}));
exports.loginBody = (0, superstruct_1.object)({
    username: commonStructs_1.usernameStruct,
    password: commonStructs_1.passwordStruct
});
exports.authStatusBody = (0, superstruct_1.object)({
    status: (0, superstruct_1.enums)(['APPROVED', 'REJECTED'])
});
exports.patchAdminBody = (0, superstruct_1.object)({
    contact: commonStructs_1.contactStruct,
    name: (0, superstruct_1.string)(),
    email: commonStructs_1.emailStruct,
    description: (0, superstruct_1.string)(),
    apartmentName: (0, superstruct_1.string)(),
    apartmentAddress: (0, superstruct_1.string)(),
    apartmentManagementNumber: commonStructs_1.contactStruct
});
