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
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const authenticate_1 = __importDefault(require("../../middleware/authenticate"));
const notification_sse_1 = require("../notification/notification.sse");
const tokenDev_1 = require("../../lib/tokenDev");
const constants_1 = require("../../lib/constants");
const auth_service_session_1 = __importDefault(require("../auth/auth.service.session"));
const auth_control_1 = require("../auth/auth.control");
const devRouter = express_1.default.Router();
devRouter.get('/superAdmin', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../../../public/superAdmin.html'));
});
devRouter.get('/admin', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../../../public/admin.html'));
});
devRouter.get('/user', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../../../public/user.html'));
});
devRouter.get('/test-noti', (0, authenticate_1.default)(), (req, res) => {
    const user = req.user;
    (0, notification_sse_1.sendToUser)(user.id, `[알림] 테스트 for ${user.role}`);
    console.log('');
    res.send('sent');
});
devRouter.get('/token', (0, authenticate_1.default)(), (req, res, next) => {
    var _a;
    // brower의 tokens을 서버에 전달하여 서버 개발용 인증으로 사용
    const access = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a[constants_1.ACCESS_TOKEN_COOKIE_NAME];
    console.log(`${req.user.role}`);
    (0, tokenDev_1.setDevTokens)(access !== null && access !== void 0 ? access : null);
    // console.log(`accessToken_dev:  ${access}`);
    console.log('');
    res.json({ ok: true });
});
devRouter.get('/token/refresh', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const refresh = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a[constants_1.REFRESH_TOKEN_COOKIE_NAME];
    const { accessToken, refreshToken } = yield auth_service_session_1.default.issueTokens(refresh);
    (0, auth_control_1.setTokenCookies)(res, accessToken, refreshToken);
    console.log('');
    console.log(`Token refreshed`);
    (0, tokenDev_1.setDevTokens)(accessToken);
    console.log('');
    res.json({ ok: true });
}));
exports.default = devRouter;
