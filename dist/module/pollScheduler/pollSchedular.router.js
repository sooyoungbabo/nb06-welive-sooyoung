"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const systemScheduler_1 = require("../../scheduler/systemScheduler");
const pollSchedulerRouter = express_1.default.Router();
pollSchedulerRouter.get('/ping', (_req, res) => {
    const lastRun = (0, systemScheduler_1.getSchedulerStatus)();
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
exports.default = pollSchedulerRouter;
