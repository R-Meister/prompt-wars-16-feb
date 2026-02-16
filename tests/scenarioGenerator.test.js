/**
 * Scenario Generator — Unit Tests
 * Tests normalizeEmotions, isValidScenario, sanitizeText, getFallbackScenario
 */

const {
    normalizeEmotions,
    isValidScenario,
    getFallbackScenario,
    sanitizeText,
    EMOTION_DIMENSIONS,
} = require('../src/services/scenarioGenerator');

describe('normalizeEmotions', () => {
    test('normalizes values within 0-1 range', () => {
        const result = normalizeEmotions({
            warmth: 0.5,
            loneliness: 0.8,
            tension: 0.2,
            nostalgia: 0.6,
            belonging: 0.3,
        });

        Object.values(result).forEach(v => {
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThanOrEqual(1);
        });
    });

    test('clamps values above 1', () => {
        const result = normalizeEmotions({
            warmth: 5.0,
            loneliness: 1.5,
            tension: 100,
            nostalgia: 0.5,
            belonging: 0.5,
        });

        expect(result.warmth).toBe(1);
        expect(result.loneliness).toBe(1);
        expect(result.tension).toBe(1);
    });

    test('clamps values below 0', () => {
        const result = normalizeEmotions({
            warmth: -1,
            loneliness: -10,
            tension: 0,
            nostalgia: 0.5,
            belonging: 0.5,
        });

        expect(result.warmth).toBe(0);
        expect(result.loneliness).toBe(0);
    });

    test('handles missing dimensions with default 0', () => {
        const result = normalizeEmotions({ warmth: 0.8 });

        expect(result.warmth).toBe(0.8);
        expect(result.loneliness).toBe(0);
        expect(result.tension).toBe(0);
    });

    test('handles NaN values', () => {
        const result = normalizeEmotions({
            warmth: NaN,
            loneliness: 'not a number',
            tension: undefined,
            nostalgia: null,
            belonging: '',
        });

        Object.values(result).forEach(v => {
            expect(v).toBe(0);
        });
    });

    test('preserves all EMOTION_DIMENSIONS', () => {
        const result = normalizeEmotions({});
        for (const dim of EMOTION_DIMENSIONS) {
            expect(result).toHaveProperty(dim);
        }
    });
});

describe('isValidScenario', () => {
    const validScenario = {
        scenario: 'A test scenario in Tokyo.',
        choices: [
            { text: 'Choice A text', emotions: { warmth: 0.5 } },
            { text: 'Choice B text', emotions: { warmth: 0.3 } },
        ],
        tone: 'warm',
    };

    test('accepts valid scenario', () => {
        expect(isValidScenario(validScenario)).toBe(true);
    });

    test('rejects null', () => {
        expect(isValidScenario(null)).toBeFalsy();
    });

    test('rejects undefined', () => {
        expect(isValidScenario(undefined)).toBeFalsy();
    });

    test('rejects empty scenario text', () => {
        expect(isValidScenario({ ...validScenario, scenario: '' })).toBe(false);
    });

    test('rejects missing choices', () => {
        expect(isValidScenario({ scenario: 'test' })).toBe(false);
    });

    test('rejects wrong number of choices', () => {
        expect(isValidScenario({
            scenario: 'test',
            choices: [{ text: 'A', emotions: {} }],
        })).toBe(false);
    });

    test('rejects choices with empty text', () => {
        expect(isValidScenario({
            scenario: 'test',
            choices: [
                { text: '', emotions: {} },
                { text: 'B', emotions: {} },
            ],
        })).toBe(false);
    });

    test('rejects choices without emotions', () => {
        expect(isValidScenario({
            scenario: 'test',
            choices: [
                { text: 'A' },
                { text: 'B', emotions: {} },
            ],
        })).toBe(false);
    });

    test('rejects non-object input', () => {
        expect(isValidScenario('string')).toBe(false);
        expect(isValidScenario(42)).toBe(false);
        expect(isValidScenario([])).toBe(false);
    });
});

describe('sanitizeText', () => {
    test('removes HTML tags', () => {
        expect(sanitizeText('Hello <b>world</b>')).toBe('Hello world');
    });

    test('removes dangerous characters', () => {
        expect(sanitizeText('test@#$%')).not.toContain('@');
        expect(sanitizeText('test@#$%')).not.toContain('#');
    });

    test('preserves safe characters', () => {
        const safe = "Hello, World! It's a test.";
        expect(sanitizeText(safe)).toBe(safe);
    });

    test('returns empty string for non-string input', () => {
        expect(sanitizeText(null)).toBe('');
        expect(sanitizeText(undefined)).toBe('');
        expect(sanitizeText(42)).toBe('');
    });

    test('truncates to 500 characters max', () => {
        const long = 'A'.repeat(600);
        expect(sanitizeText(long).length).toBeLessThanOrEqual(500);
    });

    test('trims whitespace', () => {
        expect(sanitizeText('  hello  ')).toBe('hello');
    });
});

describe('getFallbackScenario', () => {
    const city = { name: 'Tokyo', country: 'Japan', lat: 35.68, lng: 139.76 };

    test('returns a valid scenario object', () => {
        const result = getFallbackScenario(city);

        expect(result.city).toBe('Tokyo');
        expect(result.country).toBe('Japan');
        expect(result.scenario).toBeDefined();
        expect(result.choices).toHaveLength(2);
        expect(result.tone).toBeDefined();
        expect(result.generated).toBe(false);
    });

    test('choices have correct structure', () => {
        const result = getFallbackScenario(city);

        result.choices.forEach(choice => {
            expect(choice.id).toMatch(/^[AB]$/);
            expect(typeof choice.text).toBe('string');
            expect(choice.emotions).toBeDefined();
            expect(typeof choice.emotions.warmth).toBe('number');
        });
    });

    test('scenario contains city name', () => {
        const result = getFallbackScenario(city);
        expect(result.scenario).toContain('Tokyo');
    });

    test('emotion values are within 0-1 range', () => {
        const result = getFallbackScenario(city);
        result.choices.forEach(choice => {
            Object.values(choice.emotions).forEach(v => {
                expect(v).toBeGreaterThanOrEqual(0);
                expect(v).toBeLessThanOrEqual(1);
            });
        });
    });
});
