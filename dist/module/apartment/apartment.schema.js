"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apartmentListQuery = exports.apartmentListQueryShape = exports.publicApartmentListQuery = exports.publicApartmentListQueryShape = exports.apartmentParams = void 0;
const superstruct_1 = require("superstruct");
const commonStructs_1 = require("../../middleware/commonStructs");
//------------------------------------------------- params schema
exports.apartmentParams = (0, superstruct_1.object)({
    id: (0, superstruct_1.string)()
});
//------------------------------------------------- query schema
exports.publicApartmentListQueryShape = {
    keyword: (0, superstruct_1.optional)((0, superstruct_1.string)()),
    name: (0, superstruct_1.optional)((0, superstruct_1.string)()),
    address: (0, superstruct_1.optional)((0, superstruct_1.string)())
};
exports.publicApartmentListQuery = (0, superstruct_1.object)(exports.publicApartmentListQueryShape);
exports.apartmentListQueryShape = {
    name: (0, superstruct_1.optional)((0, superstruct_1.string)()),
    address: (0, superstruct_1.optional)((0, superstruct_1.string)()),
    keyword: (0, superstruct_1.optional)((0, superstruct_1.string)()),
    apartmentStatus: (0, superstruct_1.optional)((0, superstruct_1.enums)(['PENDING', 'APPROVED', 'REJECTED'])),
    page: (0, superstruct_1.optional)(commonStructs_1.str4numStruct),
    limit: (0, superstruct_1.optional)(commonStructs_1.str4numStruct)
};
exports.apartmentListQuery = (0, superstruct_1.object)(exports.apartmentListQueryShape);
