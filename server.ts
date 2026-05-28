import dotenv from 'dotenv';
dotenv.config();

import app from './backend/src/app';
import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { startExpiryJob } from './backend/src/jobs/expiryJob';

async function start() {
  const PORT = 3000; // Strictly hardcoded to comply with sandbox proxy routing

  // 1. Initialize background node-cron sweepers
  try {
    startExpiryJob();
  } catch (error) {
    console.warn('[Runner] Failed to boot scheduled cron jobs core:', error);
  }

  // 2. Integrate Vite depending on NODE_ENV
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Runner] Running in development mode, mounting Vite asset-builder...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    
    // Express mounts Vite as a dev asset compiler
    app.use(vite.middlewares);
  } else {
    console.log('[Runner] Running in production mode, routing static contents...');
    const distPath = path.join(process.cwd(), 'dist');
    
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind to PORT 3000 and 0.0.0.0 (required for Cloud Run routing)
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Runner] URL Shortener online and active at: http://0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error('[Runner] Unrecoverable boot crash encountered:', err);
});
