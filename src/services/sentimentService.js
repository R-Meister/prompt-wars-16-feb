/**
 * Google Cloud Natural Language — Sentiment Analysis Service
 * Analyzes scenario text sentiment and maps it to the game's emotion vector.
 * Uses Google Cloud Natural Language API with lazy initialization.
 * @module services/sentimentService
 */

const { logger } = require('../utils/logger');

/** @type {import('@google-cloud/language').LanguageServiceClient|null} */
let nlClient = null;
let isInitialized = false;

/**
 * Initialize the Natural Language client lazily.
 * @returns {import('@google-cloud/language').LanguageServiceClient|null}
 */
function initNaturalLanguage() {
    if (isInitialized) return nlClient;

    try {
        const language = require('@google-cloud/language');
        nlClient = new language.LanguageServiceClient();
        isInitialized = true;
        logger.info('Natural Language client initialized');
        return nlClient;
    } catch (err) {
        logger.warn('Natural Language service unavailable', { error: err.message });
        isInitialized = true;
        return null;
    }
}

/**
 * Analyze sentiment of text.
 * @param {string} text - Text to analyze
 * @returns {Promise<{ score: number, magnitude: number }|null>}
 *   score: -1.0 (negative) to 1.0 (positive)
 *   magnitude: 0+ (strength of sentiment)
 */
async function analyzeSentiment(text) {
    const client = initNaturalLanguage();

    if (!client) {
        logger.debug('Sentiment analysis skipped — client unavailable');
        return null;
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        logger.warn('Sentiment analysis skipped — empty text');
        return null;
    }

    const cleanText = text.trim().slice(0, 2000);

    try {
        const [result] = await client.analyzeSentiment({
            document: {
                content: cleanText,
                type: 'PLAIN_TEXT',
            },
        });

        const sentiment = result.documentSentiment;

        logger.info('Sentiment analysis complete', {
            score: sentiment.score,
            magnitude: sentiment.magnitude,
            textLength: cleanText.length,
        });

        return {
            score: sentiment.score,
            magnitude: sentiment.magnitude,
        };
    } catch (err) {
        logger.error('Sentiment analysis failed', { error: err.message });
        return null;
    }
}

/**
 * Map NLP sentiment to the game's 5-emotion vector.
 * Uses sentiment score (valence) and magnitude (intensity) to derive
 * a weighted distribution across warmth, loneliness, tension, nostalgia, belonging.
 *
 * @param {number} score - Sentiment score (-1.0 to 1.0)
 * @param {number} magnitude - Sentiment magnitude (0+)
 * @returns {{ warmth: number, loneliness: number, tension: number, nostalgia: number, belonging: number }}
 */
function mapSentimentToEmotions(score, magnitude) {
    // Normalize magnitude to 0–1 range (cap at 3.0)
    const intensity = Math.min(magnitude / 3.0, 1.0);

    // Base distribution — starts equal
    const emotions = {
        warmth: 0.2,
        loneliness: 0.2,
        tension: 0.2,
        nostalgia: 0.2,
        belonging: 0.2,
    };

    if (score > 0.3) {
        // Positive — boost warmth and belonging
        emotions.warmth += 0.25 * intensity;
        emotions.belonging += 0.2 * intensity;
        emotions.nostalgia += 0.05 * intensity;
        emotions.tension -= 0.15 * intensity;
        emotions.loneliness -= 0.15 * intensity;
    } else if (score < -0.3) {
        // Negative — boost tension and loneliness
        emotions.tension += 0.25 * intensity;
        emotions.loneliness += 0.2 * intensity;
        emotions.warmth -= 0.15 * intensity;
        emotions.belonging -= 0.15 * intensity;
    } else {
        // Neutral/mixed — boost nostalgia (reflective)
        emotions.nostalgia += 0.2 * intensity;
        emotions.warmth += 0.05 * intensity;
        emotions.loneliness += 0.05 * intensity;
    }

    // Clamp to [0, 1] and normalize to sum ≈ 1
    const keys = Object.keys(emotions);
    keys.forEach(k => { emotions[k] = Math.max(0, Math.min(1, emotions[k])); });

    const total = keys.reduce((sum, k) => sum + emotions[k], 0);
    if (total > 0) {
        keys.forEach(k => { emotions[k] = Math.round((emotions[k] / total) * 100) / 100; });
    }

    return emotions;
}

/**
 * Analyze text and return game emotion vector.
 * @param {string} text - Text to analyze
 * @returns {Promise<{ emotions: Object, sentiment: { score: number, magnitude: number } }|null>}
 */
async function extractEmotions(text) {
    const sentiment = await analyzeSentiment(text);

    if (!sentiment) return null;

    const emotions = mapSentimentToEmotions(sentiment.score, sentiment.magnitude);

    return { emotions, sentiment };
}

module.exports = {
    analyzeSentiment,
    extractEmotions,
    mapSentimentToEmotions,
    initNaturalLanguage,
};
