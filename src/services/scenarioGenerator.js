/**
 * Scenario Generator Service
 * Uses Gemini AI to create culturally plausible short moments for countries.
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

/** Minimum and maximum number of choices */
const MIN_CHOICES = 3;
const MAX_CHOICES = 4;

/**
 * Generate a scenario for a given country with retry logic.
 * @param {Object} country - Country object { name, capital, lat, lng, continent, region }
 * @param {Object|null} emotionProfile - Current emotional profile of the country
 * @returns {Promise<Object>} Generated scenario with choices and emotion mapping
 */
async function generateScenario(country, emotionProfile = null) {
    const model = getModel();

    if (!model) {
        logger.warn('Gemini model unavailable, using fallback', { country: country.name });
        return getFallbackScenario(country);
    }

    // Randomly decide number of choices (3 or 4)
    const numChoices = Math.floor(Math.random() * (MAX_CHOICES - MIN_CHOICES + 1)) + MIN_CHOICES;
    const prompt = buildPrompt(country, emotionProfile, numChoices);

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            const parsed = JSON.parse(text);

            if (!isValidScenario(parsed, numChoices)) {
                logger.warn('Invalid AI response structure', { country: country.name, attempt });
                if (attempt < MAX_RETRIES) continue;
                return getFallbackScenario(country);
            }

            // Generate choice IDs (A, B, C, D, etc.)
            const choiceIds = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
            const choices = parsed.choices.map((choice, index) => ({
                id: choiceIds[index],
                text: sanitizeText(choice.text),
                emotions: normalizeEmotions(choice.emotions),
            }));

            return {
                country: country.name,
                capital: country.capital,
                scenario: sanitizeText(parsed.scenario),
                choices: choices,
                tone: parsed.tone || 'neutral',
                generated: true,
            };
        } catch (error) {
            logger.error('Scenario generation attempt failed', {
                country: country.name,
                attempt,
                error: error.message,
            });

            if (attempt < MAX_RETRIES) {
                const delay = BASE_DELAY_MS * Math.pow(2, attempt);
                await sleep(delay);
                continue;
            }

            return getFallbackScenario(country);
        }
    }

    return getFallbackScenario(country);
}

/**
 * Build the Gemini prompt for scenario generation.
 * @param {Object} country - Country data
 * @param {Object|null} emotionProfile - Existing emotion profile
 * @param {number} numChoices - Number of choices to generate (3 or 4)
 * @returns {string} Formatted prompt
 */
function buildPrompt(country, emotionProfile, numChoices) {
    const profileContext = emotionProfile
        ? `\nThis country has been visited before. Its current emotional atmosphere is:\n${Object.entries(emotionProfile).map(([k, v]) => `- ${k}: ${(v * 100).toFixed(0)}%`).join('\n')}\nSubtly reflect this accumulated mood in the scenario's tone.`
        : '\nThis is the first visit to this country. Generate a fresh, culturally grounded moment.';

    // Generate choice template based on numChoices
    const choiceTemplate = Array.from({ length: numChoices }, (_, i) => {
        const choiceLetter = String.fromCharCode(65 + i);
        return `    {
      "text": "Action choice ${choiceLetter} (3-12 words, vary the length and style)",
      "emotions": {
        "warmth": 0.0-1.0,
        "loneliness": 0.0-1.0,
        "tension": 0.0-1.0,
        "nostalgia": 0.0-1.0,
        "belonging": 0.0-1.0
      }
    }`;
    }).join(',\n');

    return `You are a culturally aware storytelling engine for a geography game called Atlas.

TASK: Generate a short, emotionally resonant everyday moment set in ${country.name} (capital: ${country.capital}), located in ${country.region}.

RULES:
- The moment must be culturally plausible for ${country.name}
- Maximum 2 sentences for the scenario
- It must describe a real, ordinary human moment (a vendor, a commuter, a student, a family, etc.)
- Draw from ${country.name}'s geography, culture, and daily life in ${country.region}
- NO fantasy, supernatural, or fictional elements
- NO stereotypes or offensive content
- NO generic filler — every detail should feel specific to this place
- Present tense, second person ("You see...", "You notice...")
 ${profileContext}

Generate ${numChoices} distinct choices that offer different ways to engage with the moment. Vary the choice styles:
- Some practical/action-oriented (what you do)
- Some social/emotional (how you connect with others)
- Some observational/reflective (what you notice or feel)
- Mix short phrases (3-5 words) with longer descriptions (8-12 words)

RESPONSE FORMAT (strict JSON):
{
  "scenario": "A 1-2 sentence scene set in ${country.name}",
  "choices": [
${choiceTemplate}
  ],
  "tone": "one word describing the overall mood"
}

Each choice should lead to meaningfully different emotional outcomes across the five dimensions (warmth, loneliness, tension, nostalgia, belonging).`;
}

/**
 * Validate the parsed scenario structure.
 * @param {Object} parsed - Parsed JSON from Gemini
 * @param {number} expectedChoices - Expected number of choices (3 or 4)
 * @returns {boolean}
 */
