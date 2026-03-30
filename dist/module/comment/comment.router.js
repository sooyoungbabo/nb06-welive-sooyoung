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
const comment_control_1 = __importDefault(require("./comment.control"));
const validateReq_1 = require("../../middleware/validateReq");
const comment_schema_1 = require("./comment.schema");
const commentRouter = express_1.default.Router();
// 댓글 등록
commentRouter.post('/', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.USER, client_1.UserType.ADMIN), (0, validateReq_1.validateBody)(comment_schema_1.commentCreateBody), (0, withTryCatch_1.default)(comment_control_1.default.create));
// 댓글 수정
commentRouter.patch('/:commentId', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.USER, client_1.UserType.ADMIN), (0, validateReq_1.validateParams)(comment_schema_1.commentParams), (0, validateReq_1.validateBody)(comment_schema_1.commentPatchBody), (0, withTryCatch_1.default)(comment_control_1.default.patch));
// 댓글 삭제
commentRouter.delete('/:commentId', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.USER, client_1.UserType.ADMIN), (0, validateReq_1.validateParams)(comment_schema_1.commentParams), (0, withTryCatch_1.default)(comment_control_1.default.del));
exports.default = commentRouter;
