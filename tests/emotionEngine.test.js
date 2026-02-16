/**
 * Emotion Engine — Unit Tests
 */

const {
    mergeEmotions,
    getDominantEmotion,
    getDefaultProfile,
    getEmotionColor
} = require('../src/services/emotionEngine');

describe('mergeEmotions', () => {
    const baseEmotions = {
        warmth: 0.5,
        loneliness: 0.5,
        tension: 0.5,
        nostalgia: 0.5,
        belonging: 0.5
    };

    test('blends new emotions with existing profile', () => {
        const newEmotions = {
            warmth: 1.0,
            loneliness: 0.0,
            tension: 0.0,
            nostalgia: 0.0,
            belonging: 1.0
        };

        const merged = mergeEmotions(baseEmotions, newEmotions, 0);

        // With LEARNING_RATE of 0.15, new values should shift base toward new
        expect(merged.warmth).toBeGreaterThan(0.5);
        expect(merged.loneliness).toBeLessThan(0.5);
        expect(merged.belonging).toBeGreaterThan(0.5);
    });

    test('stabilizes with more visits', () => {
        const newEmotions = { warmth: 1.0, loneliness: 0, tension: 0, nostalgia: 0, belonging: 0 };

        const mergedEarly = mergeEmotions(baseEmotions, newEmotions, 1);
        const mergedLate = mergeEmotions(baseEmotions, newEmotions, 100);

        // Later visits should have less impact
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
    });
});

describe('getDominantEmotion', () => {
    test('identifies the strongest emotion', () => {
        expect(getDominantEmotion({ warmth: 0.9, loneliness: 0.1, tension: 0.1, nostalgia: 0.1, belonging: 0.1 }))
            .toBe('warmth');

        expect(getDominantEmotion({ warmth: 0.1, loneliness: 0.8, tension: 0.1, nostalgia: 0.1, belonging: 0.1 }))
            .toBe('loneliness');
    });

    test('returns first highest on tie', () => {
        const result = getDominantEmotion({ warmth: 0.5, loneliness: 0.5, tension: 0.5, nostalgia: 0.5, belonging: 0.5 });
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
});

describe('getEmotionColor', () => {
    test('returns HSL color for known emotions', () => {
        expect(getEmotionColor('warmth')).toContain('hsl');
        expect(getEmotionColor('loneliness')).toContain('hsl');
    });

    test('returns neutral for unknown emotion', () => {
        expect(getEmotionColor('unknown')).toContain('hsl');
    });
});
