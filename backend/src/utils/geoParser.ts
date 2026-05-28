import geoip from 'geoip-lite';

interface GeoInfo {
  country: string;
  city: string;
}

/**
 * Parses client IP address to retrieve geographic city/country information.
 */
export function lookupIp(ip: string): GeoInfo {
  try {
    // Handle localhost and private IPs gracefully
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
      return { country: 'Local Loopback', city: 'Localhost' };
    }

    const geo = geoip.lookup(ip);
    if (!geo) {
      return { country: 'Unknown', city: 'Unknown' };
    }

    return {
      country: geo.country || 'Unknown',
      city: geo.city || 'Unknown',
    };
  } catch (error) {
    console.error('GeoIP lookup error:', error);
    return { country: 'Unknown', city: 'Unknown' };
  }
}
