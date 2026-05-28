import { UAParser } from 'ua-parser-js';

interface UserAgentInfo {
  browser: string;
  os: string;
  deviceType: string;
}

/**
 * Parses user agent string to extract client metrics.
 */
export function parseUA(userAgentHeader: string | undefined): UserAgentInfo {
  if (!userAgentHeader) {
    return { browser: 'Unknown', os: 'Unknown', deviceType: 'desktop' };
  }

  try {
    const parser = new UAParser(userAgentHeader);
    const result = parser.getResult();

    return {
      browser: result.browser.name ? `${result.browser.name} ${result.browser.version || ''}`.trim() : 'Unknown',
      os: result.os.name ? `${result.os.name} ${result.os.version || ''}`.trim() : 'Unknown',
      deviceType: result.device.type || 'desktop',
    };
  } catch (error) {
    console.error('UA parsing failed:', error);
    return { browser: 'Unknown', os: 'Unknown', deviceType: 'desktop' };
  }
}
