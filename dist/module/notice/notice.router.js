"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const notice_control_1 = __importDefault(require("./notice.control"));
const authenticate_1 = __importDefault(require("../../middleware/authenticate"));
const withTryCatch_1 = __importDefault(require("../../lib/withTryCatch"));
const authorize_1 = __importDefault(require("../../middleware/authorize"));
const client_1 = require("@prisma/client");
const validateReq_1 = require("../../middleware/validateReq");
const notice_schema_1 = require("./notice.schema");
const noticeRouter = express_1.default.Router();
// 공지사항 등록
noticeRouter.post('/', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.ADMIN), (0, validateReq_1.validateBody)(notice_schema_1.noticeCreateBody), (0, withTryCatch_1.default)(notice_control_1.default.create));
// 공지사항 조회: 검색
noticeRouter.get('/', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.ADMIN, client_1.UserType.USER), (0, validateReq_1.validateQuery)(notice_schema_1.NoticeQuery, notice_schema_1.NoticeQueryShape), (0, withTryCatch_1.default)(notice_control_1.default.getList));
// 공지사항 상세 조회
noticeRouter.get('/:noticeId', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.ADMIN, client_1.UserType.USER), (0, validateReq_1.validateParams)(notice_schema_1.noticeParams), (0, withTryCatch_1.default)(notice_control_1.default.get));
// 공지사항 수정
noticeRouter.patch('/:noticeId', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.ADMIN), (0, validateReq_1.validateParams)(notice_schema_1.noticeParams), (0, validateReq_1.validateBody)(notice_schema_1.noticePatchBody), (0, withTryCatch_1.default)(notice_control_1.default.patch));
// 공지사항 삭제
noticeRouter.delete('/:noticeId', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.ADMIN), (0, validateReq_1.validateParams)(notice_schema_1.noticeParams), (0, withTryCatch_1.default)(notice_control_1.default.del));
exports.default = noticeRouter;
