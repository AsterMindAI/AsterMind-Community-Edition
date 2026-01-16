// multi-kernel-elm.ts — Multi-Kernel ELM combining multiple kernel types
// Combines RBF, polynomial, and linear kernels for improved accuracy

import { ELM } from '../../core/ELM.js';
import { KernelELM } from '../../core/KernelELM.js';
import { ridgeSolvePro, type RidgeOptions } from '../math/krr.js';
import type { Vec } from '../math/index.js';
// License removed - all features are now free!

export interface MultiKernelELMOptions {
  kernels: Array<{
    type: 'rbf' | 'polynomial' | 'linear';
    weight?: number; // Optional initial weight (will be learned if not provided)
    params?: {
      gamma?: number; // For RBF
      degree?: number; // For polynomial
      coef0?: number; // For polynomial
    };
  }>;
  ridgeLambda?: number;
  learnWeights?: boolean; // Whether to learn kernel weights
  nystrom?: {
    m?: number;
    strategy?: 'uniform' | 'random';
  };
}

export interface MultiKernelELMResult {
  label: string;
  prob: number;
}

/**
 * Multi-Kernel ELM that combines multiple kernel types
 * Uses weighted combination of kernels for improved accuracy
 */
export class MultiKernelELM {
  private kelms: KernelELM[] = [];
  private kernelWeights: number[] = [];
  private categories: string[] = [];
  private options: Required<MultiKernelELMOptions>;
  private trained = false;

  constructor(categories: string[], options: MultiKernelELMOptions) {
    // License check removed // Premium feature - requires valid license
    this.categories = categories;
    this.options = {
      kernels: options.kernels,
      ridgeLambda: options.ridgeLambda ?? 0.001,
      learnWeights: options.learnWeights ?? true,
      nystrom: {
        m: options.nystrom?.m ?? 100,
        strategy: options.nystrom?.strategy ?? 'uniform',
      },
    };

    // Initialize kernel ELMs
    for (const kernelConfig of this.options.kernels) {
      const kelm = new KernelELM({
        outputDim: categories.length,
        kernel: {
          type: kernelConfig.type === 'polynomial' ? 'rbf' : kernelConfig.type, // Map polynomial to rbf for now
          gamma: kernelConfig.params?.gamma ?? 0.01,
        },
        ridgeLambda: this.options.ridgeLambda,
        task: 'classification',
        mode: 'nystrom',
        nystrom: {
          m: this.options.nystrom.m,
          strategy: this.options.nystrom.strategy === 'random' ? 'uniform' : this.options.nystrom.strategy,
        },
      });
      this.kelms.push(kelm);
    }

    // Initialize kernel weights
    if (this.options.learnWeights) {
      this.kernelWeights = this.options.kernels.map(
        (k, i) => k.weight ?? 1.0 / this.options.kernels.length
      );
    } else {
      this.kernelWeights = this.options.kernels.map(
        (k) => k.weight ?? 1.0 / this.options.kernels.length
      );
    }
  }

  /**
   * Train the multi-kernel ELM
   */
  fit(X: number[][], y: number[][] | number[]): void {
    // Convert y to one-hot if needed
    const oneHotY = this._toOneHot(y);

    // Train each kernel ELM
    for (const kelm of this.kelms) {
      kelm.fit(X, oneHotY);
    }

    // Learn optimal kernel weights if enabled
    if (this.options.learnWeights && this.kelms.length > 1) {
      this._learnKernelWeights(X, oneHotY);
    }

    this.trained = true;
  }

