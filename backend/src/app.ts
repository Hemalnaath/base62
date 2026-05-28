import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import redirectRouter from './routes/redirect';
import authRouter from './routes/auth';
import urlRouter from './routes/urls';
import analyticsRouter from './routes/analytics';
import { globalLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Trust the first proxy hop (e.g., our nginx reverse proxy in the container environment)
app.set('trust proxy', 1);

// 1. Top-Level redirect route (THE HOT PATH) - placed FIRST as requested
app.use('/', redirectRouter);

// 2. Security parsing and formatting middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Turned off to allow Vite inline client bundles
  crossOriginEmbedderPolicy: false
}));

// Safely sanitize CORS_ORIGIN to exclude invalid control characters, newlines, or wrapping quotes
const getCorsOrigin = (): string | boolean | RegExp | (string | RegExp)[] => {
  const envOrigin = process.env.CORS_ORIGIN;
  if (!envOrigin) {
    return '*';
  }
  
  let cleaned = envOrigin.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  
  cleaned = cleaned.replace(/[\r\n\t]/g, '').trim();
  
  if (!cleaned) {
    return '*';
  }
  
  if (cleaned.includes(',')) {
    return cleaned.split(',').map(o => {
      let oClean = o.trim();
      if ((oClean.startsWith('"') && oClean.endsWith('"')) || (oClean.startsWith("'") && oClean.endsWith("'"))) {
        oClean = oClean.slice(1, -1).trim();
      }
      return oClean.replace(/[\r\n\t]/g, '').trim();
    }).filter(Boolean);
  }
  
  return cleaned;
};

app.use(cors({
  origin: getCorsOrigin(),
  credentials: true
}));

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Globals limiting filters
app.use(globalLimiter);

// 4. API health checks
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// 5. Routers Mounting
app.use('/api/auth', authRouter);
app.use('/api/urls', urlRouter);
app.use('/api/urls', analyticsRouter); // Merges /:id/analytics perfectly!

// 6. Global fallback error handler
app.use(errorHandler);

export default app;
