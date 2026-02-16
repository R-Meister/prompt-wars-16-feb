/**
 * Tests for Input Validation Middleware
 * Tests validateBody, validateQuery, and validateField functions.
 */

const { validateBody, validateQuery, validateField } = require('../src/middleware/inputValidator');

/**
 * Helper to create mock Express req/res/next objects.
 */
function mockExpress(body = {}, query = {}) {
    const req = { body, query };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();
    return { req, res, next };
}

describe('Input Validator', () => {
    describe('validateField', () => {
        test('returns error for required field that is undefined', () => {
            const err = validateField('city', undefined, { type: 'string', required: true });
            expect(err).toBe('city is required');
        });

        test('returns error for required field that is null', () => {
            const err = validateField('city', null, { type: 'string', required: true });
            expect(err).toBe('city is required');
        });

        test('returns error for required field that is empty string', () => {
            const err = validateField('city', '', { type: 'string', required: true });
            expect(err).toBe('city is required');
        });

        test('returns null for optional field that is undefined', () => {
            const err = validateField('city', undefined, { type: 'string' });
            expect(err).toBeNull();
        });

        test('returns error for wrong type', () => {
            const err = validateField('count', 'abc', { type: 'number' });
            expect(err).toBe('count must be a number');
        });

        test('returns error for string shorter than minLength', () => {
            const err = validateField('name', '', { type: 'string', minLength: 1 });
            expect(err).toBe('name must be at least 1 characters');
        });

        test('returns error for string longer than maxLength', () => {
            const err = validateField('name', 'a'.repeat(101), { type: 'string', maxLength: 100 });
            expect(err).toBe('name must not exceed 100 characters');
        });

        test('returns null for valid string within bounds', () => {
            const err = validateField('name', 'Tokyo', { type: 'string', minLength: 1, maxLength: 100 });
            expect(err).toBeNull();
        });

        test('returns error for number below min', () => {
            const err = validateField('lat', -100, { type: 'number', min: -90 });
            expect(err).toBe('lat must be at least -90');
        });

        test('returns error for number above max', () => {
            const err = validateField('lng', 200, { type: 'number', max: 180 });
            expect(err).toBe('lng must not exceed 180');
        });

        test('returns null for valid number within bounds', () => {
            const err = validateField('lat', 35.6, { type: 'number', min: -90, max: 90 });
            expect(err).toBeNull();
        });

        test('validates array type', () => {
            const err = validateField('items', 'not-array', { type: 'array' });
            expect(err).toBe('items must be an array');
        });

        test('accepts valid array', () => {
            const err = validateField('items', [1, 2, 3], { type: 'array' });
            expect(err).toBeNull();
        });

        test('validates boolean type', () => {
            const err = validateField('active', 'yes', { type: 'boolean' });
            expect(err).toBe('active must be a boolean');
        });

        test('accepts valid boolean', () => {
            const err = validateField('active', true, { type: 'boolean' });
            expect(err).toBeNull();
        });
    });

    describe('validateBody', () => {
        test('calls next() for valid body', () => {
            const middleware = validateBody({
                city: { type: 'string', required: true, minLength: 1 },
            });

            const { req, res, next } = mockExpress({ city: 'Tokyo' });
            middleware(req, res, next);

            expect(next).toHaveBeenCalledWith();
        });

        test('calls next with ValidationError for missing required field', () => {
            const middleware = validateBody({
                city: { type: 'string', required: true },
            });

            const { req, res, next } = mockExpress({});
            middleware(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                message: expect.stringContaining('city is required'),
                statusCode: 400,
            }));
        });

        test('reports multiple validation errors', () => {
            const middleware = validateBody({
                city: { type: 'string', required: true },
                lat: { type: 'number', required: true },
            });

            const { req, res, next } = mockExpress({});
            middleware(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                message: expect.stringContaining('city is required'),
            }));
            expect(next.mock.calls[0][0].message).toContain('lat is required');
        });

        test('validates types correctly', () => {
            const middleware = validateBody({
                count: { type: 'number', required: true },
            });

            const { req, res, next } = mockExpress({ count: 'not-a-number' });
            middleware(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                message: expect.stringContaining('count must be a number'),
            }));
        });

        test('passes with optional fields missing', () => {
            const middleware = validateBody({
                city: { type: 'string', required: true },
                country: { type: 'string' },
            });

            const { req, res, next } = mockExpress({ city: 'Paris' });
            middleware(req, res, next);

            expect(next).toHaveBeenCalledWith();
        });
    });

    describe('validateQuery', () => {
        test('calls next() for valid query params', () => {
            const middleware = validateQuery({
                q: { type: 'string', required: true, minLength: 1 },
            });

            const { req, res, next } = mockExpress({}, { q: 'Tokyo' });
            middleware(req, res, next);

            expect(next).toHaveBeenCalledWith();
        });

        test('coerces number types from query strings', () => {
            const middleware = validateQuery({
                limit: { type: 'number', min: 1, max: 100 },
            });

            const { req, res, next } = mockExpress({}, { limit: '50' });
            middleware(req, res, next);

            expect(next).toHaveBeenCalledWith();
            expect(req.query.limit).toBe(50);
        });

        test('rejects invalid number strings', () => {
            const middleware = validateQuery({
                limit: { type: 'number' },
            });

            const { req, res, next } = mockExpress({}, { limit: 'abc' });
            middleware(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                message: expect.stringContaining('limit must be a valid number'),
            }));
        });

        test('handles missing optional query params', () => {
            const middleware = validateQuery({
                q: { type: 'string' },
            });

            const { req, res, next } = mockExpress({}, {});
            middleware(req, res, next);

            expect(next).toHaveBeenCalledWith();
        });

        test('rejects missing required query params', () => {
            const middleware = validateQuery({
                q: { type: 'string', required: true },
            });

            const { req, res, next } = mockExpress({}, {});
            middleware(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                statusCode: 400,
            }));
        });
    });
});
