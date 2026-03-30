"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const withTryCatch_1 = __importDefault(require("../../lib/withTryCatch"));
const authenticate_1 = __importDefault(require("../../middleware/authenticate"));
const authorize_1 = __importDefault(require("../../middleware/authorize"));
const event_control_1 = __importDefault(require("./event.control"));
const validateReq_1 = require("../../middleware/validateReq");
const event_schema_1 = require("./event.schema");
const eventRouter = express_1.default.Router();
// 목록 조회
// 필수: apartmentId, year, month
eventRouter.get('/', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.USER, client_1.UserType.ADMIN), (0, validateReq_1.validateQuery)(event_schema_1.eventQuery, event_schema_1.eventQueryShape), (0, withTryCatch_1.default)(event_control_1.default.getList));
eventRouter.put('/', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.ADMIN), (0, validateReq_1.validateBody)(event_schema_1.eventUpsertBody), (0, withTryCatch_1.default)(event_control_1.default.put));
eventRouter.delete('/:eventId', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.ADMIN), (0, validateReq_1.validateParams)(event_schema_1.eventParams), (0, withTryCatch_1.default)(event_control_1.default.del));
exports.default = eventRouter;
