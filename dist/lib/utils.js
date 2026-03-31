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
exports.getNotiReceivers = getNotiReceivers;
exports.isSuperAdmin = isSuperAdmin;
exports.getSuperAdminId = getSuperAdminId;
exports.getAptInfoByUserId = getAptInfoByUserId;
exports.getAptInfoByResidentId = getAptInfoByResidentId;
exports.getAdminIdByAptId = getAdminIdByAptId;
exports.getDongRange = getDongRange;
exports.getHoRange = getHoRange;
exports.validateAptDongHo = validateAptDongHo;
exports.formatKST = formatKST;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("./prisma"));
const BadRequestError_1 = __importDefault(require("../middleware/errors/BadRequestError"));
const user_repo_1 = __importDefault(require("../module/user/user.repo"));
const NotFoundError_1 = __importDefault(require("../middleware/errors/NotFoundError"));
const apartment_repo_1 = __importDefault(require("../module/apartment/apartment.repo"));
const resident_repo_1 = __importDefault(require("../module/resident/resident.repo"));
const internalServerError_1 = __importDefault(require("../middleware/errors/internalServerError"));
function getNotiReceivers(adminAptId) {
    return __awaiter(this, void 0, void 0, function* () {
        const receivers = yield resident_repo_1.default.findMany({
            where: {
                apartmentId: adminAptId,
                deletedAt: null,
                userId: { not: null }
            },
            select: { userId: true }
        });
        return receivers.filter((r) => r.userId !== null);
    });
}
function isSuperAdmin(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield user_repo_1.default.find({
            where: { id: userId },
            select: { role: true }
        });
        if (!user)
            throw new NotFoundError_1.default('사용자가 존재하지 않습니다.');
        return user.role === client_1.UserType.SUPER_ADMIN;
    });
}
function getSuperAdminId() {
    return __awaiter(this, void 0, void 0, function* () {
        const superAdmins = yield user_repo_1.default.findMany(prisma_1.default, {
            where: { role: client_1.UserType.SUPER_ADMIN, deletedAt: null },
            select: { id: true }
        });
        return superAdmins.map((sa) => sa.id);
    });
}
function getAptInfoByUserId(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const adminsFound = yield user_repo_1.default.findMany(prisma_1.default, {
            where: {
                role: client_1.UserType.ADMIN,
                deletedAt: null,
                apartment: { users: { some: { id: userId, deletedAt: null } } }
            },
            select: {
                id: true,
                apartment: {
                    select: {
                        id: true,
                        name: true,
                        boards: { select: { id: true, boardType: true } }
                    }
                }
            }
        });
        if (adminsFound.length === 0)
            throw new NotFoundError_1.default('관리자가 존재하지 않습니다.');
        if (adminsFound.length > 1)
            throw new internalServerError_1.default('관리자가 2명 이상입니다.');
        const admin = adminsFound[0];
        if (!admin.apartment)
            throw new NotFoundError_1.default('관리자 계정에 아파트 정보가 없습니다.');
        const boards = Object.fromEntries(admin.apartment.boards.map((b) => [b.boardType, b.id]));
        if (!boards[client_1.BoardType.NOTICE] ||
            !boards[client_1.BoardType.COMPLAINT] ||
            !boards[client_1.BoardType.POLL])
            throw new NotFoundError_1.default('아파트에 3종 보드가 없습니다.');
        const aptInfo = {
            apartmentId: admin.apartment.id,
            apartmentName: admin.apartment.name,
            adminId: admin.id,
            noticeBoardId: boards[client_1.BoardType.NOTICE],
            complaintBoardId: boards[client_1.BoardType.COMPLAINT],
            pollBoardId: boards[client_1.BoardType.POLL]
        };
        return aptInfo;
    });
}
function getAptInfoByResidentId(residentId) {
    return __awaiter(this, void 0, void 0, function* () {
        const resident = yield resident_repo_1.default.find(prisma_1.default, {
            where: { id: residentId },
            select: {
                userId: true,
                apartment: {
                    select: {
                        id: true,
                        name: true,
                        users: {
                            where: { role: client_1.UserType.ADMIN, deletedAt: null },
                            select: { id: true }
                        },
                        boards: { select: { id: true, boardType: true } }
                    }
                }
            }
        });
        if (!resident)
            throw new NotFoundError_1.default('입주민을 찾을 수 없습니다.');
        if (resident.apartment.users.length === 0)
            throw new NotFoundError_1.default('관리자가 없습니다.');
        if (resident.apartment.users.length > 1)
            throw new internalServerError_1.default('관리자가 2명 이상입니다.');
        const admin = resident.apartment.users[0];
        const boards = Object.fromEntries(resident.apartment.boards.map((b) => [b.boardType, b.id]));
        const aptInfo = Object.assign(Object.assign({ apartmentId: resident.apartment.id, apartmentName: resident.apartment.name, adminId: admin.id }, (resident.userId && { userId: resident.userId })), { noticeBoardId: boards[client_1.BoardType.NOTICE], complaintBoardId: boards[client_1.BoardType.COMPLAINT], pollBoardId: boards[client_1.BoardType.POLL] });
        return aptInfo;
    });
}
function getAdminIdByAptId(aptId) {
    return __awaiter(this, void 0, void 0, function* () {
        const admin = yield user_repo_1.default.findFirst({
            where: { apartmentId: aptId, role: client_1.UserType.ADMIN, deletedAt: null },
            select: { id: true }
        });
        if (!admin)
            throw new NotFoundError_1.default('해당 아파트에는 관리자가 없습니다.');
        return admin.id;
    });
}
function getDongRange(maxComplex, maxBuilding) {
    const dongRange = [0];
    for (let k = 1; k <= maxComplex; k++) {
        for (let l = 1; l <= maxBuilding; l++) {
            dongRange.push(k * 100 + l);
        }
    }
    return dongRange;
}
function getHoRange(maxFloor, maxUnit) {
    const hoRange = [0];
    for (let m = 1; m <= maxFloor; m++) {
        for (let n = 1; n <= maxUnit; n++) {
            hoRange.push(m * 100 + n);
        }
    }
    return hoRange;
}
function validateAptDongHo(aptName, dong, ho) {
    return __awaiter(this, void 0, void 0, function* () {
        const apt = yield apartment_repo_1.default.findFirst({
            where: { name: aptName, deletedAt: null },
            include: {
                users: {
                    where: { role: client_1.UserType.ADMIN, deletedAt: null },
                    select: { id: true }
                }
            }
        });
        if (!apt)
            throw new NotFoundError_1.default('해당 이름을 가진 아파트가 존재하지 않습니다.');
        if (!apt.users)
            throw new NotFoundError_1.default('해당 아파트에 관리자가 없습니다.');
        const aptId = apt.id;
        const adminId = apt.users[0].id;
        const dongRange = getDongRange(apt.endComplexNumber, apt.endBuildingNumber);
        const hoRange = getHoRange(apt.endFloorNumber, apt.endUnitNumber);
        if (!dongRange.includes(Number(dong)))
            throw new BadRequestError_1.default('아파트 동 번호가 범위를 벗어났습니다.');
        if (!hoRange.includes(Number(ho)))
            throw new BadRequestError_1.default('아파트 호수가 범위를 벗어났습니다.');
        return { aptId, adminId };
    });
}
function formatKST(date) {
    const kst = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const yyyy = kst.getFullYear();
    const MM = String(kst.getMonth() + 1).padStart(2, '0');
    const dd = String(kst.getDate()).padStart(2, '0');
    const hh = String(kst.getHours()).padStart(2, '0');
    const mm = String(kst.getMinutes()).padStart(2, '0');
    const ss = String(kst.getSeconds()).padStart(2, '0');
    return `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}`;
}
