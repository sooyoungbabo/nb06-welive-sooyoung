"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeJob = removeJob;
exports.cleanupUser = cleanupUser;
const notification_sse_1 = require("./notification.sse");
const jobs = new Map();
function removeJob(userId) {
    const job = jobs.get(userId);
    if (job) {
        job.stop();
        jobs.delete(userId);
        console.log('JOB REMOVED:', userId);
    }
}
function cleanupUser(userId) {
    removeJob(userId);
    (0, notification_sse_1.removeClient)(userId);
}
