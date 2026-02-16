/**
 * Tests for Sentiment Analysis Service
 * Tests Google Cloud Natural Language API integration with mocked client.
 */

// Mock @google-cloud/language
const mockAnalyzeSentiment = jest.fn();
jest.mock('@google-cloud/language', () => ({
    LanguageServiceClient: jest.fn().mockImplementation(() => ({
        analyzeSentiment: mockAnalyzeSentiment,
    })),
}));

// Mock logger
jest.mock('../src/utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

let sentimentService;
beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    jest.isolateModules(() => {
        sentimentService = require('../src/services/sentimentService');
    });
});

describe('Sentiment Service', () => {
    describe('analyzeSentiment', () => {
        test('returns score and magnitude for valid text', async () => {
            mockAnalyzeSentiment.mockResolvedValueOnce([{
                documentSentiment: { score: 0.8, magnitude: 1.5 },
            }]);

            const result = await sentimentService.analyzeSentiment('This city is beautiful and warm');
            expect(result).toEqual({ score: 0.8, magnitude: 1.5 });
        });

        test('returns null for empty text', async () => {
            const result = await sentimentService.analyzeSentiment('');
            expect(result).toBeNull();
        });

        test('returns null for null text', async () => {
            const result = await sentimentService.analyzeSentiment(null);
            expect(result).toBeNull();
        });

        test('returns null for whitespace-only text', async () => {
            const result = await sentimentService.analyzeSentiment('   ');
            expect(result).toBeNull();
        });

        test('returns null for non-string input', async () => {
            const result = await sentimentService.analyzeSentiment(42);
            expect(result).toBeNull();
        });

        test('handles API error gracefully', async () => {
            mockAnalyzeSentiment.mockRejectedValueOnce(new Error('Network error'));
            const result = await sentimentService.analyzeSentiment('Some text');
            expect(result).toBeNull();
        });

        test('truncates text over 2000 characters', async () => {
            const longText = 'word '.repeat(500);
            mockAnalyzeSentiment.mockResolvedValueOnce([{
                documentSentiment: { score: 0.1, magnitude: 0.5 },
            }]);

            await sentimentService.analyzeSentiment(longText);

            expect(mockAnalyzeSentiment).toHaveBeenCalledWith({
                document: {
                    content: expect.any(String),
                    type: 'PLAIN_TEXT',
                },
            });
            const content = mockAnalyzeSentiment.mock.calls[0][0].document.content;
            expect(content.length).toBeLessThanOrEqual(2000);
        });
    });

    describe('mapSentimentToEmotions', () => {
        test('positive sentiment boosts warmth and belonging', () => {
            const emotions = sentimentService.mapSentimentToEmotions(0.7, 2.0);
            expect(emotions.warmth).toBeGreaterThan(emotions.tension);
            expect(emotions.belonging).toBeGreaterThan(emotions.loneliness);
        });

        test('negative sentiment boosts tension and loneliness', () => {
            const emotions = sentimentService.mapSentimentToEmotions(-0.7, 2.0);
            expect(emotions.tension).toBeGreaterThan(emotions.warmth);
            expect(emotions.loneliness).toBeGreaterThan(emotions.belonging);
        });

        test('neutral sentiment boosts nostalgia', () => {
            const emotions = sentimentService.mapSentimentToEmotions(0, 1.5);
            expect(emotions.nostalgia).toBeGreaterThanOrEqual(emotions.tension);
        });

        test('all emotions sum to approximately 1', () => {
            const emotions = sentimentService.mapSentimentToEmotions(0.5, 1.0);
            const sum = Object.values(emotions).reduce((s, v) => s + v, 0);
            expect(sum).toBeCloseTo(1.0, 0);
        });

        test('all emotions are between 0 and 1', () => {
            const testCases = [
                [1.0, 3.0],
                [-1.0, 3.0],
                [0, 0],
                [0.5, 1.5],
                [-0.5, 0.5],
            ];

            testCases.forEach(([score, mag]) => {
                const emotions = sentimentService.mapSentimentToEmotions(score, mag);
                Object.values(emotions).forEach((v) => {
                    expect(v).toBeGreaterThanOrEqual(0);
                    expect(v).toBeLessThanOrEqual(1);
                });
            });
        });

        test('zero magnitude returns near-equal distribution', () => {
            const emotions = sentimentService.mapSentimentToEmotions(0, 0);
            const values = Object.values(emotions);
            const avg = values.reduce((s, v) => s + v, 0) / values.length;
            values.forEach((v) => expect(v).toBeCloseTo(avg, 1));
        });

        test('returns all five emotion keys', () => {
            const emotions = sentimentService.mapSentimentToEmotions(0.5, 1.0);
            expect(Object.keys(emotions)).toEqual(
                expect.arrayContaining(['warmth', 'loneliness', 'tension', 'nostalgia', 'belonging']),
            );
            expect(Object.keys(emotions)).toHaveLength(5);
        });
    });

    describe('extractEmotions', () => {
        test('returns emotions and sentiment for valid text', async () => {
            mockAnalyzeSentiment.mockResolvedValueOnce([{
                documentSentiment: { score: 0.6, magnitude: 1.2 },
            }]);

            const result = await sentimentService.extractEmotions('A beautiful sunny day');
            expect(result).toBeTruthy();
            expect(result.sentiment).toEqual({ score: 0.6, magnitude: 1.2 });
            expect(result.emotions).toHaveProperty('warmth');
            expect(result.emotions).toHaveProperty('loneliness');
        });

        test('returns null when sentiment analysis fails', async () => {
            const result = await sentimentService.extractEmotions('');
            expect(result).toBeNull();
        });

        test('returns null when API errors', async () => {
            mockAnalyzeSentiment.mockRejectedValueOnce(new Error('Quota exceeded'));
            const result = await sentimentService.extractEmotions('Some text');
            expect(result).toBeNull();
        });
    });
});
