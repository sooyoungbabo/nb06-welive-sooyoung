import { fakerKO as faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';

export async function hashingPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

export function getRandomDong(maxComplex: number, maxBuilding: number): number {
  const dongRange = [];
  for (let k = 1; k <= maxComplex; k++) {
    for (let l = 1; l <= maxBuilding; l++) {
      dongRange.push(k * 100 + l);
    }
  }
  return faker.helpers.arrayElement(dongRange);
}
export function getRandomHo(maxFloor: number, maxUnit: number): number {
  const hoRange = [];
  for (let m = 1; m <= maxFloor; m++) {
    for (let n = 1; n <= maxUnit; n++) {
      hoRange.push(m * 100 + n);
    }
  }
  return faker.helpers.arrayElement(hoRange);
}
