import { object, string } from 'superstruct';

//-------------------------------------------- Params schema
export const voteParams = object({
  optionId: string()
});
