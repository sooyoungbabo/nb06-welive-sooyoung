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
const ForbiddenError_1 = __importDefault(require("../../middleware/errors/ForbiddenError"));
const BadRequestError_1 = __importDefault(require("../../middleware/errors/BadRequestError"));
const NotFoundError_1 = __importDefault(require("../../middleware/errors/NotFoundError"));
const notification_repo_1 = __importDefault(require("../notification/notification.repo"));
const user_repo_1 = __importDefault(require("../user/user.repo"));
const complaint_repo_1 = __importDefault(require("./complaint.repo"));
const comment_repo_1 = __importDefault(require("../comment/comment.repo"));
const node_console_1 = require("node:console");
const notification_struct_1 = require("../notification/notification.struct");
const notification_sse_1 = require("../notification/notification.sse");
const buildQuery_1 = require("../../lib/buildQuery");
const utils_1 = require("../../lib/utils");
const constants_1 = require("../../lib/constants");
const client_1 = require("@prisma/client");
//----------------------------------------------------- 민원 등록
function create(userId, body) {
    return __awaiter(this, void 0, void 0, function* () {
        const { adminId, complaintBoardId } = yield (0, utils_1.getAptInfoByUserId)(userId);
        const isBoardIdCorrect = body.boardId === complaintBoardId;
        if (!isBoardIdCorrect)
            throw new BadRequestError_1.default('boardId가 틀립니다.');
        const complaintData = {
            title: body.title,
            content: body.content,
            isPublic: body.isPublic,
            status: body.status,
            creator: { connect: { id: userId } },
            board: { connect: { id: complaintBoardId } },
            admin: { connect: { id: adminId } }
        };
        // DB 생성: 트랜젝션 (1) 민원등록 (2) 알림생성
        const complaint = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            // (1) 민원등록
            const complaint = yield complaint_repo_1.default.create(tx, {
                data: complaintData,
                include: { creator: { select: { name: true } } }
            });
            // (2) 알림생성
            const notiData = {
                notiType: client_1.NotificationType.COMPLAINT_RAISED,
                targetId: complaint.id,
                content: `[알림] 민원접수 (${complaint.creator.name}님, ${complaint.title})`
            };
            (0, node_console_1.assert)(notiData, notification_struct_1.CreateNotification);
            yield notification_repo_1.default.create(tx, {
                data: Object.assign(Object.assign({}, notiData), { receiver: { connect: { id: adminId } } })
            });
            return complaint;
        }));
        // SSE to admin
        (0, notification_sse_1.sendToUser)(adminId, `[알림] 민원접수 (${complaint.creator.name}님, ${complaint.title})`);
        return complaint;
    });
}
//----------------------------------------------------- 전체 민원 조회
function getList(userId, query) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const { complaintBoardId } = yield (0, utils_1.getAptInfoByUserId)(userId);
        // 쿼리 파라미터 구성
        let whereTerms = [
            {
                boardId: complaintBoardId, // 같은 아파트의 민원 보드로 한정
                deletedAt: null
            }
        ];
        const queryParams = buildQueryParams(query);
        const { skip, take } = (0, buildQuery_1.buildPagination)(queryParams.pagination, {
            limitDefault: 20,
            limitMax: 100
        });
        // query where
        const queryWhere = (0, buildQuery_1.buildWhere)({
            searchKey: queryParams.searchKey,
            exactFilters: queryParams.exactFilters
        });
        if (Object.keys(queryWhere).length > 0)
            whereTerms.push(queryWhere);
        //관계형 필터 조회 추가: filters - dong, ho
        let residentFilters = {};
        const { apartmentDong, apartmentHo } = (_a = queryParams.filters) !== null && _a !== void 0 ? _a : {};
        if (apartmentDong)
            residentFilters.apartmentDong = apartmentDong;
        if (apartmentHo)
            residentFilters.apartmentHo = apartmentHo;
        if (Object.keys(residentFilters).length > 0) {
            whereTerms.push({
                creator: { resident: residentFilters }
            });
        }
        // 최종 where
        const where = { AND: whereTerms };
        // 출력에 필요한 민원인 정보 include
        const include = {
            creator: {
                select: {
                    resident: {
                        select: { name: true, apartmentDong: true, apartmentHo: true }
                    }
                }
            }
        };
        // DB 민원 조회
        const totalCount = yield complaint_repo_1.default.count({ where });
        const rawComplaints = yield complaint_repo_1.default.findMany({
            where,
            include,
            skip,
            take,
            orderBy: { createdAt: 'desc' }
        });
        // DB 댓글 조회: 댓글수 민원 필드에 추가
        const comlaints = yield addCommentsCountField(rawComplaints);
        return {
            complaints: yield buildComplaintListRes(comlaints),
            totalCount
        };
    });
}
//----------------------------------------------------- 민원 상세 조회
function get(userId, complaintId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { adminId: userAdminId, complaintBoardId: userBoardId } = yield (0, utils_1.getAptInfoByUserId)(userId);
        const complaint = yield complaint_repo_1.default.find({
            where: { id: complaintId },
            select: { creatorId: true, boardId: true, isPublic: true }
        });
        if (!complaint)
            throw new NotFoundError_1.default('존재하지 않는 민원입니다.');
        const isSameBoard = userBoardId === complaint.boardId;
        const amIAdmin = userId === userAdminId;
        const amIAuthor = userId === complaint.creatorId;
        if (!isSameBoard)
            throw new ForbiddenError_1.default(); // 권한: 같은 아파트 민원인가
        if (!amIAdmin && complaint.isPublic === false)
            if (!amIAuthor)
                // 사용자는, 비밀민원인 경우 저자만 조회 가능
                throw new ForbiddenError_1.default('비공개 민원입니다.');
        // DB: viewCount 1 증가하고 상세 조회 내려줌
        const complaintUpdated = yield complaint_repo_1.default.patch(prisma_1.default, {
            where: { id: complaintId },
            data: { viewCount: { increment: 1 } },
            include: {
                creator: {
                    select: {
                        resident: {
                            select: { name: true, apartmentDong: true, apartmentHo: true }
                        }
                    }
                }
            }
        });
        const comments = yield comment_repo_1.default.findMany({
            where: { targetId: complaintId, targetType: client_1.CommentType.COMPLAINT }
        });
        return buildComplaintRes(complaintUpdated, comments);
    });
}
//----------------------------------------------------- 일반 유저 민원 수정: 유저, 관리자
function patch(userId, complaintId, body) {
    return __awaiter(this, void 0, void 0, function* () {
        const { adminId: userAdminId, complaintBoardId: userBoardId } = yield (0, utils_1.getAptInfoByUserId)(userId);
        const complaint = yield complaint_repo_1.default.find({
            where: { id: complaintId },
            select: { boardId: true, status: true, creatorId: true }
        });
        if (!complaint)
            throw new NotFoundError_1.default('존재하지 않는 민원입니다.');
        const isSameBoard = userBoardId === complaint.boardId;
        const amIAdmin = userId === userAdminId;
        const amIAuthor = userId === complaint.creatorId;
        if (!isSameBoard)
            throw new ForbiddenError_1.default(); // 권한
        if (!amIAdmin && !amIAuthor)
            throw new ForbiddenError_1.default('본인이 작성한 민원만 수정할 수 있습니다.');
        if (complaint.status !== client_1.ComplaintStatus.PENDING)
            throw new BadRequestError_1.default('처리 중이거나 종결된 민원은 수정할 수 없습니다.');
        const complaintUpdated = yield complaint_repo_1.default.patch(prisma_1.default, {
            where: { id: complaintId },
            data: Object.assign({}, body),
            include: {
                creator: {
                    select: {
                        resident: {
                            select: { name: true, apartmentDong: true, apartmentHo: true }
                        }
                    }
                }
            }
        });
        const comments = yield comment_repo_1.default.findMany({
            where: { targetId: complaintUpdated.id, targetType: client_1.CommentType.COMPLAINT }
        });
        const _a = yield buildComplaintRes(complaintUpdated, comments), { writerName } = _a, rest = __rest(_a, ["writerName"]);
        return rest;
    });
}
//----------------------------------------------------- 민원 삭제: 개발환경에서는 삭제, 배포환경에서는 soft delete
function del(userId, complaintId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { adminId: userAdminId, complaintBoardId: userBoardId } = yield (0, utils_1.getAptInfoByUserId)(userId);
        const complaint = yield complaint_repo_1.default.find({
            where: { id: complaintId },
            select: { boardId: true, status: true, creatorId: true }
        });
        if (!complaint)
            throw new NotFoundError_1.default('존재하지 않는 민원입니다.');
        if (complaint.status !== client_1.ComplaintStatus.PENDING)
            throw new BadRequestError_1.default('처리 중이거나 종결된 민원은 삭제할 수 없습니다.');
        const isSameBoard = userBoardId === complaint.boardId;
        const amIAdmin = (userId = userAdminId);
        const amIAuthor = (userId = complaint.creatorId);
        if (!isSameBoard)
            throw new ForbiddenError_1.default(); // 권한
        if (!amIAdmin && !amIAuthor)
            throw new ForbiddenError_1.default('본인이 작성한 민원만 삭제할 수 있습니다.');
        if (constants_1.NODE_ENV === 'development') {
            yield complaint_repo_1.default.del({ where: { id: complaintId } });
            // comment는 삭제하지 않겠음
        }
        else
            yield complaint_repo_1.default.patch(prisma_1.default, {
                where: { id: complaintId },
                data: { deletedAt: new Date() }
            });
        // comment는 soft delete 없음
    });
}
//----------------------------------------------------- 관리자 이상 민원 수정 : 상태 변경
function changeStatus(userId, complaintId, status) {
    return __awaiter(this, void 0, void 0, function* () {
        const complaint = yield complaint_repo_1.default.find({
            where: { id: complaintId },
            select: { boardId: true, creatorId: true }
        });
        if (!complaint)
            throw new NotFoundError_1.default('존재하지 않는 민원입니다.');
        // 아래는 잠시 유보: 관리자는 필요할 수 있음
        // if (complaint.status !== ComplaintStatus.PENDING)
        //   throw new BadRequestError('처리 중이거나 종결된 민원은 수정할 수 없습니다.');
        if (!(0, utils_1.isSuperAdmin)(userId)) {
            const { adminId: userAdminId, complaintBoardId: userBoardId } = yield (0, utils_1.getAptInfoByUserId)(userId);
            const isSameBoard = userBoardId === complaint.boardId;
            const amIAdmin = (userId = userAdminId);
            if (amIAdmin && !isSameBoard)
                throw new ForbiddenError_1.default(); // admin은 자기 아파트이어야
        }
        // DB 트랜젝션: (1) Complaint 상태 변경 (2) 알림
        const complaintPatched = yield complaintStatusTransaction(complaintId, status);
        if (!complaintPatched.creator.resident)
            throw new NotFoundError_1.default('민원 작성자가 입주민 명부에 없습니다.');
        // SSE to 민원 작성자
        (0, notification_sse_1.sendToUser)(complaint.creatorId, `[알림] 민원종결 (${complaintPatched.creator.resident.name}님)`);
        // 댓글 가져오고, 데이터 가공 후 리턴
        const comments = yield comment_repo_1.default.findMany({
            where: { targetId: complaintId, targetType: client_1.CommentType.COMPLAINT }
        });
        return buildComplaintRes(complaintPatched, comments);
    });
}
//----------------------------------------------------- 지역 함수
function complaintStatusTransaction(complaintId, status) {
    return __awaiter(this, void 0, void 0, function* () {
        const complaintPatched = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            // complaint 상태 변경
            const complaint = yield complaint_repo_1.default.patch(tx, {
                where: { id: complaintId },
                data: { status },
                include: {
                    creator: {
                        select: {
                            resident: {
                                select: { name: true, apartmentDong: true, apartmentHo: true }
                            }
                        }
                    }
                }
            });
            if (!complaint.creator.resident)
                throw new NotFoundError_1.default('민원 작성자가 입주민 명부에 없습니다.');
            // (2) DB 알림 생성
            const notiData = {
                notiType: client_1.NotificationType.COMPLAINT_RESOLVED,
                targetId: complaintId,
                content: `[알림] ${complaint.creator.resident.name}님 민원종결`
            };
            (0, node_console_1.assert)(notiData, notification_struct_1.CreateNotification);
            const noti = yield notification_repo_1.default.create(tx, {
                data: Object.assign(Object.assign({}, notiData), { receiver: { connect: { id: complaint.creatorId } } })
            });
            return complaint;
        }));
        return complaintPatched;
    });
}
function buildQueryParams(query) {
    const { page, limit } = query;
    const { dong, ho } = query;
    const { keyword } = query;
    const status = query.status === undefined || query.status === ''
        ? undefined
        : query.status;
    const isPublic = query.isPublic === undefined ? undefined : query.isPublic === 'true';
    return {
        pagination: { page, limit },
        searchKey: { keyword, fields: ['title', 'content'] },
        filters: { apartmentDong: dong, apartmentHo: ho },
        exactFilters: { status, isPublic }
    };
}
function buildComplaintRes(complaint, comments) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!complaint.creator.resident)
            throw new NotFoundError_1.default();
        return {
            complaintId: complaint.id,
            userId: complaint.creatorId,
            title: complaint.title,
            writerName: complaint.creator.resident.name,
            createdAt: complaint.createdAt,
            updatedAt: complaint.updatedAt,
            isPublic: complaint.isPublic,
            viewsCount: complaint.viewCount,
            commentsCount: comments.length,
            status: complaint.status,
            dong: complaint.creator.resident.apartmentDong,
            ho: complaint.creator.resident.apartmentHo,
            content: complaint.content,
            boardType: client_1.BoardType.COMPLAINT,
            comments: yield buildCommentRes(comments)
        };
    });
}
function buildCommentRes(comments) {
    return __awaiter(this, void 0, void 0, function* () {
        return Promise.all(comments.map((c) => __awaiter(this, void 0, void 0, function* () {
            const writer = yield user_repo_1.default.find({ where: { id: c.creatorId } });
            if (!writer)
                throw new NotFoundError_1.default('댓글 작성 사용자가 존재하지 않습니다.');
            return {
                id: c.id,
                userId: c.creatorId,
                content: c.content,
                createdAt: c.createdAt,
                updatedAt: c.updatedAt,
                writerName: writer.name
            };
        })));
    });
}
function addCommentsCountField(complaints) {
    return __awaiter(this, void 0, void 0, function* () {
        const counts = yield prisma_1.default.comment.groupBy({
            by: ['targetId'],
            where: {
                targetType: client_1.CommentType.COMPLAINT,
                targetId: { in: complaints.map((c) => c.id) }
            },
            _count: true
        });
        const countMap = new Map(counts.map((c) => [c.targetId, c._count]));
        const result = complaints.map((c) => {
            var _a;
            return (Object.assign(Object.assign({}, c), { commentsCount: (_a = countMap.get(c.id)) !== null && _a !== void 0 ? _a : 0 }));
        });
        return result;
    });
}
function buildComplaintListRes(complaints) {
    return __awaiter(this, void 0, void 0, function* () {
        return complaints.map((c) => {
            const writer = c.creator.resident;
            if (!writer)
                throw new NotFoundError_1.default('민원인 정보를 찾을 수 없습니다.');
            return {
                complaintId: c.id,
                userId: c.creatorId,
                title: c.title,
                writerName: writer.name,
                createdAt: c.createdAt,
                updatedAt: c.updatedAt,
                isPublic: c.isPublic,
                viewsCount: c.viewCount,
                commentsCount: c.commentsCount,
                status: c.status,
                dong: writer.apartmentDong,
                ho: writer.apartmentHo
            };
        });
    });
}
exports.default = {
    create,
    getList,
    get,
    patch,
    del,
    changeStatus
};
