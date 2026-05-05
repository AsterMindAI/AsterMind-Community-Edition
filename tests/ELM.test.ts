import { describe, it, expect } from 'vitest';
import { ELM, UniversalEncoder } from '../src/index';

describe('ELM (core) — smoke tests', () => {
    it('text mode: train() + predict() returns labelled probabilities', () => {
        const elm = new ELM({
            categories: ['English', 'French'],
            hiddenUnits: 32,
            useTokenizer: true,
        });
        elm.train();

        const result = elm.predict('hello', 2);
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
        expect(result[0]).toHaveProperty('label');
        expect(result[0]).toHaveProperty('prob');
        expect(typeof result[0].prob).toBe('number');
        expect(['English', 'French']).toContain(result[0].label);
    });

    it('vector mode: trainFromData(X, Y) + predictFromVector', () => {
        const encoder = new UniversalEncoder({
            charSet: 'abcdefghijklmnopqrstuvwxyz ',
            maxLen: 20,
            useTokenizer: false,
        });
        const elm = new ELM({
            categories: ['low', 'high'],
            hiddenUnits: 16,
            maxLen: 20,
            useTokenizer: false,
            encoder,
        });

        const dim = encoder.getVectorSize();
        const X = [
            new Array(dim).fill(0.1),
            new Array(dim).fill(0.2),
            new Array(dim).fill(0.8),
            new Array(dim).fill(0.9),
        ];
        const Y = [
            elm.oneHot(2, 0),
            elm.oneHot(2, 0),
            elm.oneHot(2, 1),
            elm.oneHot(2, 1),
        ];

        elm.trainFromData(X, Y);
        expect(elm.model).toBeTruthy();

        const preds = elm.predictFromVector([new Array(dim).fill(0.85)]);
        expect(preds.length).toBe(1);
        expect(preds[0].length).toBeGreaterThan(0);
        expect(preds[0][0]).toHaveProperty('label');
        expect(preds[0][0]).toHaveProperty('prob');
    });

    it('throws on empty trainFromData input', () => {
        const elm = new ELM({
            categories: ['a', 'b'],
            hiddenUnits: 8,
            useTokenizer: true,
        });
        expect(() => elm.trainFromData([], [])).toThrow();
    });

    it('topK clamps to available categories', () => {
        const elm = new ELM({
            categories: ['x', 'y', 'z'],
            hiddenUnits: 8,
            useTokenizer: true,
        });
        elm.train();
        const result = elm.predict('hello', 99);
        expect(result.length).toBeLessThanOrEqual(3);
    });
});
