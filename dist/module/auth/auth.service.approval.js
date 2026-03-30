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
const ForbiddenError_1 = __importDefault(require("../../middleware/errors/ForbiddenError"));
const NotFoundError_1 = __importDefault(require("../../middleware/errors/NotFoundError"));
const apartment_repo_1 = __importDefault(require("../apartment/apartment.repo"));
const user_repo_1 = __importDefault(require("../user/user.repo"));
const resident_repo_1 = __importDefault(require("../resident/resident.repo"));
const utils_1 = require("../../lib/utils");
const client_1 = require("@prisma/client");
// 관리자 목록 조회: 최고관리자 부가 기능
function getAdminList() {
    return __awaiter(this, void 0, void 0, function* () {
        return yield user_repo_1.default.findMany(prisma_1.default, {
            where: { role: client_1.UserType.ADMIN },
            orderBy: { createdAt: 'desc' }
        });
    });
}
// 아파트 목록 조회: 최고관리자 부가 기능
function getAptList() {
    return __awaiter(this, void 0, void 0, function* () {
        return yield apartment_repo_1.default.findMany({ orderBy: { createdAt: 'desc' } });
    });
}
// 관리자 상태 변경: 최고관리자 권한
function changeAdminStatus(adminId, status) {
    return __awaiter(this, void 0, void 0, function* () {
        const apartmentStatus = getApprovalStatus(status);
        const admin = yield user_repo_1.default.find({
            where: { id: adminId },
            select: { apartmentId: true }
        });
        if (!admin)
            throw new NotFoundError_1.default('관리자가 존재하지 않습니다.');
        const aptId = admin.apartmentId;
        if (!aptId)
            throw new NotFoundError_1.default('관리자 계정에 아파트 ID가 존재하지 않습니다.');
        // DB 승인상태 변경, 트랜젝션: (1) User (2) Apartment
        const adminApproved = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            const admin = yield user_repo_1.default.patch(tx, {
                where: { id: adminId },
                data: { joinStatus: status }
            });
            yield apartment_repo_1.default.patch(tx, {
                where: { id: aptId },
                data: { apartmentStatus }
            });
            return admin;
        }));
        if (status === client_1.JoinStatus.APPROVED)
            return `[슈퍼관리자] 관리자 ${adminApproved.name}의 가입요청을 승인했습니다.`;
        else
            return `[슈퍼관리자] 관리자 ${adminApproved.name}의 가입요청을 기각했습니다.`;
    });
}
// 관리자 상태 일괄 변경: 최고관리자 권한
function changeAllAdminsStatus(status) {
    return __awaiter(this, void 0, void 0, function* () {
        const apartmentStatus = getApprovalStatus(status);
        // DB 승인상태 변경, 트랜젝션: (1) User (2) Apartment
        const adminsApproved = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            const adminArgs = {
                where: { role: client_1.UserType.ADMIN, joinStatus: client_1.JoinStatus.PENDING },
                data: { joinStatus: status }
            };
            const admins = yield user_repo_1.default.patchMany(tx, adminArgs);
            const aptArgs = {
                where: { apartmentStatus: client_1.ApprovalStatus.PENDING },
                data: { apartmentStatus }
            };
            yield apartment_repo_1.default.patchMany(tx, aptArgs);
            return admins;
        }));
        if (status === client_1.JoinStatus.APPROVED)
            return `[슈퍼관리자] 관리자 ${adminsApproved.count}명의 가입신청을 승인했습니다.`;
        else
            return `[슈퍼관리자] 관리자 ${adminsApproved.count}명의 가입신청을 기각했습니다.`;
    });
}
// 입주민 1명 가입상태 변경: 관리자 권한
function changeResidentStatus(userId, residentId, status) {
    return __awaiter(this, void 0, void 0, function* () {
        const { adminId: residentAdminId, apartmentId: residentAptId } = yield (0, utils_1.getAptInfoByResidentId)(residentId);
        const isMyResident = userId === residentAdminId;
        if (!isMyResident)
            throw new ForbiddenError_1.default(); // 권한 검증: 주민의 관리자가 나인가
        const approvalStatus = getApprovalStatus(status);
        // DB 상태변경, 트랜젝션: (1) Resident (2) User
        const residentApproved = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            const resident = yield resident_repo_1.default.patch(tx, {
                where: { id: residentId, isRegistered: true }, // 명부only 입주민은 대상에서 제외
                data: { approvalStatus },
                select: { isRegistered: true, userId: true, name: true }
            });
            if (!resident)
                throw new NotFoundError_1.default('입주민 정보를 찾을 수 없습니다.');
            if (!resident.userId)
                throw new NotFoundError_1.default('입주민의 사용자 ID가 없습니다.');
            yield user_repo_1.default.patch(tx, {
                where: { id: resident.userId },
                data: { joinStatus: status }
            });
            return resident;
        }));
        const apt = yield apartment_repo_1.default.find({
            where: { id: residentAptId },
            select: { name: true }
        });
        if (status === client_1.JoinStatus.APPROVED)
            return `[관리자] ${apt.name} ${residentApproved.name}의 가입요청을 승인했습니다.`;
        else
            return `[관리자] ${apt.name} ${residentApproved.name}의 가입요청을 기각했습니다.`;
    });
}
// 입주민 가입상태 일괄 변경: 관리자 권한
function changeAllResidentsStatus(userId, status) {
    return __awaiter(this, void 0, void 0, function* () {
        const { apartmentId } = yield (0, utils_1.getAptInfoByUserId)(userId);
        const approvalStatus = getApprovalStatus(status);
        const userArgs = {
            where: {
                apartmentId,
                role: client_1.UserType.USER,
                joinStatus: client_1.JoinStatus.PENDING
            },
            data: { joinStatus: status }
        };
        const residentArgs = {
            where: {
                apartmentId,
                isRegistered: true, // 명부only 입주민 제외
                approvalStatus: client_1.ApprovalStatus.PENDING
            },
            data: { approvalStatus }
        };
        const residentApproved = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            const resident = yield resident_repo_1.default.patchMany(tx, residentArgs);
            yield user_repo_1.default.patchMany(tx, userArgs);
            return resident;
        }));
        const apt = yield apartment_repo_1.default.find({ where: { id: apartmentId }, select: { name: true } });
        if (status === client_1.JoinStatus.APPROVED)
            return `[관리자] ${apt.name} 입주민 ${residentApproved.count}명의 가입요청을 승인했습니다.`;
        else
            return `[관리자] ${apt.name} 입주민 ${residentApproved.count}명의 가입요청을 기각했습니다.`;
    });
}
// 관리자 정보 수정: 최고관리자 권한
function patchAdminApt(adminId, body) {
    return __awaiter(this, void 0, void 0, function* () {
        const adminData = buildPatchAdminData(body);
        const aptData = buildPatchAptData(body);
        return prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            const admin = yield user_repo_1.default.patch(tx, {
                where: { id: adminId, role: client_1.UserType.ADMIN },
                data: adminData
            });
            yield apartment_repo_1.default.patch(tx, { where: { id: admin.apartmentId }, data: aptData });
            return admin;
        }));
    });
}
//-------------------------------------------------------- 지역 힘수
function buildPatchAdminData(body) {
    return {
        contact: body.contact,
        name: body.name,
        email: body.email
    };
}
function buildPatchAptData(body) {
    return {
        description: body.description,
        name: body.apartmentName,
        address: body.apartmentAddress,
        apartmentManagementNumber: body.apartmentManagementNumber
    };
}
function getApprovalStatus(state) {
    if (state === client_1.JoinStatus.APPROVED)
        return client_1.ApprovalStatus.APPROVED;
    else
        return client_1.ApprovalStatus.REJECTED;
}
exports.default = {
    getAdminList,
    getAptList,
    changeAdminStatus,
    changeAllAdminsStatus,
    changeResidentStatus,
    changeAllResidentsStatus,
    patchAdminApt
};
