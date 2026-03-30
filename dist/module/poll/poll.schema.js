"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pollListQuery = exports.pollListQueryShape = exports.pollPatchBody = exports.pollCreateBody = exports.pollParams = void 0;
const superstruct_1 = require("superstruct");
const commonStructs_1 = require("../../middleware/commonStructs");
//-------------------------------------------- Params schema
exports.pollParams = (0, superstruct_1.object)({
    pollId: (0, superstruct_1.string)()
});
//-------------------------------------------- Body schema
const pollOption = (0, superstruct_1.object)({
    title: (0, superstruct_1.string)()
});
exports.pollCreateBody = (0, superstruct_1.object)({
    boardId: commonStructs_1.uuidStruct,
    status: (0, superstruct_1.enums)(['PENDING', 'IN_PROGRESS', 'CLOSED']),
    title: (0, superstruct_1.size)((0, superstruct_1.string)(), 1, 200),
    content: (0, superstruct_1.string)(),
    buildingPermission: (0, superstruct_1.min)((0, superstruct_1.integer)(), 0),
    startDate: commonStructs_1.dateFromStrStruct,
    endDate: commonStructs_1.dateFromStrStruct,
    options: (0, superstruct_1.size)((0, superstruct_1.array)(pollOption), 2, 50)
});
exports.pollPatchBody = (0, superstruct_1.partial)(exports.pollCreateBody);
//-------------------------------------------- Query schema
exports.pollListQueryShape = {
    page: (0, superstruct_1.optional)(commonStructs_1.str4numStruct),
    limit: (0, superstruct_1.optional)(commonStructs_1.str4numStruct),
    buildingPermission: (0, superstruct_1.optional)(commonStructs_1.str4numStruct),
    status: (0, superstruct_1.optional)((0, superstruct_1.enums)(['PENDING', 'IN_PROGRESS', 'CLOSED'])),
    keyword: (0, superstruct_1.optional)((0, superstruct_1.size)((0, superstruct_1.string)(), 1, 100)) // 투표 제목, 설명
};
exports.pollListQuery = (0, superstruct_1.object)(exports.pollListQueryShape);
