"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setTokenCookies = setTokenCookies;
const BadRequestError_1 = __importDefault(require("../../middleware/errors/BadRequestError"));
const auth_service_signup_1 = __importDefault(require("./auth.service.signup"));
const auth_service_session_1 = __importDefault(require("./auth.service.session"));
const auth_service_approval_1 = __importDefault(require("./auth.service.approval"));
const auth_service_cleanup_1 = __importDefault(require("./auth.service.cleanup"));
const constants_1 = require("../../lib/constants");
function signup(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const newUser = yield auth_service_signup_1.default.signup(req.body);
        res.status(201).json(newUser);
    });
}
function signupAdmin(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const newAdmin = yield auth_service_signup_1.default.signupAdmin(req.body);
        res.status(201).json(newAdmin);
    });
}
function signupSuperAdmin(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const newSuperAdmin = yield auth_service_signup_1.default.signupSuperAdmin(req.body);
        res.status(201).json(newSuperAdmin);
    });
}
function login(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const { userRes, accessToken, refreshToken } = yield auth_service_session_1.default.login(req.body);
        setTokenCookies(res, accessToken, refreshToken);
        res.status(200).json(userRes);
    });
}
function logout(req, res, next) {
    auth_service_session_1.default.logout(req.user.id, res);
    res.status(200).send({ message: '사용자가 로그아웃 하였습니다' });
}
function viewTokens(req, res, next) {
    const accessToken = req.cookies[constants_1.ACCESS_TOKEN_COOKIE_NAME];
    const refreshToken = req.cookies[constants_1.REFRESH_TOKEN_COOKIE_NAME];
    console.log('');
    console.log(`accessToken:  ${accessToken}`);
    console.log(`refreshToken: ${refreshToken}`);
    console.log('');
}
function issueTokens(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        let currRefreshToken = req.cookies[constants_1.REFRESH_TOKEN_COOKIE_NAME];
        const { accessToken, refreshToken } = yield auth_service_session_1.default.issueTokens(currRefreshToken);
        setTokenCookies(res, accessToken, refreshToken);
        res.status(201).send({ accessToken });
    });
}
function getAdminList(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const admins = yield auth_service_approval_1.default.getAdminList();
        res.status(200).json({ count: admins.length, admins });
    });
}
function getAptList(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const apts = yield auth_service_approval_1.default.getAptList();
        res.status(200).json({ count: apts.length, apts });
    });
}
function changeAdminStatus(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const adminId = req.params.adminId;
        if (!adminId)
            throw new BadRequestError_1.default('관리자 ID가 필요합니다.');
        const message = yield auth_service_approval_1.default.changeAdminStatus(adminId, req.body.status);
        res.status(200).send({ message });
    });
}
function changeAllAdminsStatus(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const message = yield auth_service_approval_1.default.changeAllAdminsStatus(req.body.status);
        res.status(200).send({ message });
    });
}
function changeResidentStatus(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const residentId = req.params.residentId;
        if (!residentId)
            throw new BadRequestError_1.default('입주민 ID가 필요합니다.');
        const message = yield auth_service_approval_1.default.changeResidentStatus(req.user.id, residentId, req.body.status);
        res.status(200).send({ message });
    });
}
function changeAllResidentsStatus(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const message = yield auth_service_approval_1.default.changeAllResidentsStatus(req.user.id, req.body.status);
        res.status(200).send({ message });
    });
}
function patchAdminApt(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const adminId = req.params.adminId;
        const adminPatched = yield auth_service_approval_1.default.patchAdminApt(adminId, req.body);
        res.status(200).send({ message: '작업이 성공적으로 완료되었습니다' });
    });
}
function deleteAdmin(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const adminId = req.params.adminId;
        if (constants_1.NODE_ENV === 'development')
            yield auth_service_cleanup_1.default.deleteAdmin(adminId);
        else
            yield auth_service_cleanup_1.default.softDeleteAdmin(adminId);
        res.status(200).send({ message: '관리자/아파트/보드가 성공적으로 삭제되었습니다' });
    });
}
function cleanup(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const message = yield auth_service_cleanup_1.default.cleanup(req.user.id);
        res.status(201).send({ message });
    });
}
//-------------------------------------------------- local functions
function setTokenCookies(res, accessToken, refreshToken) {
    res.cookie(constants_1.ACCESS_TOKEN_COOKIE_NAME, accessToken, {
        httpOnly: true,
        secure: false, //NODE_ENV === 'production',
        sameSite: 'lax', //NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: constants_1.ACCESS_TOKEN_MAXAGE || 10 * 60 * 60 * 1000 // 1 hour
    });
    res.cookie(constants_1.REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
        httpOnly: true,
        secure: false, //NODE_ENV === 'production',
        sameSite: 'lax', //NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: constants_1.REFRESH_TOKEN_MAXAGE || 1 * 24 * 60 * 60 * 1000, // 1 day,
        path: '/auth/refresh'
    });
}
exports.default = {
    signup,
    signupAdmin,
    signupSuperAdmin,
    login,
    logout,
    viewTokens,
    issueTokens,
    getAdminList,
    getAptList,
    changeAdminStatus,
    changeAllAdminsStatus,
    changeResidentStatus,
    changeAllResidentsStatus,
    patchAdminApt,
    deleteAdmin,
    cleanup
};
