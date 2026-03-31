"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.complaintListQuery = exports.complaintListQueryShape = exports.complaintStatusBody = exports.complaintPatchBody = exports.complaintCreateBody = exports.complaintParams = void 0;
const superstruct_1 = require("superstruct");
const commonStructs_1 = require("../../middleware/commonStructs");
//-------------------------------------------- Params schema
exports.complaintParams = (0, superstruct_1.object)({
    complaintId: (0, superstruct_1.string)()
});
//-------------------------------------------- Body schema
exports.complaintCreateBody = (0, superstruct_1.object)({
    title: (0, superstruct_1.string)(),
    content: (0, superstruct_1.string)(),
    isPublic: (0, superstruct_1.boolean)(),
    boardId: commonStructs_1.uuidStruct,
    status: (0, superstruct_1.enums)(['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'])
});
exports.complaintPatchBody = (0, superstruct_1.partial)({
    title: (0, superstruct_1.string)(),
    content: (0, superstruct_1.string)(),
    isPublic: (0, superstruct_1.boolean)()
});
exports.complaintStatusBody = (0, superstruct_1.object)({
    status: (0, superstruct_1.enums)(['APPROVED', 'RESOLVED', 'REJECTED'])
});
//-------------------------------------------- Query schema
exports.complaintListQueryShape = {
    page: (0, superstruct_1.optional)(commonStructs_1.str4numStruct),
    limit: (0, superstruct_1.optional)(commonStructs_1.str4numStruct),
    status: (0, superstruct_1.optional)((0, superstruct_1.enums)(['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'])),
    isPublic: (0, superstruct_1.optional)((0, superstruct_1.enums)(['true', 'false'])),
    dong: (0, superstruct_1.optional)(commonStructs_1.str4numStruct),
    ho: (0, superstruct_1.optional)(commonStructs_1.str4numStruct),
    keyword: (0, superstruct_1.optional)((0, superstruct_1.size)((0, superstruct_1.string)(), 1, 100))
};
exports.complaintListQuery = (0, superstruct_1.object)(exports.complaintListQueryShape);
