import cron from 'node-cron';
import { pool } from '../db';
import { cacheService } from '../services/cacheService';

/**
 * Initializes the periodic execution sequence.
 * Enforces the rule: Runs every hour at :00, deactivates URLs with elapsed expiration structures,
 * and clears them from in-memory caches.
 */
export function startExpiryJob(): void {
  console.log('[Expiry Job] Initializing Hourly Cron Monitor...');
  
  // '0 * * * *' fires at minute 0 of every hour
  cron.schedule('0 * * * *', async () => {
    console.log('[Expiry Job] Scanning database for expired links...');
    try {
      // 1. Select the codes we are about to deactivate so we can evict them from Cache
      const selectExpQuery = await pool.query(
        `SELECT short_code FROM urls WHERE expires_at < datetime('now') AND is_active = 1`
      );

      if (selectExpQuery.rows.length > 0) {
        const expiredCodes = selectExpQuery.rows.map(row => row.short_code);
        console.log(`[Expiry Job] Found ${expiredCodes.length} expired short link(s). Purging cache and deactivating...`);

        // 2. Perform DB deactivation
        await pool.query(
          `UPDATE urls SET is_active = 0 WHERE expires_at < datetime('now') AND is_active = 1`
        );

        // 3. Purge from Cache
        cacheService.del(expiredCodes);
        console.log('[Expiry Job] Cache eviction and link deactivation completed successfully.');
      } else {
        console.log('[Expiry Job] No expired items found.');
      }
    } catch (error) {
      console.error('[Expiry Job] Warning: Failed to process cleanups inside cron context.', error);
    }
  });
}
