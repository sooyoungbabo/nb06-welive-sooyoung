import { object, string } from 'superstruct';

//------------------------------------------------- params schema
export const userParams = object({
  userId: string()
});
