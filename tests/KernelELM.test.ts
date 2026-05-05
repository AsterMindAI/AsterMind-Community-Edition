import { describe, it, expect } from 'vitest';
import { KernelELM } from '../src/index';

describe('KernelELM — smoke tests', () => {
    const X = [
        [0.1, 0.1],
        [0.2, 0.2],
        [0.8, 0.8],
        [0.9, 0.9],
    ];
    const Y = [
        [1, 0],
        [1, 0],
        [0, 1],
        [0, 1],
    ];

    it('exact mode with RBF kernel: fit + predict', () => {
        const kelm = new KernelELM({
            outputDim: 2,
            kernel: { type: 'rbf', gamma: 1.0 },
            mode: 'exact',
            ridgeLambda: 1e-2,
        });
        kelm.fit(X, Y);

        const probs = kelm.predictProbaFromVectors([[0.85, 0.85]]);
        expect(probs.length).toBe(1);
        expect(probs[0].length).toBe(2);
        expect(probs[0][0]).toBeGreaterThanOrEqual(0);
        expect(probs[0][0]).toBeLessThanOrEqual(1);
        expect(probs[0][1]).toBeGreaterThanOrEqual(0);
        expect(probs[0][1]).toBeLessThanOrEqual(1);
    });

    it('Nyström mode with whitening: fit + predict', () => {
        const kelm = new KernelELM({
            outputDim: 2,
            kernel: { type: 'rbf', gamma: 1.0 },
            mode: 'nystrom',
            nystrom: { m: 4, strategy: 'uniform', whiten: true },
            ridgeLambda: 1e-2,
        });
        kelm.fit(X, Y);

        const probs = kelm.predictProbaFromVectors([[0.85, 0.85]]);
        expect(probs.length).toBe(1);
        expect(probs[0].length).toBe(2);
    });

    it('linear kernel: fit + predict', () => {
        const kelm = new KernelELM({
            outputDim: 2,
            kernel: { type: 'linear' },
            mode: 'exact',
            ridgeLambda: 1e-2,
        });
        kelm.fit(X, Y);

        const probs = kelm.predictProbaFromVectors([[0.5, 0.5]]);
        expect(probs[0].length).toBe(2);
    });
});
