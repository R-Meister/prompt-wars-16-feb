/**
 * Emotion Engine Service
 * Processes player choices into emotional vectors and manages country profiles in Firestore.
 * Implements adaptive learning rate for stabilised country personalities.
 * @module services/emotionEngine
 */

const { getDb } = require('../config/firebase');
const { EMOTION_DIMENSIONS } = require('./scenarioGenerator');
const { logger } = require('../utils/logger');

/** Firestore collection name for country emotion profiles */
const COUNTRIES_COLLECTION = 'countries';

/** Weight for new interactions vs existing profile (lower = more stable) */
const LEARNING_RATE = 0.15;

/**
 * Get the emotional profile of a country from Firestore.
 * @param {string} countryName - Normalized country name
 * @returns {Promise<Object|null>} Country profile or null
 */
async function getCountryProfile(countryName) {
    const db = getDb();
    if (!db) return getDefaultProfile();

    try {
        const key = countryName.toLowerCase().replace(/\s+/g, '_');
        const doc = await db.collection(COUNTRIES_COLLECTION).doc(key).get();

        if (!doc.exists) return null;

        return doc.data();
    } catch (error) {
        logger.error('Firestore read error', { error: error.message, country: countryName });
        return null;
    }
}

/**
 * Update a country's emotional profile with a new interaction.
 * Uses exponential moving average to blend new emotions with existing profile.
 * @param {string} countryName - Country name
 * @param {Object} newEmotions - Emotion vector from player choice
 * @param {Object} countryData - Country metadata (capital, lat, lng)
 * @returns {Promise<Object>} Updated profile
 */
async function updateCountryProfile(countryName, newEmotions, countryData = {}) {
    const db = getDb();
    const key = countryName.toLowerCase().replace(/\s+/g, '_');

    const existing = await getCountryProfile(countryName);

    const mergedEmotions = mergeEmotions(
        existing?.emotions || getDefaultProfile().emotions,
        newEmotions,
        existing?.visitCount || 0
    );

    const updatedProfile = {
        name: countryData.name || countryName,
        capital: countryData.capital || existing?.capital || 'Unknown',
        lat: countryData.lat || existing?.lat || 0,
        lng: countryData.lng || existing?.lng || 0,
        emotions: mergedEmotions,
        dominantEmotion: getDominantEmotion(mergedEmotions),
        visitCount: (existing?.visitCount || 0) + 1,
        lastUpdated: new Date().toISOString(),
    };

    if (db) {
        try {
            await db.collection(COUNTRIES_COLLECTION).doc(key).set(updatedProfile, { merge: true });
            logger.info('Country profile updated', { country: countryName, visitCount: updatedProfile.visitCount });
        } catch (error) {
            logger.error('Firestore write error', { error: error.message, country: countryName });
        }
    }

    return updatedProfile;
}

/**
 * Merge new emotion vector with existing profile using weighted average.
 * Earlier interactions have less effect as visit count grows (stabilisation).
 * @param {Object} existing - Current emotion vector
 * @param {Object} newEmotions - New emotion vector from choice
 * @param {number} visitCount - Number of prior visits
 * @returns {Object} Merged emotion vector
 */
function mergeEmotions(existing, newEmotions, visitCount) {
    const merged = {};

    // Adaptive learning rate: decreases as more visits happen (stabilisation)
    const adaptiveRate = Math.max(0.05, LEARNING_RATE / Math.sqrt(1 + visitCount * 0.1));

    for (const dim of EMOTION_DIMENSIONS) {
        const oldVal = Math.max(0, Math.min(1, parseFloat(existing[dim]) || 0));
        const newVal = Math.max(0, Math.min(1, parseFloat(newEmotions[dim]) || 0));
        merged[dim] = Math.round((oldVal * (1 - adaptiveRate) + newVal * adaptiveRate) * 1000) / 1000;
    }

    return merged;
}

/**
 * Find the dominant emotion in a profile.
 * @param {Object} emotions - Emotion vector
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
 * Get all country profiles from Firestore (for world map).
 * @param {number} limit - Maximum number of countries to return
 * @returns {Promise<Object[]>} Array of country profiles
 */
async function getAllCountryProfiles(limit = 500) {
    const db = getDb();
    if (!db) return [];

    try {
        const snapshot = await db
            .collection(COUNTRIES_COLLECTION)
            .orderBy('visitCount', 'desc')
            .limit(limit)
            .get();

        return snapshot.docs.map(doc => doc.data());
    } catch (error) {
        logger.error('Firestore read-all error', { error: error.message });
        return [];
    }
}

/**
 * Get default emotion profile for a new country.
 * @returns {Object} Balanced default profile
 */
function getDefaultProfile() {
    return {
        emotions: {
            warmth: 0.5,
            loneliness: 0.5,
            tension: 0.5,
            nostalgia: 0.5,
            belonging: 0.5,
        },
        visitCount: 0,
        dominantEmotion: 'neutral',
    };
}

/**
 * Get emotion colour mapping for visualisation.
 * @param {string} emotion - Emotion name
 * @returns {string} HSL colour string
 */
function getEmotionColor(emotion) {
    const colors = {
        warmth: 'hsl(35, 90%, 55%)',
        loneliness: 'hsl(220, 70%, 55%)',
        tension: 'hsl(0, 75%, 55%)',
        nostalgia: 'hsl(280, 60%, 55%)',
        belonging: 'hsl(145, 65%, 45%)',
        neutral: 'hsl(220, 15%, 55%)',
    };
    return colors[emotion] || colors.neutral;
}

module.exports = {
    getCountryProfile,
    updateCountryProfile,
    mergeEmotions,
    getDominantEmotion,
    getAllCountryProfiles,
    getDefaultProfile,
    getEmotionColor,
    EMOTION_DIMENSIONS,
};
