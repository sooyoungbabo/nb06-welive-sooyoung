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
const notification_sse_1 = require("./notification.sse");
const client_1 = require("@prisma/client");
const notification_repo_1 = __importDefault(require("./notification.repo"));
const prisma_1 = __importDefault(require("../../lib/prisma"));
const ForbiddenError_1 = __importDefault(require("../../middleware/errors/ForbiddenError"));
const NotFoundError_1 = __importDefault(require("../../middleware/errors/NotFoundError"));
const user_repo_1 = __importDefault(require("../user/user.repo"));
const notification_repo_2 = __importDefault(require("./notification.repo"));
function notify(userId, data) {
    return __awaiter(this, void 0, void 0, function* () {
        const notiData = Object.assign(Object.assign({}, data), { receiver: { connect: { id: userId } } });
        const notification = yield notification_repo_1.default.create(prisma_1.default, { data: notiData });
        (0, notification_sse_1.sendToUser)(userId, notification.content);
    });
}
// try {
//   sendToUser(args.receiverId, notification.content);
// } catch (err) {
//   console.error('Realtime notification failed', {
//     receiverId: args.receiverId,
//     message: err instanceof Error ? err.message : err
//   });
// }
//-------------------------------------------- 개별 알림 읽음 처리
function read(userId, notiId) {
    return __awaiter(this, void 0, void 0, function* () {
        const noti = yield notification_repo_1.default.find({
            where: { id: notiId },
            select: { receiverId: true }
        });
        if (!noti)
            throw new NotFoundError_1.default('알림이 존재하지 않습니다.');
        if (userId !== noti.receiverId)
            throw new ForbiddenError_1.default(); // 권한: 수신자
        const notiUpdated = yield notification_repo_1.default.patch({
            where: { id: notiId },
            data: { isChecked: true }
        });
        return buildNotificationRes(notiUpdated);
    });
}
//-------------------------------------------- 추가 기능: 알림 일괄 읽음 처리
function readAll(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const notis = yield notification_repo_1.default.patchMany({
            where: { receiverId: userId, isChecked: false },
            data: { isChecked: true }
        });
        const user = yield user_repo_1.default.find({
            where: { id: userId },
            select: { name: true }
        });
        return `${user === null || user === void 0 ? void 0 : user.name}님이 ${notis.count}건의 알림을 읽음으로 처리하였습니다.`;
    });
}
//-------------------------------------------- 추가 기능: 알림목록 조회
function getList(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield notification_repo_1.default.findMany({
            where: { receiverId: userId },
            orderBy: { notifiedAt: 'desc' }
        });
    });
}
//-------------------------------------------- 추가 기능: 안 읽은 알림목록 조회
function getUnreadList(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const unReadNotis = yield notification_repo_1.default.findMany({
            where: { receiverId: userId, isChecked: false }
        });
        return {
            type: 'alarm',
            data: buildNotiList(unReadNotis)
        };
    });
}
//-------------------------------------------- 지역 함수
function buildNotiList(notis) {
    return notis.map((n) => {
        return {
            notificationId: n.id,
            content: n.content,
            notificationType: n.notiType,
            notifiedAt: n.notifiedAt,
            isChecked: n.isChecked,
            noticeId: n.notiType === client_1.NotificationType.NOTICE ? n.targetId : undefined,
            pollId: n.notiType === client_1.NotificationType.POLL_CLOSED ? n.targetId : undefined,
            complaintId: n.notiType === client_1.NotificationType.COMPLAINT_RAISED ||
                n.notiType === client_1.NotificationType.COMPLAINT_RESOLVED
                ? n.targetId
                : undefined
        };
    });
}
function send(body) {
    return __awaiter(this, void 0, void 0, function* () {
        const { receiverId, notiType, targetId, content } = body;
        const noti = yield notification_repo_2.default.create(prisma_1.default, {
            data: {
                notiType,
                targetId,
                content,
                receiver: { connect: { id: receiverId } }
            }
        });
        return noti;
    });
}
function buildNotificationRes(noti) {
    return {
        notificationId: noti.id,
        receiverId: noti.receiverId,
        content: noti.content,
        notiType: noti.notiType,
        notifiedAt: noti.notifiedAt,
        isChecked: noti.isChecked
    };
}
exports.default = {
    notify,
    getList,
    getUnreadList,
    read,
    readAll,
    send
};
