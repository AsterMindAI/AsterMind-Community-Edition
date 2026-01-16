// sparse-elm.ts — Sparse ELM with L1/L2 regularization and feature selection
// Efficient for high-dimensional data with interpretability

import { ELM } from '../../core/ELM.js';
import { KernelELM } from '../../core/KernelELM.js';
import type { Vec } from '../math/index.js';
// License removed - all features are now free!

export interface SparseELMOptions {
  categories: string[];
  hiddenUnits?: number;
  maxLen?: number;
  useTokenizer?: boolean;
  activation?: 'relu' | 'tanh' | 'sigmoid' | 'linear';
  regularization: {
    type: 'l1' | 'l2' | 'elastic';
    lambda: number;
    alpha?: number; // For elastic net (L1 weight)
  };
  sparsityTarget?: number; // Target sparsity ratio (0-1)
  pruneThreshold?: number; // Threshold for weight pruning
}

export interface SparseELMResult {
  label: string;
  prob: number;
}

/**
 * Sparse ELM with regularization and feature selection
 * Features:
 * - L1/L2/Elastic net regularization
 * - Weight pruning for sparsity
 * - Feature importance ranking
 * - Interpretable models
 */
export class SparseELM {
  private elm: ELM;
  private options: Required<SparseELMOptions>;
  private trained = false;
  private weightMask: boolean[][] = []; // Track which weights are active
  private featureImportance: number[] = [];

  constructor(options: SparseELMOptions) {
    // License check removed // Premium feature - requires valid license
    this.options = {
      categories: options.categories,
      hiddenUnits: options.hiddenUnits ?? 256,
      maxLen: options.maxLen ?? 100,
      useTokenizer: options.useTokenizer ?? true,
      activation: options.activation ?? 'relu',
      regularization: {
        type: options.regularization.type,
        lambda: options.regularization.lambda,
        alpha: options.regularization.alpha ?? 0.5,
      },
      sparsityTarget: options.sparsityTarget ?? 0.5,
      pruneThreshold: options.pruneThreshold ?? 1e-6,
    };

    this.elm = new ELM({
      useTokenizer: this.options.useTokenizer ? true : undefined,
      hiddenUnits: this.options.hiddenUnits,
      categories: this.options.categories,
      maxLen: this.options.maxLen,
      activation: this.options.activation,
    } as any);
  }

  /**
   * Train sparse ELM with regularization
   */
  train(X: number[][], y: number[] | string[]): void {
    // Prepare labels
    const labelIndices = y.map(label => 
      typeof label === 'number' 
        ? label 
        : this.options.categories.indexOf(label as string)
    );

    // Encode inputs
    const encoded = this.options.useTokenizer
      ? X.map(x => {
          const enc = (this.elm as any).encoder?.encode?.(x) || x;
          return (this.elm as any).encoder?.normalize?.(enc) || enc;
        })
      : X;

    // Train base ELM
    (this.elm as any).setCategories?.(this.options.categories);
    (this.elm as any).trainFromData?.(encoded, labelIndices);

    // Apply regularization and sparsification
    this._applyRegularization();
    this._pruneWeights();
    this._computeFeatureImportance();

    this.trained = true;
  }

  /**
   * Predict with sparse model
   */
  predict(X: number[] | number[][], topK: number = 3): SparseELMResult[] {
    if (!this.trained) {
      throw new Error('Model must be trained before prediction');
    }

    // Use base ELM for prediction (sparsity is in weights)
    const XArray = Array.isArray(X[0]) ? (X as number[][]) : [X as number[]];
    const preds = (this.elm as any).predictFromVector?.(XArray, topK) || [];
    return preds.map((pred: any) => ({
      label: pred.label || this.options.categories[pred.index || 0],
      prob: pred.prob || 0,
    }));
  }

  /**
   * Apply regularization to weights
   */
  private _applyRegularization(): void {
    const model = (this.elm as any).model;
    if (!model || !model.W) return;

    const W = model.W;
    const lambda = this.options.regularization.lambda;
    const alpha = this.options.regularization.alpha || 0.5;

    // Apply regularization
    for (let i = 0; i < W.length; i++) {
      for (let j = 0; j < W[i].length; j++) {
        const w = W[i][j];
        
        if (this.options.regularization.type === 'l1') {
          // L1: soft thresholding
          const sign = w >= 0 ? 1 : -1;
          W[i][j] = sign * Math.max(0, Math.abs(w) - lambda);
        } else if (this.options.regularization.type === 'l2') {
          // L2: shrinkage
          W[i][j] = w / (1 + lambda);
        } else if (this.options.regularization.type === 'elastic') {
          // Elastic net: combination
          const l1 = alpha * lambda;
          const l2 = (1 - alpha) * lambda;
          const sign = w >= 0 ? 1 : -1;
          const softThresh = sign * Math.max(0, Math.abs(w) - l1);
          W[i][j] = softThresh / (1 + l2);
        }
      }
    }
  }

