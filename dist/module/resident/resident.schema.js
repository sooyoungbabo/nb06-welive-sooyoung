"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.residentCreateBody = exports.residentListQuery = exports.residentListQueryShape = exports.residentParams = void 0;
const superstruct_1 = require("superstruct");
//------------------------------------------------- params schema
exports.residentParams = (0, superstruct_1.object)({
    id: (0, superstruct_1.string)()
});
//------------------------------------------------- query schema
const str4numStruct = (0, superstruct_1.pattern)((0, superstruct_1.string)(), /^\d+$/);
const contactStruct = (0, superstruct_1.pattern)((0, superstruct_1.size)((0, superstruct_1.string)(), 11, 13), /^\d{2,3}-\d{3,4}-\d{4}$/);
exports.residentListQueryShape = {
    page: (0, superstruct_1.optional)(str4numStruct),
    limit: (0, superstruct_1.optional)(str4numStruct),
    building: (0, superstruct_1.optional)(str4numStruct),
    unitNumber: (0, superstruct_1.optional)(str4numStruct),
    residenceStatus: (0, superstruct_1.optional)((0, superstruct_1.enums)(['RESIDENCE', 'NO_RESIDENCE'])),
    isRegistered: (0, superstruct_1.optional)((0, superstruct_1.enums)(['true', 'false'])),
    keyword: (0, superstruct_1.optional)((0, superstruct_1.size)((0, superstruct_1.string)(), 1, 100))
};
exports.residentListQuery = (0, superstruct_1.object)(exports.residentListQueryShape);
//------------------------------------------------- body schema
exports.residentCreateBody = (0, superstruct_1.object)({
    building: str4numStruct,
    unitNumber: str4numStruct,
    contact: contactStruct,
    name: (0, superstruct_1.string)(),
    isHouseholder: (0, superstruct_1.enums)(['HOUSEHOLDER', 'MEMBER'])
});
