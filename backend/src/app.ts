import cors from 'cors';
import express from 'express';

import { env } from './config/env.js';
import { apiRouter } from './routes/index.js';

export const app = express();

app.use(
  cors({
    origin: [env.frontendUrl, 'https://www.clubmy.com.br'],
    credentials: true
  })
);
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'clubmy-api' });
});

app.use('/', apiRouter);
