import express from 'express';
import path from 'path';
import authenticate from '../../middleware/authenticate';
import { sendToUser } from '../notification/sse.manager';
import { getDevAccessToken, getDevRefreshToken, setDevTokens } from '../../lib/tokenDev';
import { ACCESS_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME } from '../../lib/constants';
import { setTokenCookies } from '../auth/auth.control';

const devRouter = express.Router();

devRouter.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, '../../../public/test.html'));
});

devRouter.get('/test-noti', authenticate(), (req, res) => {
  const user = req.user;
  sendToUser(user.id, '테스트 알림');
  res.send('sent');
});

devRouter.get('/token', authenticate(), (req, res, next) => {
  const access = req.cookies?.[ACCESS_TOKEN_COOKIE_NAME];
  const refresh = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

  console.log('');
  console.log(`accessToken_dev:  ${access}`);
  console.log(`refreshToken_dev: ${refresh}`);
  console.log('');

  setDevTokens(access ?? null, refresh ?? null);
  res.json({ ok: true });
});

devRouter.get('/sync-token', (req, res) => {
  const access = getDevAccessToken();
  const refresh = getDevRefreshToken();

  console.log('');
  console.log(`accessToken_sync:  ${access}`);
  console.log(`refreshToken_sync: ${refresh}`);
  console.log('');

  setTokenCookies(res, access, refresh);

  res.json({ ok: true });
});
export default devRouter;
