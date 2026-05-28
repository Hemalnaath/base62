import { pool } from '../db';
import { encodeBase62 } from '../utils/base62';
import { generateQrCode } from '../utils/qrGenerator';

export interface UrlRecord {
  id: number;
  short_code: string;
  original_url: string;
  user_id: string;
  custom_alias: string | null;
  click_count: number;
  created_at: string;
  expires_at: string | null;
  is_active: number;
  is_public: number;
}

export const urlService = {
  /**
   * Evaluates if a short_code exists in the registry.
   */
  async getByShortCode(shortCode: string): Promise<UrlRecord | null> {
    const res = await pool.query(
      `SELECT * FROM urls WHERE short_code = $1 AND is_active = 1`,
      [shortCode]
    );
    return res.rows.length ? (res.rows[0] as UrlRecord) : null;
  },

  /**
   * Fetches full record metadata by its sequence identifier.
   */
  async getById(id: number): Promise<UrlRecord | null> {
    const res = await pool.query(
      `SELECT * FROM urls WHERE id = $1 AND is_active = 1`,
      [id]
    );
    return res.rows.length ? (res.rows[0] as UrlRecord) : null;
  },

  /**
   * Retrieves list of URLs owned by a specific account. Supports pagination.
   */
  async listUserUrls(userId: string, limit: number = 20, offset: number = 0): Promise<UrlRecord[]> {
    const res = await pool.query(
      `SELECT * FROM urls WHERE user_id = $1 AND is_active = 1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return res.rows as UrlRecord[];
  },

  /**
   * Implements the requested multi-phase insertion logic:
   * 1. If custom_alias is provided, validate DB unique constraint and insert as is.
   * 2. If no alias is given, insert a temporary record to get the auto-increment ID seed,
   *    convert the seed ID to standard Base62 encoding, and update the record.
   */
  async createShortUrl(
    originalUrl: string,
    userId: string,
    customAlias?: string,
    expiresAt?: string | null,
    isPublic: boolean = false
  ): Promise<UrlRecord & { qrCodeDataUrl: string; shortUrl: string }> {
    const expiresTimestamp = expiresAt ? new Date(expiresAt).toISOString() : null;
    const isPublicInt = isPublic ? 1 : 0;
    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    if (customAlias) {
      // Check collision first
      const collisionCheck = await pool.query(
        `SELECT id FROM urls WHERE short_code = $1`,
        [customAlias]
      );
      if (collisionCheck.rows.length) {
        throw { status: 409, message: 'Custom alias has already been taken.' };
      }

      const res = await pool.query(
        `INSERT INTO urls (short_code, original_url, user_id, custom_alias, expires_at, is_public, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, 1)
         RETURNING *`,
        [customAlias, originalUrl, userId, customAlias, expiresTimestamp, isPublicInt]
      );

      const record = res.rows[0] as UrlRecord;
      const shortUrl = `${appUrl}/${record.short_code}`;
      const qrCodeDataUrl = await generateQrCode(shortUrl);

      return { ...record, shortUrl, qrCodeDataUrl };
    }

    // Phase 2: Generating auto-encoded Base62 short links
    let retries = 3;
    let finalCode = '';
    let lastId = 0;

    while (retries > 0) {
      try {
        // Create tentative placeholder records to lock auto-increment sequence
        const tempPlaceholder = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const insertRes = await pool.query(
          `INSERT INTO urls (short_code, original_url, user_id, custom_alias, expires_at, is_public, is_active)
           VALUES ($1, $2, $3, NULL, $4, $5, 1)
           RETURNING id`,
          [tempPlaceholder, originalUrl, userId, expiresTimestamp, isPublicInt]
        );

        lastId = insertRes.rows[0].id;
        finalCode = encodeBase62(lastId);

        // Update with full Base62 calculations
        const updateRes = await pool.query(
          `UPDATE urls SET short_code = $1 WHERE id = $2 RETURNING *`,
          [finalCode, lastId]
        );

        const record = updateRes.rows[0] as UrlRecord;
        const shortUrl = `${appUrl}/${record.short_code}`;
        const qrCodeDataUrl = await generateQrCode(shortUrl);

        return { ...record, shortUrl, qrCodeDataUrl };
      } catch (error: any) {
        retries--;
        console.warn(`[UrlService] Collision occur, retrying base62 transaction. Retries left: ${retries}`, error);
        if (retries === 0) {
          throw { status: 500, message: 'Base62 generation encountered key collisions repeatably.' };
        }
      }
    }

    throw { status: 500, message: 'Base62 generation thread crashed.' };
  },

  /**
   * Performs updating of original destination target URL.
   */
  async updateUrl(id: number, userId: string, newOriginalUrl: string): Promise<UrlRecord> {
    // Ownership check
    const ownerRes = await pool.query(`SELECT user_id, custom_alias, short_code FROM urls WHERE id = $1`, [id]);
    if (!ownerRes.rows.length) {
      throw { status: 404, message: 'URL not found.' };
    }

    if (ownerRes.rows[0].user_id !== userId) {
      throw { status: 401, message: 'You do not own this URL.' };
    }

    const res = await pool.query(
      `UPDATE urls SET original_url = $1 WHERE id = $2 RETURNING *`,
      [newOriginalUrl, id]
    );

    return res.rows[0] as UrlRecord;
  },

  /**
   * Applies client soft delete to maintain clicks analytics integrity.
   */
  async softDeleteUrl(id: number, userId: string): Promise<boolean> {
    const ownerRes = await pool.query(`SELECT user_id FROM urls WHERE id = $1`, [id]);
    if (!ownerRes.rows.length) {
      throw { status: 404, message: 'URL not found.' };
    }

    if (ownerRes.rows[0].user_id !== userId) {
      throw { status: 401, message: 'You do not own this URL.' };
    }

    const res = await pool.query(
      `UPDATE urls SET is_active = 0 WHERE id = $1`,
      [id]
    );

    return res.rowCount > 0;
  }
};
