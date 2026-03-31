"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentPatchBody = exports.commentCreateBody = exports.commentParams = void 0;
const superstruct_1 = require("superstruct");
const commonStructs_1 = require("../../middleware/commonStructs");
//-------------------------------------------- Params schema
exports.commentParams = (0, superstruct_1.object)({
    commentId: (0, superstruct_1.string)()
});
//-------------------------------------------- Body schema
exports.commentCreateBody = (0, superstruct_1.object)({
    content: (0, superstruct_1.string)(),
    commentType: (0, superstruct_1.enums)(['NOTICE', 'COMPLAINT']),
    targetId: commonStructs_1.uuidStruct
});
exports.commentPatchBody = (0, superstruct_1.partial)({
    content: (0, superstruct_1.string)(),
    commentType: (0, superstruct_1.enums)(['NOTICE', 'COMPLAINT']),
    targetId: commonStructs_1.uuidStruct
});
