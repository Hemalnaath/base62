import NodeCache from 'node-cache';

// Initialize NodeCache with standard 1-hour default TTL (3600 seconds)
const localCache = new NodeCache({
  stdTTL: 3600,
  checkperiod: 60, // check for expired elements every 60 seconds
  useClones: false // performance boost as objects are immutable here
});

export const cacheService = {
  get<T>(key: string): T | undefined {
    return localCache.get<T>(key);
  },

  set<T>(key: string, value: T, ttl: number = 3600): boolean {
    return localCache.set(key, value, ttl);
  },

  del(key: string | string[]): number {
    return localCache.del(key);
  },

  flush(): void {
    localCache.flushAll();
  }
};
