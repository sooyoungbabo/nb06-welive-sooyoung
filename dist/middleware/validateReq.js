"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateParams = validateParams;
exports.validateQuery = validateQuery;
exports.validateBody = validateBody;
const superstruct_1 = require("superstruct");
const BadRequestError_1 = __importDefault(require("./errors/BadRequestError"));
function validateParams(schema) {
    return (req, _res, next) => {
        try {
            (0, superstruct_1.assert)(req.params, schema);
            next();
        }
        catch (err) {
            next(err);
        }
    };
}
function validateQuery(schema, shape) {
    return (req, _res, next) => {
        var _a, _b;
        try {
            const invalidKeys = Object.keys(req.query).filter((k) => !Object.prototype.hasOwnProperty.call(shape, k));
            if (invalidKeys.length > 0) {
                throw new BadRequestError_1.default(`Invalid query keys: ${invalidKeys.join(', ')}`);
            }
            req.body = (0, superstruct_1.create)(req.query, schema);
            next();
        }
        catch (err) {
            const field = (_b = (_a = err.path) === null || _a === void 0 ? void 0 : _a[0]) !== null && _b !== void 0 ? _b : 'query';
            throw new BadRequestError_1.default(`${field} 값이 올바르지 않습니다.`);
        }
    };
}
function validateBody(schema) {
    return (req, _res, next) => {
        try {
            req.body = (0, superstruct_1.create)(req.body, schema);
            next();
        }
        catch (err) {
            if (err instanceof superstruct_1.StructError) {
                const failure = [...err.failures()][0];
                throw new BadRequestError_1.default(`${failure.key} 값이 올바르지 않습니다.`);
            }
        }
    };
}
