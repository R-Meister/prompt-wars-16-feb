/**
 * City Validator Service
 * Validates city names, enforces Atlas rules, and prevents repetition
 */

const { CITIES_MAP, searchCities } = require('../data/cities');

/**
 * Validate if the city name is a real city in our dataset
 * @param {string} cityName - City name to validate
 * @returns {{ valid: boolean, city: object|null, error: string|null }}
 */
function validateCity(cityName) {
    if (!cityName || typeof cityName !== 'string') {
        return { valid: false, city: null, error: 'City name is required.' };
    }

    const normalized = cityName.trim();

    if (normalized.length < 2 || normalized.length > 100) {
        return { valid: false, city: null, error: 'City name must be between 2 and 100 characters.' };
    }

    // Sanitize: only allow letters, spaces, hyphens, periods, apostrophes
    if (!/^[a-zA-ZÀ-ÿ\s\-'.]+$/.test(normalized)) {
        return { valid: false, city: null, error: 'City name contains invalid characters.' };
    }

    const key = normalized.toLowerCase();
    const city = CITIES_MAP.get(key);

    if (!city) {
        return { valid: false, city: null, error: `"${normalized}" is not recognized as a valid city.` };
    }

    return { valid: true, city, error: null };
}

/**
 * Validate Atlas rule: next city must start with the last letter of previous city
 * @param {string} previousCity - The previous city name
 * @param {string} nextCity - The next city name to validate
 * @returns {{ valid: boolean, requiredLetter: string, error: string|null }}
 */
function validateAtlasRule(previousCity, nextCity) {
    if (!previousCity) {
        // First city of the session — any city is valid
        return { valid: true, requiredLetter: null, error: null };
    }

    const prevName = previousCity.trim().toLowerCase();
    const nextName = nextCity.trim().toLowerCase();

    // Get the last alphabetic letter of the previous city
    const lastLetter = getLastLetter(prevName);
    const firstLetter = nextName.charAt(0);

    if (firstLetter !== lastLetter) {
        return {
            valid: false,
            requiredLetter: lastLetter.toUpperCase(),
            error: `Next city must start with "${lastLetter.toUpperCase()}" (last letter of "${previousCity}").`
        };
    }

    return { valid: true, requiredLetter: lastLetter.toUpperCase(), error: null };
}

/**
 * Check if city has already been used in this session
 * @param {string} cityName - City to check
 * @param {string[]} usedCities - Array of already used city names (lowercase)
 * @returns {{ valid: boolean, error: string|null }}
 */
function checkRepetition(cityName, usedCities = []) {
    const key = cityName.trim().toLowerCase();

    if (usedCities.includes(key)) {
        return { valid: false, error: `"${cityName}" has already been used in this session.` };
    }

    return { valid: true, error: null };
}

/**
 * Full validation pipeline
 * @param {string} cityName - City name to validate
 * @param {string|null} previousCity - Previous city (null if first)
 * @param {string[]} usedCities - Already used cities in session
 * @returns {{ valid: boolean, city: object|null, requiredLetter: string|null, error: string|null }}
 */
function fullValidation(cityName, previousCity = null, usedCities = []) {
    // Step 1: Is it a real city?
    const cityCheck = validateCity(cityName);
    if (!cityCheck.valid) return { ...cityCheck, requiredLetter: null };

    // Step 2: Atlas rule
    const atlasCheck = validateAtlasRule(previousCity, cityName);
    if (!atlasCheck.valid) return { valid: false, city: cityCheck.city, ...atlasCheck };

    // Step 3: Not repeated
    const repCheck = checkRepetition(cityName, usedCities);
    if (!repCheck.valid) return { valid: false, city: cityCheck.city, requiredLetter: atlasCheck.requiredLetter, error: repCheck.error };

    return {
        valid: true,
        city: cityCheck.city,
        requiredLetter: atlasCheck.requiredLetter,
        error: null
    };
}

/**
 * Get the last alphabetic letter from a string
 * @param {string} str
 * @returns {string}
 */
function getLastLetter(str) {
    for (let i = str.length - 1; i >= 0; i--) {
        if (/[a-z]/i.test(str[i])) {
            return str[i].toLowerCase();
        }
    }
    return str[str.length - 1].toLowerCase();
}

/**
 * Get hint: find cities starting with the required letter
 * @param {string} letter - The letter cities must start with
 * @param {string[]} usedCities - Already used cities (to exclude)
 * @param {number} limit - Max number of hints
 * @returns {string[]}
 */
function getHints(letter, usedCities = [], limit = 5) {
    if (!letter) return [];

    const hints = [];
    const lowerLetter = letter.toLowerCase();

    for (const [key, city] of CITIES_MAP) {
        if (key.startsWith(lowerLetter) && !usedCities.includes(key)) {
            hints.push(city.name);
            if (hints.length >= limit) break;
        }
    }

    return hints;
}

module.exports = {
    validateCity,
    validateAtlasRule,
    checkRepetition,
    fullValidation,
    getLastLetter,
    getHints
};
