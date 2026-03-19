import { Comment, CommentType } from '@prisma/client';
import { CommentCreateRequestDto, CommentPatchRequestDto } from './comment.dto';
import commentRepo from './comment.repo';
import ForbiddenError from '../../middleware/errors/ForbiddenError';
import NotFoundError from '../../middleware/errors/NotFoundError';
import complaintRepo from '../complaint/complaint.repo';
import noticeRepo from '../notice/notice.repo';
import { getAptInfoByUserId } from '../../lib/utils';

async function create(userId: string, body: CommentCreateRequestDto) {
  const { content, boardType: targetType, boardId: targetId } = body;
  const { adminId } = await getAptInfoByUserId(userId);

  // req.body 데이터 유효성 검사
  const item =
    targetType === CommentType.COMPLAINT
      ? await complaintRepo.find({
          where: { id: targetId, deletedAt: null },
          select: { adminId: true }
        })
      : await noticeRepo.find({
          where: { id: targetId, deletedAt: null },
          select: { adminId: true }
        });
  if (!item) throw new NotFoundError('원 게시물이 존재하지 않거나 해당 타입이 아닙니다.');
  if (item.adminId !== adminId) throw new ForbiddenError(); // 권한: 다른 아파트 게시물임

  // 데이터 가공
  const commentData = {
    targetType,
    targetId,
    content
  };

  // DB 생성
  const comment = await commentRepo.create({
    data: { ...commentData, creator: { connect: { id: userId } } },
    include: { creator: { select: { name: true } } }
  });

  // 데이터 가공하여 리턴
  return buildCommentCreateRes(comment);
}

async function patch(userId: string, commentId: string, body: CommentPatchRequestDto) {
  const { content, boardType: targetType, boardId: targetId } = body;
  const { adminId } = await getAptInfoByUserId(userId);

  // req.body 데이터 유효성 검사
  const item =
    targetType === CommentType.COMPLAINT
      ? await complaintRepo.find({
          where: { id: targetId, deletedAt: null },
          select: { adminId: true }
        })
      : await noticeRepo.find({
          where: { id: targetId, deletedAt: null },
          select: { adminId: true }
        });
  if (!item) throw new NotFoundError('원 게시물이 존재하지 않거나 해당 타입이 아닙니다.');
  if (item.adminId !== adminId) throw new ForbiddenError(); // 권한: 다른 아파트 게시물임 (필요없는 검사일 듯...)

  // 권한: 작성자
  const comment = await commentRepo.find({
    where: { id: commentId },
    select: { creatorId: true }
  });
  if (!comment) throw new NotFoundError('댓글이 존재하지 않습니다.');
  if (userId !== comment.creatorId)
    throw new ForbiddenError('본인이 작성한 댓글만 수정할 수 있습니다.');

  // 데이터 가공
  const commentData = {
    targetType,
    targetId,
    content
  };

  // DB update
  const commentUpdated = await commentRepo.patch({
    where: { id: commentId },
    data: commentData,
    include: { creator: { select: { name: true } } }
  });
  if (!commentUpdated) throw new NotFoundError('댓글이 존재하지 않습니다.');

  // 데이터 가공하여 리턴
  return buildCommentCreateRes(commentUpdated);
}

async function del(userId: string, commentId: string) {
  const comment = await commentRepo.find({ where: { id: commentId }, select: { creatorId: true } });
  if (!comment) throw new NotFoundError('댓글이 존재하지 않습니다.');
  if (userId !== comment.creatorId) throw new ForbiddenError(); // 권한: 작성자

  await commentRepo.del({ where: { id: commentId } });
}

export default {
  create,
  patch,
  del
};

//------------------------------------------------- 지역함수
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
