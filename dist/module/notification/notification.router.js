"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const notification_control_1 = __importDefault(require("./notification.control"));
const authenticate_1 = __importDefault(require("../../middleware/authenticate"));
const withTryCatch_1 = __importDefault(require("../../lib/withTryCatch"));
const validateReq_1 = require("../../middleware/validateReq");
const notification_schema_1 = require("./notification.schema");
const notiRouter = express_1.default.Router();
// SSE
notiRouter.get('/stream', (0, authenticate_1.default)(), (0, withTryCatch_1.default)(notification_control_1.default.stream));
// 읽지 않은 알림 실시간 수신
notiRouter.get('/SSE', (0, authenticate_1.default)(), (0, withTryCatch_1.default)(notification_control_1.default.startNotiScheduler));
// 개별 알림 상태변경
notiRouter.patch('/:notificationId/read', (0, authenticate_1.default)(), (0, validateReq_1.validateParams)(notification_schema_1.notiParams), (0, withTryCatch_1.default)(notification_control_1.default.read));
// 부가 기능
// 일괄 상태변경
notiRouter.patch('/read', (0, authenticate_1.default)(), (0, withTryCatch_1.default)(notification_control_1.default.readAll));
// 알림목록 조회
notiRouter.get('/', (0, authenticate_1.default)(), (0, withTryCatch_1.default)(notification_control_1.default.getList));
// 안 읽은 알림목록 조회
notiRouter.get('/unread', (0, authenticate_1.default)(), (0, withTryCatch_1.default)(notification_control_1.default.getUnreadList));
// 알림 보내기
notiRouter.post('/send', (0, authenticate_1.default)(), (0, validateReq_1.validateBody)(notification_schema_1.notiSendBody), (0, withTryCatch_1.default)(notification_control_1.default.send));
exports.default = notiRouter;
