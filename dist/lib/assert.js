"use strict";
// export function assertHasProperty<T, K extends keyof T>(
//   obj: T,
//   key: K
// ): asserts obj is T & { [P in K]-?: NonNullable<T[P]> } {
//   if (obj[key] == null) {
//     throw new Error(`${String(key)}가 존재해야 합니다`);
//   }
// }
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertHasProperty = assertHasProperty;
// assertHasProperties(created, 'apartmentId', 'email');
function assertHasProperty(obj, key) {
    if (obj[key] == null) {
        throw new Error(`${String(key)} is missing`);
    }
}
