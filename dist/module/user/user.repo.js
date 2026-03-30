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
function getList(args) {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma_1.default.user.findMany(args);
    });
}
function create(db, args) {
    return __awaiter(this, void 0, void 0, function* () {
        return db.user.create(args);
    });
}
function find(args) {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma_1.default.user.findUnique(args);
    });
}
function findFirst(args) {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma_1.default.user.findFirst(args);
    });
}
function findMany(db, args) {
    return __awaiter(this, void 0, void 0, function* () {
        return db.user.findMany(args);
    });
}
function patch(db, args) {
    return __awaiter(this, void 0, void 0, function* () {
        return db.user.update(args);
    });
}
function patchMany(db, args) {
    return __awaiter(this, void 0, void 0, function* () {
        return db.user.updateMany(args);
    });
}
function del(db, args) {
    return __awaiter(this, void 0, void 0, function* () {
        return db.user.delete(args);
    });
}
function softDel(db, args) {
    return __awaiter(this, void 0, void 0, function* () {
        return db.user.update(args);
    });
}
function deleteMany(db, args) {
    return __awaiter(this, void 0, void 0, function* () {
        return db.user.deleteMany(args);
    });
}
exports.default = {
    getList,
    create,
    patch,
    patchMany,
    find,
    findFirst,
    findMany,
    del,
    softDel,
    deleteMany
};
