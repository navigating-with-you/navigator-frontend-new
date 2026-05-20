interface CacheEntry {
    data: any;
    etag: string;
    timestamp: number;
    ttl: number; // milliseconds
}

class CacheManager {
    private cache: Map<string, CacheEntry> = new Map();

    set(key: string, data: any, etag: string, ttl: number = 300000) {
        // ttl default: 5 minutes
        this.cache.set(key, {
            data,
            etag,
            timestamp: Date.now(),
            ttl,
        });
    }

    /**
     * Get data only if it is not expired.
     * Do NOT delete here so we can still use the ETag for revalidation.
     */
    get(key: string): any | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        // Check if expired
        if (Date.now() - entry.timestamp > entry.ttl) {
            return null;
        }

        return entry.data;
    }

    /**
     * Get cached data regardless of whether it is expired.
     * Useful when the server returns 304 Not Modified.
     */
    getExpired(key: string): any | null {
        const entry = this.cache.get(key);
        return entry ? entry.data : null;
    }

    /**
     * Get ETag regardless of expiration to use for revalidation.
     */
    getETag(key: string): string | null {
        const entry = this.cache.get(key);
        return entry ? entry.etag : null;
    }

    /**
     * Refresh the timestamp of an existing cache entry.
     */
    refresh(key: string, ttl?: number) {
        const entry = this.cache.get(key);
        if (entry) {
            entry.timestamp = Date.now();
            if (ttl !== undefined) {
                entry.ttl = ttl;
            }
        }
    }

    invalidate(key: string) {
        this.cache.delete(key);
    }

    invalidatePattern(pattern: string) {
        // Invalidate all keys matching pattern
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
            }
        }
    }

    clear() {
        this.cache.clear();
    }
}

export const cacheManager = new CacheManager();
