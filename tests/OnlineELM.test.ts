import { describe, it, expect } from 'vitest';
import { OnlineELM } from '../src/index';

describe('OnlineELM — smoke tests', () => {
    it('init + update + predict on streaming-shaped data', () => {
        const ol = new OnlineELM({
            inputDim: 4,
            outputDim: 2,
            hiddenUnits: 16,
        });

        const X0 = [
            [0.1, 0.1, 0.1, 0.1],
            [0.2, 0.2, 0.2, 0.2],
            [0.8, 0.8, 0.8, 0.8],
            [0.9, 0.9, 0.9, 0.9],
        ];
        const Y0 = [
            [1, 0],
            [1, 0],
            [0, 1],
            [0, 1],
        ];
        ol.init(X0, Y0);

        // Streaming update
        ol.update([[0.85, 0.85, 0.85, 0.85]], [[0, 1]]);

        const probs = ol.predictProbaFromVectors([[0.5, 0.5, 0.5, 0.5]]);
        expect(probs.length).toBe(1);
        expect(probs[0].length).toBe(2);
    });

    it('throws on init with mismatched X/Y row counts', () => {
        const ol = new OnlineELM({ inputDim: 2, outputDim: 2, hiddenUnits: 8 });
        expect(() =>
            ol.init([[0.1, 0.1]], [[1, 0], [0, 1]]),
        ).toThrow();
    });

    it('throws on init with wrong X column dim', () => {
        const ol = new OnlineELM({ inputDim: 4, outputDim: 2, hiddenUnits: 8 });
        expect(() =>
            ol.init([[0.1, 0.1]], [[1, 0]]),
        ).toThrow();
    });

    it('forgetting factor accepted in config', () => {
        const ol = new OnlineELM({
            inputDim: 2,
            outputDim: 2,
            hiddenUnits: 8,
            forgettingFactor: 0.95,
        });
        ol.init([[0.1, 0.1], [0.9, 0.9]], [[1, 0], [0, 1]]);
        const probs = ol.predictProbaFromVectors([[0.5, 0.5]]);
        expect(probs[0].length).toBe(2);
    });
});
