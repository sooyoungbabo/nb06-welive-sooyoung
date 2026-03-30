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
const constants_1 = require("../../lib/constants");
const utils_1 = require("../../lib/utils");
const buildQuery_1 = require("../../lib/buildQuery");
const notification_sse_1 = require("../notification/notification.sse");
const notification_repo_1 = __importDefault(require("../notification/notification.repo"));
const notice_repo_1 = __importDefault(require("./notice.repo"));
const comment_repo_1 = __importDefault(require("../comment/comment.repo"));
const event_repo_1 = __importDefault(require("../event/event.repo"));
const NotFoundError_1 = __importDefault(require("../../middleware/errors/NotFoundError"));
const ForbiddenError_1 = __importDefault(require("../../middleware/errors/ForbiddenError"));
const BadRequestError_1 = __importDefault(require("../../middleware/errors/BadRequestError"));
const client_1 = require("@prisma/client");
//----------------------------------------------- 공지 생성: 관리자
function create(userId, body) {
    return __awaiter(this, void 0, void 0, function* () {
        const { apartmentId: adminAptId, noticeBoardId: userBoardId } = yield (0, utils_1.getAptInfoByUserId)(userId);
        const { category, isPinned, startDate, endDate, title, content, boardId, pollId } = body;
        // req.body validity 검증
        const isSameBoard = boardId === userBoardId;
        if (!isSameBoard)
            throw new BadRequestError_1.default('boardId가 틀립니다.');
        if (endDate !== null && endDate < startDate)
            throw new BadRequestError_1.default('종료일은 시작일보다 이전일 수 없습니다.');
        // 공지 데이터 준비
        const noticeData = Object.assign({ category,
            isPinned,
            startDate,
            endDate, title: '[공지] ' + title, content, board: { connect: { id: boardId } }, admin: { connect: { id: userId } } }, (pollId && { poll: { connect: { id: pollId } } }));
        // 이벤트 데이터 준비
        const eventData = {
            eventType: client_1.EventType.NOTICE,
            title: '[공지] ' + title,
            startDate: startDate,
            endDate: endDate
        };
        // 알림 수신자 준비
        const receivers = yield (0, utils_1.getNotiReceivers)(adminAptId);
        const userIds = receivers
            .map((r) => r.userId)
            .filter((id) => id !== null);
        // 알림 데이터 준비
        const notiData = {
            notiType: category === client_1.NoticeType.RESIDENT_VOTE
                ? client_1.NotificationType.POLL_CLOSED
                : client_1.NotificationType.NOTICE,
            content: `[알림] ${category}: ${title}`
        };
        // 트랜젝션: (1) Notice 생성 (2) Event 생성 (3) Notification 생성
        const notice = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            // 공지 생성
            const notice = yield notice_repo_1.default.create(tx, noticeData);
            // 이벤트 생성: 투표를 제외하고 날짜가 있는 공지
            // 투표는 생성 시 이벤트에 올라감
            if (noticeData.startDate && noticeData.category !== client_1.NoticeType.RESIDENT_VOTE) {
                yield event_repo_1.default.create(tx, {
                    data: Object.assign(Object.assign({}, eventData), { notice: { connect: { id: notice.id } } })
                });
            }
            // 알림 생성
            yield Promise.all(userIds.map((id) => notification_repo_1.default.create(tx, {
                data: Object.assign(Object.assign({}, notiData), { targetId: notice.id, receiver: { connect: { id } } })
            })));
            return notice;
        }));
        // SSE 알림은 트랜젝션 밖에서
        for (const id of userIds) {
            (0, notification_sse_1.sendToUser)(id, notiData.content);
        }
        return notice;
    });
}
//----------------------------------------------- 공지목록 조회: 관리자, 입주민
function getList(userId, query) {
    return __awaiter(this, void 0, void 0, function* () {
        const { noticeBoardId: boardId } = yield (0, utils_1.getAptInfoByUserId)(userId);
        // where 쿼리 파라미터 구성
        const params = buildQueryParams(query);
        let whereTerms = [{ boardId, deletedAt: null }]; // 같은 아파트 공지만
        const queryWhere = (0, buildQuery_1.buildWhere)(params);
        if (!queryWhere)
            whereTerms.push(queryWhere);
        if (Object.keys(queryWhere).length > 0)
            whereTerms.push(queryWhere);
        const where = { AND: whereTerms };
        // 페이지네이션 파라미터
        const { skip, take } = (0, buildQuery_1.buildPagination)(params.pagination, {
            limitDefault: 11,
            limitMax: 100
        });
        // DB 조회
        const notices = yield notice_repo_1.default.findMany({
            where,
            skip,
            take,
            include: { admin: { select: { name: true } } }, // 출력에 필요한 정보 포함
            orderBy: { createdAt: 'desc' }
        });
        const totalCount = yield notice_repo_1.default.count({ where });
        return { notices: yield buildNoticeListRes(notices), totalCount };
    });
}
//----------------------------------------------- 공지 상세 조회: 관리자, 입주민
function get(userId, noticeId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { noticeBoardId: userBoardId } = yield (0, utils_1.getAptInfoByUserId)(userId);
        const notice = yield notice_repo_1.default.update(prisma_1.default, {
            where: { id: noticeId, deletedAt: null },
            data: { viewCount: { increment: 1 } },
            include: { admin: { select: { id: true, name: true } } }
        });
        if (!notice)
            throw new NotFoundError_1.default('공지 게시판이 존재하지 않습니다.');
        const isSameBoard = userBoardId === notice.boardId;
        if (!isSameBoard)
            throw new ForbiddenError_1.default(); // 권한: 같은 아파트
        return buildNoticeDetailRes(notice);
    });
}
//----------------------------------------------- 공지 수정: 같은 아파트 관리자 권한
// DB 트랜젝션: (1) 공지수정 (2) 이벤트 수정 (3) 알림
// (4) SSE
function patch(userId, noticeId, body) {
    return __awaiter(this, void 0, void 0, function* () {
        const { apartmentId: userAptId, noticeBoardId: userBoardId } = yield (0, utils_1.getAptInfoByUserId)(userId);
        const notice = yield notice_repo_1.default.find({
            where: { id: noticeId, deletedAt: null },
            select: { boardId: true }
        });
        if (!notice)
            throw new NotFoundError_1.default('공지를 찾을 수 없습니다.');
        // 권한 검증: 같은 공지보드(아파트)
        const isSameBoard = userBoardId === notice.boardId;
        if (!isSameBoard) {
            throw new ForbiddenError_1.default();
        }
        const { category, title, content, boardId, isPinned, startDate, endDate } = body;
        // 요청 검증
        if (userBoardId !== boardId)
            throw new BadRequestError_1.default('boardId가 틀립니다.');
        if (endDate !== null && endDate < startDate)
            throw new BadRequestError_1.default('종료일은 시작일보다 이전일 수 없습니다.');
        // if (startDate < new Date())
        //   throw new BadRequestError('이미 시작되었거나 종료된 일정 공지는 수정할 수 없습니다.');
        // 데이터 준비
        const noticeData = {
            category,
            title,
            content,
            boardId,
            isPinned,
            startDate,
            endDate
        };
        const eventData = {
            title,
            startDate,
            endDate
        };
        // 수신자 ID 목록 준비: 알림과 SSE용
        const receivers = yield (0, utils_1.getNotiReceivers)(userAptId);
        // 트랜젝션 (1) 공지 (2) 이벤트 (3) 알림 (날짜있는 공지 경우, 과거이면 X)
        const noticeUpdated = yield noticePatchTransaction(noticeId, noticeData, eventData, receivers);
        // (4) SSE: 트랜젝션 바깥
        // 날짜가 없거나, 있는 경우 아직 종료되지 않은 경우만
        if (!startDate || endDate > new Date()) {
            for (const r of receivers) {
                if (!r.userId)
                    continue;
                (0, notification_sse_1.sendToUser)(r.userId, `[알림] 공지수정 (${noticeUpdated.title})`);
            }
        }
        const formattedNotice = yield buildNoticeListRes([
            noticeUpdated
        ]);
        return formattedNotice[0];
    });
}
function noticePatchTransaction(noticeId, noticeData, eventData, receivers) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            // (1) 공지 수정
            const notice = yield notice_repo_1.default.update(tx, {
                where: { id: noticeId },
                data: noticeData,
                include: { admin: { select: { name: true } } }
            });
            // 공지 중 RESIDENT_VOTE는 투표종료에 대한 공지로 이벤트에 올라가지 않음
            // 투표는 IN_PROGRESS로 생성될 때 이벤트에 올라감
            if (notice.category !== client_1.NoticeType.RESIDENT_VOTE) {
                // (2) 이벤트 수정
                yield event_repo_1.default.update(tx, {
                    where: { noticeId },
                    data: eventData
                });
                // (3) 공지수정 알림
                // 날짜가 없거나, 있는 경우 아직 종료되지 않은 것만 알림
                if (!noticeData.startDate || noticeData.endDate > new Date()) {
                    const message = `[알림] 공지수정 (${notice.title})`;
                    const notiData = buildNotiData(receivers, noticeId, message);
                    yield notification_repo_1.default.createMany(tx, { data: notiData });
                }
            }
            return notice;
        }));
    });
}
//----------------------------------------------- 공지 삭제: 같은 아파트의 관리자
// DB 트랜젝션: (1) 이벤트 삭제 (2) 공지 삭제
// 개발환경에서는 삭제, 배포환경에서는 soft delete
function del(userId, noticeId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { noticeBoardId: userBoardId } = yield (0, utils_1.getAptInfoByUserId)(userId);
        const notice = yield notice_repo_1.default.find({
            where: { id: noticeId, deletedAt: null },
            select: { boardId: true, category: true }
        });
        if (!notice)
            throw new NotFoundError_1.default('공지를 찾을 수 없습니다.');
        // 권한 검증: 같은 공지 보드(아파트)
        const isSameBoard = userBoardId === notice.boardId;
        if (!isSameBoard)
            throw new ForbiddenError_1.default();
        // 요청 검증
        // if (notice.startDate && notice.startDate < new Date())
        //   throw new BadRequestError(
        //     '이미 시작되었거나 종료된 일정이 있는 공지는 삭제할 수 없습니다.'
        //   );
        // 트랜젝션 (1) 이벤트 (2) 공지
        // 개발환경에서는 삭제, 배포환경에서는 soft delete
        if (constants_1.NODE_ENV === 'development')
            yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                if (notice.category !== client_1.NoticeType.RESIDENT_VOTE)
                    yield event_repo_1.default.del(tx, { where: { noticeId } }); // 이벤트 삭제
                yield notice_repo_1.default.del(tx, { where: { id: noticeId } }); // 공지 삭제
            }));
        else {
            yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                if (notice.category !== client_1.NoticeType.RESIDENT_VOTE)
                    yield event_repo_1.default.del(tx, { where: { noticeId } }); // 이벤트는 soft delete 없음
                yield notice_repo_1.default.update(tx, {
                    where: { id: noticeId },
                    data: { deletedAt: new Date() }
                });
            }));
        }
    });
}
//----------------------------------------------- 지역함수
function buildQueryParams(query) {
    const { page, limit, keyword } = query;
    const category = query.category === undefined || query.category === ''
        ? undefined
        : query.category;
    return {
        pagination: { page, limit },
        exactFilters: { category },
        searchKey: { keyword, fields: ['title', 'content'] }
    };
}
function buildNoticeListRes(notices) {
    return __awaiter(this, void 0, void 0, function* () {
        return Promise.all(notices.map((n) => __awaiter(this, void 0, void 0, function* () {
            const comments = yield comment_repo_1.default.findMany({
                where: { targetId: n.id, targetType: client_1.CommentType.NOTICE }
            });
            return {
                noticeId: n.id,
                userId: n.adminId,
                category: n.category,
                title: n.title,
                writerName: n.admin.name,
                createdAt: n.createdAt,
                updatedAt: n.updatedAt,
                viewsCount: n.viewCount,
                commentsCount: comments.length,
                isPinned: n.isPinned
            };
        })));
    });
}
function buildNoticeDetailRes(notice) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!notice.admin)
            throw new NotFoundError_1.default('관리자를 찾을 수 없습니다.');
        const comments = yield comment_repo_1.default.findMany({
            where: { targetId: notice.id, targetType: client_1.CommentType.NOTICE },
            include: { creator: { select: { name: true } } }
        });
        const formattedComments = comments.map((c) => {
            return {
                id: c.id,
                userId: c.creatorId,
                content: c.content,
                createdAt: c.createdAt,
                updatedAt: c.updatedAt,
                writerName: c.creator.name
            };
        });
        return {
            noticeId: notice.id,
            userId: notice.adminId,
            category: notice.category,
            title: notice.title,
            writerName: notice.admin.name,
            createdAt: notice.createdAt,
            updatedAt: notice.updatedAt,
            viewsCount: notice.viewCount,
            commentsCount: comments.length,
            isPinned: notice.isPinned,
            startDate: notice.startDate, // 개발용, 나중에 뺄 것. Dto도 수정
            endDate: notice.endDate, // 개발용, 나중에 뺄 것. Dto도 수정
            content: notice.content,
            boardName: '공지사항',
            comments: formattedComments
        };
    });
}
function buildNotiData(receivers, noticeId, content) {
    return receivers
        .filter((r) => r.userId != null)
        .map((r) => ({
        receiverId: r.userId,
        targetId: noticeId,
        notiType: client_1.NotificationType.NOTICE,
        content
    }));
}
exports.default = {
    create,
    getList,
    get,
    patch,
    del
};
