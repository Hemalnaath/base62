import { MongoClient, Db } from 'mongodb';
import sqlite3 from 'sqlite3';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export interface QueryResult {
  rows: any[];
  rowCount: number;
}

class Pool {
  private mongoClient: MongoClient | null = null;
  private mongoDb: Db | null = null;
  private sqliteDb: sqlite3.Database | null = null;
  private isMongoMode: boolean = false;
  private dbPromise: Promise<void>;

  constructor() {
    const mongoUri = process.env.MONGODB_URI;

    this.dbPromise = (async () => {
      // 1. If a custom or default MongoDB URI exists, try to connect to MongoDB first
      if (mongoUri) {
        console.log(`[Database] Attempting to connect to configured MongoDB URI: ${mongoUri.replace(/:([^:@]+)@/, ':****@')}`);
        try {
          this.mongoClient = new MongoClient(mongoUri, {
            serverSelectionTimeoutMS: 2000, // Fail fast in 2 seconds (crucial for Cloud Run sandbox to avoid hang/timeout)
          });
          const client = await this.mongoClient.connect();
          this.mongoDb = client.db();
          this.isMongoMode = true;
          console.log('[Database] MongoDB connection established successfully');
          await this.initializeMongoDatabase(this.mongoDb);
          return;
        } catch (err: any) {
          console.warn(`[Database] Custom MONGODB_URI connection failed: ${err?.message || err}`);
          console.warn('[Database] Gracefully falling back to integrated SQLite...');
        }
      } else {
        console.log('[Database] No custom MONGODB_URI environment variable detected.');
        console.log('[Database] Falling back to high-performance local SQLite database...');
      }

      // 2. Initialize integrated SQLite fallback
      await this.initializeSqlite();
    })();
  }

  private async initializeMongoDatabase(db: Db) {
    try {
      await db.collection('users').createIndex({ email: 1 }, { unique: true });
      await db.collection('urls').createIndex({ short_code: 1 }, { unique: true });
      await db.collection('urls').createIndex({ user_id: 1 });
      await db.collection('click_events').createIndex({ url_id: 1 });
      await db.collection('click_events').createIndex({ clicked_at: 1 });
      console.log('[Database] MongoDB database indexes verified / created successfully');
    } catch (err) {
      console.error('[Database] Failed to create MongoDB indexes:', err);
    }
  }

  private async initializeSqlite(): Promise<void> {
    const dbPath = path.join(process.cwd(), 'database.sqlite');
    return new Promise((resolve, reject) => {
      this.sqliteDb = new sqlite3.Database(dbPath, async (err) => {
        if (err) {
          console.error('[Database] Failed to load SQLite database file:', err);
          return reject(err);
        }
        console.log('[Database] SQLite database loaded successfully at:', dbPath);
        try {
          await this.ensureSqliteSchema();
          resolve();
        } catch (schemaErr) {
          reject(schemaErr);
        }
      });
    });
  }

