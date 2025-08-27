import config from './config';

import express, { Express } from 'express';
import cors from 'cors';
import { connectDB } from './DB/connect';
// Routers
import authRouter from './modules/auth/auth.controller';
import userRouter from './modules/user/user.controller';
import messageRouter from './modules/message/message.controller';
import cookieParser from 'cookie-parser';
import { globalErrorHandler } from './utils/error/globalErrorHandler';
import { limiter } from './utils/limiter';
import { job as tokenJob } from './utils/cronjob/token';

export default function bootstrap(app: Express): void {
  // Connect to database
  connectDB();

  // Initialize middleware
  app.use(limiter);
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL || 'http://localhost:3000' 
      : 'http://localhost:3000',
    credentials: true
  }));
  app.use(express.json());
  app.use(cookieParser());

  app.use('/', authRouter);
  app.use('/user', userRouter);
  app.use('/message', messageRouter);

  // Global error handler
  app.use(globalErrorHandler);

  try {
    tokenJob.start();
    console.log('Token refresh job started');
  } catch (error) {
    console.error('Failed to start token job:', error);
  }

  const server = app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
  });

  process.on('unhandledRejection', (err: Error) => {
    console.error('Unhandled Rejection! Shutting down...');
    console.error(err.name, err.message);
    server.close(() => {
      process.exit(1);
    });
  });
}
