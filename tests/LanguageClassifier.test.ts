import { describe, it, expect } from 'vitest';
import { LanguageClassifier } from '../src/index';

describe('LanguageClassifier — smoke tests', () => {
    it('train + predict returns labelled probabilities', () => {
        const clf = new LanguageClassifier({
            categories: ['English', 'French'],
            hiddenUnits: 16,
            useTokenizer: true,
        });

        clf.train([
            { text: 'hello world', label: 'English' },
            { text: 'good morning friend', label: 'English' },
            { text: 'bonjour monde', label: 'French' },
            { text: 'merci beaucoup ami', label: 'French' },
        ]);

        const result = clf.predict('hello', 2);
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
        expect(result[0]).toHaveProperty('label');
        expect(result[0]).toHaveProperty('prob');
        expect(['English', 'French']).toContain(result[0].label);
    });

    it('throws on empty training input', () => {
        const clf = new LanguageClassifier({
            categories: ['a', 'b'],
            hiddenUnits: 8,
            useTokenizer: true,
        });
        expect(() => clf.train([])).toThrow();
    });
});
