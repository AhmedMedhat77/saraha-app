import mongoose from 'mongoose';
import config from '../config';

export function connectDB() {
  // make sure ot connect to string
  mongoose.connect(config.mongoUri);
  console.log('Database connected');
}
