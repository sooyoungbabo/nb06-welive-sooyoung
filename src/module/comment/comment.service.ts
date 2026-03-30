import { Comment, CommentType } from '@prisma/client';
import { CommentCreateRequestDto, CommentPatchRequestDto } from './comment.dto';
import commentRepo from './comment.repo';
import ForbiddenError from '../../middleware/errors/ForbiddenError';
import NotFoundError from '../../middleware/errors/NotFoundError';
import complaintRepo from '../complaint/complaint.repo';
import noticeRepo from '../notice/notice.repo';
import { getAptInfoByUserId } from '../../lib/utils';

//------------------------------------------------------ 댓글 생성
// boardType과 boardId만으로는 원래의 민원 글을 찾을 수 없어서
// boardType --> commentType (targetType)
// boardId --> targetId로 바꾸었음.

async function create(userId: string, body: CommentCreateRequestDto) {
  const { content, commentType: targetType, targetId } = body;
  const { adminId: userAdminId } = await getAptInfoByUserId(userId);

  // 요청 validation
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

  const isSameAdmin = item.adminId === userAdminId;
  if (!isSameAdmin) throw new ForbiddenError(); // 권한: 다른 아파트 게시물인지 검사

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

//------------------------------------------------------ 댓글 수정
async function patch(userId: string, commentId: string, body: CommentPatchRequestDto) {
  await authorizeAdminAuthorOrThrow(userId, commentId);

  // 데이터 가공
  const commentData = {
    targetType: body.commentType,
    targetId: body.targetId,
    content: body.content
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

//------------------------------------------------------ 댓글 삭제
async function del(userId: string, commentId: string) {
  await authorizeAdminAuthorOrThrow(userId, commentId);
  await commentRepo.del({ where: { id: commentId } }); // soft delete 없음
}

//------------------------------------------------------ 지역 함수
type CommentWithAdminName = Comment & { creator: { name: string } };

function buildCommentCreateRes(comment: CommentWithAdminName) {
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

async function authorizeAdminAuthorOrThrow(userId: string, commentId: string) {
  const { adminId: userAdminId, apartmentId: userAptId } =
    await getAptInfoByUserId(userId);

  const comment = await commentRepo.find({
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
  if (!comment) throw new NotFoundError('댓글이 존재하지 않습니다.');

  const isSameApt = userAptId === comment.creator.apartmentId;
  const amIAdmin = userId === userAdminId;
  const amIAuthor = userId === comment.creator.id;

  if (amIAdmin && !isSameApt) throw new ForbiddenError();
  if (!amIAdmin && !amIAuthor) throw new ForbiddenError();
}

export default {
  create,
  patch,
  del
};
