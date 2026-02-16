/**
 * API Routes
 * RESTful endpoints for the Atlas game.
 * Includes caching, structured logging, and TTS narration.
 * @module routes/api
 */

const express = require('express');
const router = express.Router();
const { fullValidation, getHints } = require('../services/cityValidator');
const { generateScenario } = require('../services/scenarioGenerator');
const { getCityProfile, updateCityProfile, getAllCityProfiles, getEmotionColor } = require('../services/emotionEngine');
const { searchCities } = require('../data/cities');
const { synthesizeSpeech } = require('../services/ttsService');
const { logger } = require('../utils/logger');
const { citySearchCache, cityProfileCache, worldMapCache } = require('../utils/cache');

/**
 * POST /api/validate-city
 * Validate a city name against Atlas rules
 */
router.post('/validate-city', (req, res) => {
    try {
        const { city, previousCity, usedCities } = req.body;

        if (!city) {
            return res.status(400).json({ error: 'City name is required.' });
        }

        const result = fullValidation(city, previousCity, usedCities || []);

        if (!result.valid) {
            const requiredLetter = result.requiredLetter || null;
            const hints = requiredLetter ? getHints(requiredLetter.toLowerCase(), usedCities || []) : [];
            return res.json({ ...result, hints });
        }

        return res.json(result);
    } catch (error) {
        logger.error('validate-city failed', { error: error.message, requestId: req.id });
        return res.status(500).json({ error: 'Validation failed.' });
    }
});

/**
 * POST /api/generate-scenario
 * Generate an AI-powered scenario for a city
 */
router.post('/generate-scenario', async (req, res) => {
    try {
        const { city, country, lat, lng } = req.body;

        if (!city) {
            return res.status(400).json({ error: 'City information is required.' });
        }

        // Get existing emotional profile for this city
        const profile = await getCityProfile(city);
        const emotionProfile = profile?.emotions || null;

        const scenario = await generateScenario(
            { name: city, country: country || 'Unknown', lat: lat || 0, lng: lng || 0 },
            emotionProfile
        );

        logger.info('Scenario generated', { city, generated: scenario.generated, requestId: req.id });

        return res.json({
            ...scenario,
            existingProfile: profile ? {
                emotions: profile.emotions,
                visitCount: profile.visitCount,
                dominantEmotion: profile.dominantEmotion,
            } : null,
        });
    } catch (error) {
        logger.error('generate-scenario failed', { error: error.message, requestId: req.id });
        return res.status(500).json({ error: 'Scenario generation failed.' });
    }
});

/**
 * POST /api/submit-choice
 * Process a player's choice and update the city's emotional profile
 */
router.post('/submit-choice', async (req, res) => {
    try {
        const { city, country, lat, lng, choiceId, emotions } = req.body;

        if (!city || !emotions) {
            return res.status(400).json({ error: 'City and emotions are required.' });
        }

        const updatedProfile = await updateCityProfile(
            city,
            emotions,
            { name: city, country, lat, lng }
        );

        // Invalidate cached profile for this city
        cityProfileCache.delete(city.toLowerCase());
        worldMapCache.clear();

        logger.info('Choice submitted', { city, choiceId, dominant: updatedProfile.dominantEmotion, requestId: req.id });

        return res.json({
            success: true,
            profile: updatedProfile,
            emotionColor: getEmotionColor(updatedProfile.dominantEmotion),
        });
    } catch (error) {
        logger.error('submit-choice failed', { error: error.message, requestId: req.id });
        return res.status(500).json({ error: 'Choice submission failed.' });
    }
});

/**
 * GET /api/city-profile/:city
 * Get the emotional profile of a specific city (cached)
 */
router.get('/city-profile/:city', async (req, res) => {
    try {
        const cityName = decodeURIComponent(req.params.city);
        const cacheKey = cityName.toLowerCase();

        // Check cache first
        const cached = cityProfileCache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const profile = await getCityProfile(cityName);

        if (!profile) {
            const response = { exists: false, city: cityName };
            cityProfileCache.set(cacheKey, response);
            return res.json(response);
        }

        const response = {
            exists: true,
            ...profile,
            emotionColor: getEmotionColor(profile.dominantEmotion),
        };

        cityProfileCache.set(cacheKey, response);
        return res.json(response);
    } catch (error) {
        logger.error('city-profile failed', { error: error.message, requestId: req.id });
        return res.status(500).json({ error: 'Failed to fetch city profile.' });
    }
});

/**
 * GET /api/world-map
 * Get all cities with emotional data for map visualization (cached)
 */
router.get('/world-map', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 500, 1000);
        const cacheKey = `worldmap_${limit}`;

        // Check cache first
        const cached = worldMapCache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const cities = await getAllCityProfiles(limit);

        const response = {
            count: cities.length,
            cities: cities.map(c => ({
                name: c.name,
                country: c.country,
                lat: c.lat,
                lng: c.lng,
                emotions: c.emotions,
                dominantEmotion: c.dominantEmotion,
                visitCount: c.visitCount,
                color: getEmotionColor(c.dominantEmotion),
            })),
        };

        worldMapCache.set(cacheKey, response);
        return res.json(response);
    } catch (error) {
        logger.error('world-map failed', { error: error.message, requestId: req.id });
        return res.status(500).json({ error: 'Failed to fetch world map data.' });
    }
});

/**
 * GET /api/search-cities
 * Autocomplete city search (cached)
 */
router.get('/search-cities', (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        if (q.length < 1) {
            return res.json({ results: [] });
        }

        const cacheKey = `search_${q.toLowerCase()}`;
        const cached = citySearchCache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const results = searchCities(q, 8);
        const response = { results };

        citySearchCache.set(cacheKey, response);
        return res.json(response);
    } catch (error) {
        logger.error('search-cities failed', { error: error.message, requestId: req.id });
        return res.status(500).json({ error: 'Search failed.' });
    }
});

/**
 * POST /api/narrate
 * Generate TTS audio narration for a scenario text
 */
router.post('/narrate', async (req, res) => {
    try {
        const { text, tone } = req.body;

        if (!text || typeof text !== 'string') {
            return res.status(400).json({ error: 'Text is required for narration.' });
        }

        if (text.trim().length > 1000) {
            return res.status(400).json({ error: 'Text exceeds maximum length of 1000 characters.' });
        }

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
        logger.error('narrate failed', { error: error.message, requestId: req.id });
        return res.status(500).json({ error: 'Narration failed.' });
    }
});

/**
 * GET /api/health
 * Health check endpoint with system info
 */
router.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.round(process.uptime()),
        memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
    });
});

/**
 * GET /api/cache-stats
 * Get cache performance statistics (debug)
 */
router.get('/cache-stats', (_req, res) => {
    res.json({
        citySearch: citySearchCache.stats(),
        cityProfile: cityProfileCache.stats(),
        worldMap: worldMapCache.stats(),
    });
});

module.exports = router;
