/**
 * Structured Logger Utility
 * Uses Google Cloud Logging in production, structured console in development.
 * Provides consistent log format with severity levels and metadata.
 * @module utils/logger
 */

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/** @type {import('@google-cloud/logging').Logging|null} */
let cloudLogger = null;
/** @type {import('@google-cloud/logging').Log|null} */
let cloudLog = null;

/**
 * Initialize Google Cloud Logging client (production only).
 * Falls back silently to console if unavailable.
 */
function initCloudLogging() {
    if (!IS_PRODUCTION || cloudLogger) return;

    try {
        const { Logging } = require('@google-cloud/logging');
        cloudLogger = new Logging();
        cloudLog = cloudLogger.log('atlas-app');
    } catch (err) {
        console.warn('[Logger] Cloud Logging unavailable, using console:', err.message);
    }
}

/**
 * Severity mapping for Cloud Logging
 * @see https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#LogSeverity
 */
const SEVERITY = {
    debug: 'DEBUG',
    info: 'INFO',
    warn: 'WARNING',
    error: 'ERROR',
};

/**
 * Write a structured log entry.
 * @param {'debug'|'info'|'warn'|'error'} level - Log severity
 * @param {string} message - Human-readable message
 * @param {Object} [meta={}] - Additional structured metadata
 */
function writeLog(level, message, meta = {}) {
    const entry = {
        severity: SEVERITY[level] || 'DEFAULT',
        message,
        timestamp: new Date().toISOString(),
        ...meta,
    };

    if (IS_PRODUCTION && cloudLog) {
        const cloudEntry = cloudLog.entry(
            { severity: entry.severity },
            { message, ...meta }
        );
        cloudLog.write(cloudEntry).catch(() => { });
    }

    // Always write to console with structured format
    const consoleFn = level === 'error' ? console.error
        : level === 'warn' ? console.warn
            : level === 'debug' ? console.debug
                : console.log;

    consoleFn(JSON.stringify(entry));
}

/**
 * Logger interface with convenience methods for each severity level.
 * @example
 *   logger.info('Request received', { path: '/api/health', requestId: '...' });
 *   logger.error('Gemini API failed', { error: err.message, city: 'Tokyo' });
 */
const logger = {
    /** @param {string} msg @param {Object} [meta] */
    debug: (msg, meta) => writeLog('debug', msg, meta),
    /** @param {string} msg @param {Object} [meta] */
    info: (msg, meta) => writeLog('info', msg, meta),
    /** @param {string} msg @param {Object} [meta] */
    warn: (msg, meta) => writeLog('warn', msg, meta),
    /** @param {string} msg @param {Object} [meta] */
    error: (msg, meta) => writeLog('error', msg, meta),
};

// Auto-initialize Cloud Logging on import
initCloudLogging();

module.exports = { logger, initCloudLogging };
