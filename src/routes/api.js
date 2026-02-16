/**
 * API Routes
 * RESTful endpoints for the Atlas game.
 * Includes input validation, caching, structured logging,
 * TTS narration, translation, and sentiment analysis.
 * @module routes/api
 */

const express = require('express');

const router = express.Router();
const { fullValidation, getHints } = require('../services/countryValidator');
const { generateScenario } = require('../services/scenarioGenerator');
const { getCountryProfile, updateCountryProfile, getAllCountryProfiles, getEmotionColor } = require('../services/emotionEngine');
const { searchCountries } = require('../data/countries');
const { synthesizeSpeech } = require('../services/ttsService');
const { translateText, getSupportedLanguages } = require('../services/translationService');
const { extractEmotions } = require('../services/sentimentService');
const { logger } = require('../utils/logger');
const { countrySearchCache, countryProfileCache, worldMapCache, scenarioCache } = require('../utils/cache');
const { validateBody, validateQuery } = require('../middleware/inputValidator');
const { ValidationError, NotFoundError, ServiceUnavailableError } = require('../utils/AppError');

// ─── Validation Schemas ───────────────────
const validateCountrySchema = {
    country: { type: 'string', required: true, minLength: 1, maxLength: 100 },
};

const generateScenarioSchema = {
    country: { type: 'string', required: true, minLength: 1, maxLength: 100 },
};

const submitChoiceSchema = {
    country: { type: 'string', required: true, minLength: 1, maxLength: 100 },
    choiceId: { type: 'string', required: true },
    emotions: { type: 'object', required: true },
};

const narrateSchema = {
    text: { type: 'string', required: true, minLength: 1, maxLength: 1000 },
};

const translateSchema = {
    text: { type: 'string', required: true, minLength: 1, maxLength: 2000 },
    targetLang: { type: 'string', required: true, minLength: 2, maxLength: 5 },
};

const sentimentSchema = {
    text: { type: 'string', required: true, minLength: 1, maxLength: 2000 },
};

// ─── Country Validation ──────────────────────
/**
 * POST /api/validate-country
 * Validate a country name against Atlas rules (letter chain, uniqueness).
 */
router.post('/validate-country', validateBody(validateCountrySchema), (req, res, next) => {
    try {
        const { country, previousCountry, usedCountries } = req.body;

        const result = fullValidation(country, previousCountry, usedCountries || []);

        if (!result.valid) {
            const requiredLetter = result.requiredLetter || null;
            const hints = requiredLetter ? getHints(requiredLetter.toLowerCase(), usedCountries || []) : [];
            return res.json({ ...result, hints });
        }

        return res.json(result);
    } catch (error) {
        next(error);
    }
});

// ─── Scenario Generation ──────────────────
/**
 * POST /api/generate-scenario
 * Generate an AI-powered scenario for a country (cached per country for 5 minutes).
 */
router.post('/generate-scenario', validateBody(generateScenarioSchema), async (req, res, next) => {
    try {
        const { country, capital, lat, lng, continent, region } = req.body;

        // Check scenario cache first
        const cacheKey = `scenario_${country.toLowerCase()}`;

        const profile = await getCountryProfile(country);
        const emotionProfile = profile?.emotions || null;

        const scenario = await scenarioCache.getOrSet(cacheKey, () =>
            generateScenario(
                { name: country, capital: capital || 'Unknown', lat: lat || 0, lng: lng || 0, continent: continent || 'Unknown', region: region || 'Unknown' },
                emotionProfile,
            ),
        );

        logger.info('Scenario generated', { country, cached: scenarioCache.has(cacheKey), requestId: req.id });

        return res.json({
            ...scenario,
            existingProfile: profile ? {
                emotions: profile.emotions,
                visitCount: profile.visitCount,
                dominantEmotion: profile.dominantEmotion,
            } : null,
        });
    } catch (error) {
        next(error);
    }
});

// ─── Submit Choice ────────────────────────
/**
 * POST /api/submit-choice
 * Process a player's choice and update the country's emotional profile.
 */
router.post('/submit-choice', validateBody(submitChoiceSchema), async (req, res, next) => {
    try {
        const { country, capital, lat, lng, choiceId, emotions } = req.body;

        const updatedProfile = await updateCountryProfile(
            country,
            emotions,
            { name: country, capital, lat, lng },
        );

        // Invalidate caches
        countryProfileCache.delete(country.toLowerCase());
        worldMapCache.clear();
        scenarioCache.delete(`scenario_${country.toLowerCase()}`);

        logger.info('Choice submitted', { country, choiceId, dominant: updatedProfile.dominantEmotion, requestId: req.id });

        return res.json({
            success: true,
            profile: updatedProfile,
            emotionColor: getEmotionColor(updatedProfile.dominantEmotion),
        });
    } catch (error) {
        next(error);
    }
});

// ─── Country Profile ─────────────────────────
/**
 * GET /api/country-profile/:country
 * Get the emotional profile of a specific country (cached).
 */
