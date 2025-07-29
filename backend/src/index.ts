import express from 'express';
import bootstrap from './app.controller';

const app = express();

bootstrap(app);

export default app;
