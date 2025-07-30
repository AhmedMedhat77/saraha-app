import dotenv from 'dotenv';
import { StringValue } from 'ms'; // You might need to install @types/ms

dotenv.config();


interface Config {
  port: number;
  nodeEnv: string;
  mongoUri: string;
  tokenSecret: string;
  emailUser: string;
  emailPassword: string;
  googleClientId: string;
  ACCESS_TOKEN_TIME: StringValue;
  REFRESH_TOKEN_TIME: StringValue;
}

const config: Config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/saraha-app',
  tokenSecret: process.env.TOKEN_SECRET || 'secret',
  emailUser: process.env.EMAIL_USER || '',
  emailPassword: process.env.EMAIL_PASSWORD || '',
  googleClientId: process.env.GOOGLE_AUTH_CLIENT || '',
  ACCESS_TOKEN_TIME: '10m',
  REFRESH_TOKEN_TIME: '7d',
};

export default config;
