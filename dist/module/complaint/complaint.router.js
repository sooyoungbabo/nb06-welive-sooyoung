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
const complaint_control_1 = __importDefault(require("./complaint.control"));
const validateReq_1 = require("../../middleware/validateReq");
const complaint_schema_1 = require("./complaint.schema");
const complaintRouter = express_1.default.Router();
// 민원 등록
complaintRouter.post('/', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.USER), (0, validateReq_1.validateBody)(complaint_schema_1.complaintCreateBody), (0, withTryCatch_1.default)(complaint_control_1.default.create));
// 전체 민원 조회
complaintRouter.get('/', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.USER, client_1.UserType.ADMIN), (0, validateReq_1.validateQuery)(complaint_schema_1.complaintListQuery, complaint_schema_1.complaintListQueryShape), (0, withTryCatch_1.default)(complaint_control_1.default.getList));
// 민원 상세 조회
// 비공개는 작성자와 관리자만 조회 가능
complaintRouter.get('/:complaintId', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.USER, client_1.UserType.ADMIN), (0, validateReq_1.validateParams)(complaint_schema_1.complaintParams), (0, withTryCatch_1.default)(complaint_control_1.default.get));
// 일반 유저 민원 수정: 유저
complaintRouter.patch('/:complaintId', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.USER), (0, validateReq_1.validateParams)(complaint_schema_1.complaintParams), (0, validateReq_1.validateBody)(complaint_schema_1.complaintPatchBody), (0, withTryCatch_1.default)(complaint_control_1.default.patch));
// 민원 삭제: 유저, 관리자
complaintRouter.delete('/:complaintId', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.USER), (0, validateReq_1.validateParams)(complaint_schema_1.complaintParams), (0, withTryCatch_1.default)(complaint_control_1.default.del));
// 관리자 이상 민원 수정
complaintRouter.patch('/:complaintId/status', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.SUPER_ADMIN, client_1.UserType.ADMIN), (0, validateReq_1.validateParams)(complaint_schema_1.complaintParams), (0, validateReq_1.validateBody)(complaint_schema_1.complaintStatusBody), (0, withTryCatch_1.default)(complaint_control_1.default.changeStatus));
exports.default = complaintRouter;
