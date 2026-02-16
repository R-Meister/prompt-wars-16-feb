/**
 * Country Validator Service
 * Validates country names, enforces Atlas rules, and prevents repetition
 */

const { COUNTRIES_MAP, searchCountries } = require('../data/countries');

/**
 * Validate if the country name is a real country in our dataset
 * @param {string} countryName - Country name to validate
 * @returns {{ valid: boolean, country: object|null, error: string|null }}
 */
function validateCountry(countryName) {
    if (!countryName || typeof countryName !== 'string') {
        return { valid: false, country: null, error: 'Country name is required.' };
    }

    const normalized = countryName.trim();

    if (normalized.length < 2 || normalized.length > 100) {
        return { valid: false, country: null, error: 'Country name must be between 2 and 100 characters.' };
    }

    // Sanitize: only allow letters, spaces, hyphens, periods, apostrophes
    if (!/^[a-zA-ZÀ-ÿ\s\-'.]+$/.test(normalized)) {
        return { valid: false, country: null, error: 'Country name contains invalid characters.' };
    }

    const key = normalized.toLowerCase();
    const country = COUNTRIES_MAP.get(key);

    if (!country) {
        return { valid: false, country: null, error: `"${normalized}" is not recognized as a valid country.` };
    }

    return { valid: true, country, error: null };
}

/**
 * Validate Atlas rule: next country must start with the last letter of previous country
 * @param {string} previousCountry - The previous country name
 * @param {string} nextCountry - The next country name to validate
 * @returns {{ valid: boolean, requiredLetter: string, error: string|null }}
 */
function validateAtlasRule(previousCountry, nextCountry) {
    if (!previousCountry) {
        // First country of the session — any country is valid
        return { valid: true, requiredLetter: null, error: null };
    }

    const prevName = previousCountry.trim().toLowerCase();
    const nextName = nextCountry.trim().toLowerCase();

    // Get the last alphabetic letter of the previous country
    const lastLetter = getLastLetter(prevName);
    const firstLetter = nextName.charAt(0);

    if (firstLetter !== lastLetter) {
        return {
            valid: false,
            requiredLetter: lastLetter.toUpperCase(),
            error: `Next country must start with "${lastLetter.toUpperCase()}" (last letter of "${previousCountry}").`
        };
    }

    return { valid: true, requiredLetter: lastLetter.toUpperCase(), error: null };
}

/**
 * Check if country has already been used in this session
 * @param {string} countryName - Country to check
 * @param {string[]} usedCountries - Array of already used country names (lowercase)
 * @returns {{ valid: boolean, error: string|null }}
 */
function checkRepetition(countryName, usedCountries = []) {
    const key = countryName.trim().toLowerCase();

    if (usedCountries.includes(key)) {
        return { valid: false, error: `"${countryName}" has already been used in this session.` };
    }

    return { valid: true, error: null };
}

/**
 * Full validation pipeline
 * @param {string} countryName - Country name to validate
 * @param {string|null} previousCountry - Previous country (null if first)
 * @param {string[]} usedCountries - Already used countries in session
 * @returns {{ valid: boolean, country: object|null, requiredLetter: string|null, error: string|null }}
 */
function fullValidation(countryName, previousCountry = null, usedCountries = []) {
    // Step 1: Is it a real country?
    const countryCheck = validateCountry(countryName);
    if (!countryCheck.valid) return { ...countryCheck, requiredLetter: null };

    // Step 2: Atlas rule
    const atlasCheck = validateAtlasRule(previousCountry, countryName);
    if (!atlasCheck.valid) return { valid: false, country: countryCheck.country, ...atlasCheck };

    // Step 3: Not repeated
    const repCheck = checkRepetition(countryName, usedCountries);
    if (!repCheck.valid) return { valid: false, country: countryCheck.country, requiredLetter: atlasCheck.requiredLetter, error: repCheck.error };

    return {
        valid: true,
        country: countryCheck.country,
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
 * Get hint: find countries starting with the required letter
 * @param {string} letter - The letter countries must start with
 * @param {string[]} usedCountries - Already used countries (to exclude)
 * @param {number} limit - Max number of hints
 * @returns {string[]}
 */
function getHints(letter, usedCountries = [], limit = 5) {
    if (!letter) return [];

    const hints = [];
    const lowerLetter = letter.toLowerCase();

    for (const [key, country] of COUNTRIES_MAP) {
        if (key.startsWith(lowerLetter) && !usedCountries.includes(key)) {
            hints.push(country.name);
            if (hints.length >= limit) break;
        }
    }

    return hints;
}

module.exports = {
    validateCountry,
    validateAtlasRule,
    checkRepetition,
    fullValidation,
    getLastLetter,
    getHints
};