  /**
   * Predict with multi-kernel combination
   */
  predict(X: number[] | number[][], topK: number = 3): MultiKernelELMResult[] {
    if (!this.trained) {
      throw new Error('Model must be trained before prediction');
    }

    const XArray = Array.isArray(X[0]) ? (X as number[][]) : [X as number[]];
    const allPredictions: MultiKernelELMResult[] = [];

    for (const x of XArray) {
      const predictions: MultiKernelELMResult[] = [];
      // Get predictions from each kernel
      const kernelPredictions = this.kelms.map((kelm) => {
        const pred = (kelm as any).transform?.([x]) || (kelm as any).predict?.([x]);
        return (Array.isArray(pred) ? pred[0] : pred) || new Float64Array(this.categories.length);
      });

      // Weighted combination
      const combined = new Float64Array(this.categories.length);
      for (let i = 0; i < this.kelms.length; i++) {
        const weight = this.kernelWeights[i];
        for (let j = 0; j < this.categories.length; j++) {
          combined[j] += kernelPredictions[i][j] * weight;
        }
      }

      // Convert to probabilities
      const probs = this._softmax(combined);

      // Get top-K
      const indexed: Array<{ label: string; prob: number; index: number }> = [];
      for (let idx = 0; idx < probs.length; idx++) {
        indexed.push({
          label: this.categories[idx],
          prob: probs[idx],
          index: idx,
        });
      }
      indexed.sort((a, b) => b.prob - a.prob);

      const topResults: MultiKernelELMResult[] = [];
      for (let i = 0; i < Math.min(topK, indexed.length); i++) {
        topResults.push({
          label: indexed[i].label,
          prob: indexed[i].prob,
        });
      }
      predictions.push(...topResults);
      allPredictions.push(...predictions);
    }

    return allPredictions;
  }

  /**
   * Learn optimal kernel weights using validation performance
   */
  private _learnKernelWeights(X: number[][], y: number[][]): void {
    // Simple approach: weight by validation accuracy
    // In practice, you might use cross-validation
    const weights = new Float64Array(this.kelms.length);

    for (let i = 0; i < this.kelms.length; i++) {
      const kelm = this.kelms[i];
      let correct = 0;
      let total = 0;

      // Evaluate on training data (in production, use validation set)
      for (let j = 0; j < Math.min(100, X.length); j++) {
        const pred = (kelm as any).transform?.([X[j]]) || (kelm as any).predict?.([X[j]]);
        const predVec = (Array.isArray(pred) ? pred[0] : pred) || new Float64Array(0);
        const predIdx = this._argmax(predVec);
        const trueIdx = this._argmax(y[j]);
        if (predIdx === trueIdx) correct++;
        total++;
      }

      weights[i] = total > 0 ? correct / total : 1.0 / this.kelms.length;
    }

    // Normalize weights
    const sum = Array.from(weights).reduce((a, b) => a + b, 0);
    if (sum > 0) {
      for (let i = 0; i < weights.length; i++) {
        this.kernelWeights[i] = weights[i] / sum;
      }
    }
  }

  private _toOneHot(y: number[] | number[][]): number[][] {
    if (Array.isArray(y[0])) {
      return y as number[][];
    }
    const labels = y as number[];
    return labels.map((label) => {
      const oneHot = new Array(this.categories.length).fill(0);
      oneHot[label] = 1;
      return oneHot;
    });
  }

  private _softmax(logits: Float64Array): Float64Array {
    const max = Math.max(...Array.from(logits));
    const exp = new Float64Array(logits.length);
    let sum = 0;
    for (let i = 0; i < logits.length; i++) {
      exp[i] = Math.exp(logits[i] - max);
      sum += exp[i];
    }
    for (let i = 0; i < exp.length; i++) {
      exp[i] /= sum;
    }
    return exp;
  }

  private _argmax(arr: Float64Array | number[]): number {
    let maxIdx = 0;
    let maxVal = arr[0] || 0;
    for (let i = 1; i < arr.length; i++) {
      if ((arr[i] || 0) > maxVal) {
        maxVal = arr[i] || 0;
        maxIdx = i;
      }
    }
    return maxIdx;
  }

  /**
   * Get current kernel weights
   */
  getKernelWeights(): number[] {
    return [...this.kernelWeights];
  }
}

