/**
 * Scenario Generator Service
 * Uses Gemini AI to create culturally plausible short moments for cities.
 * Includes retry with exponential backoff for resilient AI interactions.
 * @module services/scenarioGenerator
 */

const { getModel } = require('../config/gemini');
const { logger } = require('../utils/logger');

/**
 * Emotion dimensions tracked by the system.
 * @type {string[]}
 */
const EMOTION_DIMENSIONS = ['warmth', 'loneliness', 'tension', 'nostalgia', 'belonging'];

/** Maximum number of retry attempts for Gemini API calls */
const MAX_RETRIES = 2;

/** Base delay (ms) for exponential backoff */
const BASE_DELAY_MS = 500;

/**
 * Generate a scenario for a given city with retry logic.
 * @param {Object} city - City object { name, country, lat, lng }
 * @param {Object|null} emotionProfile - Current emotional profile of the city
 * @returns {Promise<Object>} Generated scenario with choices and emotion mapping
 */
async function generateScenario(city, emotionProfile = null) {
    const model = getModel();

    if (!model) {
        logger.warn('Gemini model unavailable, using fallback', { city: city.name });
        return getFallbackScenario(city);
    }

    const prompt = buildPrompt(city, emotionProfile);

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            const parsed = JSON.parse(text);

            if (!isValidScenario(parsed)) {
                logger.warn('Invalid AI response structure', { city: city.name, attempt });
                if (attempt < MAX_RETRIES) continue;
                return getFallbackScenario(city);
            }

            return {
                city: city.name,
                country: city.country,
                scenario: sanitizeText(parsed.scenario),
                choices: [
                    {
                        id: 'A',
                        text: sanitizeText(parsed.choices[0].text),
                        emotions: normalizeEmotions(parsed.choices[0].emotions),
                    },
                    {
                        id: 'B',
                        text: sanitizeText(parsed.choices[1].text),
                        emotions: normalizeEmotions(parsed.choices[1].emotions),
                    },
                ],
                tone: parsed.tone || 'neutral',
                generated: true,
            };
        } catch (error) {
            logger.error('Scenario generation attempt failed', {
                city: city.name,
                attempt,
                error: error.message,
            });

            if (attempt < MAX_RETRIES) {
                const delay = BASE_DELAY_MS * Math.pow(2, attempt);
                await sleep(delay);
                continue;
            }

            return getFallbackScenario(city);
        }
    }

    return getFallbackScenario(city);
}

/**
 * Build the Gemini prompt for scenario generation.
 * @param {Object} city - City data
 * @param {Object|null} emotionProfile - Existing emotion profile
 * @returns {string} Formatted prompt
 */
function buildPrompt(city, emotionProfile) {
    const profileContext = emotionProfile
        ? `\nThis city has been visited before. Its current emotional atmosphere is:\n${Object.entries(emotionProfile).map(([k, v]) => `- ${k}: ${(v * 100).toFixed(0)}%`).join('\n')}\nSubtly reflect this accumulated mood in the scenario's tone.`
        : '\nThis is the first visit to this city. Generate a fresh, culturally grounded moment.';

    return `You are a culturally aware storytelling engine for a geography game called Atlas.

TASK: Generate a short, emotionally resonant everyday moment set in ${city.name}, ${city.country}.

RULES:
- The moment must be culturally plausible for ${city.name}
- Maximum 2 sentences for the scenario
- It must describe a real, ordinary human moment (a vendor, a commuter, a student, etc.)
- NO fantasy, supernatural, or fictional elements
- NO stereotypes or offensive content
- NO generic filler — every detail should feel specific to this place
- Present tense, second person ("You see...", "You notice...")
${profileContext}

RESPONSE FORMAT (strict JSON):
{
  "scenario": "A 1-2 sentence scene set in ${city.name}",
  "choices": [
    {
      "text": "Short action choice A (max 8 words)",
      "emotions": {
        "warmth": 0.0-1.0,
        "loneliness": 0.0-1.0,
        "tension": 0.0-1.0,
        "nostalgia": 0.0-1.0,
        "belonging": 0.0-1.0
      }
    },
    {
      "text": "Short action choice B (max 8 words)",
      "emotions": {
        "warmth": 0.0-1.0,
        "loneliness": 0.0-1.0,
        "tension": 0.0-1.0,
        "nostalgia": 0.0-1.0,
        "belonging": 0.0-1.0
      }
    }
  ],
  "tone": "one word describing the overall mood"
}

The two choices should lead to meaningfully different emotional outcomes. One should lean warmer/brighter, the other more introspective/complex.`;
}

