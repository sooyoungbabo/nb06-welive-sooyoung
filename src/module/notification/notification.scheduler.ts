import { CronJob } from 'cron';
import { removeClient } from './notification.sse';
const jobs = new Map<string, CronJob>();

export function removeJob(userId: string) {
  const job = jobs.get(userId);
  if (job) {
    job.stop();
    jobs.delete(userId);
    console.log('JOB REMOVED:', userId);
  }
}

export function cleanupUser(userId: string) {
  removeJob(userId);
  removeClient(userId);
}
