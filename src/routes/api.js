/**
 * API Routes
 * RESTful endpoints for the Atlas game
 */

const express = require('express');
const router = express.Router();
const { fullValidation, getHints } = require('../services/cityValidator');
const { generateScenario } = require('../services/scenarioGenerator');
const { getCityProfile, updateCityProfile, getAllCityProfiles, getEmotionColor } = require('../services/emotionEngine');
const { searchCities } = require('../data/cities');

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
            // Include hints for the required letter
            const requiredLetter = result.requiredLetter || (previousCity ? null : null);
            const hints = requiredLetter ? getHints(requiredLetter.toLowerCase(), usedCities || []) : [];
            return res.json({ ...result, hints });
        }

        return res.json(result);
    } catch (error) {
        console.error('[API] validate-city error:', error.message);
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

        return res.json({
            ...scenario,
            existingProfile: profile ? {
                emotions: profile.emotions,
                visitCount: profile.visitCount,
                dominantEmotion: profile.dominantEmotion
            } : null
        });
    } catch (error) {
        console.error('[API] generate-scenario error:', error.message);
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

        return res.json({
            success: true,
            profile: updatedProfile,
            emotionColor: getEmotionColor(updatedProfile.dominantEmotion)
        });
    } catch (error) {
        console.error('[API] submit-choice error:', error.message);
        return res.status(500).json({ error: 'Choice submission failed.' });
    }
});

/**
 * GET /api/city-profile/:city
 * Get the emotional profile of a specific city
 */
router.get('/city-profile/:city', async (req, res) => {
    try {
        const cityName = decodeURIComponent(req.params.city);
        const profile = await getCityProfile(cityName);

        if (!profile) {
            return res.json({ exists: false, city: cityName });
        }

        return res.json({
            exists: true,
            ...profile,
            emotionColor: getEmotionColor(profile.dominantEmotion)
        });
    } catch (error) {
        console.error('[API] city-profile error:', error.message);
        return res.status(500).json({ error: 'Failed to fetch city profile.' });
    }
});

/**
 * GET /api/world-map
 * Get all cities with emotional data for map visualization
 */
router.get('/world-map', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 500, 1000);
        const cities = await getAllCityProfiles(limit);

        return res.json({
            count: cities.length,
            cities: cities.map(c => ({
                name: c.name,
                country: c.country,
                lat: c.lat,
                lng: c.lng,
                emotions: c.emotions,
                dominantEmotion: c.dominantEmotion,
                visitCount: c.visitCount,
                color: getEmotionColor(c.dominantEmotion)
            }))
        });
    } catch (error) {
        console.error('[API] world-map error:', error.message);
        return res.status(500).json({ error: 'Failed to fetch world map data.' });
    }
});

/**
 * GET /api/search-cities
 * Autocomplete city search
 */
router.get('/search-cities', (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        if (q.length < 1) {
            return res.json({ results: [] });
        }
        const results = searchCities(q, 8);
        return res.json({ results });
    } catch (error) {
        console.error('[API] search-cities error:', error.message);
        return res.status(500).json({ error: 'Search failed.' });
    }
});

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
