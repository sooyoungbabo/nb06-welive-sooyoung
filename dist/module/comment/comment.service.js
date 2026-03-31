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
const client_1 = require("@prisma/client");
const comment_repo_1 = __importDefault(require("./comment.repo"));
const ForbiddenError_1 = __importDefault(require("../../middleware/errors/ForbiddenError"));
const NotFoundError_1 = __importDefault(require("../../middleware/errors/NotFoundError"));
const complaint_repo_1 = __importDefault(require("../complaint/complaint.repo"));
const notice_repo_1 = __importDefault(require("../notice/notice.repo"));
const utils_1 = require("../../lib/utils");
//------------------------------------------------------ 댓글 생성
// boardType과 boardId만으로는 원래의 민원 글을 찾을 수 없어서
// boardType --> commentType (targetType)
// boardId --> targetId로 바꾸었음.
function create(userId, body) {
    return __awaiter(this, void 0, void 0, function* () {
        const { content, commentType: targetType, targetId } = body;
        const { adminId: userAdminId } = yield (0, utils_1.getAptInfoByUserId)(userId);
        // 요청 validation
        const item = targetType === client_1.CommentType.COMPLAINT
            ? yield complaint_repo_1.default.find({
                where: { id: targetId, deletedAt: null },
                select: { adminId: true }
            })
            : yield notice_repo_1.default.find({
                where: { id: targetId, deletedAt: null },
                select: { adminId: true }
            });
        if (!item)
            throw new NotFoundError_1.default('원 게시물이 존재하지 않거나 해당 타입이 아닙니다.');
        const isSameAdmin = item.adminId === userAdminId;
        if (!isSameAdmin)
            throw new ForbiddenError_1.default(); // 권한: 다른 아파트 게시물인지 검사
        // 데이터 가공
        const commentData = {
            targetType,
            targetId,
            content
        };
        // DB 생성
        const comment = yield comment_repo_1.default.create({
            data: Object.assign(Object.assign({}, commentData), { creator: { connect: { id: userId } } }),
            include: { creator: { select: { name: true } } }
        });
        // 데이터 가공하여 리턴
        return buildCommentCreateRes(comment);
    });
}
//------------------------------------------------------ 댓글 수정
function patch(userId, commentId, body) {
    return __awaiter(this, void 0, void 0, function* () {
        yield authorizeAdminAuthorOrThrow(userId, commentId);
        // 데이터 가공
        const commentData = {
            targetType: body.commentType,
            targetId: body.targetId,
            content: body.content
        };
        // DB update
        const commentUpdated = yield comment_repo_1.default.patch({
            where: { id: commentId },
            data: commentData,
            include: { creator: { select: { name: true } } }
        });
        if (!commentUpdated)
            throw new NotFoundError_1.default('댓글이 존재하지 않습니다.');
        // 데이터 가공하여 리턴
        return buildCommentCreateRes(commentUpdated);
    });
}
//------------------------------------------------------ 댓글 삭제
function del(userId, commentId) {
    return __awaiter(this, void 0, void 0, function* () {
        yield authorizeAdminAuthorOrThrow(userId, commentId);
        yield comment_repo_1.default.del({ where: { id: commentId } }); // soft delete 없음
    });
}
function buildCommentCreateRes(comment) {
    return {
        comment: {
            id: comment.id,
            userId: comment.creatorId,
            content: comment.content,
            createdAt: comment.createdAt,
            updatedAt: comment.updatedAt,
            writerName: comment.creator.name
        },
        board: {
            id: comment.targetId,
            CommentType: comment.targetType
        }
    };
}
function authorizeAdminAuthorOrThrow(userId, commentId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { adminId: userAdminId, apartmentId: userAptId } = yield (0, utils_1.getAptInfoByUserId)(userId);
        const comment = yield comment_repo_1.default.find({
            where: { id: commentId },
            select: {
                creator: {
                    select: {
                        id: true,
                        apartmentId: true
                    }
                }
            }
        });
        if (!comment)
            throw new NotFoundError_1.default('댓글이 존재하지 않습니다.');
        const isSameApt = userAptId === comment.creator.apartmentId;
        const amIAdmin = userId === userAdminId;
        const amIAuthor = userId === comment.creator.id;
        if (amIAdmin && !isSameApt)
            throw new ForbiddenError_1.default();
        if (!amIAdmin && !amIAuthor)
            throw new ForbiddenError_1.default();
    });
}
exports.default = {
    create,
    patch,
    del
};
