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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../../lib/prisma"));
const client_1 = require("@prisma/client");
const superstruct_1 = require("superstruct");
const user_struct_1 = require("../user/user.struct");
const constants_1 = require("../../lib/constants");
const token_1 = require("../../lib/token");
const ForbiddenError_1 = __importDefault(require("../../middleware/errors/ForbiddenError"));
const BadRequestError_1 = __importDefault(require("../../middleware/errors/BadRequestError"));
const NotFoundError_1 = __importDefault(require("../../middleware/errors/NotFoundError"));
const UnauthorizedError_1 = __importDefault(require("../../middleware/errors/UnauthorizedError"));
const user_service_1 = require("../user/user.service");
const notification_service_1 = __importDefault(require("../notification/notification.service"));
const apartment_repo_1 = __importDefault(require("../apartment/apartment.repo"));
const user_repo_1 = __importDefault(require("../user/user.repo"));
const resident_repo_1 = __importDefault(require("../resident/resident.repo"));
const board_repo_1 = __importDefault(require("../board/board.repo"));
const apartment_struct_1 = require("../apartment/apartment.struct");
const ConflictError_1 = __importDefault(require("../../middleware/errors/ConflictError"));
const resident_struct_1 = require("../resident/resident.struct");
const require_1 = require("../../lib/require");
const utils_1 = require("../../lib/utils");
const notification_struct_1 = require("../notification/notification.struct");
function signup(body) {
    return __awaiter(this, void 0, void 0, function* () {
        // validation: (1) 아파트 (2) 동호수
        const apt = yield apartment_repo_1.default.findByName(body.apartmentName);
        if (!apt)
            throw new BadRequestError_1.default('아파트가 존재하지 않습니다.');
        (0, utils_1.validateDongHo)(body.apartmentDong, body.apartmentHo, apt);
        // data transformation & validation by superstruct
        const userData = yield buildSignupUserData(body);
        const residentData = yield buildSignupResidentData(body);
        (0, superstruct_1.assert)(userData, user_struct_1.CreateUser);
        (0, superstruct_1.assert)(Object.assign(Object.assign({}, residentData), { apartmentId: apt.id }), resident_struct_1.CreateResident);
        // DB creation
        const userCreated = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            const userArgs = Object.assign(Object.assign({}, userData), { apartment: { connect: { id: apt.id } } });
            const user = yield user_repo_1.default.create(tx, userArgs);
            const residentArgs = Object.assign(Object.assign({}, residentData), { apartment: { connect: { id: apt.id } }, user: { connect: { id: user.id } } });
            yield resident_repo_1.default.create(tx, residentArgs);
            return user;
        }));
        // 알림 생성
        const adminId = yield (0, utils_1.getAdminIdByAparatmentId)(apt.id);
        const notiData = {
            notiType: client_1.NotificationType.AUTH_USER_APPLIED,
            targetId: userCreated.id,
            content: `[알림] ${userCreated.name}님 가입신청`
        };
        (0, superstruct_1.assert)(notiData, notification_struct_1.CreateNotification);
        const noti = yield notification_service_1.default.notify(adminId, notiData);
        // 출력형식에 맞추 재가공하여 리턴
        return buildSignupUserRes(userCreated);
    });
}
function signupAdmin(body) {
    return __awaiter(this, void 0, void 0, function* () {
        // validation: 아파트
        const aptExisted = yield apartment_repo_1.default.find({
            where: { name: body.apartmentName, address: body.apartmentAddress }
        });
        if (aptExisted)
            throw new ConflictError_1.default('같은 이름과 주소를 가진 아파트가 이미 존재합니다.');
        // 데이터 가공, 검증
        const aptData = buildSignupApartmentData(body);
        const adminData = yield buildSignupAdminData(body);
        (0, superstruct_1.assert)(aptData, apartment_struct_1.CreateApartment);
        (0, superstruct_1.assert)(adminData, user_struct_1.CreateUser);
        // DB 생성: User, Apartment, Board
        const adminCreated = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            const apt = yield apartment_repo_1.default.create(tx, aptData);
            const adminArgs = Object.assign(Object.assign({}, adminData), { apartment: { connect: { id: apt.id } } });
            const admin = yield user_repo_1.default.create(tx, adminArgs);
            const boardData = [
                { boardType: client_1.BoardType.NOTICE, apartmentId: apt.id },
                { boardType: client_1.BoardType.COMPLAINT, apartmentId: apt.id },
                { boardType: client_1.BoardType.POLL, apartmentId: apt.id }
            ];
            yield board_repo_1.default.createMany(tx, boardData);
            return admin;
        }));
        // 알림 생성
        const superAdminIds = yield (0, utils_1.getSuperAdminId)();
        for (const id of superAdminIds) {
            const notiData = {
                notiType: client_1.NotificationType.AUTH_ADMIN_APPLIED,
                targetId: adminCreated.id,
                content: `[알림] ${adminCreated.name}님 가입신청`
            };
            (0, superstruct_1.assert)(notiData, notification_struct_1.CreateNotification);
            const noti = yield notification_service_1.default.notify(id, notiData);
        }
        // 데이터 재가공하여 리턴
        return buildSignupUserRes(adminCreated);
    });
}
function signupSuperAdmin(body) {
    return __awaiter(this, void 0, void 0, function* () {
        const data = Object.assign(Object.assign({}, body), { password: yield (0, user_service_1.hashingPassword)(body.password) });
        (0, superstruct_1.assert)(data, user_struct_1.CreateUser);
        const superAdminCreated = yield user_repo_1.default.create(prisma_1.default, data);
        return buildSignupUserRes(superAdminCreated);
    });
}
function login(data) {
    return __awaiter(this, void 0, void 0, function* () {
        const requiredUserInfo = {
            where: { username: data.username },
            include: {
                notifications: true,
                apartment: { include: { boards: true } }
            }
        };
        const user = yield user_repo_1.default.find(requiredUserInfo);
        if (!user)
            throw new NotFoundError_1.default('사용자가 존재하지 않습니다');
        console.log('');
        console.log(`${user.role} ${user.name}님이 로그인하셨습니다.`);
        const isPasswordOk = yield (0, user_service_1.check_passwordValidity)(data.password, user.password);
        if (!isPasswordOk)
            throw new ForbiddenError_1.default('비밀번호가 틀렸습니다');
        if (user.notifications.length) {
            const unreadCount = user.notifications.filter((n) => n.isChecked === false).length;
            if (constants_1.NODE_ENV === 'development') {
                console.log(`읽지 않은 알림이 ${unreadCount}개 있습니다.`);
                console.log('');
            }
        }
        const { accessToken, refreshToken } = (0, token_1.generateTokens)(user.id);
        let userRes;
        if (user.role === client_1.UserType.SUPER_ADMIN)
            userRes = buildLoginSuperAdminRes(user);
        else
            userRes = buildLoginUserRes(user);
        return { userRes, accessToken, refreshToken };
    });
}
function logout(tokenData) {
    clearTokenCookies(tokenData);
}
function issueTokens(refreshToken) {
    return __awaiter(this, void 0, void 0, function* () {
        const { userId } = (0, token_1.verifyRefreshToken)(refreshToken);
        const user = yield verifyUserExist(userId);
        return (0, token_1.generateTokens)(user.id);
    });
}
function getAdminList() {
    return __awaiter(this, void 0, void 0, function* () {
        return yield user_repo_1.default.findMany(prisma_1.default, {
            where: { role: client_1.UserType.ADMIN },
            orderBy: { createdAt: 'desc' }
        });
    });
}
function getAptList() {
    return __awaiter(this, void 0, void 0, function* () {
        return yield apartment_repo_1.default.getList({ orderBy: { createdAt: 'desc' } });
    });
}
function changeAdminStatus(adminId, status) {
    return __awaiter(this, void 0, void 0, function* () {
        const apartmentStatus = getApprovalStatus(status);
        const admin = yield user_repo_1.default.find({ where: { id: adminId }, select: { apartmentId: true } });
        if (!admin)
            throw new NotFoundError_1.default('관리자가 존재하지 않습니다.');
        const aptId = admin.apartmentId;
        if (!aptId)
            throw new NotFoundError_1.default('관리자 계정에 아파트 ID가 존재하지 않습니다.');
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
function changeAllAdminsStatus(status) {
    return __awaiter(this, void 0, void 0, function* () {
        const apartmentStatus = getApprovalStatus(status);
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
            const apts = yield apartment_repo_1.default.patchMany(tx, aptArgs);
            return admins;
        }));
        if (status === client_1.JoinStatus.APPROVED)
            return `[슈퍼관리자] 관리자 ${adminsApproved.count}명의 가입신청을 승인했습니다.`;
        else
            return `[슈퍼관리자] 관리자 ${adminsApproved.count}명의 가입신청을 기각했습니다.`;
    });
}
function changeResidentStatus(user, residentId, status) {
    return __awaiter(this, void 0, void 0, function* () {
        (0, require_1.requireApartmentUser)(user);
        yield (0, utils_1.ensureSameApartment)(user.apartmentId, residentId); // 권한 검증
        const approvalStatus = getApprovalStatus(status);
        const residentApproved = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            const resident = yield resident_repo_1.default.patch(tx, {
                where: { id: residentId, isRegistered: true }, // 명부only 입주민은 대상에서 제외
                data: { approvalStatus }
            });
            if (!resident)
                throw new NotFoundError_1.default('입주민 정보를 찾을 수 없습니다.');
            if (!resident.userId)
                throw new NotFoundError_1.default('입주민 ID가 존재하지 않습니다.');
            // 사용자 계정이 있는 경우
            if (resident.isRegistered === true)
                yield user_repo_1.default.patch(tx, { where: { id: resident.userId }, data: { joinStatus: status } });
            return resident;
        }));
        const apt = yield apartment_repo_1.default.find({ where: { id: user.apartmentId }, select: { name: true } });
        if (!apt)
            throw new NotFoundError_1.default('아파트가 존재하지 않습니다.');
        if (status === client_1.JoinStatus.APPROVED)
            return `[관리자] ${apt.name}관리자가 ${residentApproved.name}의 가입요청을 승인했습니다.`;
        else
            return `[관리자] ${apt.name}관리자가 ${residentApproved.name}의 가입요청을 기각했습니다.`;
    });
}
function changeAllResidentsStatus(user, status) {
    return __awaiter(this, void 0, void 0, function* () {
        (0, require_1.requireApartmentUser)(user);
        const approvalStatus = getApprovalStatus(status);
        const userArgs = {
            where: {
                apartmentId: user.apartmentId,
                role: client_1.UserType.USER,
                joinStatus: client_1.JoinStatus.PENDING
            },
            data: { joinStatus: status }
        };
        const residentArgs = {
            where: {
                apartmentId: user.apartmentId,
                isRegistered: true, // 명부only 입주민 제외
                approvalStatus: client_1.ApprovalStatus.PENDING
            },
            data: { approvalStatus }
        };
        const residentApproved = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            yield user_repo_1.default.patchMany(tx, userArgs);
            const resident = yield resident_repo_1.default.patchMany(tx, residentArgs);
            return resident;
        }));
        const apt = yield apartment_repo_1.default.find({ where: { id: user.apartmentId }, select: { name: true } });
        if (!apt)
            throw new NotFoundError_1.default('아파트가 존재하지 않습니다.');
        if (status === client_1.JoinStatus.APPROVED)
            return `[관리자] ${apt.name}관리자가 입주민 ${residentApproved.count}명의 가입요청을 승인했습니다.`;
        else
            return `[관리자] ${apt.name}관리자가 입주민 ${residentApproved.count}명의 가입요청을 기각했습니다.`;
    });
}
function patchAdminApt(adminId, body) {
    return __awaiter(this, void 0, void 0, function* () {
        const adminData = buildPatchAdminData(body);
        const aptData = buildPatchAptData(body);
        (0, superstruct_1.assert)(adminData, user_struct_1.PatchUser);
        (0, superstruct_1.assert)(aptData, apartment_struct_1.PatchApartment);
        return prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            const admin = yield user_repo_1.default.patch(tx, { where: { id: adminId }, data: adminData });
            yield apartment_repo_1.default.patch(tx, { where: { id: admin.apartmentId }, data: aptData });
            return admin;
        }));
    });
}
function deleteAdminApt(adminId) {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            const admin = yield user_repo_1.default.deleteById(tx, adminId);
            if (!admin.apartmentId)
                throw new NotFoundError_1.default('관리자 계정에 아파트 ID가 존재하지 않습니다.');
            yield board_repo_1.default.deleteMany(tx, { where: { apartmentId: admin.apartmentId } });
            yield apartment_repo_1.default.deleteById(tx, admin.apartmentId);
            return admin;
        }));
    });
}
function cleanup(user) {
    return __awaiter(this, void 0, void 0, function* () {
        (0, require_1.requireUser)(user);
        if (user.userType === client_1.UserType.SUPER_ADMIN)
            return cleanupSuperAdmin();
        return cleanupAdmin(user);
    });
}
function cleanupSuperAdmin() {
    return __awaiter(this, void 0, void 0, function* () {
        const aptArgs = { where: { apartmentStatus: client_1.ApprovalStatus.REJECTED } };
        const boardArgs = { where: { apartment: { apartmentStatus: client_1.ApprovalStatus.REJECTED } } };
        const userArgs = { where: { role: client_1.UserType.ADMIN, joinStatus: client_1.JoinStatus.REJECTED } };
        const deleted = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            const users = yield user_repo_1.default.cleanup(tx, userArgs);
            const boards = yield board_repo_1.default.deleteMany(tx, boardArgs);
            const apts = yield apartment_repo_1.default.cleanup(tx, aptArgs);
            return users;
        }));
        return `[슈퍼관리자] 거절된 관리자 가입신청 ${deleted.count}건이 일괄정리되었습니다.`;
    });
}
function cleanupAdmin(user) {
    return __awaiter(this, void 0, void 0, function* () {
        (0, require_1.requireApartmentUser)(user);
        const userArgs = {
            where: {
                apartmentId: user.apartmentId,
                role: client_1.UserType.USER,
                joinStatus: client_1.JoinStatus.REJECTED
            }
        };
        const residentArgs = {
            where: {
                apartmentId: user.apartmentId,
                isRegistered: true, // 명부only 입주민 제외
                approvalStatus: client_1.ApprovalStatus.REJECTED
            }
        };
        const deleted = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            const users = yield user_repo_1.default.cleanup(tx, userArgs);
            const residents = yield resident_repo_1.default.cleanup(tx, residentArgs);
            return residents;
        }));
        return `[관리자] 거절된 사용자 가입신청 ${deleted.count}건이 일괄정리되었습니다.`;
    });
}
//-------------------------------------------------------- 지역 합수
function buildSignupUserData(body) {
    return __awaiter(this, void 0, void 0, function* () {
        return {
            username: body.username,
            password: yield (0, user_service_1.hashingPassword)(body.password),
            contact: body.contact,
            name: body.name,
            email: body.email,
            role: body.role,
            joinStatus: client_1.JoinStatus.PENDING
        };
    });
}
function buildSignupResidentData(body) {
    return __awaiter(this, void 0, void 0, function* () {
        return {
            contact: body.contact,
            name: body.name,
            email: body.email,
            apartmentDong: body.apartmentDong,
            apartmentHo: body.apartmentHo,
            isRegistered: true,
            isHouseholder: client_1.HouseholdRole.HOUSEHOLDER,
            residenceStatus: client_1.ResidenceStatus.RESIDENCE,
            approvalStatus: client_1.ApprovalStatus.PENDING
        };
    });
}
function buildSignupUserRes(user) {
    //USER, ADMIN, SUPER_ADMIN
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        joinStatus: user.joinStatus,
        isActive: true,
        role: user.role
    };
}
function buildSignupApartmentData(body) {
    const raw = {
        name: body.apartmentName,
        address: body.apartmentAddress,
        description: body.description,
        apartmentManagementNumber: body.apartmentManagementNumber,
        startComplexNumber: body.startComplexNumber,
        endComplexNumber: body.endComplexNumber,
        startDongNumber: body.startDongNumber,
        endDongNumber: body.endDongNumber,
        startFloorNumber: body.startFloorNumber,
        endFloorNumber: body.endFloorNumber,
        startHoNumber: body.startHoNumber,
        endHoNumber: body.endHoNumber
    };
    const { startDongNumber: startBuildingNumber, endDongNumber: endBuildingNumber, startHoNumber: startUnitNumber, endHoNumber: endUnitNumber } = raw, rest = __rest(raw, ["startDongNumber", "endDongNumber", "startHoNumber", "endHoNumber"]);
    return Object.assign({ startBuildingNumber,
        endBuildingNumber,
        startUnitNumber,
        endUnitNumber }, rest);
}
function buildSignupAdminData(body) {
    return __awaiter(this, void 0, void 0, function* () {
        return {
            username: body.username,
            password: yield (0, user_service_1.hashingPassword)(body.password),
            contact: body.contact,
            name: body.name,
            email: body.email,
            role: body.role,
            joinStatus: client_1.JoinStatus.PENDING
        };
    });
}
function buildLoginSuperAdminRes(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        username: user.username,
        contact: user.contact,
        avatar: user.avatar,
        joinStatus: user.joinStatus,
        isActive: true
    };
}
function buildLoginUserRes(user) {
    if (!user.apartment)
        throw new NotFoundError_1.default('관련된 아파트 정보가 없습니다');
    if (!user.apartment.boards)
        throw new NotFoundError_1.default('아파트 게시판이 없습니다');
    if (user.apartment.boards.length !== 3)
        throw new NotFoundError_1.default('아파트 게시판 수가 3이 아닙니다');
    const boardIds = {
        [client_1.BoardType.NOTICE]: user.apartment.boards.find((b) => b.boardType === client_1.BoardType.NOTICE).id,
        [client_1.BoardType.COMPLAINT]: user.apartment.boards.find((b) => b.boardType === client_1.BoardType.COMPLAINT)
            .id,
        [client_1.BoardType.POLL]: user.apartment.boards.find((b) => b.boardType === client_1.BoardType.POLL).id
    };
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        username: user.username,
        contact: user.contact,
        avatar: user.avatar,
        joinStatus: user.joinStatus,
        isActive: true,
        apartmentId: user.apartment.id,
        apartmentName: user.apartment.name,
        boardIds
    };
}
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
function verifyUserExist(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield user_repo_1.default.findById(userId);
        if (!user)
            throw new UnauthorizedError_1.default();
        return user;
    });
}
function clearTokenCookies(tokenData) {
    tokenData.clearCookie(constants_1.ACCESS_TOKEN_COOKIE_NAME);
    tokenData.clearCookie(constants_1.REFRESH_TOKEN_COOKIE_NAME, { path: '/auth/refresh' });
    // refreshToken은 지정된 path가 있음
}
exports.default = {
    signup,
    signupAdmin,
    signupSuperAdmin,
    login,
    logout,
    issueTokens,
    getAdminList,
    getAptList,
    changeAdminStatus,
    changeAllAdminsStatus,
    changeResidentStatus,
    changeAllResidentsStatus,
    verifyUserExist,
    patchAdminApt,
    deleteAdminApt,
    cleanup
};
