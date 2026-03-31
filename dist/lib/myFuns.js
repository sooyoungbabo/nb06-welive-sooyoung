"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEmptyArray = isEmptyArray;
exports.isEmptyObject = isEmptyObject;
exports.isEmpty = isEmpty;
exports.print = print;
exports.includedOk = includedOk;
exports.stripNulls = stripNulls;
exports.myRandom = myRandom;
exports.getRandomDate = getRandomDate;
exports.getRandomNo = getRandomNo;
exports.getUniqueRandomNOs = getUniqueRandomNOs;
exports.shuffleArray = shuffleArray;
exports.getTimestamp = getTimestamp;
function isEmptyArray(v) {
    if (Array.isArray(v))
        return v.length === 0;
    else
        return false;
}
function isEmptyObject(v) {
    if (typeof v === 'object')
        return Object.keys(v).length === 0;
    else
        return false;
}
function isEmpty(v) {
    if (v === undefined)
        return true;
    return Boolean(isEmptyObject(v) || isEmptyArray(v));
}
function print(message) {
    console.log('');
    console.log(message);
    console.log('');
}
function includedOk(myArray, myKey, myValue) {
    return myArray.some((n) => n[myKey] === myValue);
}
function stripNulls(obj) {
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null));
}
function myRandom(min, max) {
    return min + Math.floor(Math.random() * (max - min));
}
function getRandomDate(start, end) {
    const startTime = start.getTime();
    const endTime = end.getTime();
    const randomTime = startTime + Math.random() * (endTime - startTime);
    return new Date(randomTime);
}
function getRandomNo(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}
function getUniqueRandomNOs(min, max, count) {
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
function shuffleArray(myArray) {
    const shuffled = [...myArray];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
function getTimestamp() {
    const now = new Date();
    const YYYY = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const DD = String(now.getDate()).padStart(2, '0');
    const HH = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${YYYY}-${MM}-${DD}-${HH}${mm}${ss}`;
}
