import { CronJob } from 'cron';
import { checkPollClosure } from '../module/pollScheduler/pollSchedular';

let job: CronJob | null = null;
let lastRun: Date | null = null;
let isPollClosureRunning = false;

export function startSystemScheduler() {
  if (job) return;

  job = new CronJob('*/10 * * * * *', async () => {
    lastRun = new Date(); // 스케쥴러 heartbeat

    if (isPollClosureRunning) return;
    isPollClosureRunning = true;

    try {
      await checkPollClosure();
    } catch (err) {
      console.error('systemScheduler error:', err);
    } finally {
      isPollClosureRunning = false;
    }
  });
  job.start();
}

export function getSchedulerStatus() {
  return lastRun;
}
