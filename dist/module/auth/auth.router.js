"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const auth_control_1 = __importDefault(require("./auth.control"));
const withTryCatch_1 = __importDefault(require("../../lib/withTryCatch"));
const authenticate_1 = __importDefault(require("../../middleware/authenticate"));
const authorize_1 = __importDefault(require("../../middleware/authorize"));
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const validateReq_1 = require("../../middleware/validateReq");
const auth_schema_1 = require("./auth.schema");
const authRouter = express_1.default.Router();
// 가입신청
authRouter.post('/signup', (0, validateReq_1.validateBody)(auth_schema_1.userSignupBody), (0, withTryCatch_1.default)(auth_control_1.default.signup));
authRouter.post('/signup/admin', (0, validateReq_1.validateBody)(auth_schema_1.adminSignupBody), (0, withTryCatch_1.default)(auth_control_1.default.signupAdmin));
authRouter.post('/signup/super-admin', (0, validateReq_1.validateBody)(auth_schema_1.superAdminSignupBody), (0, withTryCatch_1.default)(auth_control_1.default.signupSuperAdmin));
// 로그인 / 로그아웃
authRouter.post('/login', (0, validateReq_1.validateBody)(auth_schema_1.loginBody), (0, withTryCatch_1.default)(auth_control_1.default.login));
authRouter.post('/logout', (0, authenticate_1.default)(), (0, withTryCatch_1.default)(auth_control_1.default.logout));
// 토큰 재발행
authRouter.post('/refresh', (0, withTryCatch_1.default)(auth_control_1.default.issueTokens));
authRouter.get('/refresh/view', (0, withTryCatch_1.default)(auth_control_1.default.viewTokens)); // 토큰 확인: 부가 기능
// 최고관리자: 관리자 목록조회: 부가 기능
authRouter.get('/admins', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.SUPER_ADMIN), (0, withTryCatch_1.default)(auth_control_1.default.getAdminList));
// 최고관리자: 관리자 목록조회: 부가 기능
authRouter.get('/apartments', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.SUPER_ADMIN), (0, withTryCatch_1.default)(auth_control_1.default.getAptList));
// 최고관리자: 관리자 가입상태 변경: PENDING -> 승인/거절
authRouter.patch('/admins/:adminId/status', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.SUPER_ADMIN), (0, validateReq_1.validateParams)(auth_schema_1.authAdminParams), (0, validateReq_1.validateBody)(auth_schema_1.authStatusBody), (0, withTryCatch_1.default)(auth_control_1.default.changeAdminStatus));
// 최고관리자: 관리자 가입상태 일괄 변경: PENDING -> 승인/거절
authRouter.patch('/admins/status', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.SUPER_ADMIN), (0, validateReq_1.validateBody)(auth_schema_1.authStatusBody), (0, withTryCatch_1.default)(auth_control_1.default.changeAllAdminsStatus));
// 최고관리자: 관리자 정보 수정
authRouter.patch('/admins/:adminId', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.SUPER_ADMIN), (0, validateReq_1.validateParams)(auth_schema_1.authAdminParams), (0, validateReq_1.validateBody)(auth_schema_1.patchAdminBody), (0, withTryCatch_1.default)(auth_control_1.default.patchAdminApt));
// 최고관리자: 관리자 정보 삭제
authRouter.delete('/admins/:adminId', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.SUPER_ADMIN), (0, validateReq_1.validateParams)(auth_schema_1.authAdminParams), (0, withTryCatch_1.default)(auth_control_1.default.deleteAdmin));
// 관라지: 주민 관리상태 변경: PENDING --> 승인/거절
authRouter.patch('/residents/:residentId/status', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.ADMIN), (0, validateReq_1.validateParams)(auth_schema_1.authResidentParams), (0, validateReq_1.validateBody)(auth_schema_1.authStatusBody), (0, withTryCatch_1.default)(auth_control_1.default.changeResidentStatus));
// 관라지: 주민 관리상태 일괄변경: PENDING --> 승인/거절
authRouter.patch('/residents/status', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.ADMIN), (0, validateReq_1.validateBody)(auth_schema_1.authStatusBody), (0, withTryCatch_1.default)(auth_control_1.default.changeAllResidentsStatus));
// 최고관리자/관리자: 거절된 관리자/주민 일괄 정리
authRouter.post('/cleanup', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.SUPER_ADMIN, client_1.UserType.ADMIN), (0, withTryCatch_1.default)(auth_control_1.default.cleanup));
exports.default = authRouter;
