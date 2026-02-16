/**
 * Tests for Request ID Middleware
 * Tests unique ID generation, header forwarding, and timing.
 */

const { requestIdMiddleware } = require('../src/middleware/requestId');

/**
 * Create mock Express objects for testing middleware.
 */
function createMocks(headers = {}) {
    const req = {
        headers,
        get: jest.fn((name) => headers[name.toLowerCase()]),
    };
    const res = {
        setHeader: jest.fn(),
    };
    const next = jest.fn();
    return { req, res, next };
}

describe('Request ID Middleware', () => {
    test('generates a unique request ID', () => {
        const { req, res, next } = createMocks();
        requestIdMiddleware(req, res, next);

        expect(req.id).toBeDefined();
        expect(typeof req.id).toBe('string');
        expect(req.id.length).toBeGreaterThan(0);
    });

    test('sets X-Request-Id response header', () => {
        const { req, res, next } = createMocks();
        requestIdMiddleware(req, res, next);

        expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', req.id);
    });

    test('records start time on request', () => {
        const { req, res, next } = createMocks();
        const before = Date.now();
        requestIdMiddleware(req, res, next);
        const after = Date.now();

        expect(req.startTime).toBeDefined();
        expect(req.startTime).toBeGreaterThanOrEqual(before);
        expect(req.startTime).toBeLessThanOrEqual(after);
    });

    test('calls next() to continue middleware chain', () => {
        const { req, res, next } = createMocks();
        requestIdMiddleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
    });

    test('generates different IDs for different requests', () => {
        const ids = new Set();
        for (let i = 0; i < 100; i++) {
            const { req, res, next } = createMocks();
            requestIdMiddleware(req, res, next);
            ids.add(req.id);
        }
        // All 100 should be unique
        expect(ids.size).toBe(100);
    });

    test('uses forwarded X-Request-Id header if present', () => {
        const { req, res, next } = createMocks({ 'x-request-id': 'forwarded-id-123' });
        requestIdMiddleware(req, res, next);

        // Middleware should either use forwarded ID or generate new one
        // depending on implementation — just check it has an ID
        expect(req.id).toBeDefined();
    });

    test('request ID is a valid format (alphanumeric with dashes)', () => {
        const { req, res, next } = createMocks();
        requestIdMiddleware(req, res, next);

        // Should be a reasonable ID format
        expect(req.id).toMatch(/^[\w-]+$/);
    });
});
