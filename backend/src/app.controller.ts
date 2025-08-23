import config from './config';

import { Express, json } from 'express';
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
  app.use(cors({ origin: '*' }));
  app.use(json());
  app.use(cookieParser());

  app.use('/', authRouter);
  app.use('/user', userRouter);
  app.use('/message', messageRouter);

  // Global error handler
  app.use(globalErrorHandler);

  tokenJob.start();
  // Start server
  app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
  });
}
