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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashingPassword = hashingPassword;
exports.check_passwordValidity = check_passwordValidity;
const bcrypt_1 = __importDefault(require("bcrypt"));
const path_1 = __importDefault(require("path"));
const prisma_1 = __importDefault(require("../../lib/prisma"));
const superstruct_1 = require("superstruct");
const BadRequestError_1 = __importDefault(require("../../middleware/errors/BadRequestError"));
const NotFoundError_1 = __importDefault(require("../../middleware/errors/NotFoundError"));
const ForbiddenError_1 = __importDefault(require("../../middleware/errors/ForbiddenError"));
const user_struct_1 = require("./user.struct");
const image_storage_1 = __importDefault(require("../../storage/image.storage"));
const user_repo_1 = __importDefault(require("./user.repo"));
const constants_1 = require("../../lib/constants");
//----------------------------------------------------- 추가 기능: 유저 목록 조회
function getList(sortParam) {
    return __awaiter(this, void 0, void 0, function* () {
        const users = yield user_repo_1.default.getList({ orderBy: { createdAt: sortParam } });
        if (users.length === 0)
            throw new NotFoundError_1.default();
        return filterPassword(users);
    });
}
//----------------------------------------------------- 추가 기능: 유저 상세 조회
function get(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield user_repo_1.default.find({
            where: { id },
            include: { resident: true, apartment: true }
        });
        if (!user)
            throw new NotFoundError_1.default('사용자를 찾을 수 없습니다.');
        const { password } = user, rest = __rest(user, ["password"]);
        return rest;
    });
}
//----------------------------------------------------- 유저 비밀번호 변경
function patchPassword(id, oldPassword, newPassword) {
    return __awaiter(this, void 0, void 0, function* () {
        if (oldPassword === newPassword)
            throw new BadRequestError_1.default('비밀번호가 같습니다.');
        const user = yield user_repo_1.default.find({
            where: { id },
            select: { password: true, name: true }
        });
        if (!user)
            throw new NotFoundError_1.default('사용자가 존재하지 않습니다.');
        if (!(yield check_passwordValidity(oldPassword, user.password)))
            throw new ForbiddenError_1.default('현재 비밀번호가 틀렸습니다.');
        const userData = { password: yield hashingPassword(newPassword) };
        (0, superstruct_1.assert)(userData, user_struct_1.PatchUser);
        const newUser = yield user_repo_1.default.patch(prisma_1.default, { where: { id }, data: userData });
        const message = `${user.name}님의 비밀번호가 성공적으로 업데이트되었습니다. 다시 로그인해주세요.`;
        return message;
    });
}
//----------------------------------------------------- 유저 프로필 이미지 업로드
function postAvatar(file, id) {
    return __awaiter(this, void 0, void 0, function* () {
        // AWS S3에 이미지 저장
        const ext = path_1.default.extname(file.originalname);
        const normalizedExt = ext.toLowerCase().startsWith('.')
            ? ext.toLowerCase()
            : `.${ext.toLowerCase()}`;
        const user = yield user_repo_1.default.find({
            where: { id },
            select: { username: true, name: true }
        });
        if (!user)
            throw new NotFoundError_1.default('사용자가 존재하지 않습니다.');
        const rawKey = `${user.username}${normalizedExt}`;
        const key = constants_1.NODE_ENV === 'production' ? `welive/${rawKey}` : `images/${rawKey}`;
        yield image_storage_1.default.saveImg(key, file); // 서버가 업로드
        const newImageUrl = `${constants_1.BASE_URL}/${key}`;
        // DB에 새 imageUrl 저장
        yield user_repo_1.default.patch(prisma_1.default, { where: { id }, data: { avatar: newImageUrl } });
        // 출력 문구;
        const message = `${user.name}님의 프로필 이미지가 성공적으로 업데이트되었습니다.`;
        return message;
    });
}
//----------------------------------------------------- 지역 함수
function filterPassword(users) {
    return users.map((_a) => {
        var { password } = _a, rest = __rest(_a, ["password"]);
        return rest;
    });
}
function hashingPassword(textPassword) {
    return __awaiter(this, void 0, void 0, function* () {
        const salt = yield bcrypt_1.default.genSalt(10);
        return yield bcrypt_1.default.hash(textPassword, salt);
    });
}
function check_passwordValidity(textPassword, savedPassword) {
    return __awaiter(this, void 0, void 0, function* () {
        const isPasswordSame = yield bcrypt_1.default.compare(textPassword, savedPassword);
        return isPasswordSame;
    });
}
exports.default = {
    getList,
    get,
    patchPassword,
    postAvatar
};
