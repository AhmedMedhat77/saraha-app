import { errorHandler } from './middleware/error/errorHandler';
import config from './config';

import express, { Express } from 'express';
import cors from 'cors';
import { connectDB } from './DB/connect';

export default function bootstrap(app: Express): void {
  // Connect to database
  connectDB();

  // Initialize middleware
  app.use(cors({ origin: '*' }));
  app.use(express.json());
  app.use(errorHandler);

  // Start server
  app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
  });
}
