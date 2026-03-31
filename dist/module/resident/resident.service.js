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
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const NotFoundError_1 = __importDefault(require("../../middleware/errors/NotFoundError"));
const ForbiddenError_1 = __importDefault(require("../../middleware/errors/ForbiddenError"));
const prisma_1 = __importDefault(require("../../lib/prisma"));
const resident_repo_1 = __importDefault(require("./resident.repo"));
const user_repo_1 = __importDefault(require("../user/user.repo"));
const utils_1 = require("../../lib/utils");
const buildQuery_1 = require("../../lib/buildQuery");
const myFuns_1 = require("../../lib/myFuns");
const resident_struct_1 = require("./resident.struct");
const superstruct_1 = require("superstruct");
const client_1 = require("@prisma/client");
//---------------------------------------- 입주민 목록 조회
// page, limit (default 20, max 100)
// filters: building, unitNumber
// exactFilters: residenceStatus, isRegistered
// keyword 검색: 검색필드는 name, ontact
function getList(userId, query) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const { apartmentId } = yield (0, utils_1.getAptInfoByUserId)(userId);
        const baseWhere = {
            apartmentId,
            deletedAt: null
        };
        // 검색 파라미터 구성
        const queryParams = buildQueryParams(query);
        const { skip, take } = (0, buildQuery_1.buildPagination)(queryParams.pagination, {
            limitDefault: 20,
            limitMax: 100
        });
        const queryWhere = (_a = (0, buildQuery_1.buildWhere)({
            searchKey: queryParams.searchKey,
            filters: queryParams.filters,
            exactFilters: queryParams.exactFilters
        })) !== null && _a !== void 0 ? _a : {};
        // 최종 where
        const where = {
            AND: [baseWhere, queryWhere]
        };
        const totalCount = yield resident_repo_1.default.count({ where });
        const rawResidents = yield resident_repo_1.default.findMany({
            where,
            skip,
            take,
            orderBy: { createdAt: 'desc' }
        });
        return {
            residents: buildResidentListRes(rawResidents),
            totalCount
        };
    });
}
//---------------------------------------- 명부only 입주민 리소스 생성 (개별 등록)
// userId, email은 null, isRegistered = false
// 승인 절차가 따로 없고 user계정 등록할 때 트랜젝션으로 함께 승인
//                     그러면 userId, email = nn, isRegistered = true
function post(userId, data) {
    return __awaiter(this, void 0, void 0, function* () {
        // validation: 아파트, 동, 호
        const { apartmentId, apartmentName } = yield (0, utils_1.getAptInfoByUserId)(userId);
        (0, utils_1.validateAptDongHo)(apartmentName, data.apartmentDong, data.apartmentHo);
        // DB Resident 생성
        const resident = yield resident_repo_1.default.create(prisma_1.default, {
            data: Object.assign(Object.assign({}, data), { isRegistered: false, apartment: { connect: { id: apartmentId } } })
        });
        // 출력 양식에 맞춰 포맷하고 리턴
        return buildResidentRes(resident);
    });
}
// 주강사님과의 협의로 안 만들기로 한 API
// async function user2resident(userId: string): Promise<Resident> {
//   const user = await userRepo.findById(userId);
//   let message: string;
//   if (!user) throw new NotFoundError('존재하지 않는 사용자입니다.');
//   if (!user.apartmentId) throw new NotFoundError('아파트ID가 없는 사용자입니다.');
//   const resident = await residentRepo.find(prisma, { where: { userId } });
//   if (resident) throw new NotFoundError('이미 입주민 명부에 추가된 사용자입니다.');
//   const data = {
//     apartmentDong: '999', // user에도 중복으로 넣어야 할 듯
//     apartmentHo: '999',
//     contact: user.contact,
//     name: user.name,
//     isHouseholder: HouseholdRole.HOUSEHOLDER
//   };
//   assert(data, CreateResident);
//   return await residentRepo.create(prisma, {
//     ...data,
//     apartment: { connect: { id: user.apartmentId } }
//   });
// }
//---------------------------------------- 입주민 업로드용 템플릿 다운로드
function downloadTemplateCsv() {
    return ('\ufeff' +
        [
            `"동","호수","이름","연락처","세대주여부"`,
            `"101","101","홍길동","01012345678","HOUSEHOLDER"`,
            `"105","2008","김길동","01043215678","MEMBER"`
        ].join('\n'));
}
//---------------------------------------- 파일로부터 입주민 리소스 생성
function createManyFromFile(userId, buffer) {
    return __awaiter(this, void 0, void 0, function* () {
        const text = buffer.toString('utf-8').replace(/^\uFEFF/, '');
        const { apartmentId, apartmentName } = yield (0, utils_1.getAptInfoByUserId)(userId);
        let residentData = [];
        const rows = text.split('\n').slice(1);
        for (const row of rows) {
            const [dong, ho, name, contact, role] = row.replace(/"/g, '').split(',');
            const tempData = {
                apartmentId,
                apartmentDong: dong,
                apartmentHo: ho,
                name,
                contact,
                isHouseholder: role,
                isRegistered: false,
                residenceStatus: client_1.ResidenceStatus.RESIDENCE,
                approvalStatus: client_1.ApprovalStatus.PENDING
            };
            // validation: 아파트, 동, 호
            (0, utils_1.validateAptDongHo)(apartmentName, dong, ho);
            (0, superstruct_1.assert)(tempData, resident_struct_1.CreateResident);
            residentData.push(tempData);
        }
        const residents = yield resident_repo_1.default.createMany(prisma_1.default, residentData);
        return residents.count;
    });
}
//---------------------------------------- 입주민 목록 파일 다운로드
function downloadListCsv(userId, query) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const { apartmentId } = yield (0, utils_1.getAptInfoByUserId)(userId);
        // 쿼리 파라미터 구성
        const queryParams = buildQueryParams(query);
        const { skip, take } = (0, buildQuery_1.buildPagination)(queryParams.pagination, {
            limitDefault: 20,
            limitMax: 100
        });
        const baseWhere = {
            apartmentId, // 관리 중인 아파트로 한정
            deletedAt: null
        };
        const queryWhere = (_a = (0, buildQuery_1.buildWhere)({
            searchKey: queryParams.searchKey,
            filters: queryParams.filters,
            exactFilters: queryParams.exactFilters
        })) !== null && _a !== void 0 ? _a : {};
        const where = {
            AND: [baseWhere, queryWhere]
        };
        // DB 조회
        const residents = yield resident_repo_1.default.findMany({
            where,
            skip,
            take,
            orderBy: { createdAt: 'desc' }
        });
        // 출력용 데이터로 재가공
        const items = residents.map((r) => ({
            apartmentDong: r.apartmentDong,
            apartmentHo: r.apartmentHo,
            name: r.name,
            contact: r.contact,
            isHouseholder: r.isHouseholder
        }));
        const header = ['동', ' 호수', ' 이름', ' 연락처', ' 세대주여부'];
        const rows = residents.map((r) => [r.apartmentDong, r.apartmentHo, r.name, r.contact, r.isHouseholder]
            .map((v) => `"${v}"`)
            .join(','));
        const csv = '\ufeff' + [header.join(','), ...rows].join('\n');
        // file에 저장
        const savedFilePath = yield saveCsv(csv);
        //console.log(savedFilePath);
        return csv;
    });
}
//---------------------------------------- 입주민 상세 조회
function get(userId, residentId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { adminId: residentAdminId } = yield (0, utils_1.getAptInfoByResidentId)(residentId);
        const isAdmin = userId === residentAdminId;
        if (!isAdmin)
            throw new ForbiddenError_1.default(); // 권한: 나 = 입주민 아파트 관리자
        const resident = yield resident_repo_1.default.find(prisma_1.default, {
            where: { id: residentId, deletedAt: null }
        });
        if (!resident)
            throw new NotFoundError_1.default('입주민이 존재하지 않습니다.');
        return buildResidentRes(resident);
    });
}
//---------------------------------------- 입주민 정보 수정
function patch(userId, residentId, residentData, userData) {
    return __awaiter(this, void 0, void 0, function* () {
        // 권한 체크: 나 = 입주민 아파트 관리자이어야 함
        const { adminId: residentAdminId, userId: residentUserId, apartmentId } = yield (0, utils_1.getAptInfoByResidentId)(residentId);
        const isAdmin = userId === residentAdminId;
        if (!isAdmin)
            throw new ForbiddenError_1.default();
        // DB 트랜젝션: Resident/User 수정
        return prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            const resident = yield resident_repo_1.default.patch(tx, {
                where: { id: residentId, apartmentId },
                data: residentData
            });
            // User 계정이 있는 명부 입주민인 경우
            if (residentUserId)
                yield user_repo_1.default.patch(tx, {
                    where: { id: residentUserId, apartmentId },
                    data: userData
                });
            return resident;
        }));
    });
}
//---------------------------------------- 입주민 정보 삭제
// 개발환경에서는 진짜 삭제
function del(userId, residentId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { adminId: residentAdminId, userId: residentUserId } = yield (0, utils_1.getAptInfoByResidentId)(residentId);
        const isAdmin = userId === residentAdminId;
        if (!isAdmin)
            throw new ForbiddenError_1.default();
        yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            const resident = yield resident_repo_1.default.del(tx, {
                where: { id: residentId }
            });
            // 사용자 계정이 있는 입주민인 경우
            if (residentUserId)
                yield user_repo_1.default.del(tx, {
                    where: { id: residentUserId }
                });
        }));
    });
}
// 배포 환경에서는 soft-delete
function softDel(userId, residentId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { adminId: residentAdminId, userId: residentUserId } = yield (0, utils_1.getAptInfoByResidentId)(residentId);
        const isAdmin = userId === residentAdminId;
        if (!isAdmin)
            throw new ForbiddenError_1.default();
        yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            const resident = yield resident_repo_1.default.patch(prisma_1.default, {
                where: { id: residentId },
                data: { deletedAt: new Date() }
            });
            if (residentUserId)
                yield user_repo_1.default.patch(tx, {
                    where: { id: residentUserId },
                    data: { deletedAt: new Date() }
                });
        }));
    });
}
//----------------------------------------------------------- 지역 함수
function buildQueryParams(query) {
    const { page, limit } = query;
    const { keyword } = query;
    const { building: apartmentDong, unitNumber: apartmentHo } = query;
    const residenceStatus = query.residenceStatus === undefined || query.residenceStatus === ''
        ? undefined
        : query.residenceStatus;
    const isRegistered = query.isRegistered === undefined ? undefined : query.isRegistered === 'true';
    return {
        pagination: { page, limit },
        searchKey: { keyword, fields: ['name', 'contact'] },
        filters: { apartmentDong, apartmentHo },
        exactFilters: { residenceStatus, isRegistered }
    };
}
function buildResidentListRes(data) {
    return data.map((d) => {
        return {
            id: d.id,
            userId: d.userId,
            building: d.apartmentDong,
            unitNumber: d.apartmentHo,
            contact: d.contact,
            name: d.name,
            residenceStatus: d.residenceStatus,
            isHouseholder: d.isHouseholder,
            isRegistered: d.isRegistered,
            approvalStatus: d.approvalStatus,
            email: d.email
        };
    });
}
function buildResidentRes(resident) {
    return {
        id: resident.id,
        userId: resident.userId,
        building: resident.apartmentDong,
        unitNumber: resident.apartmentHo,
        contact: resident.contact,
        name: resident.name,
        email: resident.email,
        residenceStatus: resident.residenceStatus,
        isHouseholder: resident.isHouseholder,
        isRegistered: resident.isRegistered,
        approvalStatus: resident.approvalStatus
    };
}
function saveCsv(csv) {
    return __awaiter(this, void 0, void 0, function* () {
        const dir = path_1.default.join(process.cwd(), 'downloads');
        const filePath = path_1.default.join(dir, `아파트_입주민명부_${(0, myFuns_1.getTimestamp)()}.csv`);
        yield promises_1.default.mkdir(dir, { recursive: true });
        yield promises_1.default.writeFile(filePath, csv, 'utf-8');
        return filePath;
    });
}
exports.default = {
    getList,
    post,
    downloadTemplateCsv,
    createManyFromFile,
    downloadListCsv,
    get,
    patch,
    del,
    softDel
};
