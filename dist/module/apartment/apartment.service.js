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
const NotFoundError_1 = __importDefault(require("../../middleware/errors/NotFoundError"));
const ForbiddenError_1 = __importDefault(require("../../middleware/errors/ForbiddenError"));
const utils_1 = require("../../lib/utils");
const client_1 = require("@prisma/client");
const buildQuery_1 = require("../../lib/buildQuery");
const apartment_repo_1 = __importDefault(require("./apartment.repo"));
//--------------------------------------- 아파트 목록 조회: public
function publicGetList(query) {
    return __awaiter(this, void 0, void 0, function* () {
        const queryParams = buildPublicListQueryParams(query);
        const where = (0, buildQuery_1.buildWhere)(queryParams);
        const apts = yield apartment_repo_1.default.findMany({ where, orderBy: { createdAt: 'desc' } });
        return buildPublicAptListRes(apts);
    });
}
//--------------------------------------- 아파트 상세 조회: public
function publicGet(aptId) {
    return __awaiter(this, void 0, void 0, function* () {
        const apt = yield apartment_repo_1.default.find({ where: { id: aptId } });
        if (!apt)
            throw new NotFoundError_1.default('아파트가 존재하지 않습니다.');
        return buildPublicAptRes(apt);
    });
}
//--------------------------------------- 아파트 목록 조회: 최고관리자/관리자
function getList(userId, query) {
    return __awaiter(this, void 0, void 0, function* () {
        // 쿼리 파라미터 구성
        const params = buildListQueryParams(query);
        const { skip, take } = (0, buildQuery_1.buildPagination)(params.pagination, {
            limitDefault: 20,
            limitMax: 100
        });
        let whereTerms = [{ deletedAt: null }];
        if (!(yield (0, utils_1.isSuperAdmin)(userId))) {
            const { apartmentId } = yield (0, utils_1.getAptInfoByUserId)(userId);
            whereTerms.push({ id: apartmentId }); // 관리자인 경우 관리 아파트만 조회 가능
        }
        const queryWhere = (0, buildQuery_1.buildWhere)(params);
        if (Object.keys(queryWhere).length > 0)
            whereTerms.push(queryWhere);
        let relationWhere;
        if (params.searchKey.keyword) {
            relationWhere = buildAdminRelationSearch(params.searchKey.keyword, params.relationSearch.admin);
            whereTerms.push(relationWhere);
        }
        const where = { AND: whereTerms };
        const args = {
            where,
            skip,
            take,
            orderBy: { createdAt: 'desc' },
            include: {
                users: {
                    where: { role: client_1.UserType.ADMIN, deletedAt: null }, // 출력에 필요한 관리자 정보 가져옴
                    select: { id: true, name: true, contact: true, email: true }
                }
            }
        };
        // DB 조회
        const totalCount = yield apartment_repo_1.default.count({ where });
        const apts = yield apartment_repo_1.default.findMany(args);
        return { apartments: buildMemberAptListRes(apts), totalCount };
    });
}
//--------------------------------------- 아파트 상세 조회: 최고관리자/관리자
function get(userId, aptId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(yield (0, utils_1.isSuperAdmin)(userId))) {
            const { apartmentId: adminAptId } = yield (0, utils_1.getAptInfoByUserId)(userId);
            const isMyApt = adminAptId === aptId;
            if (!isMyApt)
                throw new ForbiddenError_1.default(); // 권한: 내가 관리자인가
        }
        const apt = yield apartment_repo_1.default.find({
            where: { id: aptId },
            include: {
                users: {
                    where: { role: client_1.UserType.ADMIN, deletedAt: null }, // 출력 시 필요한 관리자 정보 가져옴
                    select: { id: true, name: true, contact: true, email: true }
                }
            }
        });
        if (!apt)
            throw new NotFoundError_1.default('아파트가 존재하지 않습니다.');
        return buildMemberAptRes(apt);
    });
}
//------------------------------------- 지역 함수들
function buildPublicListQueryParams(query) {
    const { keyword, name, address } = query;
    return {
        filters: { name, address },
        searchKey: { keyword, fields: ['name', 'address', 'description'] }
    };
}
function buildListQueryParams(query) {
    const { name, address, keyword, page, limit } = query;
    const apartmentStatus = query.apartmentStatus === undefined || query.apartmentStatus === ''
        ? undefined
        : query.apartmentStatus;
    return {
        pagination: { page, limit },
        filters: { name, address },
        exactFilters: { apartmentStatus },
        searchKey: { keyword, fields: ['name', 'address', 'description'] },
        relationSearch: { admin: ['name', 'email'] }
        // 관리자 이름, 관리자 이메일은 관계 필드 users에서 가져와야 함
    };
}
function buildAdminRelationSearch(keyword, adminFields) {
    const adminBase = {
        role: client_1.UserType.ADMIN,
        deletedAt: null
    };
    let searchTerms = [];
    for (const field of adminFields) {
        searchTerms.push({
            users: {
                some: Object.assign(Object.assign({}, adminBase), { [field]: { contains: keyword, mode: 'insensitive' } })
            }
        });
    }
    const where = { OR: searchTerms };
    return where;
}
function buildPublicAptListRes(apts) {
    return apts.map(({ id, name, address }) => ({ id, name, address }));
}
function buildPublicAptRes(apt) {
    return {
        id: apt.id,
        name: apt.name,
        address: apt.address,
        startComplexNumber: apt.startComplexNumber,
        endComplexNumber: apt.endComplexNumber,
        startDongNumber: apt.startBuildingNumber,
        endDongNumber: apt.endBuildingNumber,
        startFloorNumber: apt.startFloorNumber,
        endFloorNumber: apt.endFloorNumber,
        startHoNumber: apt.startUnitNumber,
        endHoNumber: apt.endUnitNumber,
        apartmentStatus: apt.apartmentStatus,
        dongRange: {
            start: apt.startComplexNumber * 100 + apt.startBuildingNumber,
            end: apt.endComplexNumber * 100 + apt.endBuildingNumber
        },
        hoRange: {
            start: apt.startFloorNumber * 100 + apt.startUnitNumber,
            end: apt.endFloorNumber * 100 + apt.endUnitNumber
        }
    };
}
function buildMemberAptListRes(apts) {
    return apts.map((apt) => {
        const admin = apt.users[0];
        if (!admin)
            throw new NotFoundError_1.default('관리자를 찾을 수 없습니다.');
        return {
            id: apt.id,
            name: apt.name,
            address: apt.address,
            officeNumber: apt.apartmentManagementNumber,
            description: apt.description,
            startComplexNumber: apt.startComplexNumber,
            endComplexNumber: apt.endComplexNumber,
            startDongNumber: apt.startBuildingNumber,
            endDongNumber: apt.endBuildingNumber,
            startFloorNumber: apt.startFloorNumber,
            endFloorNumber: apt.endFloorNumber,
            startHoNumber: apt.startUnitNumber,
            endHoNumber: apt.endUnitNumber,
            apartmentStatus: apt.apartmentStatus,
            adminId: admin.id,
            adminName: admin.name,
            adminContact: admin.contact,
            adminEmail: admin.email
        };
    });
}
function buildMemberAptRes(apt) {
    return {
        id: apt.id,
        name: apt.name,
        address: apt.address,
        officeNumber: apt.apartmentManagementNumber,
        description: apt.description,
        startComplexNumber: apt.startComplexNumber,
        endComplexNumber: apt.endComplexNumber,
        startDongNumber: apt.startBuildingNumber,
        endDongNumber: apt.endBuildingNumber,
        startFloorNumber: apt.startFloorNumber,
        endFloorNumber: apt.endFloorNumber,
        startHoNumber: apt.startUnitNumber,
        endHoNumber: apt.endUnitNumber,
        apartmentStatus: apt.apartmentStatus,
        adminId: apt.users[0].id,
        adminName: apt.users[0].name,
        adminContact: apt.users[0].contact,
        adminEmail: apt.users[0].email,
        dongRange: {
            start: apt.startComplexNumber * 100 + apt.startBuildingNumber,
            end: apt.endComplexNumber * 100 + apt.endBuildingNumber
        },
        hoRange: {
            start: apt.startFloorNumber * 100 + apt.startUnitNumber,
            end: apt.endFloorNumber * 100 + apt.endUnitNumber
        }
    };
}
exports.default = {
    publicGetList,
    publicGet,
    getList,
    get
};
