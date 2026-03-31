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
const event_service_1 = __importDefault(require("./event.service"));
function getList(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const events = yield event_service_1.default.getList(req.user.id, req.body);
        res.status(200).json(events);
    });
}
function put(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const event = yield event_service_1.default.put(req.user.id, req.body);
        res.status(200).json(event);
    });
}
function del(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const eventId = req.params.eventId;
        const event = yield event_service_1.default.del(req.user.id, eventId);
        res.status(200).json(event);
    });
}
exports.default = {
    getList,
    put,
    del
};
