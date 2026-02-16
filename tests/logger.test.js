/**
 * Logger — Unit Tests
 * Tests structured logging output format
 */

const { logger } = require('../src/utils/logger');

describe('logger', () => {
    let consoleSpy;

    beforeEach(() => {
        consoleSpy = {
            log: jest.spyOn(console, 'log').mockImplementation(),
            warn: jest.spyOn(console, 'warn').mockImplementation(),
            error: jest.spyOn(console, 'error').mockImplementation(),
            debug: jest.spyOn(console, 'debug').mockImplementation(),
        };
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('info() writes to console.log with JSON', () => {
        logger.info('test message', { key: 'value' });

        expect(consoleSpy.log).toHaveBeenCalledTimes(1);
        const output = JSON.parse(consoleSpy.log.mock.calls[0][0]);
        expect(output.message).toBe('test message');
        expect(output.severity).toBe('INFO');
        expect(output.key).toBe('value');
        expect(output.timestamp).toBeDefined();
    });

    test('error() writes to console.error', () => {
        logger.error('something broke', { code: 500 });

        expect(consoleSpy.error).toHaveBeenCalledTimes(1);
        const output = JSON.parse(consoleSpy.error.mock.calls[0][0]);
        expect(output.message).toBe('something broke');
        expect(output.severity).toBe('ERROR');
        expect(output.code).toBe(500);
    });

    test('warn() writes to console.warn', () => {
        logger.warn('careful!');

        expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
        const output = JSON.parse(consoleSpy.warn.mock.calls[0][0]);
        expect(output.severity).toBe('WARNING');
    });

    test('debug() writes to console.debug', () => {
        logger.debug('trace data', { detail: true });

        expect(consoleSpy.debug).toHaveBeenCalledTimes(1);
        const output = JSON.parse(consoleSpy.debug.mock.calls[0][0]);
        expect(output.severity).toBe('DEBUG');
        expect(output.detail).toBe(true);
    });

    test('log entries have ISO timestamp', () => {
        logger.info('timestamp test');

        const output = JSON.parse(consoleSpy.log.mock.calls[0][0]);
        expect(() => new Date(output.timestamp)).not.toThrow();
        expect(new Date(output.timestamp).toISOString()).toBe(output.timestamp);
    });

    test('handles missing metadata gracefully', () => {
        logger.info('no meta');

        const output = JSON.parse(consoleSpy.log.mock.calls[0][0]);
        expect(output.message).toBe('no meta');
        expect(output.severity).toBe('INFO');
    });
});
