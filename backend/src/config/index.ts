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
  RESET_TOKEN_TIME: StringValue;
  resetTokenSecret: string;
  clientURI: string;
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
  RESET_TOKEN_TIME: '5m',
  REFRESH_TOKEN_TIME: '7d',
  resetTokenSecret: process.env.RESET_TOKEN_SECRET || '',
  clientURI: process.env.CLIENT_URI || '',
};

export default config;
