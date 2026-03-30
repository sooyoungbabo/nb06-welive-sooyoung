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
const client_1 = require("@prisma/client");
const token_1 = require("../../lib/token");
const BadRequestError_1 = __importDefault(require("../../middleware/errors/BadRequestError"));
const ForbiddenError_1 = __importDefault(require("../../middleware/errors/ForbiddenError"));
const NotFoundError_1 = __importDefault(require("../../middleware/errors/NotFoundError"));
const UnauthorizedError_1 = __importDefault(require("../../middleware/errors/UnauthorizedError"));
const user_service_1 = require("../user/user.service");
const user_repo_1 = __importDefault(require("../user/user.repo"));
const constants_1 = require("../../lib/constants");
const notification_scheduler_1 = require("../notification/notification.scheduler");
//------------------------------------------------------- 로그인
function login(data) {
    return __awaiter(this, void 0, void 0, function* () {
        const args = {
            where: { username: data.username },
            include: {
                notifications: true,
                apartment: { include: { boards: true } }
            }
        };
        const user = yield user_repo_1.default.find(args);
        if (!user)
            throw new NotFoundError_1.default('사용자가 존재하지 않습니다');
        if (user.joinStatus === client_1.JoinStatus.PENDING)
            throw new BadRequestError_1.default(`계정 승인 대기 중입니다.\n승인 후 서비스 이용이 가능합니다.`);
        const isPasswordOk = yield (0, user_service_1.check_passwordValidity)(data.password, user.password);
        if (!isPasswordOk)
            throw new ForbiddenError_1.default('비밀번호가 틀렸습니다');
        if (constants_1.NODE_ENV === 'development') {
            console.log('');
            console.log(`${user.role} ${user.name}님이 로그인하셨습니다.`);
        }
        if (user.notifications.length > 0) {
            const unreadCount = user.notifications.filter((n) => n.isChecked === false).length;
            if (constants_1.NODE_ENV === 'development') {
                console.log(`읽지 않은 알림이 ${unreadCount}개 있습니다.`);
                console.log('');
            }
        }
        const { accessToken, refreshToken } = (0, token_1.generateTokens)(user.id); // 토큰 발급 (쿠키헤더)
        let userRes;
        if (user.role === client_1.UserType.SUPER_ADMIN)
            userRes = buildLoginSuperAdminRes(user);
        else
            userRes = buildLoginUserRes(user);
        return { userRes, accessToken, refreshToken };
    });
}
//------------------------------------------------------- 로그아웃
function logout(userId, tokenData) {
    (0, notification_scheduler_1.removeJob)(userId);
    clearTokenCookies(tokenData);
}
//------------------------------------------------------- 토큰 갱신
function issueTokens(refreshToken) {
    return __awaiter(this, void 0, void 0, function* () {
        const { userId } = (0, token_1.verifyRefreshToken)(refreshToken);
        const user = yield verifyUserExist(userId);
        return (0, token_1.generateTokens)(user.id);
    });
}
//-------------------------------------------------------- 지역 힘수
function verifyUserExist(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield user_repo_1.default.find({
            where: { id: userId }
        });
        if (!user)
            throw new UnauthorizedError_1.default();
        return user;
    });
}
function clearTokenCookies(tokenData) {
    tokenData.clearCookie(constants_1.ACCESS_TOKEN_COOKIE_NAME);
    tokenData.clearCookie(constants_1.REFRESH_TOKEN_COOKIE_NAME, { path: '/auth/refresh' });
    // refreshToken은 지정된 path가 있음
}
function buildLoginSuperAdminRes(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        username: user.username,
        contact: user.contact,
        avatar: user.avatar,
        joinStatus: user.joinStatus,
        isActive: true
    };
}
function buildLoginUserRes(user) {
    if (!user.apartment)
        throw new NotFoundError_1.default('관련된 아파트 정보가 없습니다');
    if (!user.apartment.boards)
        throw new NotFoundError_1.default('아파트 게시판이 없습니다');
    if (user.apartment.boards.length !== 3)
        throw new NotFoundError_1.default('아파트 게시판 수가 3이 아닙니다');
    const boardIds = {
        [client_1.BoardType.NOTICE]: user.apartment.boards.find((b) => b.boardType === client_1.BoardType.NOTICE).id,
        [client_1.BoardType.COMPLAINT]: user.apartment.boards.find((b) => b.boardType === client_1.BoardType.COMPLAINT).id,
        [client_1.BoardType.POLL]: user.apartment.boards.find((b) => b.boardType === client_1.BoardType.POLL)
            .id
    };
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        username: user.username,
        contact: user.contact,
        avatar: user.avatar,
        joinStatus: user.joinStatus,
        isActive: true,
        apartmentId: user.apartment.id,
        apartmentName: user.apartment.name,
        boardIds
    };
}
exports.default = {
    login,
    logout,
    issueTokens,
    verifyUserExist
};
