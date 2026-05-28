import { Response, NextFunction } from 'express';
import Papa from 'papaparse';
import { urlService, UrlRecord } from '../services/urlService';
import { cacheService } from '../services/cacheService';
import { pool } from '../db';
import { generateQrCode } from '../utils/qrGenerator';

export const urlController = {
  /**
   * Returns a paginated listed registry of the calling user's URLs.
   * Path: GET /api/urls
   */
  async listUrls(req: any, res: Response, next: NextFunction) {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    try {
      // Return list
      const records = await urlService.listUserUrls(userId, limit, offset);

      // Map complete shortUrls for frontend usability
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const formatted = records.map(r => ({
        id: r.id,
        shortCode: r.short_code,
        shortUrl: `${appUrl}/${r.short_code}`,
        originalUrl: r.original_url,
        createdAt: r.created_at,
        expiresAt: r.expires_at,
        clickCount: r.click_count,
        isPublic: r.is_public === 1,
        customAlias: r.custom_alias
      }));

      return res.status(200).json(formatted);
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Returns metadata of a single URL.
   * Path: GET /api/urls/:id
   */
  async getUrl(req: any, res: Response, next: NextFunction) {
    const userId = req.user.id;
    const id = parseInt(req.params.id);

    try {
      const record = await urlService.getById(id);
      if (!record) {
        return res.status(404).json({ error: 'URL details could not be found.' });
      }

      if (record.user_id !== userId) {
        return res.status(401).json({ error: 'You do not own this URL.' });
      }

      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const shortUrl = `${appUrl}/${record.short_code}`;
      const qrCodeDataUrl = await generateQrCode(shortUrl);

      return res.status(200).json({
        id: record.id,
        shortCode: record.short_code,
        shortUrl,
        originalUrl: record.original_url,
        createdAt: record.created_at,
        expiresAt: record.expires_at,
        clickCount: record.click_count,
        isPublic: record.is_public === 1,
        qrCodeDataUrl,
        customAlias: record.custom_alias
      });
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Registers a brand new URL code.
   * Path: POST /api/urls
   */
  async createUrl(req: any, res: Response, next: NextFunction) {
    const userId = req.user.id;
    const { original_url, custom_alias, expires_at, is_public } = req.body;
    console.log('[UrlController] Incoming createUrl request payload:', { original_url, custom_alias, expires_at, is_public });

    try {
      const record = await urlService.createShortUrl(
        original_url,
        userId,
        custom_alias,
        expires_at,
        is_public === true
      );

      // Pre-warm Cache with TTL
      const ttl = record.expires_at ? Math.max(1, Math.floor((new Date(record.expires_at).getTime() - Date.now()) / 1000)) : 3600;
      cacheService.set(record.short_code, record, ttl);

      return res.status(201).json({
        id: record.id,
        shortUrl: record.shortUrl,
        shortCode: record.short_code,
        originalUrl: record.original_url,
        createdAt: record.created_at,
        expiresAt: record.expires_at,
        clickCount: record.click_count,
        qrCodeDataUrl: record.qrCodeDataUrl,
        isPublic: record.is_public === 1
      });
    } catch (error: any) {
      if (error.status) {
        return res.status(error.status).json({ error: error.message });
      }
      return next(error);
    }
  },

  /**
   * Modifies the destination long URL for an existing entry.
   * Path: PATCH /api/urls/:id
   */
  async patchUrl(req: any, res: Response, next: NextFunction) {
    const userId = req.user.id;
    const id = parseInt(req.params.id);
    const { original_url } = req.body;

    if (!original_url) {
      return res.status(400).json({ error: 'Destination long url must be supplied.' });
    }

    // Format check on url
    try {
      const u = new URL(original_url);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        return res.status(400).json({ error: 'Protocols whitelisted: HTTP/HTTPS only.' });
      }
    } catch {
      return res.status(400).json({ error: 'Malformed url format.' });
    }

    try {
      const updated = await urlService.updateUrl(id, userId, original_url);

      // Purge Cache to reflect the updated target destination
      cacheService.del(updated.short_code);

      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      return res.status(200).json({
        id: updated.id,
        shortCode: updated.short_code,
        shortUrl: `${appUrl}/${updated.short_code}`,
        originalUrl: updated.original_url,
        createdAt: updated.created_at,
        expiresAt: updated.expires_at,
        clickCount: updated.click_count,
        isPublic: updated.is_public === 1
      });
    } catch (error: any) {
      if (error.status) {
        return res.status(error.status).json({ error: error.message });
      }
      return next(error);
    }
  },

  /**
   * Soft deactivates/deletes a URL row in the registry.
   * Path: DELETE /api/urls/:id
   */
  async deleteUrl(req: any, res: Response, next: NextFunction) {
    const userId = req.user.id;
    const id = parseInt(req.params.id);

    try {
      // Find row first to clear cache
      const details = await urlService.getById(id);
      if (details) {
        cacheService.del(details.short_code);
      }

      await urlService.softDeleteUrl(id, userId);
      return res.status(200).json({ success: true, message: 'URL deactivated safely.' });
    } catch (error: any) {
      if (error.status) {
        return res.status(error.status).json({ error: error.message });
      }
      return next(error);
    }
  },

  /**
   * Processes batch uploading of URL inputs inside CSV contents.
   * Path: POST /api/urls/bulk
   */
  async bulkImport(req: any, res: Response, next: NextFunction) {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file was uploaded.' });
    }

    try {
      const csvStr = req.file.buffer.toString('utf8');
      const parsed = Papa.parse(csvStr, {
        header: true,
        skipEmptyLines: true
      });

      const rows = parsed.data as any[];

      // Enforce CSV row boundaries: Max 100 rows per request
      if (rows.length > 100) {
        return res.status(400).json({ error: 'Bulk uploads are capped at 100 entries per CSV payload.' });
      }

      const success: any[] = [];
      const failed: any[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        // Header normalization
        const originalUrl = row.long_url || row.url || row.original_url || row['long_url'];
        const customAlias = row.custom_alias || row.alias || row['custom_alias'] || undefined;
        const expiresAt = row.expires_at || row.expiry || row['expires_at'] || undefined;
        const isPublicVal = row.is_public === 'true' || row.is_public === '1' || row['is_public'] === 'true';

        // Perform schema validations
        if (!originalUrl) {
          failed.push({ row, error: 'Destination URL field is blank.' });
          continue;
        }

        try {
          const checkUrl = new URL(originalUrl);
          if (checkUrl.protocol !== 'http:' && checkUrl.protocol !== 'https:') {
            failed.push({ row, error: 'Unsupported protocol. Link must begin with HTTP/HTTPS.' });
            continue;
          }
        } catch {
          failed.push({ row, error: 'Malformed original URL formatting.' });
          continue;
        }

        // Validate custom alias rules on CSV row
        if (customAlias) {
          const aliasStr = String(customAlias).trim();
          if (aliasStr.length < 8 || aliasStr.length > 100) {
            failed.push({ row, error: 'Custom alias length must be 8-100 characters.' });
            continue;
          }
          if (!/^[a-zA-Z0-9\-_]+$/.test(aliasStr)) {
            failed.push({ row, error: 'Custom alias permits characters: [a-zA-Z0-9-_].' });
            continue;
          }
          const reserved = ['api','admin','login','signup','dashboard','analytics','health','static','assets','favicon','robots','sitemap','null','undefined'];
          if (reserved.includes(aliasStr.toLowerCase())) {
            failed.push({ row, error: 'Custom alias contains reserved keyword.' });
            continue;
          }
        }

        // Validate future expiry dates on CSV row
        if (expiresAt) {
          const date = new Date(expiresAt);
          if (isNaN(date.getTime())) {
            failed.push({ row, error: 'Expiry date is invalid.' });
            continue;
          }
          if (date.getTime() <= Date.now()) {
            failed.push({ row, error: 'Expiry target is in the past.' });
            continue;
          }
        }

        // Create short URL row
        try {
          const urlRecord = await urlService.createShortUrl(
            originalUrl,
            userId,
            customAlias ? String(customAlias).trim() : undefined,
            expiresAt,
            isPublicVal
          );
          
          success.push({
            row,
            shortUrl: urlRecord.shortUrl
          });
        } catch (err: any) {
          failed.push({
            row,
            error: err.message || 'Collateral creation conflict.'
          });
        }
      }

      return res.status(200).json({
        processed: rows.length,
        success,
        failed
      });
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Retrieves public statistics of a short_code link without authentication,
   * granted that url.is_public is active.
   * Path: GET /api/urls/:shortCode/public
   */
  async getPublicStats(req: any, res: Response, next: NextFunction) {
    const shortCode = req.params.shortCode;

    try {
      const recordsRes = await pool.query(
        `SELECT click_count, created_at, is_public, original_url FROM urls WHERE short_code = $1 AND is_active = 1`,
        [shortCode]
      );

      if (!recordsRes.rows.length) {
        return res.status(404).json({ error: 'Short link could not be found.' });
      }

      const record = recordsRes.rows[0];
      if (record.is_public !== 1) {
        return res.status(401).json({ error: 'Statistics for this link are marked confidential.' });
      }

      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      return res.status(200).json({
        totalClicks: record.click_count,
        createdAt: record.created_at,
        shortUrl: `${appUrl}/${shortCode}`
      });
    } catch (error) {
      return next(error);
    }
  }
};
export default urlController;