  private ensureSqliteSchema(): Promise<void> {
    return new Promise((resolve, reject) => {
      const db = this.sqliteDb!;
      db.serialize(() => {
        // Users Table
        db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            refresh_token_hash TEXT,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Urls Table
        db.run(`
          CREATE TABLE IF NOT EXISTS urls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            short_code TEXT UNIQUE NOT NULL,
            original_url TEXT NOT NULL,
            user_id TEXT,
            custom_alias TEXT,
            click_count INTEGER DEFAULT 0,
            expires_at DATETIME,
            is_public INTEGER DEFAULT 1,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Click Events Table
        db.run(`
          CREATE TABLE IF NOT EXISTS click_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url_id INTEGER,
            ip_address TEXT,
            country TEXT,
            city TEXT,
            device_type TEXT,
            browser TEXT,
            os TEXT,
            referrer TEXT,
            clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `, (err) => {
          if (err) {
            console.error('[Database] SQLite schema creation error:', err);
            return reject(err);
          }
          console.log('[Database] Integrated SQLite database schema verified successfully');
          resolve();
        });
      });
    });
  }

  private async getNextSequence(db: Db, name: string): Promise<number> {
    const result = await db.collection<{ _id: string; seq: number }>('counters').findOneAndUpdate(
      { _id: name },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' }
    );
    if (!result) return 1;
    return 'seq' in result ? (result as any).seq : ((result as any).value?.seq || 1);
  }

  public async query(text: string, params: any[] = []): Promise<QueryResult> {
    await this.dbPromise;

    if (this.isMongoMode && this.mongoDb) {
      return this.executeMongoQuery(this.mongoDb, text, params);
    } else if (this.sqliteDb) {
      return this.executeSqliteQuery(this.sqliteDb, text, params);
    } else {
      throw new Error('[Database] No available database backends loaded');
    }
  }

  private executeSqliteQuery(db: sqlite3.Database, text: string, params: any[]): Promise<QueryResult> {
    return new Promise((resolve, reject) => {
      // Compatibility sanitizations to keep same SQL queries across PG/SQLite
      let sqliteSql = text.replace(/\$\d+/g, '?');
      sqliteSql = sqliteSql.replace(/\bNOW\(\)/gi, "datetime('now')");

      // Map Date objects to string format for SQLite compatibility
      const sanitizedParams = params.map(val => (val instanceof Date ? val.toISOString() : val));

      const isSelect = sqliteSql.trim().toUpperCase().startsWith('SELECT') ||
                      sqliteSql.toUpperCase().includes('RETURNING');

      if (isSelect) {
        db.all(sqliteSql, sanitizedParams, (err, rows) => {
          if (err) {
            console.error('[Database] SQLite Query failure:', sqliteSql, sanitizedParams, err);
            return reject(err);
          }
          resolve({ rows: rows || [], rowCount: (rows || []).length });
        });
      } else {
        db.run(sqliteSql, sanitizedParams, function (err) {
          if (err) {
            console.error('[Database] SQLite Exec failure:', sqliteSql, sanitizedParams, err);
            return reject(err);
          }
          resolve({ rows: [], rowCount: this.changes || 0 });
        });
      }
    });
  }

  private async executeMongoQuery(db: Db, text: string, params: any[]): Promise<QueryResult> {
    const cleanSql = text.replace(/\s+/g, ' ').trim();

    // 1. Schema Creation - No-op under Mongo
    if (cleanSql.toUpperCase().startsWith('CREATE') || cleanSql.toUpperCase().startsWith('PRAGMA')) {
      return { rows: [], rowCount: 0 };
    }

    // --- USER QUERIES ---

    // SELECT id FROM users WHERE email = $1
    if (cleanSql.includes('id FROM users WHERE email')) {
      const user = await db.collection('users').findOne({ email: params[0] });
      return { rows: user ? [{ id: user.id }] : [], rowCount: user ? 1 : 0 };
    }

    // SELECT * FROM users WHERE email = $1 AND is_active = 1
    if (cleanSql.includes('* FROM users WHERE email') && cleanSql.includes('is_active = 1')) {
      const user = await db.collection('users').findOne({ email: params[0], is_active: 1 });
      return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
    }

    // SELECT * FROM users WHERE id = $1 AND refresh_token_hash = $2 AND is_active = 1
    if (cleanSql.includes('* FROM users WHERE id') && cleanSql.includes('refresh_token_hash = $2')) {
      const user = await db.collection('users').findOne({ id: params[0], refresh_token_hash: params[1], is_active: 1 });
      return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
    }

    // INSERT INTO users (id, email, password_hash, is_active) VALUES ($1, $2, $3, 1)
    if (cleanSql.startsWith('INSERT INTO users')) {
      const user = {
        id: params[0],
        email: params[1],
        password_hash: params[2],
        is_active: 1,
        created_at: new Date()
      };
      await db.collection('users').insertOne(user);
      return { rows: [user], rowCount: 1 };
    }

    // UPDATE users SET refresh_token_hash = $1 WHERE id = $2
    if (cleanSql.includes('UPDATE users SET refresh_token_hash = $1 WHERE id = $2')) {
      const result = await db.collection('users').updateOne({ id: params[1] }, { $set: { refresh_token_hash: params[0] } });
      return { rows: [], rowCount: result.modifiedCount };
    }

    // UPDATE users SET refresh_token_hash = NULL WHERE id = $1
    if (cleanSql.includes('refresh_token_hash = NULL WHERE id = $1')) {
      const result = await db.collection('users').updateOne({ id: params[0] }, { $set: { refresh_token_hash: null } });
      return { rows: [], rowCount: result.modifiedCount };
    }


    // --- URL QUERIES ---

    // SELECT id, original_url, expires_at, is_active FROM urls WHERE short_code = $1
    if (cleanSql.includes('id, original_url, expires_at, is_active FROM urls WHERE short_code')) {
      const urlDoc = await db.collection('urls').findOne({ short_code: params[0] });
      return { rows: urlDoc ? [urlDoc] : [], rowCount: urlDoc ? 1 : 0 };
    }

    // SELECT * FROM urls WHERE short_code = $1 AND is_active = 1
    if (cleanSql.includes('* FROM urls WHERE short_code') && cleanSql.includes('is_active = 1')) {
      const urlDoc = await db.collection('urls').findOne({ short_code: params[0], is_active: 1 });
      return { rows: urlDoc ? [urlDoc] : [], rowCount: urlDoc ? 1 : 0 };
    }

    // SELECT click_count, created_at, is_public, original_url FROM urls WHERE short_code = $1 AND is_active = 1
    if (cleanSql.includes('click_count, created_at, is_public, original_url FROM urls')) {
      const urlDoc = await db.collection('urls').findOne({ short_code: params[0], is_active: 1 });
      return { rows: urlDoc ? [urlDoc] : [], rowCount: urlDoc ? 1 : 0 };
    }

    // SELECT click_count, created_at FROM urls WHERE id = $1
    if (cleanSql.includes('click_count, created_at FROM urls WHERE id')) {
      const urlDoc = await db.collection('urls').findOne({ id: Number(params[0]) });
      return { rows: urlDoc ? [urlDoc] : [], rowCount: urlDoc ? 1 : 0 };
    }

    // SELECT * FROM urls WHERE id = $1 AND is_active = 1
    if (cleanSql.includes('* FROM urls WHERE id') && cleanSql.includes('is_active = 1')) {
      const urlDoc = await db.collection('urls').findOne({ id: Number(params[0]), is_active: 1 });
      return { rows: urlDoc ? [urlDoc] : [], rowCount: urlDoc ? 1 : 0 };
    }

    // SELECT * FROM urls WHERE user_id = $1 AND is_active = 1 ORDER BY created_at DESC LIMIT $2 OFFSET $3
    if (cleanSql.includes('* FROM urls WHERE user_id') && cleanSql.includes('LIMIT $2 OFFSET $3')) {
      const userUrls = await db.collection('urls')
        .find({ user_id: params[0], is_active: 1 })
        .sort({ created_at: -1 })
        .skip(Number(params[2]))
        .limit(Number(params[1]))
        .toArray();
      return { rows: userUrls, rowCount: userUrls.length };
    }

    // SELECT id FROM urls WHERE short_code = $1
    if (cleanSql.includes('id FROM urls WHERE short_code')) {
      const urlDoc = await db.collection('urls').findOne({ short_code: params[0] });
      return { rows: urlDoc ? [{ id: urlDoc.id }] : [], rowCount: urlDoc ? 1 : 0 };
    }

    // INSERT INTO urls
    if (cleanSql.startsWith('INSERT INTO urls')) {
      const newId = await this.getNextSequence(db, 'urls');
      let urlRecord: any;
      if (params.length === 6) {
        urlRecord = {
          id: newId,
          short_code: params[0],
          original_url: params[1],
          user_id: params[2],
          custom_alias: params[3],
          click_count: 0,
          created_at: new Date(),
          expires_at: params[4] ? new Date(params[4]) : null,
          is_public: params[5] ? 1 : 0,
          is_active: 1
        };
      } else {
        urlRecord = {
          id: newId,
          short_code: params[0],
          original_url: params[1],
          user_id: params[2],
          custom_alias: null,
          click_count: 0,
          created_at: new Date(),
          expires_at: params[3] ? new Date(params[3]) : null,
          is_public: params[4] ? 1 : 0,
          is_active: 1
        };
      }
      await db.collection('urls').insertOne(urlRecord);
      return { rows: [urlRecord], rowCount: 1 };
    }

    // UPDATE urls SET short_code = $1 WHERE id = $2 RETURNING *
    if (cleanSql.includes('UPDATE urls SET short_code')) {
      const result = await db.collection('urls').findOneAndUpdate(
        { id: Number(params[1]) },
        { $set: { short_code: params[0] } },
        { returnDocument: 'after' }
      );
      const doc = result && 'value' in result ? (result as any).value : result;
      return { rows: doc ? [doc] : [], rowCount: doc ? 1 : 0 };
    }

    // SELECT user_id, custom_alias, short_code FROM urls WHERE id = $1
    if (cleanSql.includes('user_id, custom_alias, short_code FROM urls WHERE id')) {
      const urlDoc = await db.collection('urls').findOne({ id: Number(params[0]) });
      return { rows: urlDoc ? [urlDoc] : [], rowCount: urlDoc ? 1 : 0 };
    }

    // UPDATE urls SET original_url = $1 WHERE id = $2 RETURNING *
    if (cleanSql.includes('UPDATE urls SET original_url')) {
      const result = await db.collection('urls').findOneAndUpdate(
        { id: Number(params[1]) },
        { $set: { original_url: params[0] } },
        { returnDocument: 'after' }
      );
      const doc = result && 'value' in result ? (result as any).value : result;
      return { rows: doc ? [doc] : [], rowCount: doc ? 1 : 0 };
    }

    // SELECT user_id FROM urls WHERE id = $1
    if (cleanSql.includes('user_id FROM urls WHERE id')) {
      const urlDoc = await db.collection('urls').findOne({ id: Number(params[0]) });
      return { rows: urlDoc ? [urlDoc] : [], rowCount: urlDoc ? 1 : 0 };
    }

    // UPDATE urls SET is_active = 0 WHERE id = $1
    if (cleanSql.includes('UPDATE urls SET is_active = 0 WHERE id = $1')) {
      const result = await db.collection('urls').updateOne({ id: Number(params[0]) }, { $set: { is_active: 0 } });
      return { rows: [], rowCount: result.modifiedCount };
    }

    // UPDATE urls SET click_count = click_count + 1 WHERE id = $1
    if (cleanSql.includes('click_count = click_count + 1')) {
      const result = await db.collection('urls').updateOne({ id: Number(params[0]) }, { $inc: { click_count: 1 } });
      return { rows: [], rowCount: result.modifiedCount };
    }

    // SELECT short_code FROM urls WHERE expires_at < datetime('now') AND is_active = 1
    if (cleanSql.includes('expires_at < datetime') && cleanSql.includes('SELECT short_code FROM urls')) {
      const expired = await db.collection('urls')
        .find({ expires_at: { $lt: new Date() }, is_active: 1 }, { projection: { short_code: 1 } })
        .toArray();
      return { rows: expired, rowCount: expired.length };
    }

    // UPDATE urls SET is_active = 0 WHERE expires_at < datetime('now') AND is_active = 1
    if (cleanSql.includes('expires_at < datetime') && cleanSql.includes('UPDATE urls SET is_active = 0')) {
      const result = await db.collection('urls').updateMany({ expires_at: { $lt: new Date() }, is_active: 1 }, { $set: { is_active: 0 } });
      return { rows: [], rowCount: result.modifiedCount };
    }


    // --- CLICK EVENT QUERIES (ANALYTICS) ---

    // INSERT INTO click_events (url_id, ip_address, country, city, device_type, browser, os, referrer) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    if (cleanSql.startsWith('INSERT INTO click_events')) {
      const newId = await this.getNextSequence(db, 'click_events');
      const ce = {
        id: newId,
        url_id: Number(params[0]),
        ip_address: params[1],
        country: params[2],
        city: params[3],
        device_type: params[4],
        browser: params[5],
        os: params[6],
        referrer: params[7],
        clicked_at: new Date()
      };
      await db.collection('click_events').insertOne(ce);
      return { rows: [ce], rowCount: 1 };
    }

    // SELECT MAX(clicked_at) as last_visited FROM click_events WHERE url_id = $1
    if (cleanSql.includes('MAX(clicked_at)')) {
      const docs = await db.collection('click_events')
        .find({ url_id: Number(params[0]) })
        .sort({ clicked_at: -1 })
        .limit(1)
        .toArray();
      const last_visited = docs.length ? docs[0].clicked_at : null;
      return { rows: [{ last_visited }], rowCount: docs.length ? 1 : 0 };
    }

    // SELECT clicked_at, ip_address, country, city, device_type, browser, os, referrer FROM click_events WHERE url_id = $1 ORDER BY clicked_at DESC LIMIT 20
    if (cleanSql.includes('clicked_at, ip_address, country') && cleanSql.includes('LIMIT 20')) {
      const docs = await db.collection('click_events')
        .find({ url_id: Number(params[0]) })
        .sort({ clicked_at: -1 })
        .limit(20)
        .toArray();
      return { rows: docs, rowCount: docs.length };
    }

    // Group by Day (last 30 days)
    if (cleanSql.includes("strftime('%Y-%m-%d'") || cleanSql.includes('GROUP BY date')) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const rows = await db.collection('click_events').aggregate([
        {
          $match: {
            url_id: Number(params[0]),
            clicked_at: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$clicked_at" } },
            clicks: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            date: "$_id",
            clicks: 1
          }
        },
        { $sort: { date: 1 } }
      ]).toArray();
      return { rows, rowCount: rows.length };
    }

    // Group by Device Type
    if (cleanSql.includes('GROUP BY device_type')) {
      const rows = await db.collection('click_events').aggregate([
        { $match: { url_id: Number(params[0]) } },
        {
          $group: {
            _id: "$device_type",
            clicks: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            device_type: "$_id",
            clicks: 1
          }
        },
        { $sort: { clicks: -1 } }
      ]).toArray();
      return { rows, rowCount: rows.length };
    }

    // Group by Country
    if (cleanSql.includes('GROUP BY country')) {
      const rows = await db.collection('click_events').aggregate([
        { $match: { url_id: Number(params[0]) } },
        {
          $group: {
            _id: "$country",
            clicks: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            country: "$_id",
            clicks: 1
          }
        },
        { $sort: { clicks: -1 } },
        { $limit: 10 }
      ]).toArray();
      return { rows, rowCount: rows.length };
    }

    // Group by Browser
    if (cleanSql.includes('GROUP BY browser')) {
      const rows = await db.collection('click_events').aggregate([
        { $match: { url_id: Number(params[0]) } },
        {
          $group: {
            _id: "$browser",
            clicks: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            browser: "$_id",
            clicks: 1
          }
        },
        { $sort: { clicks: -1 } },
        { $limit: 5 }
      ]).toArray();
      return { rows, rowCount: rows.length };
    }

    throw new Error(`Unsupported SQL query: ${cleanSql}`);
  }
}

export const pool = new Pool();
