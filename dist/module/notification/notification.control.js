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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cron_1 = require("cron");
const notification_sse_1 = require("./notification.sse");
const notification_service_1 = __importDefault(require("./notification.service"));
const tokenDev_1 = require("../../lib/tokenDev");
const constants_1 = require("../../lib/constants");
const notification_scheduler_1 = require("./notification.scheduler");
const jobs = new Map();
//------------------------------------------ 클라이언트 요청에 의한 SSE 연결
function stream(req, res) {
    var _a;
    const user = req.user;
    // SSE 헤더
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    // 클라이언트 등록
    (0, notification_sse_1.addClient)(user.id, res);
    console.log('SSE connected:', req.user.role);
    const access = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a[constants_1.ACCESS_TOKEN_COOKIE_NAME];
    (0, tokenDev_1.setDevTokens)(access);
    // 초기 연결 메시지
    res.write(`data: connected\n\n`);
    res.flush();
    // heartbeat
    const heartbeat = setInterval(() => {
        res.write(': heartbeat\n\n');
        res.flush();
    }, 30000);
    // Step 3: 연결 즉시 ping + 1초 간격 ping
    res.write(`data: ping\n\n`); // 연결되자마자 전송
    const pingInterval = setInterval(() => {
        res.write(`data: ping ${new Date().toISOString()}\n\n`);
    }, 1000);
    // 클라이언트 연결 종료 처리
    req.on('close', () => {
        clearInterval(heartbeat);
        clearInterval(pingInterval);
        (0, notification_scheduler_1.cleanupUser)(user.id);
        console.log('SSE disconnected:', req.user.role);
    });
}
// function stream(req: Request, res: Response) {
//   const user = req.user;
//   // SSE 헤더
//   res.setHeader('Content-Type', 'text/event-stream');
//   res.setHeader('Cache-Control', 'no-cache');
//   res.setHeader('Connection', 'keep-alive');
//   res.flushHeaders();
//   // 클라이언트 등록
//   addClient(user.id, res);
//   console.log('SSE connected:', req.user.role);
//   const access = req.cookies?.[ACCESS_TOKEN_COOKIE_NAME];
//   setDevTokens(access);
//   // 초기 연결 메시지
//   res.write(`data: connected\n\n`);
//   (res as any).flush();
//   // heartbeat
//   const heartbeat = setInterval(() => {
//     res.write(': heartbeat\n\n');
//     (res as any).flush();
//   }, 30000);
//   // 클라이언트 연결 종료 처리
//   req.on('close', () => {
//     clearInterval(heartbeat);
//     cleanupUser(user.id);
//     console.log('SSE disconnected:', req.user.role);
//   });
// }
// function stream(req: Request, res: Response) {
//   const user = req.user;
//   res.setHeader('Content-Type', 'text/event-stream');
//   res.setHeader('Cache-Control', 'no-cache');
//   res.setHeader('Connection', 'keep-alive');
//   res.flushHeaders();
//   addClient(user.id, res);
//   console.log('SSE connected:', req.user.role);
//   const access = req.cookies?.[ACCESS_TOKEN_COOKIE_NAME];
//   setDevTokens(access);
//   console.log('');
//   const heartbeat = setInterval(() => {
//     res.write(': heartbeat\n\n');
//   }, 30000);
//   res.write(`data: connected\n\n`);
//   (res as any).flush();
//   req.on('close', () => {
//     clearInterval(heartbeat);
//     cleanupUser(user.id);
//   });
// }
//------------------------------------------ 클라이언트 요청에 의한 cron job
//                                           매 30초마다 안 읽은 알림목록 SSE 전송
function startNotiScheduler(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const userId = req.user.id;
        const role = req.user.role;
        if (!jobs.has(userId)) {
            console.log('JOB CREATED:', role, Date.now());
            let isRunning = false;
            const job = new cron_1.CronJob('*/30 * * * * *', () => __awaiter(this, void 0, void 0, function* () {
                console.log('JOB RUN:', role, Date.now());
                if (isRunning)
                    return;
                isRunning = true;
                try {
                    if (!(0, notification_sse_1.getClient)(userId)) {
                        (0, notification_scheduler_1.removeJob)(userId); // SSE 연결이 없으면 cron job 삭제
                        return;
                    }
                    const data = yield notification_service_1.default.getUnreadList(userId);
                    (0, notification_sse_1.sendToUser)(userId, data);
                }
                catch (err) {
                    console.error('notiScheduler error:', err);
                }
                finally {
                    isRunning = false;
                }
            }));
            jobs.set(userId, job);
            job.start();
        }
        res.status(200).json({ message: 'Notification Scheduler Started' });
    });
}
//------------------------------------------ 추가 기능: 알림 목록 조회
function getList(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const notis = yield notification_service_1.default.getList(req.user.id);
        res.status(200).json({ notifications: notis, count: notis === null || notis === void 0 ? void 0 : notis.length });
    });
}
//------------------------------------------ 추가 기능: 안 읽은 알림 목록 조회
function getUnreadList(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const notis = yield notification_service_1.default.getUnreadList(req.user.id);
        res.status(200).json(notis);
    });
}
//------------------------------------------ 개별 알림 읽음 처리
function read(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const notiId = req.params.notificationId;
        const notification = yield notification_service_1.default.read(req.user.id, notiId);
        res.status(200).json(notification);
    });
}
//------------------------------------------ 일괄 알림 읽음 처리
function readAll(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const message = yield notification_service_1.default.readAll(req.user.id);
        res.status(200).send({ message });
    });
}
//------------------------------------------ 추가기능: 알림 보내기
function send(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const noti = yield notification_service_1.default.send(req.body);
        res.status(200).json(noti);
    });
}
exports.default = {
    stream,
    startNotiScheduler,
    read,
    getList,
    getUnreadList,
    readAll,
    send
};
