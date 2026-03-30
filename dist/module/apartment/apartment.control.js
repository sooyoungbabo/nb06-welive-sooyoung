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
const apartment_service_1 = __importDefault(require("./apartment.service"));
function publicGetList(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const query = req.query;
        const apts = yield apartment_service_1.default.publicGetList(query);
        res.status(200).json({ apartments: apts, count: apts.length });
    });
}
function publicGet(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const apt = yield apartment_service_1.default.publicGet(req.params.id);
        res.status(200).json(apt);
    });
}
function getList(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const query = req.query;
        const { apartments, totalCount } = yield apartment_service_1.default.getList(req.user.id, query);
        res.status(200).json({ apartments, totalCount });
    });
}
function get(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const apt = yield apartment_service_1.default.get(req.user.id, req.params.id);
        res.status(200).json(apt);
    });
}
exports.default = {
    publicGetList,
    publicGet,
    getList,
    get
};
