"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setDevTokens = setDevTokens;
exports.getDevAccessToken = getDevAccessToken;
exports.getDevRefreshToken = getDevRefreshToken;
//----------------- 개발환경에서 브라우져 로그인으로 생성된 토큰을 서버에서 활용
let devAccessToken;
let devRefreshToken;
function setDevTokens(access) {
    console.log('DEV TOKEN SAVED IN SERVER');
    devAccessToken = access;
}
function getDevAccessToken() {
    return devAccessToken;
}
function getDevRefreshToken() {
    return devRefreshToken;
}
