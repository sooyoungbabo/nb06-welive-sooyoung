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
const token_1 = require("../lib/token");
const constants_1 = require("../lib/constants");
const auth_service_session_1 = __importDefault(require("../module/auth/auth.service.session"));
const UnauthorizedError_1 = __importDefault(require("./errors/UnauthorizedError"));
function authenticate(options) {
    return (req, res, next) => __awaiter(this, void 0, void 0, function* () {
        try {
            const accessToken = req.cookies[constants_1.ACCESS_TOKEN_COOKIE_NAME];
            if (!accessToken) {
                if (options === null || options === void 0 ? void 0 : options.optional)
                    return next();
                throw new UnauthorizedError_1.default();
            }
            const { userId } = (0, token_1.verifyAccessToken)(accessToken);
            const user = yield auth_service_session_1.default.verifyUserExist(userId);
            req.user = user;
            // if (NODE_ENV === 'development')
            //   console.log(`${user.role} ${user.name} authenticated.`);
            next();
        }
        catch (err) {
            next(err);
        }
    });
}
// SSE로 연결된 client로부터 토큰 받는 함수: 개발용
// function check_accessTokenExist(cookieData: Record<string, string | undefined>) {
//   let accessToken = cookieData[ACCESS_TOKEN_COOKIE_NAME];
//   if (!accessToken && NODE_ENV === 'development') {
//     accessToken = getDevAccessToken() ?? undefined;
//   }
//   return accessToken;
// }
exports.default = authenticate;
