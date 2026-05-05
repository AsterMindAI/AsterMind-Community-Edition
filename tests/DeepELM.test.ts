import { describe, it, expect } from 'vitest';
import { DeepELM } from '../src/index';

describe('DeepELM — smoke tests', () => {
    const X = [
        [0.1, 0.1, 0.1, 0.1],
        [0.2, 0.2, 0.2, 0.2],
        [0.8, 0.8, 0.8, 0.8],
        [0.9, 0.9, 0.9, 0.9],
    ];
    const Y = [
        [1, 0],
        [1, 0],
        [0, 1],
        [0, 1],
    ];

    it('combined fit (autoencoders + classifier) + predictProba', () => {
        const deep = new DeepELM({
            inputDim: 4,
            layers: [{ hiddenUnits: 8 }, { hiddenUnits: 4 }],
            numClasses: 2,
        });
        deep.fit(X, Y);

        const probs = deep.predictProba([[0.5, 0.5, 0.5, 0.5]]);
        expect(probs.length).toBe(1);
        expect(probs[0].length).toBe(2);
    });

    it('toJSON / fromJSON round-trip preserves predictions shape', () => {
        const deep = new DeepELM({
            inputDim: 2,
            layers: [{ hiddenUnits: 4 }],
            numClasses: 2,
        });
        deep.fit(
            [[0.1, 0.1], [0.9, 0.9]],
            [[1, 0], [0, 1]],
        );
        const json = deep.toJSON();
        expect(json).toBeTruthy();

        const deep2 = new DeepELM({
            inputDim: 2,
            layers: [{ hiddenUnits: 4 }],
            numClasses: 2,
        });
        deep2.fromJSON(json);
        const probs = deep2.predictProba([[0.5, 0.5]]);
        expect(probs.length).toBe(1);
        expect(probs[0].length).toBe(2);
    });

    it('transform() produces a feature vector from inputs', () => {
        const deep = new DeepELM({
            inputDim: 4,
            layers: [{ hiddenUnits: 8 }, { hiddenUnits: 4 }],
            numClasses: 2,
        });
        deep.fit(X, Y);

        const features = deep.transform([[0.5, 0.5, 0.5, 0.5]]);
        expect(features.length).toBe(1);
        expect(features[0].length).toBeGreaterThan(0);
    });
});