function isValidScenario(parsed, expectedChoices) {
    return (
        parsed &&
        typeof parsed.scenario === 'string' &&
        parsed.scenario.length > 0 &&
        Array.isArray(parsed.choices) &&
        parsed.choices.length >= MIN_CHOICES &&
        parsed.choices.length <= MAX_CHOICES &&
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
 * @param {Object} country - Country data
 * @returns {Object} Static fallback scenario
 */
function getFallbackScenario(country) {
    // Randomly decide number of choices (3 or 4)
    const numChoices = Math.floor(Math.random() * (MAX_CHOICES - MIN_CHOICES + 1)) + MIN_CHOICES;
    
    const fallbacks = [
        {
            scenarios: [
                `You arrive in ${country.name} as the golden hour bathes the landscape in amber light. A local arranges fresh flowers at a roadside stand, humming an old melody.`,
                `In ${country.name}, morning mist drifts across the valleys. You hear distant bells and the smell of woodsmoke on the breeze.`,
                `The afternoon heat of ${country.name} draws you to a shaded plaza. Children play while elders watch from benches, exchanging stories.`,
                `Evening settles over ${country.name}. Lanterns flicker to life as the day's final commerce winds down in the market square.`,
            ],
            choiceSets: [
                // Set 1: 3 choices
                [
                    { id: 'A', text: 'Stop and choose a flower', emotions: { warmth: 0.8, loneliness: 0.1, tension: 0.1, nostalgia: 0.4, belonging: 0.6 } },
                    { id: 'B', text: 'Walk on, lost in thought', emotions: { warmth: 0.2, loneliness: 0.7, tension: 0.1, nostalgia: 0.6, belonging: 0.1 } },
                    { id: 'C', text: 'Ask about the melody', emotions: { warmth: 0.9, loneliness: 0.05, tension: 0.2, nostalgia: 0.7, belonging: 0.5 } },
                ],
                // Set 2: 4 choices
                [
                    { id: 'A', text: 'Follow the sound of bells', emotions: { warmth: 0.4, loneliness: 0.3, tension: 0.2, nostalgia: 0.5, belonging: 0.3 } },
                    { id: 'B', text: 'Find the source of smoke', emotions: { warmth: 0.6, loneliness: 0.2, tension: 0.1, nostalgia: 0.6, belonging: 0.4 } },
                    { id: 'C', text: 'Watch the mist dissipate', emotions: { warmth: 0.1, loneliness: 0.6, tension: 0.05, nostalgia: 0.8, belonging: 0.1 } },
                    { id: 'D', text: 'Continue down the valley path', emotions: { warmth: 0.2, loneliness: 0.5, tension: 0.3, nostalgia: 0.3, belonging: 0.2 } },
                ],
                // Set 3: 3 choices
                [
                    { id: 'A', text: 'Join the children playing', emotions: { warmth: 0.9, loneliness: 0.05, tension: 0.1, nostalgia: 0.4, belonging: 0.8 } },
                    { id: 'B', text: 'Listen to the elders\' stories', emotions: { warmth: 0.7, loneliness: 0.2, tension: 0.05, nostalgia: 0.9, belonging: 0.5 } },
                    { id: 'C', text: 'Sit quietly in the shade', emotions: { warmth: 0.3, loneliness: 0.5, tension: 0.1, nostalgia: 0.5, belonging: 0.3 } },
                ],
                // Set 4: 4 choices
                [
                    { id: 'A', text: 'Browse the remaining stalls', emotions: { warmth: 0.5, loneliness: 0.3, tension: 0.1, nostalgia: 0.4, belonging: 0.4 } },
                    { id: 'B', text: 'Buy a lantern for your journey', emotions: { warmth: 0.6, loneliness: 0.2, tension: 0.2, nostalgia: 0.5, belonging: 0.3 } },
                    { id: 'C', text: 'Watch the sunset from the square', emotions: { warmth: 0.4, loneliness: 0.4, tension: 0.05, nostalgia: 0.7, belonging: 0.2 } },
                    { id: 'D', text: 'Head to your lodgings', emotions: { warmth: 0.3, loneliness: 0.5, tension: 0.1, nostalgia: 0.2, belonging: 0.4 } },
                ],
            ],
            tones: ['wistful', 'contemplative', 'warm', 'peaceful'],
        },
    ];

    const fallback = fallbacks[0];
    const scenarioIndex = Math.floor(Math.random() * fallback.scenarios.length);
    const scenario = fallback.scenarios[scenarioIndex];
    
    // Select appropriate choice set based on numChoices
    const availableChoiceSets = fallback.choiceSets.filter(set => 
        (numChoices === 3 && set.length === 3) || (numChoices === 4 && set.length === 4)
    );
    const choiceSet = availableChoiceSets.length > 0 
        ? availableChoiceSets[Math.floor(Math.random() * availableChoiceSets.length)]
        : fallback.choiceSets[0].slice(0, numChoices); // Fallback: slice to desired length

    return {
        country: country.name,
        capital: country.capital,
        scenario: scenario,
        choices: choiceSet,
        tone: fallback.tones[scenarioIndex],
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
