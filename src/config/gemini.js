/**
 * Gemini AI Configuration
 * Initializes the Google Generative AI client
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;
let model = null;

/**
 * Initialize Gemini AI client
 * @returns {{ genAI: GoogleGenerativeAI, model: GenerativeModel } | null}
 */
function initializeGemini() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        console.warn('[Gemini] No valid API key found. AI features disabled.');
        return null;
    }

    try {
        genAI = new GoogleGenerativeAI(apiKey);
        model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: {
                temperature: 0.85,
                topP: 0.92,
                topK: 40,
                maxOutputTokens: 1024,
                responseMimeType: 'application/json'
            },
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
            ]
        });

        console.log('[Gemini] AI model initialized (gemini-2.0-flash)');
        return { genAI, model };
    } catch (error) {
        console.error('[Gemini] Initialization error:', error.message);
        return null;
    }
}

/**
 * Get the Gemini model instance
 * @returns {GenerativeModel|null}
 */
function getModel() {
    if (!model) {
        initializeGemini();
    }
    return model;
}

module.exports = { initializeGemini, getModel };
