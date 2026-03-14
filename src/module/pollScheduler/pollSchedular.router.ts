import express from 'express';
import { getSchedulerStatus } from './pollSchedular';

const pollSchedulerRouter = express.Router();

pollSchedulerRouter.get('/ping', (_req, res) => {
  const lastRun = getSchedulerStatus();

  // 마지막 시간 기록이 없으면 시작하지 않은 것
  if (!lastRun) {
    return res.status(500).json({
      status: 'error',
      message: 'Poll scheduler never executed'
    });
  }

  const diff = Date.now() - lastRun.getTime();

  // 시간 기록이 1분 넘도록 없으면 중단한 것으로 간주
  if (diff > 1 * 60 * 1000) {
    return res.status(500).json({
      status: 'error',
      message: 'Poll scheduler stopped',
      lastRun
    });
  }

  return res.json({
    status: 'ok',
    message: 'Poll scheduler is running',
    lastRun
  });
});

export default pollSchedulerRouter;
