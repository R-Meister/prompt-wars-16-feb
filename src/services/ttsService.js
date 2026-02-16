/**
 * Text-to-Speech Service
 * Uses Google Cloud Text-to-Speech API to narrate city scenarios.
 * Provides audio narration for accessibility and immersive experience.
 * @module services/ttsService
 */

const { logger } = require('../utils/logger');

/** @type {import('@google-cloud/text-to-speech').TextToSpeechClient|null} */
let ttsClient = null;
let isInitialized = false;

/**
 * Initialize the Text-to-Speech client (lazy).
 * @returns {import('@google-cloud/text-to-speech').TextToSpeechClient|null}
 */
function initTTS() {
    if (isInitialized) return ttsClient;

    try {
        const textToSpeech = require('@google-cloud/text-to-speech');
        ttsClient = new textToSpeech.TextToSpeechClient();
        isInitialized = true;
        logger.info('Text-to-Speech client initialized');
        return ttsClient;
    } catch (err) {
        logger.warn('Text-to-Speech unavailable', { error: err.message });
        isInitialized = true; // Prevent repeated init attempts
        return null;
    }
}

/**
 * Voice configurations for different emotional tones.
 * Maps scenario tone to appropriate pitch/speed adjustments.
 */
const VOICE_CONFIGS = {
    warm: { pitch: 1.0, speakingRate: 0.95 },
    reflective: { pitch: -1.5, speakingRate: 0.85 },
    wistful: { pitch: -0.5, speakingRate: 0.9 },
    nostalgic: { pitch: -1.0, speakingRate: 0.88 },
    tense: { pitch: 2.0, speakingRate: 1.05 },
    neutral: { pitch: 0, speakingRate: 0.95 },
};

/**
 * Synthesize speech from a scenario text.
 * @param {string} text - The scenario text to narrate
 * @param {string} [tone='neutral'] - Emotional tone for voice adjustment
 * @param {string} [languageCode='en-US'] - BCP-47 language code
 * @returns {Promise<{ audioBase64: string, durationEstimate: number }|null>}
 *   Base64-encoded audio content or null if TTS unavailable
 */
async function synthesizeSpeech(text, tone = 'neutral', languageCode = 'en-US') {
    const client = initTTS();

    if (!client) {
        logger.debug('TTS skipped — client unavailable');
        return null;
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        logger.warn('TTS skipped — empty text');
        return null;
    }

    // Sanitise text for TTS (strip residual HTML, limit length)
    const cleanText = text.replace(/<[^>]*>/g, '').trim().slice(0, 1000);

    const voiceCfg = VOICE_CONFIGS[tone] || VOICE_CONFIGS.neutral;

    /** @type {import('@google-cloud/text-to-speech').protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest} */
    const request = {
        input: { text: cleanText },
        voice: {
            languageCode,
            name: 'en-US-Neural2-D',
            ssmlGender: 'MALE',
        },
        audioConfig: {
            audioEncoding: 'MP3',
            pitch: voiceCfg.pitch,
            speakingRate: voiceCfg.speakingRate,
            effectsProfileId: ['headphone-class-device'],
        },
    };

    try {
        const [response] = await client.synthesizeSpeech(request);

        if (!response?.audioContent) {
            logger.warn('TTS returned empty audio');
            return null;
        }

        const audioBase64 = Buffer.isBuffer(response.audioContent)
            ? response.audioContent.toString('base64')
            : response.audioContent;

        // Rough duration estimate: ~150 words/min, avg 5 chars/word
        const wordCount = cleanText.split(/\s+/).length;
        const durationEstimate = Math.round((wordCount / 150) * 60);

        logger.info('TTS synthesis complete', {
            textLength: cleanText.length,
            tone,
            durationEstimate,
        });

        return { audioBase64, durationEstimate };
    } catch (err) {
        logger.error('TTS synthesis failed', { error: err.message, tone });
        return null;
    }
}

module.exports = { synthesizeSpeech, initTTS };
