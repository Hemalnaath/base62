import { Router, Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cacheService';
import { analyticsService } from '../services/analyticsService';
import { pool } from '../db';

const router = Router();

const RESERVED_WORDS = [
  'api', 'admin', 'login', 'signup', 'dashboard', 'analytics', 'health',
  'static', 'assets', 'favicon', 'robots', 'sitemap', 'null', 'undefined'
];

/**
 * Top-level hot-path redirect route: GET /:shortCode
 * Evaluates in-memory routing cache before falling back to PostgreSQL.
 */
router.get('/:shortCode', async (req: Request, res: Response, next: NextFunction) => {
  const shortCode = req.params.shortCode;

  // 1. Skip reserved words to avoid breaking APIs or frontend routes
  if (RESERVED_WORDS.includes(shortCode.toLowerCase())) {
    return next();
  }

  try {
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || '';
    const referrer = ((req.headers.referer || req.headers.referrer || '') as string);

    // 2. Cache-First Resolution
    const cachedRecord = cacheService.get<any>(shortCode);

    if (cachedRecord) {
      const { id, original_url, expires_at, is_active } = cachedRecord;

      // Check deactivation or expiration on cache hit
      const isExpired = expires_at && new Date(expires_at).getTime() < Date.now();
      if (is_active === 0 || isExpired) {
        return res.status(410).send(`
          <html>
            <head>
              <title>Link Expired</title>
              <style>
                body { background-color: #0d0d0f; color: #ececee; font-family: monospace; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                .card { border: 1px solid #334155; padding: 2rem; border-radius: 4px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); text-align: center; }
                h1 { color: #f87171; margin-top: 0; }
              </style>
            </head>
            <body>
              <div class="card">
                <h1>HTTP 410 - Link Expired</h1>
                <p>This shortened URL has exceeded its scheduled active duration and is no longer available.</p>
              </div>
            </body>
          </html>
        `);
      }

      // Perform HTTP 302 Redirection (NOT 301, to maintain click counts tracking)
      res.redirect(302, original_url);

      // Async Click telemetry logging via setImmediate
      analyticsService.captureClick(id, clientIp, userAgent, referrer);
      return;
    }

    // 3. Database Fallback (Cache Miss)
    const dbRes = await pool.query(
      `SELECT id, original_url, expires_at, is_active FROM urls WHERE short_code = $1`,
      [shortCode]
    );

    if (!dbRes.rows.length) {
      // Pass to standard 404 router / fallback SPA handler
      return next();
    }

    const record = dbRes.rows[0];

    const isExpired = record.expires_at && new Date(record.expires_at).getTime() < Date.now();
    if (record.is_active === 0 || isExpired) {
      if (record.is_active === 1) {
        // Log deactivation on physical DB cell
        await pool.query(`UPDATE urls SET is_active = 0 WHERE id = $1`, [record.id]);
      }
      
      // Update cache
      cacheService.set(shortCode, { ...record, is_active: 0 }, 1800);

      return res.status(410).send(`
        <html>
          <head>
            <title>Link Expired</title>
            <style>
              body { background-color: #0d0d0f; color: #ececee; font-family: monospace; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .card { border: 1px solid #334155; padding: 2rem; border-radius: 4px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); text-align: center; }
              h1 { color: #f87171; margin-top: 0; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>HTTP 410 - Link Expired</h1>
              <p>This shortened URL has exceeded its scheduled active duration and is no longer available.</p>
            </div>
          </body>
        </html>
      `);
    }

    // 4. Update the Cache Registry for future queries
    const ttlSeconds = record.expires_at 
      ? Math.max(1, Math.floor((new Date(record.expires_at).getTime() - Date.now()) / 1000))
      : 3600;

    cacheService.set(shortCode, record, ttlSeconds);

    // 302 Redirection
    res.redirect(302, record.original_url);

    // Async click registration
    analyticsService.captureClick(record.id, clientIp, userAgent, referrer);
  } catch (error) {
    console.error('[Redirection Handlers] Exception caught:', error);
    return res.status(500).send('Internal Redirection Error');
  }
});

export default router;
