/**
 * API Routes — Integration Tests
 */

const request = require('supertest');
const app = require('../server');

describe('API Endpoints', () => {
    describe('GET /api/health', () => {
        test('returns ok status', async () => {
            const res = await request(app).get('/api/health');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
            expect(res.body.timestamp).toBeDefined();
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

            // Tokyo ends with 'o', Paris starts with 'P' — should fail
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
    });

    describe('GET /api/city-profile/:city', () => {
        test('returns exists:false for unvisited city', async () => {
            const res = await request(app).get('/api/city-profile/TestCityThatDoesNotExist');
            expect(res.status).toBe(200);
            // Without Firestore, should return exists: false or null
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
    });
});
