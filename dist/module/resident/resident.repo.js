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
function find(db, args) {
    return __awaiter(this, void 0, void 0, function* () {
        return db.resident.findUnique(args);
    });
}
function findFirst(db, args) {
    return __awaiter(this, void 0, void 0, function* () {
        return db.resident.findFirst(args);
    });
}
function findMany(args) {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma_1.default.resident.findMany(args);
    });
}
function count(args) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield prisma_1.default.resident.count(args);
    });
}
function create(db, args) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield db.resident.create(args);
    });
}
function createMany(db, data) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield db.resident.createMany({ data });
    });
}
function upsert(db, args) {
    return __awaiter(this, void 0, void 0, function* () {
        return db.resident.upsert(args);
    });
}
function patch(db, args) {
    return __awaiter(this, void 0, void 0, function* () {
        return db.resident.update(args);
    });
}
function patchMany(db, args) {
    return __awaiter(this, void 0, void 0, function* () {
        return db.resident.updateMany(args);
    });
}
function del(db, args) {
    return __awaiter(this, void 0, void 0, function* () {
        return db.resident.delete(args);
    });
}
function deleteMany(db, args) {
    return __awaiter(this, void 0, void 0, function* () {
        return db.resident.deleteMany(args);
    });
}
exports.default = {
    find,
    findFirst,
    findMany,
    count,
    create,
    createMany,
    upsert,
    patch,
    patchMany,
    del,
    deleteMany
};
