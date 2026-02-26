export function isEmptyArray<T>(v: T[]): boolean {
  if (Array.isArray(v)) return v.length === 0;
  else return false;
}

export function isEmptyObject(v: object): boolean {
  if (typeof v === 'object') return Object.keys(v).length === 0;
  else return false;
}

export function isEmpty(v: any): boolean {
  if (v === undefined) return true;
  return Boolean(isEmptyObject(v) || isEmptyArray(v));
}

export function print(message: string): void {
  console.log('');
  console.log(message);
  console.log('');
}

export function includedOk<T, K extends keyof T>(myArray: T[], myKey: K, myValue: T[K]): boolean {
  return myArray.some((n) => n[myKey] === myValue);
}

export function stripNulls<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null)) as T;
}

export function myRandom(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min));
}

export function getRandomDate(start: Date, end: Date): Date {
  const startTime = start.getTime();
  const endTime = end.getTime();

  const randomTime = startTime + Math.random() * (endTime - startTime);

  return new Date(randomTime);
}

export function getRandomNo(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function getUniqueRandomNOs(min: number, max: number, count: number): number[] {
  if (count > max - min + 1) {
    throw new Error('요청한 개수가 범위를 초과했습니다.');
  }

  // 1. 범위 배열 생성
  const numbers = Array.from({ length: max - min + 1 }, (_, i) => i + min);

  // 2. Fisher-Yates shuffle
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }

  // 3. 앞에서 count개 반환
  return numbers.slice(0, count);
}

export function shuffleArray<T>(myArray: T[]): T[] {
  const shuffled = [...myArray];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