router.get('/country-profile/:country', async (req, res, next) => {
    try {
        const countryName = decodeURIComponent(req.params.country);
        const cacheKey = countryName.toLowerCase();

        const response = await countryProfileCache.getOrSet(cacheKey, async () => {
            const profile = await getCountryProfile(countryName);

            if (!profile) {
                return { exists: false, country: countryName };
            }

            return {
                exists: true,
                ...profile,
                emotionColor: getEmotionColor(profile.dominantEmotion),
            };
        });

        return res.json(response);
    } catch (error) {
        next(error);
    }
});

// ─── World Map ────────────────────────────
/**
 * GET /api/world-map
 * Get all countries with emotional data for atlas visualization (cached).
 */
router.get('/world-map', async (req, res, next) => {
    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 500, 1000);
        const cacheKey = `worldmap_${limit}`;

        const response = await worldMapCache.getOrSet(cacheKey, async () => {
            const countries = await getAllCountryProfiles(limit);
            return {
                count: countries.length,
                countries: countries.map((c) => ({
                    name: c.name,
                    capital: c.capital,
                    lat: c.lat,
                    lng: c.lng,
                    emotions: c.emotions,
                    dominantEmotion: c.dominantEmotion,
                    visitCount: c.visitCount,
                    color: getEmotionColor(c.dominantEmotion),
                })),
            };
        });

        return res.json(response);
    } catch (error) {
        next(error);
    }
});

// ─── Country Search ──────────────────────────
/**
 * GET /api/search-countries
 * Autocomplete country search (cached).
 */
router.get('/search-countries', (req, res, next) => {
    try {
        const q = (req.query.q || '').trim();
        if (q.length < 1) {
            return res.json({ results: [] });
        }

        const cacheKey = `search_${q.toLowerCase()}`;
        const response = countrySearchCache.getOrSet(cacheKey, () => {
            const results = searchCountries(q, 8);
            return { results };
        });

        // getOrSet may be sync for sync fn — handle both
        if (response instanceof Promise) {
            return response.then((r) => res.json(r)).catch(next);
        }
        return res.json(response);
    } catch (error) {
        next(error);
    }
});

// ─── TTS Narration ────────────────────────
/**
 * POST /api/narrate
 * Generate TTS audio narration for scenario text.
 */
router.post('/narrate', validateBody(narrateSchema), async (req, res, next) => {
    try {
        const { text, tone } = req.body;

        const audio = await synthesizeSpeech(text, tone || 'neutral');

        if (!audio) {
            return res.json({ available: false, message: 'TTS is not available.' });
        }

        logger.info('Narration generated', { textLength: text.length, tone, requestId: req.id });

        return res.json({
            available: true,
            audioBase64: audio.audioBase64,
            durationEstimate: audio.durationEstimate,
        });
    } catch (error) {
        next(error);
    }
});

// ─── Translation ──────────────────────────
/**
 * POST /api/translate
 * Translate scenario text to a target language.
 */
router.post('/translate', validateBody(translateSchema), async (req, res, next) => {
    try {
        const { text, targetLang } = req.body;

        const result = await translateText(text, targetLang);

        if (!result) {
            return res.json({
                available: false,
                message: 'Translation service is not available.',
                supportedLanguages: getSupportedLanguages(),
            });
        }

        logger.info('Translation complete', {
            targetLang,
            sourceLength: text.length,
            requestId: req.id,
        });

        return res.json({
            available: true,
            translatedText: result.translatedText,
            detectedSourceLang: result.detectedSourceLang,
            targetLang,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/supported-languages
 * Get list of supported translation languages.
 */
router.get('/supported-languages', (_req, res) => {
    res.json({ languages: getSupportedLanguages() });
});

// ─── Sentiment Analysis ───────────────────
/**
 * POST /api/analyze-sentiment
 * Analyze text sentiment and map to game emotion vector.
 */
router.post('/analyze-sentiment', validateBody(sentimentSchema), async (req, res, next) => {
    try {
        const { text } = req.body;

        const result = await extractEmotions(text);

        if (!result) {
            return res.json({
                available: false,
                message: 'Sentiment analysis is not available.',
            });
        }

        logger.info('Sentiment analyzed', {
            score: result.sentiment.score,
            magnitude: result.sentiment.magnitude,
            requestId: req.id,
        });

        return res.json({
            available: true,
            sentiment: result.sentiment,
            emotions: result.emotions,
        });
    } catch (error) {
        next(error);
    }
});

// ─── Health Check ─────────────────────────
/**
 * GET /api/health
 * Health check endpoint with system info.
 */
router.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.round(process.uptime()),
        memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        services: ['gemini', 'firestore', 'cloud-logging', 'text-to-speech', 'translation', 'natural-language'],
    });
});

// ─── Cache Stats ──────────────────────────
/**
 * GET /api/cache-stats
 * Get cache performance statistics (debug).
 */
router.get('/cache-stats', (_req, res) => {
    res.json({
        countrySearch: countrySearchCache.stats(),
        countryProfile: countryProfileCache.stats(),
        worldMap: worldMapCache.stats(),
        scenario: scenarioCache.stats(),
    });
});

module.exports = router;
