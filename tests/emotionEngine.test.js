/**
 * Emotion Engine — Unit Tests
 * Includes edge cases: NaN, undefined dimensions, extreme values
 */

const {
    mergeEmotions,
    getDominantEmotion,
    getDefaultProfile,
    getEmotionColor,
    EMOTION_DIMENSIONS,
} = require('../src/services/emotionEngine');

describe('mergeEmotions', () => {
    const baseEmotions = {
        warmth: 0.5,
        loneliness: 0.5,
        tension: 0.5,
        nostalgia: 0.5,
        belonging: 0.5,
    };

    test('blends new emotions with existing profile', () => {
        const newEmotions = {
            warmth: 1.0,
            loneliness: 0.0,
            tension: 0.0,
            nostalgia: 0.0,
            belonging: 1.0,
        };

        const merged = mergeEmotions(baseEmotions, newEmotions, 0);

        expect(merged.warmth).toBeGreaterThan(0.5);
        expect(merged.loneliness).toBeLessThan(0.5);
        expect(merged.belonging).toBeGreaterThan(0.5);
    });

    test('stabilises with more visits', () => {
        const newEmotions = { warmth: 1.0, loneliness: 0, tension: 0, nostalgia: 0, belonging: 0 };

        const mergedEarly = mergeEmotions(baseEmotions, newEmotions, 1);
        const mergedLate = mergeEmotions(baseEmotions, newEmotions, 100);

        expect(mergedEarly.warmth - 0.5).toBeGreaterThan(mergedLate.warmth - 0.5);
    });

    test('values stay within 0-1 range', () => {
        const extreme = { warmth: 999, loneliness: -5, tension: 1.5, nostalgia: 0, belonging: 0.5 };
        const merged = mergeEmotions(baseEmotions, extreme, 0);

        Object.values(merged).forEach(v => {
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThanOrEqual(1);
        });
    });

    test('handles missing dimensions gracefully', () => {
        const partial = { warmth: 0.8 };
        const merged = mergeEmotions(baseEmotions, partial, 0);

        expect(merged.warmth).toBeDefined();
        expect(merged.loneliness).toBeDefined();
        EMOTION_DIMENSIONS.forEach(dim => {
            expect(typeof merged[dim]).toBe('number');
        });
    });

    test('handles NaN input values', () => {
        const nanEmotions = { warmth: NaN, loneliness: NaN, tension: NaN, nostalgia: NaN, belonging: NaN };
        const merged = mergeEmotions(baseEmotions, nanEmotions, 0);

        Object.values(merged).forEach(v => {
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThanOrEqual(1);
            expect(isNaN(v)).toBe(false);
        });
    });

    test('handles undefined base emotions', () => {
        const result = mergeEmotions({}, { warmth: 0.8 }, 0);
        expect(typeof result.warmth).toBe('number');
        expect(result.warmth).toBeGreaterThanOrEqual(0);
    });

    test('handles string number values', () => {
        const stringEmotions = { warmth: '0.7', loneliness: '0.3', tension: '0.5', nostalgia: '0.2', belonging: '0.8' };
        const merged = mergeEmotions(baseEmotions, stringEmotions, 0);

        Object.values(merged).forEach(v => {
            expect(typeof v).toBe('number');
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThanOrEqual(1);
        });
    });

    test('learning rate converges over many visits', () => {
        const result0 = mergeEmotions(baseEmotions, { warmth: 1.0, loneliness: 0, tension: 0, nostalgia: 0, belonging: 0 }, 0);
        const result50 = mergeEmotions(baseEmotions, { warmth: 1.0, loneliness: 0, tension: 0, nostalgia: 0, belonging: 0 }, 50);
        const result200 = mergeEmotions(baseEmotions, { warmth: 1.0, loneliness: 0, tension: 0, nostalgia: 0, belonging: 0 }, 200);

        const diff0 = result0.warmth - 0.5;
        const diff50 = result50.warmth - 0.5;
        const diff200 = result200.warmth - 0.5;

        expect(diff0).toBeGreaterThan(diff50);
        expect(diff50).toBeGreaterThan(diff200);
    });
});

describe('getDominantEmotion', () => {
    test('identifies the strongest emotion', () => {
        expect(getDominantEmotion({ warmth: 0.9, loneliness: 0.1, tension: 0.1, nostalgia: 0.1, belonging: 0.1 }))
            .toBe('warmth');

        expect(getDominantEmotion({ warmth: 0.1, loneliness: 0.8, tension: 0.1, nostalgia: 0.1, belonging: 0.1 }))
            .toBe('loneliness');

        expect(getDominantEmotion({ warmth: 0.1, loneliness: 0.1, tension: 0.1, nostalgia: 0.1, belonging: 0.9 }))
            .toBe('belonging');
    });

    test('returns first highest on tie', () => {
        const result = getDominantEmotion({ warmth: 0.5, loneliness: 0.5, tension: 0.5, nostalgia: 0.5, belonging: 0.5 });
        expect(typeof result).toBe('string');
        expect(EMOTION_DIMENSIONS).toContain(result);
    });

    test('handles zero values', () => {
        const result = getDominantEmotion({ warmth: 0, loneliness: 0, tension: 0, nostalgia: 0, belonging: 0 });
        expect(typeof result).toBe('string');
    });

    test('handles empty object', () => {
        const result = getDominantEmotion({});
        expect(typeof result).toBe('string');
    });
});

describe('getDefaultProfile', () => {
    test('returns neutral balanced profile', () => {
        const profile = getDefaultProfile();
        expect(profile.visitCount).toBe(0);
        expect(profile.emotions.warmth).toBe(0.5);
        expect(profile.dominantEmotion).toBe('neutral');
    });

    test('has all emotion dimensions', () => {
        const profile = getDefaultProfile();
        EMOTION_DIMENSIONS.forEach(dim => {
            expect(profile.emotions).toHaveProperty(dim);
            expect(profile.emotions[dim]).toBe(0.5);
        });
    });

    test('returns a new object each call (no mutation risk)', () => {
        const p1 = getDefaultProfile();
        const p2 = getDefaultProfile();
        p1.emotions.warmth = 0.9;
        expect(p2.emotions.warmth).toBe(0.5);
    });
});

describe('getEmotionColor', () => {
    test('returns HSL color for known emotions', () => {
        EMOTION_DIMENSIONS.forEach(dim => {
            const color = getEmotionColor(dim);
            expect(color).toContain('hsl');
        });
    });

    test('returns neutral for unknown emotion', () => {
        const color = getEmotionColor('unknown');
        expect(color).toContain('hsl');
        expect(color).toBe(getEmotionColor('neutral'));
    });

    test('returns neutral for undefined', () => {
        expect(getEmotionColor(undefined)).toContain('hsl');
    });

    test('returns neutral for null', () => {
        expect(getEmotionColor(null)).toContain('hsl');
    });
});
