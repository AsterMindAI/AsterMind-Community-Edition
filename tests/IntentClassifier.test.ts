import { describe, it, expect } from 'vitest';
import { IntentClassifier } from '../src/index';

describe('IntentClassifier — smoke tests', () => {
    it('train + predict returns labelled probabilities from this lesson scope', () => {
        const intents = ['greeting', 'farewell'];
        const clf = new IntentClassifier({
            categories: intents,
            hiddenUnits: 16,
            useTokenizer: true,
            activation: 'relu',
        });

        clf.train([
            { text: 'hello there friend', label: 'greeting' },
            { text: 'hi everyone good morning', label: 'greeting' },
            { text: 'goodbye now take care', label: 'farewell' },
            { text: 'see you later bye', label: 'farewell' },
        ]);

        const result = clf.predict('hi', 1);
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
        expect(result[0]).toHaveProperty('label');
        expect(result[0]).toHaveProperty('prob');
        expect(intents).toContain(result[0].label);
    });

    it('predictBatch returns one result-list per input', () => {
        const clf = new IntentClassifier({
            categories: ['a', 'b'],
            hiddenUnits: 8,
            useTokenizer: true,
            activation: 'relu',
        });
        clf.train([
            { text: 'aa aa aa', label: 'a' },
            { text: 'bb bb bb', label: 'b' },
        ]);

        const results = clf.predictBatch(['aa', 'bb', 'aa bb'], 1);
        expect(results.length).toBe(3);
        results.forEach((r) => {
            expect(Array.isArray(r)).toBe(true);
            expect(r.length).toBeGreaterThan(0);
        });
    });

    it('throws on empty training input', () => {
        const clf = new IntentClassifier({
            categories: ['x', 'y'],
            hiddenUnits: 8,
            useTokenizer: true,
            activation: 'relu',
        });
        expect(() => clf.train([])).toThrow();
    });
});
