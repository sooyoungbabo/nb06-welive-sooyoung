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
const user_service_1 = __importDefault(require("./user.service"));
const constants_1 = require("../../lib/constants");
const auth_service_session_1 = __importDefault(require("../auth/auth.service.session"));
const BadRequestError_1 = __importDefault(require("../../middleware/errors/BadRequestError"));
const NotFoundError_1 = __importDefault(require("../../middleware/errors/NotFoundError"));
const node_console_1 = require("node:console");
const user_struct_1 = require("./user.struct");
function getList(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (constants_1.NODE_ENV === 'development') {
            const sortParam = (_a = req.query.sort) !== null && _a !== void 0 ? _a : 'desc';
            const users = yield user_service_1.default.getList(sortParam);
            res.status(200).json(users);
        }
        else {
            res.status(200).send({ message: '개발자 옵션입니다' });
        }
    });
}
function get(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (constants_1.NODE_ENV === 'development') {
            const user = yield user_service_1.default.get(req.params.userId);
            res.status(200).json(user);
        }
        else {
            res.status(200).send({ message: '개발자 옵션입니다' });
        }
    });
}
function me(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield user_service_1.default.get(req.user.id);
        res.status(200).json(user);
    });
}
function patchPassword(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const { currentPassword, newPassword } = req.body;
        (0, node_console_1.assert)({ password: newPassword }, user_struct_1.PatchUser);
        const message = yield user_service_1.default.patchPassword(req.user.id, currentPassword, newPassword);
        auth_service_session_1.default.logout(req.user.id, res);
        res.status(200).send({ message });
    });
}
function postAvatar(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.file)
            throw new BadRequestError_1.default('이미지 화일이 존재하지 않습니다');
        const item = yield user_service_1.default.postAvatar(req.file, req.user.id);
        if (!item)
            throw new NotFoundError_1.default();
        res.status(201).json(item);
    });
}
//-------------------------------------------------- local functions
exports.default = {
    getList,
    get,
    me,
    patchPassword,
    postAvatar
};
