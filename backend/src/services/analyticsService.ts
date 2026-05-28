import { pool } from '../db';
import { lookupIp } from '../utils/geoParser';
import { parseUA } from '../utils/uaParser';

export interface AnalyticsSummary {
  totalClicks: number;
  lastVisited: string | null;
  recentVisits: any[];
  clicksByDay: any[];
  clicksByDevice: any[];
  clicksByCountry: any[];
  clicksByBrowser: any[];
}

export const analyticsService = {
  /**
   * Captures click telemetry in the background asynchronously via setImmediate() to maintain zero redirection latency.
   */
  captureClick(
    urlId: number,
    ipAddress: string,
    userAgentHeader: string | undefined,
    referrerHeader: string | undefined
  ): void {
    setImmediate(async () => {
      try {
        const geoValue = lookupIp(ipAddress);
        const uaValue = parseUA(userAgentHeader);
        const referrer = referrerHeader || 'Direct (Self / Bookmark)';

        // 1. Log click event
        await pool.query(
          `INSERT INTO click_events (url_id, ip_address, country, city, device_type, browser, os, referrer)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            urlId,
            ipAddress,
            geoValue.country,
            geoValue.city,
            uaValue.deviceType,
            uaValue.browser,
            uaValue.os,
            referrer
          ]
        );

        // 2. Increment active URLs total count
        await pool.query(
          `UPDATE urls SET click_count = click_count + 1 WHERE id = $1`,
          [urlId]
        );
      } catch (error) {
        console.error('[Analytics Engine] Background click processing exception:', error);
      }
    });
  },

  /**
   * Gathers full database analytics summaries filtered by URL identifier.
   */
  async getUrlAnalytics(urlId: number): Promise<AnalyticsSummary> {
    // 1. Retrieve current clicks and metrics from table urls
    const urlsQuery = await pool.query(
      `SELECT click_count, created_at FROM urls WHERE id = $1`,
      [urlId]
    );
    if (!urlsQuery.rows.length) {
      throw { status: 404, message: 'URL details could not be found.' };
    }
    const totalClicks = urlsQuery.rows[0].click_count;

    // 2. Fetch last visited timestamp
    const lastVisitedQuery = await pool.query(
      `SELECT MAX(clicked_at) as last_visited FROM click_events WHERE url_id = $1`,
      [urlId]
    );
    const lastVisited = lastVisitedQuery.rows.length ? lastVisitedQuery.rows[0].last_visited : null;

    // 3. Fetch recent 20 events DESC
    const recentQuery = await pool.query(
      `SELECT clicked_at, ip_address, country, city, device_type, browser, os, referrer
       FROM click_events
       WHERE url_id = $1
       ORDER BY clicked_at DESC
       LIMIT 20`,
      [urlId]
    );

    // 4. Group by Day (last 30 days)
    // Matches strftime for SQLite and date conversions in standard databases
    const daysQuery = await pool.query(
      `SELECT strftime('%Y-%m-%d', clicked_at) as date, count(*) as clicks
       FROM click_events
       WHERE url_id = $1 AND clicked_at >= datetime('now', '-30 days')
       GROUP BY date
       ORDER BY date ASC`,
      [urlId]
    );

    // 5. Group by Device Type
    const devicesQuery = await pool.query(
      `SELECT device_type, count(*) as clicks
       FROM click_events
       WHERE url_id = $1
       GROUP BY device_type
       ORDER BY clicks DESC`,
      [urlId]
    );

    // 6. Group by Country: Top 10
    const countriesQuery = await pool.query(
      `SELECT country, count(*) as clicks
       FROM click_events
       WHERE url_id = $1
       GROUP BY country
       ORDER BY clicks DESC
       LIMIT 10`,
      [urlId]
    );

    // 7. Group by Browser: Top 5
    const browsersQuery = await pool.query(
      `SELECT browser, count(*) as clicks
       FROM click_events
       WHERE url_id = $1
       GROUP BY browser
       ORDER BY clicks DESC
       LIMIT 5`,
      [urlId]
    );

    return {
      totalClicks,
      lastVisited,
      recentVisits: recentQuery.rows,
      clicksByDay: daysQuery.rows,
      clicksByDevice: devicesQuery.rows,
      clicksByCountry: countriesQuery.rows,
      clicksByBrowser: browsersQuery.rows,
    };
  }
};
