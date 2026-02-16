/**
 * Google Cloud Translation Service
 * Translates scenario text into the player's preferred language.
 * Uses Google Cloud Translation API v2 with lazy initialization.
 * @module services/translationService
 */

const { logger } = require('../utils/logger');

/** @type {import('@google-cloud/translate').v2.Translate|null} */
let translateClient = null;
let isInitialized = false;

/**
 * Supported language codes for translation.
 * @type {Set<string>}
 */
const SUPPORTED_LANGUAGES = new Set([
    'en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh', 'ar',
    'hi', 'ru', 'nl', 'sv', 'pl', 'tr', 'th', 'vi', 'id', 'bn',
]);

/**
 * Initialize the Translation client lazily.
 * @returns {import('@google-cloud/translate').v2.Translate|null}
 */
function initTranslation() {
    if (isInitialized) return translateClient;

    try {
        const { Translate } = require('@google-cloud/translate').v2;
        translateClient = new Translate();
        isInitialized = true;
        logger.info('Translation client initialized');
        return translateClient;
    } catch (err) {
        logger.warn('Translation service unavailable', { error: err.message });
        isInitialized = true;
        return null;
    }
}

/**
 * Translate text to a target language.
 * @param {string} text - Source text to translate
 * @param {string} targetLang - BCP-47 language code (e.g. 'es', 'fr')
 * @returns {Promise<{ translatedText: string, detectedSourceLang: string }|null>}
 */
async function translateText(text, targetLang) {
    const client = initTranslation();

    if (!client) {
        logger.debug('Translation skipped — client unavailable');
        return null;
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        logger.warn('Translation skipped — empty text');
        return null;
    }

    if (!targetLang || !SUPPORTED_LANGUAGES.has(targetLang)) {
        logger.warn('Translation skipped — unsupported language', { targetLang });
        return null;
    }

    // Limit text length to avoid excessive API cost
    const cleanText = text.trim().slice(0, 2000);

    try {
        const [translation, metadata] = await client.translate(cleanText, targetLang);

        logger.info('Translation complete', {
            targetLang,
            sourceLength: cleanText.length,
            translatedLength: translation.length,
        });

        return {
            translatedText: translation,
            detectedSourceLang: metadata?.data?.translations?.[0]?.detectedSourceLanguage || 'en',
        };
    } catch (err) {
        logger.error('Translation failed', { error: err.message, targetLang });
        return null;
    }
}

/**
 * Get the list of supported language codes.
 * @returns {string[]}
 */
function getSupportedLanguages() {
    return [...SUPPORTED_LANGUAGES];
}

module.exports = { translateText, initTranslation, getSupportedLanguages, SUPPORTED_LANGUAGES };
