import { coerce, date, pattern, size, string, number } from 'superstruct';

export const urlStruct = pattern(string(), /^https?:\/\/\S+$/);

export const usernameStruct = size(string(), 5, 50);
export const passwordStruct = pattern(
  size(string(), 8, 128),
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d])[^\s<>'"`\\\/]{8,128}$/
);
export const emailStruct = pattern(
  size(string(), 5, 254),
  /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/
);
export const str4numStruct = pattern(string(), /^\d+$/);
export const contactStruct = pattern(
  size(string(), 11, 13),
  /^\d{2,3}-\d{3,4}-\d{4}$/
);
export const uuidStruct = pattern(
  string(),
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
);

export const dateFromStrStruct = coerce(
  date(),
  string(),
  (value) => new Date(value)
);

export const str2numStruct = coerce(number(), string(), (v) => Number(v));
