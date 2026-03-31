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
const poll_repo_1 = __importDefault(require("./poll.repo"));
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../../lib/prisma"));
const buildQuery_1 = require("../../lib/buildQuery");
const user_repo_1 = __importDefault(require("../user/user.repo"));
const NotFoundError_1 = __importDefault(require("../../middleware/errors/NotFoundError"));
const BadRequestError_1 = __importDefault(require("../../middleware/errors/BadRequestError"));
const constants_1 = require("../../lib/constants");
const ForbiddenError_1 = __importDefault(require("../../middleware/errors/ForbiddenError"));
const event_repo_1 = __importDefault(require("../event/event.repo"));
const vote_repo_1 = __importDefault(require("../pollVote/vote.repo"));
const utils_1 = require("../../lib/utils");
//------------------------------------------- 투표 생성: 관리자
function create(userId, body) {
    return __awaiter(this, void 0, void 0, function* () {
        const { adminId, pollBoardId: boardId } = yield (0, utils_1.getAptInfoByUserId)(userId);
        // req.body 데이터 로직 validation
        const isSameBoardId = boardId === body.boardId;
        if (!isSameBoardId)
            throw new BadRequestError_1.default('boardId가 틀립니다.');
        if (body.endDate < body.startDate)
            throw new BadRequestError_1.default('종료일은 시작일보다 이전일 수 없습니다.');
        if (body.endDate < new Date())
            throw new BadRequestError_1.default('종료일은 현재보다 이전일 수 없습니다.');
        // 데이터 가공
        const pollDataWithOption = buildPollData(adminId, boardId, body);
        const eventData = {
            eventType: client_1.EventType.POLL,
            title: pollDataWithOption.title,
            startDate: pollDataWithOption.startDate,
            endDate: pollDataWithOption.endDate
        };
        // DB 생성: poll/pollOptions/event
        return yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            const poll = yield poll_repo_1.default.create(tx, {
                data: pollDataWithOption,
                include: { pollOptions: true }
            });
            // 진행될 투표는 생성 시 이벤트에 추가
            if (poll.status === client_1.PollStatus.IN_PROGRESS)
                yield event_repo_1.default.create(tx, {
                    data: Object.assign(Object.assign({}, eventData), { poll: { connect: { id: poll.id } } })
                });
        }));
    });
}
//------------------------------------------- 투표 목록 조회: 관리자, 입주자
// 입주민은 Pending 상태의 투표는 조회 불가
function getList(userId, query) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const { adminId, pollBoardId: boardId } = yield (0, utils_1.getAptInfoByUserId)(userId);
        const isAdmin = userId === adminId;
        // 요청 validation
        if (!isAdmin && query.status === 'PENDING') {
            throw new BadRequestError_1.default('PENDING 상태의 투표는 조회할 수 없습니다.');
        }
        // 쿼리 파라미터 구성
        const params = buildPollQueryParams(query);
        const { skip, take } = (0, buildQuery_1.buildPagination)(params.pagination, {
            limitDefault: 11,
            limitMax: 100
        });
        const baseWhere = {
            boardId,
            deletedAt: null
        };
        const queryWhere = (_a = (0, buildQuery_1.buildWhere)(params)) !== null && _a !== void 0 ? _a : {};
        // 최종 where
        const where = {
            AND: [
                baseWhere,
                queryWhere,
                ...(isAdmin ? [] : [{ status: { not: client_1.PollStatus.PENDING } }])
            ]
        };
        // DB 조회
        const polls = yield poll_repo_1.default.findMany({
            where,
            skip,
            take,
            orderBy: { createdAt: 'desc' }
        });
        const totalCount = yield poll_repo_1.default.count({ where });
        return {
            polls: yield buildPollListRes(polls),
            totalCount
        };
    });
}
//------------------------------------------- 투표 상세 조회: 관리자, 입주자
// 입주민은 Pending 상태의 투표는 조회 불가
function get(userId, pollId) {
    return __awaiter(this, void 0, void 0, function* () {
        const poll = yield poll_repo_1.default.find({
            where: { id: pollId, deletedAt: null },
            include: { pollOptions: true }
        });
        if (!poll)
            throw new NotFoundError_1.default('투표가 존재하지 않습니다.');
        const { adminId, pollBoardId: userBoardId } = yield (0, utils_1.getAptInfoByUserId)(userId);
        const isAdmin = userId === adminId;
        const isSameApartment = poll.boardId === userBoardId;
        const isPending = poll.status === client_1.PollStatus.PENDING;
        if (!isSameApartment)
            throw new ForbiddenError_1.default(); // 권한: 같은 아파트 소속
        if (!isAdmin && isPending)
            throw new BadRequestError_1.default('PENDING 상태의 투표는 조회할 수 없습니다.');
        return buildPollDetailRes(poll);
    });
}
//------------------------------------------- 투표 수정: 관리자
// 개시 전의 투표만 수정 가능
function patch(userId, pollId, body) {
    return __awaiter(this, void 0, void 0, function* () {
        const poll = yield poll_repo_1.default.find({ where: { id: pollId, deletedAt: null } });
        if (!poll)
            throw new NotFoundError_1.default('해당 투표가 존재하지 않습니다.');
        // 검증
        const isAdmin = userId === poll.adminId;
        if (!isAdmin)
            throw new ForbiddenError_1.default(); // 권한: 관리자
        if (poll.startDate <= new Date())
            throw new BadRequestError_1.default('진행 중이거나 종료된 투표는 수정할 수 없습니다.');
        // 데이터 준비
        const pollData = buildPollPatchData(body);
        const eventData = {
            title: body.title,
            startDate: body.startDate,
            endDate: body.endDate
        };
        // DB 수정: 투표/이벤트
        return yield poll_repo_1.default.patch(prisma_1.default, {
            where: { id: pollId },
            data: Object.assign(Object.assign({}, pollData), { event: {
                    update: {
                        data: eventData
                    }
                } })
        });
    });
}
//------------------------------------------- 투표 삭졔: 관리자
// 개시 전의 투표만 삭제 가능
// 개발환경에서는 삭제, 배포환경에서는 soft delete
function del(userId, pollId) {
    return __awaiter(this, void 0, void 0, function* () {
        const poll = yield poll_repo_1.default.find({ where: { id: pollId, deletedAt: null } });
        if (!poll)
            throw new NotFoundError_1.default('해당 투표가 존재하지 않습니다.');
        const isAdmin = userId === poll.adminId;
        if (!isAdmin)
            throw new ForbiddenError_1.default(); // 권한: 관리자
        if (poll.startDate <= new Date())
            throw new BadRequestError_1.default('진행 중이거나 종료된 투표는 삭제할 수 없습니다.');
        if (constants_1.NODE_ENV === 'development') {
            yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                yield vote_repo_1.default.deleteMany(tx, { where: { pollId } });
                yield tx.pollOption.deleteMany({ where: { pollId } });
                yield event_repo_1.default.del(tx, { where: { pollId } });
                yield poll_repo_1.default.del(tx, { where: { id: pollId } });
            }));
        }
        else {
            yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                yield poll_repo_1.default.patch(tx, {
                    where: { id: pollId },
                    data: { deletedAt: new Date() }
                });
                yield event_repo_1.default.del(tx, { where: { pollId } }); // hard delete만 있음
            }));
        }
    });
}
//------------------------------------------ 지역함수
function buildPollData(adminId, boardId, body) {
    return {
        buildingPermission: body.buildingPermission,
        title: body.title,
        content: body.content,
        startDate: body.startDate,
        endDate: body.endDate,
        status: body.status,
        board: { connect: { id: boardId } },
        admin: { connect: { id: adminId } },
        pollOptions: { create: body.options }
    };
}
function buildPollQueryParams(query) {
    const { page, limit, buildingPermission, keyword } = query;
    const status = query.status === undefined || query.status === ''
        ? undefined
        : query.status;
    return {
        pagination: { page, limit },
        filters: { buildingPermission },
        exactFilters: { status },
        searchKey: { keyword, fields: ['title', 'content'] }
    };
}
function buildPollListRes(polls) {
    return __awaiter(this, void 0, void 0, function* () {
        return Promise.all(polls.map((p) => __awaiter(this, void 0, void 0, function* () {
            const admin = yield user_repo_1.default.find({ where: { id: p.adminId } });
            if (!admin)
                throw new NotFoundError_1.default('관리자가 계정에 존재하지 않습니다.');
            return {
                pollId: p.id,
                userId: p.adminId,
                title: p.title,
                writerName: admin.name,
                buildingPermission: p.buildingPermission,
                createdAt: p.createdAt,
                updatedAt: p.updatedAt,
                startDate: p.startDate,
                endDate: p.endDate,
                status: p.status
            };
        })));
    });
}
function buildPollDetailRes(poll) {
    const options = poll.pollOptions.map((o) => ({
        id: o.id,
        title: o.title,
        voteCount: o.voteCount
    }));
    return {
        pollId: poll.id,
        userId: poll.adminId,
        title: poll.title,
        buildingPermission: poll.buildingPermission,
        createdAt: poll.createdAt,
        updatedAt: poll.updatedAt,
        startDate: poll.startDate,
        endDate: poll.endDate,
        status: poll.status,
        content: poll.content,
        boardName: 'POLL',
        options
    };
}
function buildPollPatchData(body) {
    const data = {
        title: body.title,
        content: body.content,
        buildingPermission: body.buildingPermission,
        startDate: body.startDate,
        endDate: body.endDate,
        status: body.status
    };
    if (body.options) {
        data.pollOptions = {
            deleteMany: {},
            create: body.options
        };
    }
    return data;
}
exports.default = {
    create,
    getList,
    get,
    patch,
    del
};
