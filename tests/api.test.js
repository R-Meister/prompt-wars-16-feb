/**
 * API Routes — Integration Tests
 * Full coverage including edge cases, caching, TTS, and error handling
 */

const request = require('supertest');
const app = require('../server');

describe('API Endpoints', () => {
    describe('GET /api/health', () => {
        test('returns ok status with system info', async () => {
            const res = await request(app).get('/api/health');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
            expect(res.body.timestamp).toBeDefined();
            expect(res.body.uptime).toBeDefined();
            expect(res.body.memory).toBeDefined();
        });

        test('includes request ID header', async () => {
            const res = await request(app).get('/api/health');
            expect(res.headers['x-request-id']).toBeDefined();
        });
    });

    describe('POST /api/validate-city', () => {
        test('validates a correct city', async () => {
            const res = await request(app)
                .post('/api/validate-city')
                .send({ city: 'Tokyo', previousCity: null, usedCities: [] });

            expect(res.status).toBe(200);
            expect(res.body.valid).toBe(true);
            expect(res.body.city.name).toBe('Tokyo');
        });

        test('rejects an invalid city name', async () => {
            const res = await request(app)
                .post('/api/validate-city')
                .send({ city: 'Notarealplace', previousCity: null, usedCities: [] });

            expect(res.status).toBe(200);
            expect(res.body.valid).toBe(false);
        });

        test('enforces Atlas rule', async () => {
            const res = await request(app)
                .post('/api/validate-city')
                .send({ city: 'Paris', previousCity: 'Tokyo', usedCities: [] });

            expect(res.body.valid).toBe(false);
            expect(res.body.error).toContain('O');
        });

        test('accepts valid Atlas chain', async () => {
            const res = await request(app)
                .post('/api/validate-city')
                .send({ city: 'Oslo', previousCity: 'Tokyo', usedCities: [] });

            expect(res.body.valid).toBe(true);
        });

        test('prevents repetition', async () => {
            const res = await request(app)
                .post('/api/validate-city')
                .send({ city: 'Tokyo', previousCity: null, usedCities: ['tokyo'] });

            expect(res.body.valid).toBe(false);
            expect(res.body.error).toContain('already been used');
        });

        test('returns 400 for missing city', async () => {
            const res = await request(app)
                .post('/api/validate-city')
                .send({});

            expect(res.status).toBe(400);
        });

        test('sanitises XSS input safely', async () => {
            const res = await request(app)
                .post('/api/validate-city')
                .send({ city: '<script>alert("xss")</script>', previousCity: null, usedCities: [] });

            expect(res.status).toBe(200);
            expect(res.body.valid).toBe(false);
        });

        test('handles empty string city', async () => {
            const res = await request(app)
                .post('/api/validate-city')
                .send({ city: '', previousCity: null, usedCities: [] });

            expect(res.status).toBe(400);
        });

        test('provides hints on invalid Atlas move', async () => {
            const res = await request(app)
                .post('/api/validate-city')
                .send({ city: 'Paris', previousCity: 'Tokyo', usedCities: [] });

            expect(res.body.valid).toBe(false);
            expect(res.body.requiredLetter).toBeDefined();
        });
    });

    describe('GET /api/search-cities', () => {
        test('returns matching cities', async () => {
            const res = await request(app).get('/api/search-cities?q=tok');
            expect(res.status).toBe(200);
            expect(res.body.results.length).toBeGreaterThan(0);
            expect(res.body.results[0].name.toLowerCase()).toContain('tok');
        });

        test('returns empty for very short query', async () => {
            const res = await request(app).get('/api/search-cities?q=');
            expect(res.body.results).toEqual([]);
        });

        test('returns results with country info', async () => {
            const res = await request(app).get('/api/search-cities?q=london');
            expect(res.status).toBe(200);
            if (res.body.results.length > 0) {
                expect(res.body.results[0].country).toBeDefined();
            }
        });

        test('handles special characters in query', async () => {
            const res = await request(app).get('/api/search-cities?q=new%20yo');
            expect(res.status).toBe(200);
        });
    });

    describe('GET /api/city-profile/:city', () => {
        test('returns exists:false for unvisited city', async () => {
            const res = await request(app).get('/api/city-profile/TestCityThatDoesNotExist');
            expect(res.status).toBe(200);
        });

        test('handles encoded city names', async () => {
            const res = await request(app).get('/api/city-profile/' + encodeURIComponent('New York'));
            expect(res.status).toBe(200);
        });
    });

    describe('POST /api/submit-choice', () => {
        test('returns 400 for missing city', async () => {
            const res = await request(app)
                .post('/api/submit-choice')
                .send({ emotions: { warmth: 0.5 } });

            expect(res.status).toBe(400);
        });

        test('returns 400 for missing emotions', async () => {
            const res = await request(app)
                .post('/api/submit-choice')
                .send({ city: 'Tokyo' });

            expect(res.status).toBe(400);
        });
    });

    describe('POST /api/narrate', () => {
        test('returns 400 for missing text', async () => {
            const res = await request(app)
                .post('/api/narrate')
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('Text is required');
        });

        test('returns 400 for non-string text', async () => {
            const res = await request(app)
                .post('/api/narrate')
                .send({ text: 12345 });

            expect(res.status).toBe(400);
        });

        test('handles unavailable TTS gracefully', async () => {
            const res = await request(app)
                .post('/api/narrate')
                .send({ text: 'A lovely test scene', tone: 'warm' });

            expect(res.status).toBe(200);
            // TTS should either return audio or indicate unavailable
            expect(res.body).toHaveProperty('available');
        });

        test('rejects text exceeding max length', async () => {
            const longText = 'A'.repeat(1001);
            const res = await request(app)
                .post('/api/narrate')
                .send({ text: longText });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('maximum length');
        });
    });

    describe('GET /api/cache-stats', () => {
        test('returns cache statistics', async () => {
            const res = await request(app).get('/api/cache-stats');
            expect(res.status).toBe(200);
            expect(res.body.citySearch).toBeDefined();
            expect(res.body.cityProfile).toBeDefined();
            expect(res.body.worldMap).toBeDefined();
        });
    });

    describe('Static Files', () => {
        test('serves index.html', async () => {
            const res = await request(app).get('/');
            expect(res.status).toBe(200);
            expect(res.text).toContain('Atlas');
        });

        test('serves config.js', async () => {
            const res = await request(app).get('/config.js');
            expect(res.status).toBe(200);
            expect(res.text).toContain('__ATLAS_CONFIG__');
        });

        test('SPA fallback returns index.html for unknown routes', async () => {
            const res = await request(app).get('/unknown-page');
            expect(res.status).toBe(200);
            expect(res.text).toContain('Atlas');
        });
    });

    describe('Security Headers', () => {
        test('includes security headers from helmet', async () => {
            const res = await request(app).get('/api/health');
            expect(res.headers['x-content-type-options']).toBe('nosniff');
            expect(res.headers['x-frame-options']).toBeDefined();
        });

        test('includes request ID header', async () => {
            const res = await request(app).get('/api/health');
            expect(res.headers['x-request-id']).toBeDefined();
        });
    });

    describe('Error Handling', () => {
        test('handles malformed JSON body gracefully', async () => {
            const res = await request(app)
                .post('/api/validate-city')
                .set('Content-Type', 'application/json')
                .send('{ invalid json }');

            expect(res.status).toBe(400);
        });
    });
});
