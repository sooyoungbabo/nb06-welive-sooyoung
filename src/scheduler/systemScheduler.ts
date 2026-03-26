import { CronJob } from 'cron';
import { getClosedPolls, handlePollClosure } from '../module/pollScheduler/pollSchedular';

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

export async function checkPollClosure() {
  // 투표 종료되면 poll.status 변경하고, notice 생성
  const closedPolls = await getClosedPolls();
  if (closedPolls.length > 0) await handlePollClosure(closedPolls);
}

export function getSchedulerStatus() {
  return lastRun;
}
