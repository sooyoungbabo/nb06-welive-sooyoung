//----------------- 개발환경에서 브라우져 로그인으로 생성된 토큰을 서버에서 활용
let devAccessToken: string | undefined;
let devRefreshToken: string | undefined;

export function setDevTokens(access?: string, refresh?: string) {
  console.log('DEV TOKENS SAVED');
  devAccessToken = access;
  devRefreshToken = refresh;
}

export function getDevAccessToken() {
  return devAccessToken;
}

export function getDevRefreshToken() {
  return devRefreshToken;
}
