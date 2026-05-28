/**
 * Calculates a clean relative time string (e.g. '3 days ago', 'just now')
 */
export function formatRelativeTime(dateInput: string | Date | null): string {
  if (!dateInput) return 'Never';
  
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Unknown date';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  const isFuture = diffMs < 0;
  const absDiff = Math.abs(diffMs);

  const seconds = Math.floor(absDiff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (isFuture) {
    if (days > 0) return `expires in ${days} ${days === 1 ? 'day' : 'days'}`;
    if (hours > 0) return `expires in ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    if (minutes > 0) return `expires in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
    return 'expires in a few seconds';
  } else {
    if (days > 0) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    if (hours > 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    if (minutes > 0) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    if (seconds > 10) return `${seconds} seconds ago`;
    return 'just now';
  }
}

/**
 * Checks URL expiration states
 */
export function getExpiryState(expiresAt: string | null): 'active' | 'expiring' | 'expired' {
  if (!expiresAt) return 'active';

  const date = new Date(expiresAt);
  if (isNaN(date.getTime())) return 'active';

  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return 'expired';

  // Less than 3 days remaining => expiring warning
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
  if (diffMs < threeDaysMs) return 'expiring';

  return 'active';
}

/**
 * Truncate long link strings neatly
 */
export function truncateUrl(url: string, maxLength: number = 45): string {
  if (url.length <= maxLength) return url;
  try {
    const raw = new URL(url);
    const domain = raw.hostname;
    const path = raw.pathname;
    if (path.length > 15) {
      return `${domain}${path.substring(0, 15)}...`;
    }
  } catch {}
  return `${url.substring(0, maxLength)}...`;
}
