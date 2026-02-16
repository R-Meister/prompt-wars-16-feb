/**
 * LRU Cache with TTL Expiration
 * Provides in-memory caching for frequently accessed data to reduce
 * redundant database/API calls and improve response latency.
 * @module utils/cache
 */

/**
 * @typedef {Object} CacheEntry
 * @property {*} value - Cached value
 * @property {number} expiry - Expiration timestamp (Date.now() + ttl)
 * @property {number} created - Creation timestamp
 */

class LRUCache {
    /**
     * Create a new LRU cache instance.
     * @param {Object} options
     * @param {number} [options.maxSize=200] - Maximum number of entries
     * @param {number} [options.defaultTTL=60000] - Default TTL in milliseconds
     * @param {string} [options.name='default'] - Cache name for stats reporting
     */
    constructor({ maxSize = 200, defaultTTL = 60000, name = 'default' } = {}) {
        /** @type {Map<string, CacheEntry>} */
        this._store = new Map();
        this._maxSize = maxSize;
        this._defaultTTL = defaultTTL;
        this._name = name;
        this._hits = 0;
        this._misses = 0;
    }

    /**
     * Get a value from the cache.
     * Returns undefined if not found or expired.
     * @param {string} key
     * @returns {*|undefined}
     */
    get(key) {
        const entry = this._store.get(key);

        if (!entry) {
            this._misses++;
            return undefined;
        }

        // Check TTL expiry
        if (Date.now() > entry.expiry) {
            this._store.delete(key);
            this._misses++;
            return undefined;
        }

        // Move to end (most recently used)
        this._store.delete(key);
        this._store.set(key, entry);
        this._hits++;

        return entry.value;
    }

    /**
     * Set a value in the cache.
     * @param {string} key
     * @param {*} value
     * @param {number} [ttlMs] - TTL in milliseconds, overrides default
     */
    set(key, value, ttlMs) {
        // Delete existing to reset position
        if (this._store.has(key)) {
            this._store.delete(key);
        }

        // Evict oldest entry if at capacity
        if (this._store.size >= this._maxSize) {
            const oldestKey = this._store.keys().next().value;
            this._store.delete(oldestKey);
        }

        this._store.set(key, {
            value,
            expiry: Date.now() + (ttlMs || this._defaultTTL),
            created: Date.now(),
        });
    }

    /**
     * Check if key exists and is not expired.
     * @param {string} key
     * @returns {boolean}
     */
    has(key) {
        const entry = this._store.get(key);
        if (!entry) return false;
        if (Date.now() > entry.expiry) {
            this._store.delete(key);
            return false;
        }
        return true;
    }

    /**
     * Delete a specific key from the cache.
     * @param {string} key
     * @returns {boolean} Whether the key existed
     */
    delete(key) {
        return this._store.delete(key);
    }

    /**
     * Clear all entries from the cache.
     */
    clear() {
        this._store.clear();
        this._hits = 0;
        this._misses = 0;
    }

    /**
     * Get cache statistics.
     * @returns {{ name: string, size: number, maxSize: number, hits: number, misses: number, hitRate: string }}
     */
    stats() {
        const total = this._hits + this._misses;
        return {
            name: this._name,
            size: this._store.size,
            maxSize: this._maxSize,
            hits: this._hits,
            misses: this._misses,
            hitRate: total > 0 ? `${((this._hits / total) * 100).toFixed(1)}%` : '0%',
        };
    }

    /**
     * Cache-aside pattern: get from cache or compute + store.
     * Eliminates repetitive get/set boilerplate in route handlers.
     * @param {string} key - Cache key
     * @param {() => Promise<*>} asyncFn - Async function to compute value on miss
     * @param {number} [ttlMs] - Optional TTL override
     * @returns {Promise<*>}
     */
    async getOrSet(key, asyncFn, ttlMs) {
        const cached = this.get(key);
        if (cached !== undefined) return cached;

        const value = await asyncFn();
        this.set(key, value, ttlMs);
        return value;
    }
}

// Pre-configured cache instances for different data types
const countrySearchCache = new LRUCache({ maxSize: 100, defaultTTL: 60_000, name: 'countrySearch' });
const countryProfileCache = new LRUCache({ maxSize: 200, defaultTTL: 30_000, name: 'countryProfile' });
const worldMapCache = new LRUCache({ maxSize: 1, defaultTTL: 120_000, name: 'worldMap' });
const scenarioCache = new LRUCache({ maxSize: 50, defaultTTL: 300_000, name: 'scenario' });

module.exports = {
    LRUCache,
    countrySearchCache,
    countryProfileCache,
    worldMapCache,
    scenarioCache,
};
