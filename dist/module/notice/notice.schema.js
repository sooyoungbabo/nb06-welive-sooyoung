"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoticeQuery = exports.NoticeQueryShape = exports.noticePatchBody = exports.pollNoticeCreateBody = exports.noticeCreateBody = exports.noticeParams = void 0;
const superstruct_1 = require("superstruct");
const commonStructs_1 = require("../../middleware/commonStructs");
//-------------------------------------------- Params schema
exports.noticeParams = (0, superstruct_1.object)({
    noticeId: (0, superstruct_1.string)()
});
//-------------------------------------------- Body schema
exports.noticeCreateBody = (0, superstruct_1.object)({
    category: (0, superstruct_1.enums)([
        'MAINTENANCE',
        'EMERGENCY',
        'COMMUNITY',
        'RESIDENT_VOTE',
        'RESIDENT_COUNCIL',
        'ETC'
    ]),
    title: (0, superstruct_1.size)((0, superstruct_1.string)(), 1, 200),
    content: (0, superstruct_1.string)(),
    boardId: commonStructs_1.uuidStruct,
    isPinned: (0, superstruct_1.boolean)(),
    startDate: (0, superstruct_1.optional)(commonStructs_1.dateFromStrStruct),
    endDate: (0, superstruct_1.optional)(commonStructs_1.dateFromStrStruct),
    pollId: (0, superstruct_1.optional)(commonStructs_1.uuidStruct)
});
exports.pollNoticeCreateBody = (0, superstruct_1.object)({
    category: (0, superstruct_1.enums)([
        'MAINTENANCE',
        'EMERGENCY',
        'COMMUNITY',
        'RESIDENT_VOTE',
        'RESIDENT_COUNCIL',
        'ETC'
    ]),
    title: (0, superstruct_1.size)((0, superstruct_1.string)(), 1, 200),
    content: (0, superstruct_1.string)(),
    boardId: commonStructs_1.uuidStruct,
    isPinned: (0, superstruct_1.boolean)(),
    startDate: (0, superstruct_1.date)(),
    endDate: (0, superstruct_1.date)(),
    pollId: commonStructs_1.uuidStruct
});
exports.noticePatchBody = (0, superstruct_1.partial)({
    category: (0, superstruct_1.enums)([
        'MAINTENANCE',
        'EMERGENCY',
        'COMMUNITY',
        'RESIDENT_VOTE',
        'RESIDENT_COUNCIL',
        'ETC'
    ]),
    title: (0, superstruct_1.size)((0, superstruct_1.string)(), 1, 200),
    content: (0, superstruct_1.string)(),
    boardId: commonStructs_1.uuidStruct,
    isPinned: (0, superstruct_1.boolean)(),
    startDate: commonStructs_1.dateFromStrStruct,
    endDate: commonStructs_1.dateFromStrStruct,
    userId: commonStructs_1.uuidStruct
});
//-------------------------------------------- Query schema
exports.NoticeQueryShape = {
    page: (0, superstruct_1.optional)(commonStructs_1.str4numStruct),
    limit: (0, superstruct_1.optional)(commonStructs_1.str4numStruct),
    category: (0, superstruct_1.optional)((0, superstruct_1.enums)([
        'MAINTENANCE',
        'EMERGENCY',
        'COMMUNITY',
        'RESIDENT_VOTE',
        'RESICENT_COUNCIL',
        'ETC'
    ])),
    keyword: (0, superstruct_1.optional)((0, superstruct_1.size)((0, superstruct_1.string)(), 1, 100)) // title, content
};
exports.NoticeQuery = (0, superstruct_1.object)(exports.NoticeQueryShape);
