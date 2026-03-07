import * as s from 'superstruct';
export const CreateComplaint = s.object({
  title: s.string(),
  content: s.string(),
  isPublic: s.boolean(),
  boardId: s.string(),
  status: s.enums(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'])
});

export const PatchComplaint = s.partial(CreateComplaint);
