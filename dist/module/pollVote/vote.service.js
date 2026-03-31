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
const BadRequestError_1 = __importDefault(require("../../middleware/errors/BadRequestError"));
const NotFoundError_1 = __importDefault(require("../../middleware/errors/NotFoundError"));
const poll_repo_1 = __importDefault(require("../poll/poll.repo"));
const resident_repo_1 = __importDefault(require("../resident/resident.repo"));
const vote_repo_1 = __importDefault(require("./vote.repo"));
const client_1 = require("@prisma/client");
//---------------------------------------------- 투표하기
function vote(voterId, optionId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(yield validateVoter(voterId, optionId)))
            throw new BadRequestError_1.default('투표권자가 아닙니다.');
        const poll = yield poll_repo_1.default.findFirst({
            where: { pollOptions: { some: { id: optionId } } }
        });
        if (!poll)
            throw new NotFoundError_1.default('해당 선택지를 갖는 투표가 없습니다.');
        if (poll.startDate > new Date())
            throw new BadRequestError_1.default('아직 투표시작 전입니다.');
        if (poll.endDate <= new Date())
            throw new BadRequestError_1.default('종료된 투표입니다.');
        const voteData = {
            poll: { connect: { id: poll.id } },
            options: { connect: { id: optionId } },
            voter: { connect: { id: voterId } }
        };
        const vote = yield vote_repo_1.default.create({ data: voteData });
        return yield buildVoteRes(poll.id, vote.optionId);
    });
}
//---------------------------------------------- 투표 취소
function cancelVote(voterId, optionId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(yield validateVoter(voterId, optionId)))
            throw new BadRequestError_1.default('투표권자가 아닙니다.');
        const option = yield prisma_1.default.pollOption.findFirst({
            where: { id: optionId },
            select: { pollId: true }
        });
        if (!option)
            throw new NotFoundError_1.default('해당 선택지를 갖는 투표가 존재하지 않습니다.');
        const poll = yield poll_repo_1.default.find({ where: { id: option.pollId } });
        if (!poll)
            throw new NotFoundError_1.default('해당 투표가 존재하지 않습니다.');
        if (poll.startDate > new Date())
            throw new BadRequestError_1.default('아직 투표시작 전입니다.');
        if (poll.endDate <= new Date())
            throw new BadRequestError_1.default('종료된 투표입니다.');
        yield vote_repo_1.default.deleteMany(prisma_1.default, {
            where: { voterId, pollId: option.pollId }
        });
        return yield buildCancelVoteRes(optionId);
    });
}
//---------------------------------------------- 지역 함수
// 공동 1위를 가정한 집계
// { sum: 37, max: 12, winnerOption: PollOption[]}
function buildVoteRes(pollId, voteOptionId) {
    return __awaiter(this, void 0, void 0, function* () {
        // pollOptions와 votes를 가져와서, 집계하고, DB에 저장
        const pollOptions = yield prisma_1.default.pollOption.findMany({
            where: { pollId },
            include: { votes: true },
            orderBy: { createdAt: 'asc' }
        });
        pollOptions.map((o) => (o.voteCount = o.votes.length)); // 집계
        yield Promise.all(pollOptions.map((o) => prisma_1.default.pollOption.update({
            where: { id: o.id },
            data: { voteCount: o.voteCount }
        })));
        // 실시간 투표 결과 계산
        const result = pollOptions.reduce((acc, cur, idx) => {
            acc.sum += cur.voteCount;
            if (cur.voteCount > acc.max) {
                acc.max = cur.voteCount;
                acc.winnerIdx = [idx];
                acc.winnerTitle = [cur.title];
            }
            else if (cur.voteCount === acc.max) {
                acc.winnerIdx.push(idx);
                acc.winnerTitle.push(cur.title);
            }
            return acc;
        }, {
            sum: 0,
            max: -Infinity,
            winnerTitle: [],
            winnerIdx: []
        });
        // 출력 포맷에 맞추어 데이터 가공
        const votedOption = pollOptions.find((po) => po.id === voteOptionId);
        if (!votedOption)
            throw new NotFoundError_1.default('투표한 선택지가 없습니다.');
        const updatedOption = {
            id: votedOption.id,
            title: votedOption.title,
            votes: votedOption.voteCount
        };
        const message = result.winnerTitle.length > 1
            ? `실시간 공동 1위: ${result.winnerIdx.map((w) => pollOptions[w].title).join(', ')}`
            : `실시간 1위: ${pollOptions[result.winnerIdx[0]].title}`;
        const winnerOption = {
            id: pollOptions[result.winnerIdx[0]].id,
            title: pollOptions[result.winnerIdx[0]].title,
            votes: pollOptions[result.winnerIdx[0]].voteCount
        };
        const options = pollOptions.map((o) => ({
            id: o.id,
            title: o.title,
            votes: o.voteCount
        }));
        return {
            message,
            updatedOption,
            winnerOption,
            options
        };
    });
}
function buildCancelVoteRes(voteOptionId) {
    return __awaiter(this, void 0, void 0, function* () {
        const option = yield prisma_1.default.pollOption.findFirst({
            where: { id: voteOptionId },
            include: { votes: true }
        });
        if (!option)
            throw new NotFoundError_1.default('취소한 선택지가 존재햐지 않습니다.');
        option.voteCount = option.votes.length;
        return {
            message: '취소한 선택지 집계 현황',
            updatedOption: {
                id: option.id,
                title: option.title,
                votes: option.voteCount
            }
        };
    });
}
function validateVoter(voterId, optionId) {
    return __awaiter(this, void 0, void 0, function* () {
        const option = yield prisma_1.default.pollOption.findUnique({
            where: { id: optionId },
            include: {
                poll: {
                    select: { buildingPermission: true, board: { select: { apartmentId: true } } }
                }
            }
        });
        if (!option)
            throw new NotFoundError_1.default('투표 옵션이 존재하지 않습니다.');
        const apartmentId = option.poll.board.apartmentId;
        const buildingPermission = option.poll.buildingPermission;
        const resident = yield resident_repo_1.default.findFirst(prisma_1.default, {
            where: Object.assign({ apartmentId, approvalStatus: client_1.ApprovalStatus.APPROVED, deletedAt: null, userId: voterId }, (buildingPermission !== 0 && {
                apartmentDong: String(buildingPermission)
            })),
            select: { userId: true }
        });
        return !!resident;
    });
}
exports.default = {
    vote,
    cancelVote
};
