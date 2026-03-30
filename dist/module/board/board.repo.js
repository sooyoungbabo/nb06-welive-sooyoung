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
function find(args) {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma_1.default.board.findUnique(args);
    });
}
function findFirst(args) {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma_1.default.board.findFirst(args);
    });
}
function findMany(args) {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma_1.default.board.findMany(args);
    });
}
function count(db, args) {
    return __awaiter(this, void 0, void 0, function* () {
        return db.board.count(args);
    });
}
function createMany(db, data) {
    return __awaiter(this, void 0, void 0, function* () {
        return db.board.createMany({ data });
    });
}
function updateMany(db, args) {
    return __awaiter(this, void 0, void 0, function* () {
        return db.board.updateMany(args);
    });
}
function deleteMany(db, args) {
    return __awaiter(this, void 0, void 0, function* () {
        return db.board.deleteMany(args);
    });
}
exports.default = {
    find,
    findFirst,
    findMany,
    count,
    createMany,
    updateMany,
    deleteMany
};
