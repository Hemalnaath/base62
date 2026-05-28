const CHARSET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Encodes a unique auto-incrementing integer ID into a 7-character Base62 string.
 * Divides the ID repeatedly by 62, mapping remainders to the character set.
 * Returns a 7-character padded code.
 */
export function encodeBase62(num: number): string {
  if (num < 0) {
    throw new Error('ID must be a positive integer.');
  }
  if (num === 0) {
    return '0'.repeat(7);
  }

  let code = '';
  let temp = num;

  while (temp > 0) {
    const remainder = temp % 62;
    code = CHARSET[remainder] + code;
    temp = Math.floor(temp / 62);
  }

  // Pad with leading '0' up to 7 characters as requested
  if (code.length < 7) {
    code = '0'.repeat(7 - code.length) + code;
  }

  return code;
}

/**
 * Decodes a Base62 string back to its corresponding numeric ID.
 */
export function decodeBase62(code: string): number {
  let num = 0;
  // Strip leading zeros for decoding calculations if they are padding
  let cleanCode = code;
  // Convert standard characters back to values
  for (let i = 0; i < cleanCode.length; i++) {
    const char = cleanCode[i];
    const val = CHARSET.indexOf(char);
    if (val === -1) {
      throw new Error(`Invalid Base62 character: ${char}`);
    }
    num = num * 62 + val;
  }
  return num;
}
