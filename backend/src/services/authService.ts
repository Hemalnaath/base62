import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JWT_PRIVATE_KEY, JWT_PUBLIC_KEY } from '../utils/jwtKeys';

export interface User {
  id: string;
  email: string;
  is_active: number; // 0 or 1 in SQLite, mapped from boolean
}

export const authService = {
  /**
   * Hashes a user password using bcrypt with a non-negotiable cost of 12 rounds.
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  },

  /**
   * Compares plain-text password with the stored bcrypt hash.
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  },

  /**
   * Generates a fast SHA-256 digest of refresh tokens for secure DB comparisons.
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  },

  /**
   * Signs a short-lived access token with RS256 algorithm. Length is 15 minutes.
   */
  generateAccessToken(user: { id: string; email: string }): string {
    return jwt.sign(
      { id: user.id, email: user.email },
      JWT_PRIVATE_KEY,
      { algorithm: 'RS256', expiresIn: '15m' }
    );
  },

  /**
   * Signs a long-lived refresh token with RS256. Length is 7 days.
   */
  generateRefreshToken(user: { id: string }): string {
    return jwt.sign(
      { id: user.id },
      JWT_PRIVATE_KEY,
      { algorithm: 'RS256', expiresIn: '7d' }
    );
  },

  /**
   * Verifies access token validity using RS256 public key.
   */
  verifyAccessToken(token: string): any {
    try {
      return jwt.verify(token, JWT_PUBLIC_KEY, { algorithms: ['RS256'] });
    } catch (error: any) {
      // Differentiate expired vs invalid
      throw error;
    }
  },

  /**
   * Verifies refresh token signature.
   */
  verifyRefreshToken(token: string): any {
    try {
      return jwt.verify(token, JWT_PUBLIC_KEY, { algorithms: ['RS256'] });
    } catch (error: any) {
      throw error;
    }
  }
};