  /**
   * Prune small weights for sparsity
   */
  private _pruneWeights(): void {
    const model = (this.elm as any).model;
    if (!model || !model.W) return;

    const W = model.W;
    const threshold = this.options.pruneThreshold;
    this.weightMask = [];

    // Prune weights below threshold
    for (let i = 0; i < W.length; i++) {
      this.weightMask[i] = [];
      for (let j = 0; j < W[i].length; j++) {
        if (Math.abs(W[i][j]) < threshold) {
          W[i][j] = 0;
          this.weightMask[i][j] = false;
        } else {
          this.weightMask[i][j] = true;
        }
      }
    }

    // Enforce sparsity target
    const currentSparsity = this._computeSparsity();
    if (currentSparsity < this.options.sparsityTarget) {
      this._enforceSparsityTarget();
    }
  }

  /**
   * Compute current sparsity ratio
   */
  private _computeSparsity(): number {
    if (this.weightMask.length === 0) return 0;
    
    let total = 0;
    let zeros = 0;
    
    for (const row of this.weightMask) {
      for (const active of row) {
        total++;
        if (!active) zeros++;
      }
    }
    
    return total > 0 ? zeros / total : 0;
  }

  /**
   * Enforce target sparsity by pruning more weights
   */
  private _enforceSparsityTarget(): void {
    const model = (this.elm as any).model;
    if (!model || !model.W) return;

    const W = model.W;
    const target = this.options.sparsityTarget;
    
    // Collect all weights with their absolute values
    const weights: Array<{ i: number; j: number; abs: number }> = [];
    for (let i = 0; i < W.length; i++) {
      for (let j = 0; j < W[i].length; j++) {
        if (Math.abs(W[i][j]) > 0) {
          weights.push({ i, j, abs: Math.abs(W[i][j]) });
        }
      }
    }
    
    // Sort by absolute value
    weights.sort((a, b) => a.abs - b.abs);
    
    // Prune smallest weights to reach target
    const totalWeights = W.length * (W[0]?.length || 0);
    const targetZeros = Math.floor(totalWeights * target);
    const currentZeros = totalWeights - weights.length;
    const needToPrune = targetZeros - currentZeros;
    
    for (let k = 0; k < Math.min(needToPrune, weights.length); k++) {
      const { i, j } = weights[k];
      W[i][j] = 0;
      if (this.weightMask[i]) {
        this.weightMask[i][j] = false;
      }
    }
  }

  /**
   * Compute feature importance based on weight magnitudes
   */
  private _computeFeatureImportance(): void {
    const model = (this.elm as any).model;
    if (!model || !model.W) return;

    const W = model.W;
    const inputDim = W[0]?.length || 0;
    this.featureImportance = new Array(inputDim).fill(0);

    // Sum absolute weights for each input feature
    for (let i = 0; i < W.length; i++) {
      for (let j = 0; j < W[i].length; j++) {
        this.featureImportance[j] += Math.abs(W[i][j]);
      }
    }

    // Normalize
    const max = Math.max(...this.featureImportance);
    if (max > 0) {
      for (let i = 0; i < this.featureImportance.length; i++) {
        this.featureImportance[i] /= max;
      }
    }
  }

  /**
   * Get feature importance scores
   */
  getFeatureImportance(): number[] {
    return [...this.featureImportance];
  }

  /**
   * Get sparsity statistics
   */
  getSparsityStats(): { sparsity: number; activeWeights: number; totalWeights: number } {
    const model = (this.elm as any).model;
    if (!model || !model.W) {
      return { sparsity: 0, activeWeights: 0, totalWeights: 0 };
    }

    const W = model.W;
    let total = 0;
    let active = 0;

    for (let i = 0; i < W.length; i++) {
      for (let j = 0; j < W[i].length; j++) {
        total++;
        if (Math.abs(W[i][j]) > this.options.pruneThreshold) {
          active++;
        }
      }
    }

    return {
      sparsity: total > 0 ? 1 - active / total : 0,
      activeWeights: active,
      totalWeights: total,
    };
  }
}

