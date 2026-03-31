"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const errorHandler_1 = require("./middleware/errorHandler");
const auth_router_1 = __importDefault(require("./module/auth/auth.router"));
const user_router_1 = __importDefault(require("./module/user/user.router"));
const apartment_router_1 = __importDefault(require("./module/apartment/apartment.router"));
const resident_router_1 = __importDefault(require("./module/resident/resident.router"));
const complaint_router_1 = __importDefault(require("./module/complaint/complaint.router"));
const notification_router_1 = __importDefault(require("./module/notification/notification.router"));
const development_router_1 = __importDefault(require("./module/development/development.router"));
const poll_router_1 = __importDefault(require("./module/poll/poll.router"));
const pollSchedular_router_1 = __importDefault(require("./module/pollScheduler/pollSchedular.router"));
const notice_router_1 = __importDefault(require("./module/notice/notice.router"));
const vote_router_1 = __importDefault(require("./module/pollVote/vote.router"));
const comment_router_1 = __importDefault(require("./module/comment/comment.router"));
const event_router_1 = __importDefault(require("./module/event/event.router"));
const constants_1 = require("./lib/constants");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// app.use(cors());
app.use((0, cors_1.default)({
    origin: true,
    //origin: 'http://localhost:5173',
    credentials: true
}));
app.use('/images', express_1.default.static(constants_1.STATIC_IMG_PATH));
// 테스트 위해 잠시 EC2에서 돌려봄.
//if (process.env.NODE_ENV === 'development')
app.use('/development', development_router_1.default);
app.use('/auth', auth_router_1.default);
app.use('/users', user_router_1.default);
app.use('/apartments', apartment_router_1.default);
app.use('/residents', resident_router_1.default);
app.use('/complaints', complaint_router_1.default);
app.use('/polls', poll_router_1.default);
app.use('/poll-scheduler', pollSchedular_router_1.default);
app.use('/options', vote_router_1.default);
app.use('/notices', notice_router_1.default);
app.use('/comments', comment_router_1.default);
app.use('/notifications', notification_router_1.default);
app.use('/event', event_router_1.default);
app.use(errorHandler_1.defaultNotFoundHandler);
app.use(errorHandler_1.globalErrorHandler);
exports.default = app;
