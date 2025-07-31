import config from './config';

import { Express, json } from 'express';
import cors from 'cors';
import { connectDB } from './DB/connect';
import authRouter from './models/auth/auth.controller';
import { NextFunction, Request, Response } from 'express';

export default function bootstrap(app: Express): void {
  // Connect to database
  connectDB();

  // Initialize middleware
  app.use(cors({ origin: '*' }));
  app.use(json());

  app.use('/', authRouter);

  // Global error handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
    });
  });

  // Start server
  app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
  });
}
