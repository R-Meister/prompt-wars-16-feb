/**
 * Emotion Engine Service
 * Processes player choices into emotional vectors and manages city profiles in Firestore
 */

const { getDb } = require('../config/firebase');
const { EMOTION_DIMENSIONS } = require('./scenarioGenerator');

/** Firestore collection name */
const CITIES_COLLECTION = 'cities';

/** Weight for new interactions vs existing profile (lower = more stable) */
const LEARNING_RATE = 0.15;

/**
 * Get the emotional profile of a city from Firestore
 * @param {string} cityName - Normalized city name
 * @returns {Promise<object|null>} City profile or null
 */
async function getCityProfile(cityName) {
    const db = getDb();
    if (!db) return getDefaultProfile();

    try {
        const key = cityName.toLowerCase().replace(/\s+/g, '_');
        const doc = await db.collection(CITIES_COLLECTION).doc(key).get();

        if (!doc.exists) return null;

        return doc.data();
    } catch (error) {
        console.error('[EmotionEngine] Read error:', error.message);
        return null;
    }
}

/**
 * Update a city's emotional profile with a new interaction
 * Uses exponential moving average to blend new emotions with existing profile
 * @param {string} cityName - City name
 * @param {object} newEmotions - Emotion vector from player choice
 * @param {object} cityData - City metadata (country, lat, lng)
 * @returns {Promise<object>} Updated profile
 */
async function updateCityProfile(cityName, newEmotions, cityData = {}) {
    const db = getDb();
    const key = cityName.toLowerCase().replace(/\s+/g, '_');

    // Get existing profile
    const existing = await getCityProfile(cityName);

    // Calculate merged emotions
    const mergedEmotions = mergeEmotions(
        existing?.emotions || getDefaultProfile().emotions,
        newEmotions,
        existing?.visitCount || 0
    );

    const updatedProfile = {
        name: cityData.name || cityName,
        country: cityData.country || existing?.country || 'Unknown',
        lat: cityData.lat || existing?.lat || 0,
        lng: cityData.lng || existing?.lng || 0,
        emotions: mergedEmotions,
        dominantEmotion: getDominantEmotion(mergedEmotions),
        visitCount: (existing?.visitCount || 0) + 1,
        lastUpdated: new Date().toISOString()
    };

    if (db) {
        try {
            await db.collection(CITIES_COLLECTION).doc(key).set(updatedProfile, { merge: true });
        } catch (error) {
            console.error('[EmotionEngine] Write error:', error.message);
        }
    }

    return updatedProfile;
}

/**
 * Merge new emotion vector with existing profile using weighted average
 * Earlier interactions have less effect as visit count grows (stabilization)
 * @param {object} existing - Current emotion vector
 * @param {object} newEmotions - New emotion vector from choice
 * @param {number} visitCount - Number of prior visits
 * @returns {object} Merged emotion vector
 */
function mergeEmotions(existing, newEmotions, visitCount) {
    const merged = {};

    // Adaptive learning rate: decreases as more visits happen (stabilization)
    const adaptiveRate = Math.max(0.05, LEARNING_RATE / Math.sqrt(1 + visitCount * 0.1));

    for (const dim of EMOTION_DIMENSIONS) {
        const oldVal = Math.max(0, Math.min(1, parseFloat(existing[dim]) || 0));
        const newVal = Math.max(0, Math.min(1, parseFloat(newEmotions[dim]) || 0));
        merged[dim] = Math.round((oldVal * (1 - adaptiveRate) + newVal * adaptiveRate) * 1000) / 1000;
    }

    return merged;
}

/**
 * Find the dominant emotion in a profile
 * @param {object} emotions - Emotion vector
 * @returns {string} Name of the strongest emotion
 */
function getDominantEmotion(emotions) {
    let maxVal = -1;
    let dominant = 'neutral';

    for (const dim of EMOTION_DIMENSIONS) {
        const val = parseFloat(emotions[dim]) || 0;
        if (val > maxVal) {
            maxVal = val;
            dominant = dim;
        }
    }

    return dominant;
}

/**
 * Get all city profiles from Firestore (for world map)
 * @param {number} limit - Maximum number of cities to return
 * @returns {Promise<object[]>} Array of city profiles
 */
async function getAllCityProfiles(limit = 500) {
    const db = getDb();
    if (!db) return [];

    try {
        const snapshot = await db
            .collection(CITIES_COLLECTION)
            .orderBy('visitCount', 'desc')
            .limit(limit)
            .get();

        return snapshot.docs.map(doc => doc.data());
    } catch (error) {
        console.error('[EmotionEngine] Read all error:', error.message);
        return [];
    }
}

/**
 * Get default emotion profile for a new city
 * @returns {object}
 */
function getDefaultProfile() {
    return {
        emotions: {
            warmth: 0.5,
            loneliness: 0.5,
            tension: 0.5,
            nostalgia: 0.5,
            belonging: 0.5
        },
        visitCount: 0,
        dominantEmotion: 'neutral'
    };
}

/**
 * Get emotion color mapping for visualization
 * @param {string} emotion - Emotion name
 * @returns {string} HSL color string
 */
function getEmotionColor(emotion) {
    const colors = {
        warmth: 'hsl(35, 90%, 55%)',      // Amber
        loneliness: 'hsl(220, 70%, 55%)',  // Blue
        tension: 'hsl(0, 75%, 55%)',       // Red
        nostalgia: 'hsl(280, 60%, 55%)',   // Violet
        belonging: 'hsl(145, 65%, 45%)',   // Green
        neutral: 'hsl(220, 15%, 55%)'      // Gray
    };
    return colors[emotion] || colors.neutral;
}

module.exports = {
    getCityProfile,
    updateCityProfile,
    mergeEmotions,
    getDominantEmotion,
    getAllCityProfiles,
    getDefaultProfile,
    getEmotionColor,
    EMOTION_DIMENSIONS
};
