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
const superstruct_1 = require("superstruct");
const BadRequestError_1 = __importDefault(require("../../middleware/errors/BadRequestError"));
const NotFoundError_1 = __importDefault(require("../../middleware/errors/NotFoundError"));
const user_service_1 = require("../user/user.service");
const notification_repo_1 = __importDefault(require("../notification/notification.repo"));
const apartment_repo_1 = __importDefault(require("../apartment/apartment.repo"));
const user_repo_1 = __importDefault(require("../user/user.repo"));
const resident_repo_1 = __importDefault(require("../resident/resident.repo"));
const board_repo_1 = __importDefault(require("../board/board.repo"));
const ConflictError_1 = __importDefault(require("../../middleware/errors/ConflictError"));
const notification_struct_1 = require("../notification/notification.struct");
const notification_sse_1 = require("../notification/notification.sse");
const utils_1 = require("../../lib/utils");
const client_1 = require("@prisma/client");
const internalServerError_1 = __importDefault(require("../../middleware/errors/internalServerError"));
//----------------------- USER 가입신청
function signup(body) {
    return __awaiter(this, void 0, void 0, function* () {
        const { username, contact, email, apartmentName, apartmentDong, apartmentHo } = body;
        // unique fields로 DB 존재여부 판단하고 이미 존재하면 409 에러 던짐
        yield validateExistingUserOrThrow({ username, contact, email });
        // rea.body 데이터 로직 검토: (1) 아파트 (2) 동호수
        const { aptId, adminId } = yield (0, utils_1.validateAptDongHo)(apartmentName, apartmentDong, apartmentHo);
        // 입주민 명부에 승인상태로 존재하면, 사용자 계정은 승인상태로 등록
        const { joinStatus, approvalStatus } = yield decideSignupStatus(aptId, body);
        // 데이터 가공
        const userData = yield buildSignupUserData(body, joinStatus);
        const residentData = yield buildSignupResidentData(body, approvalStatus);
        // DB creation: 트랜젝션 user/resident/notification 생성
        const userCreated = yield userSignupTransaction({
            userData,
            residentData,
            aptId,
            adminId
        });
        // SSE to admin: 트랜젝션 바깥에서
        if (joinStatus === client_1.JoinStatus.APPROVED)
            (0, notification_sse_1.sendToUser)(adminId, `[알림] 가입승인 (${userCreated.name}님)`);
        else
            (0, notification_sse_1.sendToUser)(adminId, `[알림] 가입신청 (${userCreated.name}님)`);
        // 출력형식에 맞게 재가공하여 리턴
        return buildSignupUserRes(userCreated);
    });
}
//-------------------------- Admin 가입신청
function signupAdmin(body) {
    return __awaiter(this, void 0, void 0, function* () {
        // 신청자와 아파트 이름/주소 조합이 이미 존재하는지 체크하고 존재하면 409 에러 던짐
        yield validateExistingAptAdminOrThrow(body);
        // 데이터 가공, 검증
        const aptData = buildSignupApartmentData(body);
        const adminData = yield buildSignupAdminData(body);
        const superAdminIds = yield (0, utils_1.getSuperAdminId)();
        // DB 생성: 트렌젝션 (1) Apartment (2) Board (3) User (4) Notification
        const adminCreated = yield adminSignupTransaction({
            aptData,
            adminData,
            superAdminIds
        });
        // SSE to superAdmins: 트렌젝션 바깥
        for (const id of superAdminIds) {
            (0, notification_sse_1.sendToUser)(id, `[알림] 가입신청 (${adminCreated.name}님)`);
        }
        // 데이터 재가공하여 리턴
        return buildSignupUserRes(adminCreated);
    });
}
//---------------------------- SuperAdmin 등록: APPROVED로 등록
function signupSuperAdmin(body) {
    return __awaiter(this, void 0, void 0, function* () {
        const data = Object.assign(Object.assign({}, body), { password: yield (0, user_service_1.hashingPassword)(body.password) });
        const superAdminCreated = yield user_repo_1.default.create(prisma_1.default, { data });
        return buildSignupUserRes(superAdminCreated);
    });
}
function validateExistingUserOrThrow(fields) {
    return __awaiter(this, void 0, void 0, function* () {
        const { username, contact, email } = fields;
        const exist = yield user_repo_1.default.findFirst({
            where: {
                OR: [{ contact }, { username }, { email: email }]
            },
            select: { contact: true, username: true, email: true }
        });
        if (!exist)
            return;
        if (exist.contact === contact)
            throw new ConflictError_1.default('이미 사용 중인 연락처입니다.');
        if (exist.username === username)
            throw new ConflictError_1.default('이미 사용 중인 유저네임입니다.');
        if (exist.email === email)
            throw new ConflictError_1.default('이미 사용 중인 이메일입니다.');
    });
}
function decideSignupStatus(aptId, body) {
    return __awaiter(this, void 0, void 0, function* () {
        const isAutoApproved = yield validateResidentSignupOrThrow(aptId, body);
        return {
            joinStatus: isAutoApproved ? client_1.JoinStatus.APPROVED : client_1.JoinStatus.PENDING,
            approvalStatus: isAutoApproved ? client_1.ApprovalStatus.APPROVED : client_1.ApprovalStatus.PENDING
        };
    });
}
function validateResidentSignupOrThrow(aptId, body) {
    return __awaiter(this, void 0, void 0, function* () {
        const resident = yield resident_repo_1.default.find(prisma_1.default, {
            where: { contact: body.contact },
            include: {
                apartment: {
                    select: {
                        users: {
                            where: { role: client_1.UserType.ADMIN, deletedAt: null },
                            select: { name: true, contact: true },
                            take: 1
                        }
                    }
                }
            }
        });
        // (1) 명부 가입자 아님 --> 일반 사용자 가입 절차로 gogo
        if (!resident)
            return false;
        const admin = resident.apartment.users[0];
        if (!admin)
            throw new NotFoundError_1.default('관리자가 없습니다.');
        // (2) 명부 가입자인데 사용자 계정이 승인되지 않은 경우
        if (resident.isRegistered === true) {
            //if (!resident.userId) throw new NotFoundError('승인된 계정이나 사용자 Id가 없습니다.');
            const user = yield user_repo_1.default.find({
                where: { contact: resident.contact },
                select: { joinStatus: true, id: true }
            });
            if (!user)
                throw new NotFoundError_1.default('사용자가 존재하지 않습니다.');
            throwJoinStatusError(user.joinStatus, admin);
        }
        // (3) 명부 정보와 합치 여부 검증
        validateResidentInfo(resident, aptId, body);
        // (4) 사용자 계정 자동 승인 허용
        return true;
    });
}
function throwJoinStatusError(joinStatus, admin) {
    switch (joinStatus) {
        case client_1.JoinStatus.PENDING:
            throw new BadRequestError_1.default('관리자가 검토 중입니다.');
        case client_1.JoinStatus.REJECTED:
            throw new BadRequestError_1.default(`가입신청이 거절되었습니다. 관리자에게 문의해주세요.\n(${admin.name}, ${admin.contact})`);
        case client_1.JoinStatus.NEED_UPDATE:
            throw new BadRequestError_1.default(`정보 수정 후 다시 제출해주세요.\n(${admin.name}, ${admin.contact})`);
        case client_1.JoinStatus.APPROVED:
            throw new BadRequestError_1.default('이미 가입된 사용자입니다.');
        default:
            throw new BadRequestError_1.default(`문제가 있습니다. 관리자에게 문의하세요\n(${admin.name}, ${admin.contact})`);
    }
}
function validateResidentInfo(resident, aptId, body) {
    if (resident.name !== body.name) {
        throw new BadRequestError_1.default('이름이 명부와 일치하지 않습니다.');
    }
    if (resident.apartmentId !== aptId)
        throw new BadRequestError_1.default('아파트가 명부와 일치하지 않습니다.');
    if (resident.apartmentDong !== body.apartmentDong)
        throw new BadRequestError_1.default('동이 일치하지 않습니다.');
    if (resident.apartmentHo !== body.apartmentHo)
        throw new BadRequestError_1.default('호수가 일치하지 않습니다.');
}
function buildSignupUserData(body, joinStatus) {
    return __awaiter(this, void 0, void 0, function* () {
        return {
            username: body.username,
            password: yield (0, user_service_1.hashingPassword)(body.password),
            contact: body.contact,
            name: body.name,
            email: body.email,
            role: body.role,
            joinStatus
        };
    });
}
function buildSignupResidentData(body, approvalStatus) {
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
            approvalStatus
        };
    });
}
function userSignupTransaction(data) {
    return __awaiter(this, void 0, void 0, function* () {
        // DB creation: 트랜젝션 (1) user 생성 (2) resident 생성 (3) 알림 생성
        const { userData, residentData, aptId, adminId } = data;
        const userCreated = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            const user = yield user_repo_1.default.create(tx, {
                data: Object.assign(Object.assign({}, userData), { apartment: { connect: { id: aptId } } }) // user 생성
            });
            const createResidentData = Object.assign(Object.assign({}, residentData), { apartmentId: aptId, userId: user.id });
            yield resident_repo_1.default.upsert(tx, {
                where: { contact: residentData.contact },
                create: createResidentData,
                update: Object.assign(Object.assign({}, residentData), { userId: user.id })
            }); // resident 생성/수정
            const notiData = {
                notiType: residentData.approvalStatus === client_1.ApprovalStatus.PENDING
                    ? client_1.NotificationType.AUTH_USER_APPLIED
                    : client_1.NotificationType.AUTH_USER_APPROVED,
                targetId: user.id,
                content: residentData.approvalStatus === client_1.ApprovalStatus.PENDING
                    ? `[알림] 가입신청 (${residentData.name}님)`
                    : `[알림] 가입승인 (${residentData.name}님)`
            };
            (0, superstruct_1.assert)(notiData, notification_struct_1.CreateNotification);
            yield notification_repo_1.default.create(tx, {
                data: Object.assign(Object.assign({}, notiData), { receiver: { connect: { id: adminId } } }) // notification 생성
            });
            return user;
        }));
        return userCreated;
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
function validateExistingAptAdminOrThrow(body) {
    return __awaiter(this, void 0, void 0, function* () {
        const { username, contact, email, apartmentName, apartmentAddress } = body;
        yield validateExistingUserOrThrow({ username, contact, email });
        const aptExisted = yield apartment_repo_1.default.find({
            where: { name: apartmentName, address: apartmentAddress }
        });
        if (aptExisted)
            throw new ConflictError_1.default('같은 이름과 주소를 가진 아파트가 이미 존재합니다.');
    });
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
function adminSignupTransaction(data) {
    return __awaiter(this, void 0, void 0, function* () {
        const { aptData, adminData, superAdminIds } = data;
        const adminCreated = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            const apt = yield apartment_repo_1.default.create(tx, { data: aptData }); // apt 생성
            const boardData = [
                { boardType: client_1.BoardType.NOTICE, apartmentId: apt.id },
                { boardType: client_1.BoardType.COMPLAINT, apartmentId: apt.id },
                { boardType: client_1.BoardType.POLL, apartmentId: apt.id }
            ];
            const boards = yield board_repo_1.default.createMany(tx, boardData); // 3종 보드 생성
            if (boards.count !== 3)
                throw new internalServerError_1.default('3개 보드가 다 만들어지지 않았습니다.');
            const admin = yield user_repo_1.default.create(tx, {
                data: Object.assign(Object.assign({}, adminData), { apartment: { connect: { id: apt.id } } }) // admin 생성
            });
            for (const id of superAdminIds) {
                const notiData = {
                    notiType: client_1.NotificationType.AUTH_ADMIN_APPLIED,
                    targetId: admin.id,
                    content: `[알림] 가입신청 (${admin.name}님)`
                };
                (0, superstruct_1.assert)(notiData, notification_struct_1.CreateNotification);
                const noti = yield notification_repo_1.default.create(tx, {
                    data: Object.assign(Object.assign({}, notiData), { receiver: { connect: { id } } }) // 알림 생성
                });
            }
            return admin;
        }));
        return adminCreated;
    });
}
exports.default = {
    signup,
    signupAdmin,
    signupSuperAdmin
};
