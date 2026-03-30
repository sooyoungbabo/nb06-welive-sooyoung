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
const complaint_service_1 = __importDefault(require("./complaint.service"));
const node_console_1 = require("node:console");
const complaint_struct_1 = require("./complaint.struct");
function create(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        (0, node_console_1.assert)(req.body, complaint_struct_1.CreateComplaint);
        const complaint = yield complaint_service_1.default.create(req.user.id, req.body);
        res.status(201).send({ message: '정상적으로 등록 처리되었습니다.' });
    });
}
function getList(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const query = req.query;
        const { complaints, totalCount } = yield complaint_service_1.default.getList(req.user.id, query);
        res.status(200).json({ complaints, count: complaints.length, totalCount });
    });
}
function get(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const complaint = yield complaint_service_1.default.get(req.user.id, req.params.complaintId);
        res.status(200).json(complaint);
    });
}
function patch(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        (0, node_console_1.assert)(req.body, complaint_struct_1.PatchComplaint);
        const complaint = yield complaint_service_1.default.patch(req.user.id, req.params.complaintId, req.body);
        res.status(200).json(complaint);
    });
}
function del(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const complaint = yield complaint_service_1.default.del(req.user.id, req.params.complaintId);
        res.status(200).send({ message: '정상적으로 삭제 처리되었습니다.' });
    });
}
function changeStatus(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const complaint = yield complaint_service_1.default.changeStatus(req.user.id, req.params.complaintId, req.body.status);
        res.status(200).json(complaint);
    });
}
exports.default = {
    create,
    getList,
    get,
    patch,
    del,
    changeStatus
};
