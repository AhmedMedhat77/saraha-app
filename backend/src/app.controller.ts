import { errorHandler } from './middleware/error/errorHandler';
import config from './config';

import { Express, json } from 'express';
import cors from 'cors';
import { connectDB } from './DB/connect';
import authRouter from './models/auth/auth.controller';

export default function bootstrap(app: Express): void {
  // Connect to database
  connectDB();


  // Initialize middleware
  app.use(cors({ origin: '*' }));
  app.use(json());
  app.use(errorHandler);

  app.use('/', authRouter);

  // Start server
  app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
  });
}
