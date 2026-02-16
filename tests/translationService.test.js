/**
 * Tests for Translation Service
 * Tests Google Cloud Translation API integration with mocked client.
 */

// Mock @google-cloud/translate
const mockTranslate = jest.fn();
jest.mock('@google-cloud/translate', () => ({
    v2: {
        Translate: jest.fn().mockImplementation(() => ({
            translate: mockTranslate,
        })),
    },
}));

// Mock logger
jest.mock('../src/utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

// Fresh module per test
let translationService;
beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    // Force re-require to reset isInitialized
    jest.isolateModules(() => {
        translationService = require('../src/services/translationService');
    });
});

describe('Translation Service', () => {
    describe('translateText', () => {
        test('translates text to target language', async () => {
            mockTranslate.mockResolvedValueOnce([
                'Hola mundo',
                { data: { translations: [{ detectedSourceLanguage: 'en' }] } },
            ]);

            const result = await translationService.translateText('Hello world', 'es');

            expect(result).toBeTruthy();
            expect(result.translatedText).toBe('Hola mundo');
            expect(result.detectedSourceLang).toBe('en');
        });

        test('returns null for empty text', async () => {
            const result = await translationService.translateText('', 'es');
            expect(result).toBeNull();
        });

        test('returns null for null text', async () => {
            const result = await translationService.translateText(null, 'es');
            expect(result).toBeNull();
        });

        test('returns null for whitespace-only text', async () => {
            const result = await translationService.translateText('   ', 'es');
            expect(result).toBeNull();
        });

        test('returns null for unsupported language', async () => {
            const result = await translationService.translateText('Hello', 'xx');
            expect(result).toBeNull();
        });

        test('returns null for missing language', async () => {
            const result = await translationService.translateText('Hello', '');
            expect(result).toBeNull();
        });

        test('truncates text longer than 2000 characters', async () => {
            const longText = 'a'.repeat(3000);
            mockTranslate.mockResolvedValueOnce([
                'translated',
                { data: { translations: [{ detectedSourceLanguage: 'en' }] } },
            ]);

            await translationService.translateText(longText, 'fr');

            expect(mockTranslate).toHaveBeenCalledWith(
                expect.any(String),
                'fr',
            );
            const calledWith = mockTranslate.mock.calls[0][0];
            expect(calledWith.length).toBeLessThanOrEqual(2000);
        });

        test('handles API error gracefully', async () => {
            mockTranslate.mockRejectedValueOnce(new Error('API quota exceeded'));

            const result = await translationService.translateText('Hello', 'es');
            expect(result).toBeNull();
        });

        test('handles missing metadata gracefully', async () => {
            mockTranslate.mockResolvedValueOnce(['Translated text', {}]);

            const result = await translationService.translateText('Hello', 'fr');
            expect(result).toBeTruthy();
            expect(result.translatedText).toBe('Translated text');
            expect(result.detectedSourceLang).toBe('en');
        });
    });

    describe('getSupportedLanguages', () => {
        test('returns array of language codes', () => {
            const langs = translationService.getSupportedLanguages();
            expect(Array.isArray(langs)).toBe(true);
            expect(langs.length).toBeGreaterThan(0);
            expect(langs).toContain('en');
            expect(langs).toContain('es');
            expect(langs).toContain('fr');
        });
    });

    describe('SUPPORTED_LANGUAGES', () => {
        test('is a Set', () => {
            expect(translationService.SUPPORTED_LANGUAGES).toBeInstanceOf(Set);
        });

        test('contains expected languages', () => {
            expect(translationService.SUPPORTED_LANGUAGES.has('en')).toBe(true);
            expect(translationService.SUPPORTED_LANGUAGES.has('ja')).toBe(true);
            expect(translationService.SUPPORTED_LANGUAGES.has('ko')).toBe(true);
            expect(translationService.SUPPORTED_LANGUAGES.has('hi')).toBe(true);
        });

        test('does not contain invalid codes', () => {
            expect(translationService.SUPPORTED_LANGUAGES.has('xx')).toBe(false);
            expect(translationService.SUPPORTED_LANGUAGES.has('')).toBe(false);
        });
    });
});
