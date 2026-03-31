"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const poll_control_1 = __importDefault(require("./poll.control"));
const authenticate_1 = __importDefault(require("../../middleware/authenticate"));
const withTryCatch_1 = __importDefault(require("../../lib/withTryCatch"));
const validateReq_1 = require("../../middleware/validateReq");
const poll_schema_1 = require("./poll.schema");
const client_1 = require("@prisma/client");
const authorize_1 = __importDefault(require("../../middleware/authorize"));
const pollRouter = express_1.default.Router();
// 생성: 관리자 권한
pollRouter.post('/', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.ADMIN), (0, validateReq_1.validateBody)(poll_schema_1.pollCreateBody), (0, withTryCatch_1.default)(poll_control_1.default.create));
// 목록조회: 관리자, 입주자 가능
pollRouter.get('/', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.ADMIN, client_1.UserType.USER), // 사용자 모두 조회 가능?
(0, validateReq_1.validateQuery)(poll_schema_1.pollListQuery, poll_schema_1.pollListQueryShape), (0, withTryCatch_1.default)(poll_control_1.default.getList));
// 상세조회: 모든 사용자 가능
pollRouter.get('/:pollId', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.ADMIN, client_1.UserType.USER), // 사용자 모두 조회 가능?
(0, validateReq_1.validateParams)(poll_schema_1.pollParams), (0, withTryCatch_1.default)(poll_control_1.default.get));
// 수정: 관리자
pollRouter.patch('/:pollId', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.ADMIN), (0, validateReq_1.validateParams)(poll_schema_1.pollParams), (0, validateReq_1.validateBody)(poll_schema_1.pollPatchBody), (0, withTryCatch_1.default)(poll_control_1.default.patch));
// 삭제: 관리자
pollRouter.delete('/:pollId', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.ADMIN), (0, validateReq_1.validateParams)(poll_schema_1.pollParams), (0, withTryCatch_1.default)(poll_control_1.default.del));
exports.default = pollRouter;
