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
const apartment_repo_1 = __importDefault(require("../apartment/apartment.repo"));
const user_repo_1 = __importDefault(require("../user/user.repo"));
const resident_repo_1 = __importDefault(require("../resident/resident.repo"));
const board_repo_1 = __importDefault(require("../board/board.repo"));
const utils_1 = require("../../lib/utils");
const client_1 = require("@prisma/client");
const NotFoundError_1 = __importDefault(require("../../middleware/errors/NotFoundError"));
// 개발용 관리자 삭제 (아파트, 보드도 삭제): 최고관리자 권한
function deleteAdmin(adminId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { apartmentId } = yield (0, utils_1.getAptInfoByUserId)(adminId);
        // 트렌젝션: user, apartment, boards
        return prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            yield board_repo_1.default.deleteMany(tx, { where: { apartmentId } }); // 3종 보드 삭제
            const admin = yield user_repo_1.default.del(tx, { where: { id: adminId } }); // 관리자 삭제
            yield apartment_repo_1.default.del(tx, { where: { id: apartmentId } }); // 아파트 삭제
            return admin;
        }));
    });
}
// 배포용 관리자 soft delete (아파트, 보드도): 최고관리자 권한
function softDeleteAdmin(adminId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { apartmentId } = yield (0, utils_1.getAptInfoByUserId)(adminId);
        // 트렌젝션: user, apartment, boards
        return prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            yield board_repo_1.default.updateMany(tx, {
                where: { apartmentId },
                data: { deletedAt: new Date() }
            });
            const admin = yield user_repo_1.default.patch(tx, {
                where: { id: adminId },
                data: { deletedAt: new Date() }
            });
            yield apartment_repo_1.default.patch(tx, {
                where: { id: apartmentId },
                data: { deletedAt: new Date() }
            });
            return admin;
        }));
    });
}
// 거절된 사용자 일괄 삭제: 최고관리자/관리자 분지
function cleanup(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield user_repo_1.default.find({ where: { id: userId }, select: { role: true } });
        if (!user)
            throw new NotFoundError_1.default('사용자가 존재하지 않습니다.');
        if (user.role === client_1.UserType.ADMIN)
            return cleanupByAdmin(userId);
        return cleanupBySuperAdmin();
    });
}
// 거절된 관리자 일괄 삭제: 최고관리자 권한
function cleanupBySuperAdmin() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('최고관리자 영역');
        const aptArgs = { where: { apartmentStatus: client_1.ApprovalStatus.REJECTED } };
        const boardArgs = {
            where: { apartment: { apartmentStatus: client_1.ApprovalStatus.REJECTED } }
        };
        const userArgs = { where: { role: client_1.UserType.ADMIN, joinStatus: client_1.JoinStatus.REJECTED } };
        // 트랜젝션: (1)User (2)Board (3)Apartment
        const deleted = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            const users = yield user_repo_1.default.deleteMany(tx, userArgs);
            yield board_repo_1.default.deleteMany(tx, boardArgs);
            yield apartment_repo_1.default.deleteMany(tx, aptArgs);
            return users;
        }));
        return `[슈퍼관리자] 거절된 관리자 가입신청 ${deleted.count}건이 일괄정리되었습니다.`;
    });
}
function cleanupByAdmin(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { apartmentId } = yield (0, utils_1.getAptInfoByUserId)(userId);
        const userArgs = {
            where: {
                apartmentId,
                role: client_1.UserType.USER,
                joinStatus: client_1.JoinStatus.REJECTED
            }
        };
        const residentArgs = {
            where: {
                apartmentId,
                isRegistered: true, // 명부only 입주민 제외
                approvalStatus: client_1.ApprovalStatus.REJECTED
            }
        };
        const deleted = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            const residents = yield resident_repo_1.default.deleteMany(tx, residentArgs);
            yield user_repo_1.default.deleteMany(tx, userArgs);
            return residents;
        }));
        return `[관리자] 거절된 사용자 가입신청 ${deleted.count}건이 일괄정리되었습니다.`;
    });
}
//-------------------------------------------------------- 지역 힘수
exports.default = {
    deleteAdmin,
    softDeleteAdmin,
    cleanup
};
