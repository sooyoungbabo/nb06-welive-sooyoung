"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userParams = void 0;
const superstruct_1 = require("superstruct");
//------------------------------------------------- params schema
exports.userParams = (0, superstruct_1.object)({
    userId: (0, superstruct_1.string)()
});
