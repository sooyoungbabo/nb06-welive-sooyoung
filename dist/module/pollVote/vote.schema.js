"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.voteParams = void 0;
const superstruct_1 = require("superstruct");
//-------------------------------------------- Params schema
exports.voteParams = (0, superstruct_1.object)({
    optionId: (0, superstruct_1.string)()
});
