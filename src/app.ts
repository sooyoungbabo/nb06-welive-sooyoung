import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
// import path from 'path';
// import http from 'http';
// import { setupSocket } from './websocket/socketIO';
import { defaultNotFoundHandler, globalErrorHandler } from './middleware/errorHandler';
import authRouter from './module/auth/auth.router';
import userRouter from './module/user/user.router';
import aptRouter from './module/apartment/apartment.router';
import residentRouter from './module/resident/resident.router';
import { NODE_ENV, PORT, STATIC_IMG_PATH } from './lib/constants';
console.log(NODE_ENV, STATIC_IMG_PATH);

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors());

// socket.io
// app.use(express.static(path.join(process.cwd(), 'public')));
// const server = http.createServer(app);
// setupSocket(server);

if (NODE_ENV === 'development') app.use('/images', express.static(STATIC_IMG_PATH));

app.use('/auth', authRouter);
app.use('/users', userRouter);
app.use('/apartments', aptRouter);
app.use('/residents', residentRouter);
// app.use('/complaints', complaintRouter);
// app.use('/polls', pollRouter);
// app.use('/notices', noticeRouter);
// app.use('/comments', commentRouter);
// app.use('/notifications', notiRouter);
// app.use('/events', eventRouter);

app.use(defaultNotFoundHandler);
app.use(globalErrorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
