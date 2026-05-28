import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const KEYS_DIR = path.join(process.cwd(), 'keys');
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, 'private.pem');
const PUBLIC_KEY_PATH = path.join(KEYS_DIR, 'public.pem');

interface KeyPair {
  privateKey: string;
  publicKey: string;
}

/**
 * Ensures RS256 keys are available. Generates them on-the-fly and caches them
 * locally in a 'keys/' directory to avoid token invalidation across dev server reboots.
 */
export function getOrGenerateKeys(): KeyPair {
  try {
    // Generate directories if of missing keys
    if (!fs.existsSync(KEYS_DIR)) {
      fs.mkdirSync(KEYS_DIR, { recursive: true });
    }

    if (fs.existsSync(PRIVATE_KEY_PATH) && fs.existsSync(PUBLIC_KEY_PATH)) {
      const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
      const publicKey = fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');
      return { privateKey, publicKey };
    }

    console.log('[Auth] Generating a new RS256 RSA key pair for bulletproof token signing...');
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    fs.writeFileSync(PRIVATE_KEY_PATH, privateKey, 'utf8');
    fs.writeFileSync(PUBLIC_KEY_PATH, publicKey, 'utf8');

    return { privateKey, publicKey };
  } catch (error) {
    console.error('[Auth] RSA Keypair generation exception, utilizing in-memory fallback:', error);
    // Secure in-memory failure protection
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    return { privateKey, publicKey };
  }
}
export const keys = getOrGenerateKeys();
export const JWT_PRIVATE_KEY = keys.privateKey;
export const JWT_PUBLIC_KEY = keys.publicKey;
