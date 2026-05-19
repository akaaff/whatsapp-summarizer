import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { runMigrations } from './db/migrate';
import authRouter from './routes/auth';
import healthRouter from './routes/health';
import whatsappRouter from './routes/whatsapp';
import summariesRouter from './routes/summaries';
import { sessionManager } from './whatsapp/SessionManager';

const app = express();
app.use(express.json());

app.use('/health', healthRouter);
app.use('/auth', authRouter);
app.use('/whatsapp', whatsappRouter);
app.use('/summaries', summariesRouter);

const PORT = Number(process.env.PORT) || 3000;

async function start() {
  await runMigrations();
  await sessionManager.restoreAll();
  app.listen(PORT, () => console.log(`API running on port ${PORT}`));
}

start().catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);
});
