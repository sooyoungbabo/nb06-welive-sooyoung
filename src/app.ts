import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { defaultNotFoundHandler, globalErrorHandler } from './middleware/errorHandler';
import authRouter from './module/auth/auth.router';
import userRouter from './module/user/user.router';
import aptRouter from './module/apartment/apartment.router';
import residentRouter from './module/resident/resident.router';
import complaintRouter from './module/complaint/complaint.router';
import notiRouter from './module/notification/notification.router';
import devRouter from './module/development/development.router';
import pollRouter from './module/poll/poll.router';
import pollSchedulerRouter from './module/pollScheduler/pollSchedular.router';
import noticeRouter from './module/notice/notice.router';
import voteRouter from './module/pollVote/vote.router';
import commentRouter from './module/comment/comment.router';
import eventRouter from './module/event/event.router';
import { STATIC_IMG_PATH } from './lib/constants';

const app = express();
app.use(express.json());
app.use(cookieParser());
// app.use(cors());
app.use(
  cors({
    //origin: true,
    origin: 'http://localhost:3000',
    credentials: true
  })
);

app.use('/images', express.static(STATIC_IMG_PATH));

if (process.env.NODE_ENV === 'development') app.use('/development', devRouter);

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/apartments', aptRouter);
app.use('/api/residents', residentRouter);
app.use('/api/complaints', complaintRouter);
app.use('/api/polls', pollRouter);
app.use('/api/poll-scheduler', pollSchedulerRouter);
app.use('/api/options', voteRouter);
app.use('/api/notices', noticeRouter);
app.use('/api/comments', commentRouter);
app.use('/api/notifications', notiRouter);
app.use('/api/event', eventRouter);

app.use(defaultNotFoundHandler);
app.use(globalErrorHandler);

export default app;
