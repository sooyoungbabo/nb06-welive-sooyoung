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
const dayjs_1 = __importDefault(require("dayjs"));
const NotFoundError_1 = __importDefault(require("../../middleware/errors/NotFoundError"));
const ForbiddenError_1 = __importDefault(require("../../middleware/errors/ForbiddenError"));
const BadRequestError_1 = __importDefault(require("../../middleware/errors/BadRequestError"));
const poll_repo_1 = __importDefault(require("../poll/poll.repo"));
const notice_repo_1 = __importDefault(require("../notice/notice.repo"));
const event_repo_1 = __importDefault(require("./event.repo"));
const client_1 = require("@prisma/client");
const constants_1 = require("../../lib/constants");
const utils_1 = require("../../lib/utils");
//----------------------------------------------- 이벤트 목록 조회
function getList(userId, query) {
    return __awaiter(this, void 0, void 0, function* () {
        const { apartmentId: userAptId } = yield (0, utils_1.getAptInfoByUserId)(userId);
        const isSameApt = userAptId === query.apartmentId;
        if (!isSameApt)
            throw new ForbiddenError_1.default(); // 권한: 같은 아파트
        const start = (0, dayjs_1.default)(`${query.year}-${query.month}-01`).startOf('month');
        const end = start.endOf('month');
        const where = {
            startDate: { lte: end.toDate() },
            endDate: { gte: start.toDate() },
            OR: [
                { notice: { board: { apartmentId: query.apartmentId } } },
                { poll: { board: { apartmentId: query.apartmentId } } }
            ]
        };
        const include = { notice: { select: { category: true } } };
        const events = yield event_repo_1.default.findMany(prisma_1.default, {
            where,
            include,
            orderBy: { createdAt: 'desc' }
        });
        return buildEventListRes(events);
    });
}
//----------------------------------------------- 이벤트 생성 또는 업데이트
// 이벤트는 파생 테이블이라서, 여기서 수정/삭제하는 건 바람직하지 않음
// 일단 API는 만들겠음.
// boardType과 boardId의 의미가 이벤트에서는 다름 <-- 이것은 실수? 의도?
// 그렇지 않다면, 원래 게시글의 ID가 없기 때문에 참조가 불가능함 (댓글에서도 마찬가지)
// boardType: eventType
// boardId: pollId or noticeId
function put(userId, body) {
    return __awaiter(this, void 0, void 0, function* () {
        const { pollBoardId, noticeBoardId, adminId: userAdminId } = yield (0, utils_1.getAptInfoByUserId)(userId);
        const { boardType: eventType, boardId: targetId, startDate, endDate } = body;
        // 원 게시물 가져오기
        const item = eventType === client_1.EventType.POLL
            ? yield poll_repo_1.default.find({
                where: { id: targetId },
                select: { boardId: true, title: true, adminId: true }
            })
            : yield notice_repo_1.default.find({
                where: { id: targetId },
                select: { title: true, boardId: true, adminId: true }
            });
        if (!item)
            throw new NotFoundError_1.default('원 게시물이 존재하지 않거나 타입이 바르지 않습니다.');
        const amIAdmin = userId === userAdminId;
        const isSameAdmin = userAdminId === item.adminId;
        if (amIAdmin && !isSameAdmin)
            throw new ForbiddenError_1.default(); // 권한: 같은 관리자
        const userBoardId = eventType === client_1.EventType.NOTICE ? noticeBoardId : pollBoardId;
        const isSameBoard = item.boardId === userBoardId;
        if (!isSameBoard)
            throw new BadRequestError_1.default('보드 ID가 틀립니다.');
        const updateData = {
            title: item.title,
            startDate,
            endDate
        };
        const createData = Object.assign({ pollId: eventType === client_1.EventType.POLL ? targetId : null, noticeId: eventType === client_1.EventType.NOTICE ? targetId : null, eventType }, updateData);
        const eventArgs = {
            where: eventType === client_1.EventType.POLL ? { pollId: targetId } : { noticeId: targetId },
            create: createData,
            update: updateData
        };
        // upsert이지만, targetId를 요구하므로, update만 수행하게 됨
        // 따라서 트랜젝션: (1) Notice/Poll update (2) Event upsert
        const event = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            // (1) Notice/Poll update
            if (eventType === client_1.EventType.NOTICE) {
                yield notice_repo_1.default.update(tx, {
                    where: { id: targetId },
                    data: { startDate, endDate }
                });
            }
            else {
                yield poll_repo_1.default.patch(tx, {
                    where: { id: targetId },
                    data: { startDate, endDate }
                });
            }
            // (2) Event upsert
            const event = yield event_repo_1.default.upsert(tx, eventArgs);
            return event;
        }));
        return buildEventUpsertRes(event);
    });
}
//----------------------------------------------- 이벤트 삭제
// 개발환경에서는 공지/투표도 삭제, 배포환경에서는 soft delete
function del(userId, eventId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { pollBoardId, noticeBoardId } = yield (0, utils_1.getAptInfoByUserId)(userId);
        const event = yield event_repo_1.default.find({
            where: { id: eventId },
            select: {
                eventType: true,
                poll: { select: { boardId: true } },
                notice: { select: { boardId: true } }
            }
        });
        if (!event)
            throw new NotFoundError_1.default('존재하지 않는 이벤트입니다.');
        // 권한 검증: 같은 아파트의 이벤트인지
        if (event.eventType === client_1.EventType.NOTICE) {
            if (!event.notice)
                throw new NotFoundError_1.default('원 공지가 존지하지 않습니다.');
            const isSameBoard = noticeBoardId === event.notice.boardId;
            if (!isSameBoard)
                throw new ForbiddenError_1.default();
        }
        if (event.eventType === client_1.EventType.POLL) {
            if (!event.poll)
                throw new NotFoundError_1.default('원 투표가 존지하지 않습니다.');
            const isSameBoard = pollBoardId === event.poll.boardId;
            if (!isSameBoard)
                throw new ForbiddenError_1.default();
        }
        // 트랜젝션: (1) 이벤트 삭제 (2) 공지/투표 삭제
        const eventDeleted = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            // 이벤트 삭제
            const event = yield event_repo_1.default.del(tx, { where: { id: eventId } });
            // 공지/투표 삭제:  개발단계에서는 hard delete, 배포시엔 soft delete
            if (constants_1.NODE_ENV === 'development') {
                event.eventType === client_1.EventType.POLL
                    ? yield poll_repo_1.default.del(tx, { where: { id: event.pollId } })
                    : yield notice_repo_1.default.del(tx, { where: { id: event.noticeId } });
            }
            else {
                event.eventType === client_1.EventType.POLL
                    ? yield poll_repo_1.default.patch(tx, {
                        where: { id: event.pollId },
                        data: { deletedAt: new Date() }
                    })
                    : yield notice_repo_1.default.update(tx, {
                        where: { id: event.noticeId },
                        data: { deletedAt: new Date() }
                    });
            }
            return event;
        }));
        return buildEventDelRes(eventDeleted);
    });
}
function buildEventListRes(events) {
    return events.map((e) => {
        return {
            id: e.id,
            start: e.startDate,
            end: e.endDate,
            title: e.title,
            category: e.notice ? e.notice.category : 'RESIDENCE_VOTE',
            type: e.eventType,
            targetId: e.notice ? e.noticeId : e.pollId
        };
    });
}
function buildEventUpsertRes(event) {
    return {
        id: event.id,
        start: event.startDate,
        end: event.endDate,
        title: event.title,
        type: event.eventType,
        targetId: event.eventType === 'NOTICE' ? event.noticeId : event.pollId
    };
}
function buildEventDelRes(event) {
    return {
        id: event.id,
        startDate: event.startDate,
        endDate: event.endDate,
        boardType: event.eventType,
        noticeId: event.noticeId,
        pollId: event.pollId
    };
}
exports.default = {
    getList,
    put,
    del
};
