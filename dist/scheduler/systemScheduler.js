"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSystemScheduler = startSystemScheduler;
exports.checkPollClosure = checkPollClosure;
exports.getSchedulerStatus = getSchedulerStatus;
const cron_1 = require("cron");
const pollSchedular_1 = require("../module/pollScheduler/pollSchedular");
let job = null;
let lastRun = null;
let isPollClosureRunning = false;
function startSystemScheduler() {
    if (job)
        return;
    job = new cron_1.CronJob('*/10 * * * * *', () => __awaiter(this, void 0, void 0, function* () {
        lastRun = new Date(); // 스케쥴러 heartbeat
        if (isPollClosureRunning)
            return;
        isPollClosureRunning = true;
        try {
            yield checkPollClosure();
        }
        catch (err) {
            console.error('systemScheduler error:', err);
        }
        finally {
            isPollClosureRunning = false;
        }
    }));
    job.start();
}
function checkPollClosure() {
    return __awaiter(this, void 0, void 0, function* () {
        // 투표 종료되면 poll.status 변경하고, notice 생성
        const closedPolls = yield (0, pollSchedular_1.getClosedPolls)();
        if (closedPolls.length > 0)
            yield (0, pollSchedular_1.handlePollClosure)(closedPolls);
    });
}
function getSchedulerStatus() {
    return lastRun;
}
