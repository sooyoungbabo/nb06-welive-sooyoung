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
const poll_service_1 = __importDefault(require("./poll.service"));
function create(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const poll = yield poll_service_1.default.create(req.user.id, req.body);
        res.status(201).send({ message: '정상적으로 등록처리되었습니다.' });
    });
}
function getList(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const query = req.query;
        const { polls, totalCount } = yield poll_service_1.default.getList(req.user.id, query);
        res.status(200).json({ polls, totalCount });
    });
}
function get(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const pollId = req.params.pollId;
        const poll = yield poll_service_1.default.get(req.user.id, pollId);
        res.status(200).json(poll);
    });
}
function patch(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const pollId = req.params.pollId;
        const poll = yield poll_service_1.default.patch(req.user.id, pollId, req.body);
        res.status(200).send({ message: '정상적으로 수정되었습니다.' });
    });
}
function del(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const pollId = req.params.pollId;
        const poll = yield poll_service_1.default.del(req.user.id, pollId);
        res.status(200).send({ message: '정상적으로 삭제처리되었습니다.' });
    });
}
exports.default = {
    create,
    getList,
    get,
    patch,
    del
};
