import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { pool } from '../db';
import { authService } from '../services/authService';

export const authController = {
  /**
   * Registers a new user.
   * Path: POST /api/auth/signup
   */
  async signup(req: Request, res: Response, next: NextFunction) {
    const { email, password } = req.body;

    try {
      const emailLower = email.toLowerCase();
      
      // Check if email already registered
      const duplicateRes = await pool.query(
        `SELECT id FROM users WHERE email = $1`,
        [emailLower]
      );
      if (duplicateRes.rows.length) {
        return res.status(400).json({ error: 'Email address already registered.' });
      }

      // Hash password with cost 12
      const pasHash = await authService.hashPassword(password);
      const uuid = crypto.randomUUID();

      // Insert user
      const insertRes = await pool.query(
        `INSERT INTO users (id, email, password_hash, is_active)
         VALUES ($1, $2, $3, 1)
         RETURNING id, email, created_at`,
        [uuid, emailLower, pasHash]
      );

      const user = insertRes.rows[0];

      // Generate credentials
      const accessToken = authService.generateAccessToken({ id: user.id, email: user.email });
      const rawRefreshToken = authService.generateRefreshToken({ id: user.id });
      const refHash = authService.hashToken(rawRefreshToken);

      // Save refresh token hashed
      await pool.query(
        `UPDATE users SET refresh_token_hash = $1 WHERE id = $2`,
        [refHash, user.id]
      );

      return res.status(201).json({
        accessToken,
        refreshToken: rawRefreshToken,
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.created_at
        }
      });
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Logs in a user.
   * Path: POST /api/auth/login
   */
  async login(req: Request, res: Response, next: NextFunction) {
    const { email, password } = req.body;

    try {
      const emailLower = email.toLowerCase();
      const userQuery = await pool.query(
        `SELECT * FROM users WHERE email = $1 AND is_active = 1`,
        [emailLower]
      );

      if (!userQuery.rows.length) {
        return res.status(401).json({ error: 'Please register to login.' });
      }

      const user = userQuery.rows[0];

      // Verify bcrypt match
      const passwordMatch = await authService.comparePassword(password, user.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      // Generate fresh credentials
      const accessToken = authService.generateAccessToken({ id: user.id, email: user.email });
      const rawRefreshToken = authService.generateRefreshToken({ id: user.id });
      const refHash = authService.hashToken(rawRefreshToken);

      // Save refresh token hashed
      await pool.query(
        `UPDATE users SET refresh_token_hash = $1 WHERE id = $2`,
        [refHash, user.id]
      );

      return res.status(200).json({
        accessToken,
        refreshToken: rawRefreshToken,
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.created_at
        }
      });
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Performs Access and Refresh tokens rotation to keep sessions alive.
   * Path: POST /api/auth/refresh
   */
  async refresh(req: Request, res: Response, next: NextFunction) {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token must be provided.' });
    }

    try {
      // 1. Verify token signature
      const decoded = authService.verifyRefreshToken(refreshToken);
      const reqHash = authService.hashToken(refreshToken);

      // 2. Lookup user in DB having this active refresh token index
      const userRes = await pool.query(
        `SELECT * FROM users WHERE id = $1 AND refresh_token_hash = $2 AND is_active = 1`,
        [decoded.id, reqHash]
      );

      if (!userRes.rows.length) {
        return res.status(401).json({ error: 'Refresh token is unrecognized or expired.' });
      }

      const user = userRes.rows[0];

      // 3. Generate brand new token pairs
      const newAccessToken = authService.generateAccessToken({ id: user.id, email: user.email });
      const newRefreshToken = authService.generateRefreshToken({ id: user.id });
      const newHash = authService.hashToken(newRefreshToken);

      // 4. Update table with rotated token
      await pool.query(
        `UPDATE users SET refresh_token_hash = $1 WHERE id = $2`,
        [newHash, user.id]
      );

      return res.status(200).json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      });
    } catch (error) {
      console.error('[Auth Refresh Handlers] Rotation failed:', error);
      return res.status(401).json({ error: 'Invalid or malformed refresh token.' });
    }
  },

  /**
   * invalidates user refresh keys.
   * Path: POST /api/auth/logout
   */
  async logout(req: any, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.sendStatus(204);
      }

      // Nullify token
      await pool.query(
        `UPDATE users SET refresh_token_hash = NULL WHERE id = $1`,
        [userId]
      );

      return res.sendStatus(204);
    } catch (error) {
      return next(error);
    }
  }
};
export default authController;
