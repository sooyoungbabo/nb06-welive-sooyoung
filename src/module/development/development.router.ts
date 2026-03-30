import express from 'express';
import path from 'path';
import authenticate from '../../middleware/authenticate';
import { sendToUser } from '../notification/notification.sse';
import { setDevTokens } from '../../lib/tokenDev';
import { ACCESS_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME } from '../../lib/constants';
import authServiceSession from '../auth/auth.service.session';
import { setTokenCookies } from '../auth/auth.control';

const devRouter = express.Router();

devRouter.get('/superAdmin', (req, res) => {
  res.sendFile(path.join(__dirname, '../../../public/superAdmin.html'));
});
devRouter.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../../../public/admin.html'));
});
devRouter.get('/user', (req, res) => {
  res.sendFile(path.join(__dirname, '../../../public/user.html'));
});

devRouter.get('/test-noti', authenticate(), (req, res) => {
  const user = req.user;
  sendToUser(user.id, `[알림] 테스트 for ${user.role}`);
  console.log('');
  res.send('sent');
});

devRouter.get('/token', authenticate(), (req, res, next) => {
  // brower의 tokens을 서버에 전달하여 서버 개발용 인증으로 사용
  const access = req.cookies?.[ACCESS_TOKEN_COOKIE_NAME];
  console.log(`${req.user.role}`);
  setDevTokens(access ?? null);
  // console.log(`accessToken_dev:  ${access}`);
  console.log('');
  res.json({ ok: true });
});

devRouter.get('/token/refresh', async (req, res, next) => {
  const refresh = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
  const { accessToken, refreshToken } = await authServiceSession.issueTokens(refresh);
  setTokenCookies(res, accessToken, refreshToken);

  console.log('');
  console.log(`Token refreshed`);
  setDevTokens(accessToken);
  console.log('');
  res.json({ ok: true });
});

export default devRouter;
