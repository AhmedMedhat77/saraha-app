import dotenv from 'dotenv';

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  mongoUri: string;
  tokenSecret: string;
  emailUser: string;
  emailPassword: string;
  emailAuth: string;
}

const config: Config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/saraha-app',
  tokenSecret: process.env.TOKEN_SECRET || 'secret',
  emailUser: process.env.EMAIL_USER || '',
  emailPassword: process.env.EMAIL_PASSWORD || '',
  emailAuth: process.env.GOOGLE_AUTH_CLIENT || '',
};

export default config;
