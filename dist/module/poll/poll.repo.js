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
const prisma_1 = __importDefault(require("../../lib/prisma"));
function create(db, args) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield db.poll.create(args);
    });
}
function findMany(args) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield prisma_1.default.poll.findMany(args);
    });
}
function count(args) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield prisma_1.default.poll.count(args);
    });
}
function find(args) {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma_1.default.poll.findUnique(args);
    });
}
function findFirst(args) {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma_1.default.poll.findFirst(args);
    });
}
function patch(db, args) {
    return __awaiter(this, void 0, void 0, function* () {
        return db.poll.update(args);
    });
}
function del(db, args) {
    return __awaiter(this, void 0, void 0, function* () {
        return db.poll.delete(args);
    });
}
exports.default = {
    create,
    findMany,
    count,
    find,
    findFirst,
    patch,
    del
};
