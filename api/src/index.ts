import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import fs from 'fs';
import { runMigrations } from './db/migrate';
import authRouter from './routes/auth';
import healthRouter from './routes/health';
import whatsappRouter from './routes/whatsapp';
import summariesRouter from './routes/summaries';
import searchRouter from './routes/search';
import { sessionManager } from './whatsapp/SessionManager';

const app = express();
app.use(express.json());

// Serve web app static files if the dist folder exists
const webDistPath = path.join(__dirname, '../../mobile/dist');
if (fs.existsSync(webDistPath)) {
  app.use(express.static(webDistPath));
  console.log(`Serving web app from ${webDistPath}`);
}

app.use('/health', healthRouter);
app.use('/auth', authRouter);
app.use('/whatsapp', whatsappRouter);
app.use('/summaries', summariesRouter);
app.use('/search', searchRouter);

// SPA fallback — serve index.html for all non-API routes
if (fs.existsSync(webDistPath)) {
  app.use((req, res, next) => {
    if (req.path.startsWith('/auth') || req.path.startsWith('/health') ||
        req.path.startsWith('/whatsapp') || req.path.startsWith('/summaries') ||
        req.path.startsWith('/search')) {
      return next();
    }
    res.sendFile(path.join(webDistPath, 'index.html'));
  });
}

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
