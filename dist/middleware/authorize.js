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
const user_repo_1 = __importDefault(require("../module/user/user.repo"));
const ForbiddenError_1 = __importDefault(require("./errors/ForbiddenError"));
const NotFoundError_1 = __importDefault(require("./errors/NotFoundError"));
function authorize(...allowedRoles) {
    return (req, res, next) => __awaiter(this, void 0, void 0, function* () {
        try {
            const user = yield user_repo_1.default.find({ where: { id: req.user.id } });
            if (!user)
                throw new NotFoundError_1.default('사용자를 찾을 수 없습니다.');
            if (allowedRoles.length === 0) {
                return next();
            }
            if (!allowedRoles.includes(user.role)) {
                throw new ForbiddenError_1.default('권한이 없습니다');
            }
            next();
        }
        catch (err) {
            next(err);
        }
    });
}
exports.default = authorize;
