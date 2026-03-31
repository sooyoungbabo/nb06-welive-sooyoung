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
exports.getClosedPolls = getClosedPolls;
exports.handlePollClosure = handlePollClosure;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../../lib/prisma"));
const poll_repo_1 = __importDefault(require("../poll/poll.repo"));
const notice_service_1 = __importDefault(require("../notice/notice.service"));
const notice_schema_1 = require("../notice/notice.schema");
const superstruct_1 = require("superstruct");
const board_repo_1 = __importDefault(require("../board/board.repo"));
const NotFoundError_1 = __importDefault(require("../../middleware/errors/NotFoundError"));
function getClosedPolls() {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma_1.default.poll.findMany({
            where: {
                status: client_1.PollStatus.IN_PROGRESS,
                endDate: { lte: new Date() }
            }
        });
    });
}
function handlePollClosure(polls) {
    return __awaiter(this, void 0, void 0, function* () {
        for (const poll of polls) {
            // 투표 상태 변경: 종료
            yield poll_repo_1.default.patch(prisma_1.default, {
                where: { id: poll.id },
                data: { status: client_1.PollStatus.CLOSED }
            });
            console.log('');
            console.log(new Date());
            console.log(`poll closed: ${poll.title}`);
            console.log('');
            // 투료종료 공지 생성
            // 공지용 게시판 아이디 가져오기
            const pollBoard = yield board_repo_1.default.find({
                where: { id: poll.boardId },
                select: { apartmentId: true }
            });
            if (!pollBoard)
                throw new NotFoundError_1.default('투표 게시판을 찾을 수 없습니다.');
            const noticeBoard = yield board_repo_1.default.findFirst({
                where: { apartmentId: pollBoard.apartmentId, boardType: client_1.BoardType.NOTICE }
            });
            if (!noticeBoard)
                throw new NotFoundError_1.default('공지 게시판을 찾을 수 없습니다.');
            // 공지 서비스로 보낼 데이터 가공
            const result = yield getPollResult(poll.id);
            const noticeBody = {
                category: client_1.NoticeType.RESIDENT_VOTE,
                title: `투표종료 (${poll.title})`,
                content: `[결과] ${result.maxStr} (${result.max}/${result.sum})`,
                boardId: noticeBoard.id,
                isPinned: true,
                startDate: poll.startDate,
                endDate: poll.endDate,
                pollId: poll.id
            };
            (0, superstruct_1.assert)(noticeBody, notice_schema_1.noticeCreateBody);
            yield notice_service_1.default.create(poll.adminId, noticeBody);
        }
    });
}
function getPollResult(pollId) {
    return __awaiter(this, void 0, void 0, function* () {
        const pollOptions = yield prisma_1.default.pollOption.findMany({ where: { pollId } });
        return pollOptions.reduce((acc, cur) => {
            acc.sum += cur.voteCount;
            if (cur.voteCount > acc.max) {
                acc.max = cur.voteCount;
                acc.maxStr = cur.title;
            }
            return acc;
        }, { sum: 0, max: -Infinity, maxStr: '' });
    });
}
