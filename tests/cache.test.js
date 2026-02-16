/**
 * LRU Cache — Unit Tests
 * Tests cache lifecycle: set, get, TTL, LRU eviction, stats
 */

const { LRUCache } = require('../src/utils/cache');

describe('LRUCache', () => {
    let cache;

    beforeEach(() => {
        cache = new LRUCache({ maxSize: 3, defaultTTL: 1000, name: 'test' });
    });

    describe('set and get', () => {
        test('stores and retrieves values', () => {
            cache.set('key1', 'value1');
            expect(cache.get('key1')).toBe('value1');
        });

        test('returns undefined for missing keys', () => {
            expect(cache.get('nonexistent')).toBeUndefined();
        });

        test('overwrites existing keys', () => {
            cache.set('key1', 'original');
            cache.set('key1', 'updated');
            expect(cache.get('key1')).toBe('updated');
        });

        test('stores objects and arrays', () => {
            const obj = { a: 1, b: [2, 3] };
            cache.set('obj', obj);
            expect(cache.get('obj')).toEqual(obj);
        });

        test('stores null and falsy values', () => {
            cache.set('null', null);
            cache.set('zero', 0);
            cache.set('empty', '');
            expect(cache.get('null')).toBeNull();
            expect(cache.get('zero')).toBe(0);
            expect(cache.get('empty')).toBe('');
        });
    });

    describe('TTL expiration', () => {
        test('returns undefined for expired entries', () => {
            cache = new LRUCache({ maxSize: 10, defaultTTL: 1 }); // 1ms TTL

            cache.set('fast', 'value');

            // Manually wait just a tiny bit
            return new Promise(resolve => {
                setTimeout(() => {
                    expect(cache.get('fast')).toBeUndefined();
                    resolve();
                }, 10);
            });
        });

        test('respects custom TTL per entry', () => {
            cache.set('long', 'long-lived', 10000);
            cache.set('short', 'short-lived', 1);

            return new Promise(resolve => {
                setTimeout(() => {
                    expect(cache.get('long')).toBe('long-lived');
                    expect(cache.get('short')).toBeUndefined();
                    resolve();
                }, 10);
            });
        });
    });

    describe('LRU eviction', () => {
        test('evicts oldest entry when at capacity', () => {
            cache.set('a', 1);
            cache.set('b', 2);
            cache.set('c', 3);
            cache.set('d', 4); // Should evict 'a'

            expect(cache.get('a')).toBeUndefined();
            expect(cache.get('d')).toBe(4);
        });

        test('accessing a key moves it to most recent', () => {
            cache.set('a', 1);
            cache.set('b', 2);
            cache.set('c', 3);

            cache.get('a'); // Move 'a' to recent

            cache.set('d', 4); // Should evict 'b' (oldest unused)

            expect(cache.get('a')).toBe(1);
            expect(cache.get('b')).toBeUndefined();
        });
    });

    describe('has', () => {
        test('returns true for existing non-expired keys', () => {
            cache.set('key', 'val');
            expect(cache.has('key')).toBe(true);
        });

        test('returns false for missing keys', () => {
            expect(cache.has('nope')).toBe(false);
        });

        test('returns false for expired keys', () => {
            cache = new LRUCache({ maxSize: 10, defaultTTL: 1 });
            cache.set('exp', 'val');

            return new Promise(resolve => {
                setTimeout(() => {
                    expect(cache.has('exp')).toBe(false);
                    resolve();
                }, 10);
            });
        });
    });

    describe('delete', () => {
        test('removes existing key', () => {
            cache.set('rm', 'val');
            expect(cache.delete('rm')).toBe(true);
            expect(cache.get('rm')).toBeUndefined();
        });

        test('returns false for non-existent key', () => {
            expect(cache.delete('ghost')).toBe(false);
        });
    });

    describe('clear', () => {
        test('removes all entries and resets stats', () => {
            cache.set('a', 1);
            cache.set('b', 2);
            cache.get('a');

            cache.clear();

            // Verify all entries removed
            expect(cache.has('a')).toBe(false);
            expect(cache.has('b')).toBe(false);

            const stats = cache.stats();
            expect(stats.size).toBe(0);
            expect(stats.hits).toBe(0);
        });
    });

    describe('stats', () => {
        test('tracks hits and misses', () => {
            cache.set('a', 1);
            cache.get('a');     // hit
            cache.get('a');     // hit
            cache.get('miss');  // miss

            const stats = cache.stats();
            expect(stats.name).toBe('test');
            expect(stats.hits).toBe(2);
            expect(stats.misses).toBe(1);
            expect(stats.hitRate).toBe('66.7%');
            expect(stats.size).toBe(1);
            expect(stats.maxSize).toBe(3);
        });

        test('returns 0% hit rate with no accesses', () => {
            const stats = cache.stats();
            expect(stats.hitRate).toBe('0%');
        });
    });
});
