"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_control_1 = __importDefault(require("./user.control"));
const withTryCatch_1 = __importDefault(require("../../lib/withTryCatch"));
const authenticate_1 = __importDefault(require("../../middleware/authenticate"));
const multer_1 = require("../../middleware/multer");
const validateReq_1 = require("../../middleware/validateReq");
const user_schema_1 = require("./user.schema");
const userRouter = express_1.default.Router();
// 부가기능
// 사용자 목록 조회
userRouter.get('/getList', (0, withTryCatch_1.default)(user_control_1.default.getList));
// 사용자 상세 조회
userRouter.get('/:userId', (0, authenticate_1.default)(), (0, validateReq_1.validateParams)(user_schema_1.userParams), (0, withTryCatch_1.default)(user_control_1.default.get));
// 사용자 자기 정보 조회
userRouter.get('/me/myInfo', (0, authenticate_1.default)(), (0, withTryCatch_1.default)(user_control_1.default.me));
// 인증된 유저 APIs - password와 avatar 분리
// 비밀번호 수정
userRouter.patch('/me/password', (0, authenticate_1.default)(), (0, withTryCatch_1.default)(user_control_1.default.patchPassword));
// 아바타 업로드
userRouter.patch('/me/avatar', (0, authenticate_1.default)(), multer_1.uploadImage.single('image'), (0, withTryCatch_1.default)(user_control_1.default.postAvatar));
exports.default = userRouter;
