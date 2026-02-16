/**
 * City Validator — Unit Tests
 */

const {
    validateCity,
    validateAtlasRule,
    checkRepetition,
    fullValidation,
    getLastLetter,
    getHints
} = require('../src/services/cityValidator');

describe('validateCity', () => {
    test('accepts a valid city', () => {
        const result = validateCity('Tokyo');
        expect(result.valid).toBe(true);
        expect(result.city.name).toBe('Tokyo');
        expect(result.city.country).toBe('Japan');
    });

    test('accepts case-insensitive input', () => {
        expect(validateCity('PARIS').valid).toBe(true);
        expect(validateCity('london').valid).toBe(true);
        expect(validateCity('New Delhi').valid).toBe(true);
    });

    test('rejects empty input', () => {
        expect(validateCity('').valid).toBe(false);
        expect(validateCity(null).valid).toBe(false);
        expect(validateCity(undefined).valid).toBe(false);
    });

    test('rejects unknown cities', () => {
        const result = validateCity('Xyzville');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('not recognized');
    });

    test('rejects invalid characters', () => {
        expect(validateCity('Tokyo<script>').valid).toBe(false);
        expect(validateCity('Paris123').valid).toBe(false);
    });

    test('rejects very short names', () => {
        expect(validateCity('A').valid).toBe(false);
    });
});

describe('validateAtlasRule', () => {
    test('first city is always valid', () => {
        const result = validateAtlasRule(null, 'Tokyo');
        expect(result.valid).toBe(true);
    });

    test('accepts correct letter chain', () => {
        // Tokyo ends with 'o', Oslo starts with 'o'
        expect(validateAtlasRule('Tokyo', 'Oslo').valid).toBe(true);
    });

    test('rejects wrong starting letter', () => {
        const result = validateAtlasRule('Tokyo', 'Paris');
        expect(result.valid).toBe(false);
        expect(result.requiredLetter).toBe('O');
    });

    test('handles cities ending with non-alpha characters', () => {
        const result = getLastLetter('test');
        expect(result).toBe('t');
    });
});

describe('checkRepetition', () => {
    test('allows new city', () => {
        expect(checkRepetition('Tokyo', ['paris', 'oslo']).valid).toBe(true);
    });

    test('rejects already used city', () => {
        expect(checkRepetition('Tokyo', ['tokyo', 'paris']).valid).toBe(false);
    });

    test('case insensitive check', () => {
        expect(checkRepetition('TOKYO', ['tokyo']).valid).toBe(false);
    });
});

describe('fullValidation', () => {
    test('validates complete chain correctly', () => {
        // First city
        const r1 = fullValidation('Tokyo', null, []);
        expect(r1.valid).toBe(true);

        // Second city: Tokyo -> Oslo (o->o)
        const r2 = fullValidation('Oslo', 'Tokyo', ['tokyo']);
        expect(r2.valid).toBe(true);

        // Third city: Oslo -> Osaka (o->o)
        const r3 = fullValidation('Osaka', 'Oslo', ['tokyo', 'oslo']);
        expect(r3.valid).toBe(true);
    });

    test('rejects when all rules fail', () => {
        const result = fullValidation('Xyznotreal', 'Tokyo', []);
        expect(result.valid).toBe(false);
    });
});

describe('getHints', () => {
    test('returns cities starting with given letter', () => {
        const hints = getHints('t', [], 3);
        expect(hints.length).toBeGreaterThan(0);
        hints.forEach(h => expect(h[0].toLowerCase()).toBe('t'));
    });

    test('excludes used cities', () => {
        const hints = getHints('t', ['tokyo'], 5);
        const lower = hints.map(h => h.toLowerCase());
        expect(lower).not.toContain('tokyo');
    });

    test('returns empty for no letter', () => {
        expect(getHints('', []).length).toBe(0);
    });
});

describe('getLastLetter', () => {
    test('returns last alphabetic character', () => {
        expect(getLastLetter('tokyo')).toBe('o');
        expect(getLastLetter('paris')).toBe('s');
        expect(getLastLetter('new york')).toBe('k');
    });
});
