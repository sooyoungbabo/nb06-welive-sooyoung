"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventQuery = exports.eventQueryShape = exports.eventUpsertBody = exports.eventParams = void 0;
const superstruct_1 = require("superstruct");
const commonStructs_1 = require("../../middleware/commonStructs");
//-------------------------------------------- Params schema
exports.eventParams = (0, superstruct_1.object)({
    eventId: (0, superstruct_1.string)()
});
//-------------------------------------------- Body schema
exports.eventUpsertBody = (0, superstruct_1.object)({
    boardType: (0, superstruct_1.enums)(['NOTICE', 'POLL']),
    boardId: commonStructs_1.uuidStruct, // pollId or noticeId
    startDate: commonStructs_1.dateFromStrStruct,
    endDate: commonStructs_1.dateFromStrStruct
});
//-------------------------------------------- Query schema
exports.eventQueryShape = {
    apartmentId: commonStructs_1.uuidStruct,
    year: (0, superstruct_1.size)(commonStructs_1.str2numStruct, 2025, 2027),
    month: (0, superstruct_1.size)(commonStructs_1.str2numStruct, 1, 12)
};
exports.eventQuery = (0, superstruct_1.object)(exports.eventQueryShape);