/**
 * Validate the parsed scenario structure.
 * @param {Object} parsed - Parsed JSON from Gemini
 * @returns {boolean}
 */
function isValidScenario(parsed) {
    return (
        parsed &&
        typeof parsed.scenario === 'string' &&
        parsed.scenario.length > 0 &&
        Array.isArray(parsed.choices) &&
        parsed.choices.length === 2 &&
        parsed.choices.every(c =>
            typeof c.text === 'string' &&
            c.text.length > 0 &&
            c.emotions &&
            typeof c.emotions === 'object'
        )
    );
}

/**
 * Normalize emotion values to ensure they are bounded [0, 1].
 * @param {Object} emotions - Raw emotion object
 * @returns {Object} Normalized emotion object
 */
function normalizeEmotions(emotions) {
    const normalized = {};
    for (const dim of EMOTION_DIMENSIONS) {
        const val = parseFloat(emotions[dim]) || 0;
        normalized[dim] = Math.max(0, Math.min(1, val));
    }
    return normalized;
}

/**
 * Sanitize text output — strip potential injection content.
 * @param {string} text - Raw text from AI
 * @returns {string} Sanitized text
 */
function sanitizeText(text) {
    if (typeof text !== 'string') return '';
    return text
        .replace(/<[^>]*>/g, '')
        .replace(/[^\w\s.,!?;:'"()\-–—]/g, '')
        .trim()
        .slice(0, 500);
}

/**
 * Sleep utility for retry backoff.
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fallback scenario when AI is unavailable.
 * @param {Object} city - City data
 * @returns {Object} Static fallback scenario
 */
function getFallbackScenario(city) {
    const fallbacks = [
        {
            scenario: `You arrive in ${city.name} as the golden hour bathes the streets in amber light. A street vendor arranges fresh flowers, humming an old melody.`,
            choices: [
                {
                    id: 'A',
                    text: 'Stop and choose a flower',
                    emotions: { warmth: 0.8, loneliness: 0.1, tension: 0.1, nostalgia: 0.4, belonging: 0.6 },
                },
                {
                    id: 'B',
                    text: 'Walk on, lost in thought',
                    emotions: { warmth: 0.2, loneliness: 0.7, tension: 0.1, nostalgia: 0.6, belonging: 0.1 },
                },
            ],
            tone: 'wistful',
        },
        {
            scenario: `Rain falls softly on ${city.name}. Through a window, you see an elderly couple sharing tea, their laughter barely audible above the downpour.`,
            choices: [
                {
                    id: 'A',
                    text: 'Seek shelter in a nearby cafe',
                    emotions: { warmth: 0.7, loneliness: 0.2, tension: 0.1, nostalgia: 0.3, belonging: 0.7 },
                },
                {
                    id: 'B',
                    text: 'Keep walking through the rain',
                    emotions: { warmth: 0.1, loneliness: 0.6, tension: 0.3, nostalgia: 0.5, belonging: 0.1 },
                },
            ],
            tone: 'reflective',
        },
        {
            scenario: `Morning light breaks over ${city.name}. A baker pulls bread from the oven, the aroma drifting to where you stand at the corner.`,
            choices: [
                {
                    id: 'A',
                    text: 'Buy a warm loaf and smile',
                    emotions: { warmth: 0.9, loneliness: 0.05, tension: 0.05, nostalgia: 0.3, belonging: 0.7 },
                },
                {
                    id: 'B',
                    text: 'Watch from a distance, remembering',
                    emotions: { warmth: 0.3, loneliness: 0.5, tension: 0.1, nostalgia: 0.8, belonging: 0.2 },
                },
            ],
            tone: 'nostalgic',
        },
    ];

    const chosen = fallbacks[Math.floor(Math.random() * fallbacks.length)];

    return {
        city: city.name,
        country: city.country,
        ...chosen,
        generated: false,
    };
}

module.exports = {
    generateScenario,
    EMOTION_DIMENSIONS,
    normalizeEmotions,
    isValidScenario,
    getFallbackScenario,
    sanitizeText,
};
