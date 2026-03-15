import { Comment, CommentType, UserType } from '@prisma/client';
import { AuthUser } from '../../type/express';
import { CommentCreateRequestDto, CommentPatchRequestDto } from './comment.dto';
import commentRepo from './comment.repo';
import ForbiddenError from '../../middleware/errors/ForbiddenError';
import NotFoundError from '../../middleware/errors/NotFoundError';
import complaintRepo from '../complaint/complaint.repo';
import noticeRepo from '../notice/notice.repo';
import BadRequestError from '../../middleware/errors/BadRequestError';

async function create(user: AuthUser, body: CommentCreateRequestDto) {
  const { content, boardType: targetType, boardId: targetId } = body;

  // 댓글을 달고자하는 게시물 타입이 바른지 체크
  if (!(await isValidCommentType(targetId, targetType)))
    throw new BadRequestError('댓글이 존재하지 않거나 타입이 맞지 않습니다.');

  // 데이터 가공
  const commentData = {
    targetType,
    targetId,
    content
  };

  // DB 생성
  const comment = await commentRepo.create({
    data: { ...commentData, creator: { connect: { id: user.id } } },
    include: { creator: { select: { name: true } } }
  });

  // 데이터 가공하여 리턴
  return buildCommentCreateRes(comment);
}

async function patch(user: AuthUser, commentId: string, body: CommentPatchRequestDto) {
  // 먼저 권한 체크: 입주민은 작성자만 가능
  if (user.userType === UserType.USER && !(await isMyComment(user.id, commentId)))
    throw new ForbiddenError();

  // 댓글을 달고자하는 게시물 타입이 바른지 체크
  const { content, boardType: targetType, boardId: targetId } = body;
  if (targetType && targetId && !(await isValidCommentType(targetId, targetType)))
    throw new BadRequestError('댓글이 존재하지 않거나 타입이 맞지 않습니다.');

  // 데이터 가공
  const commentData = {
    targetType,
    targetId,
    content
  };

  // DB update
  const commentUpdated = await commentRepo.patch({
    where: { id: commentId },
    data: { ...commentData, creator: { connect: { id: user.id } } },
    include: { creator: { select: { name: true } } }
  });
  if (!commentUpdated) throw new NotFoundError('댓글이 존재하지 않습니다.');

  // 데이터 가공하여 리턴
  return buildCommentCreateRes(commentUpdated);
}

async function del(user: AuthUser, commentId: string) {
  if (user.userType === UserType.USER && !(await isMyComment(user.id, commentId)))
    throw new ForbiddenError();
  await commentRepo.del({ where: { id: commentId } });
}

export default {
  create,
  patch,
  del
};

//------------------------------------------------- 지역함수
async function isMyComment(userId: string, commentId: string): Promise<boolean> {
  const comment = await commentRepo.find({
    where: { id: commentId },
    select: { creatorId: true }
  });
  if (!comment) throw new NotFoundError('댓글이 존재하지 않습니다.');
  return userId === comment.creatorId;
}

async function isValidCommentType(targetId: string, targetType: CommentType): Promise<boolean> {
  if (targetType === CommentType.COMPLAINT)
    return Boolean(await complaintRepo.count({ where: { id: targetId, deletedAt: null } }));
  else return Boolean(await noticeRepo.count({ where: { id: targetId, deletedAt: null } }));
}

type CommentWithAdminName = Comment & { creator: { name: string } };

function buildCommentCreateRes(comment: CommentWithAdminName) {
  return {
    comment: {
      id: comment.id,
      userId: comment.creatorId,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      wirterName: comment.creator.name
    },
    board: {
      id: comment.targetId,
      boardType: comment.targetType
    }
  };
}
