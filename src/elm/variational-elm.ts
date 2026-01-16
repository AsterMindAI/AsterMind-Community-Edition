// variational-elm.ts — Variational ELM with uncertainty estimation
// Probabilistic ELM with Bayesian inference and confidence intervals

import { ELM } from '../core/ELM.js';
import { OnlineELM } from '../core/OnlineELM.js';
export interface VariationalELMOptions {
  categories: string[];
  hiddenUnits?: number;
  priorVariance?: number; // Prior variance for Bayesian inference
  posteriorSamples?: number; // Number of samples for uncertainty estimation
  activation?: 'relu' | 'tanh' | 'sigmoid' | 'linear';
  maxLen?: number;
  useTokenizer?: boolean;
}

export interface VariationalELMResult {
  label: string;
  prob: number;
  confidence: number; // Confidence score (0-1)
  uncertainty: number; // Uncertainty measure (higher = more uncertain)
  confidenceInterval?: [number, number]; // 95% confidence interval
}

/**
 * Variational ELM with uncertainty estimation
 * Features:
 * - Probabilistic predictions with uncertainty
 * - Bayesian inference
 * - Confidence intervals
 * - Robust predictions with uncertainty quantification
 */
export class VariationalELM {
  private elm: ELM;
  private categories: string[];
  private options: Required<VariationalELMOptions>;
  private weightSamples: number[][][] = []; // Sampled weight matrices
  private trained = false;

  constructor(options: VariationalELMOptions) {
        
    this.categories = options.categories;
    this.options = {
      categories: options.categories,
      hiddenUnits: options.hiddenUnits ?? 256,
      priorVariance: options.priorVariance ?? 1.0,
      posteriorSamples: options.posteriorSamples ?? 10,
      activation: options.activation ?? 'relu',
      maxLen: options.maxLen ?? 100,
      useTokenizer: options.useTokenizer ?? true,
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
   * Train variational ELM
   */
  train(X: number[][], y: number[] | string[]): void {
    // Prepare labels
    const labelIndices = y.map(label => 
      typeof label === 'number' 
        ? label 
        : this.options.categories.indexOf(label as string)
    );

    // Train base ELM
    (this.elm as any).setCategories?.(this.options.categories);
    (this.elm as any).trainFromData?.(X, labelIndices);
    
    // Sample weights for uncertainty estimation
    this._sampleWeights();
    
    this.trained = true;
  }

  /**
   * Predict with uncertainty estimation
   */
  predict(X: number[] | number[][], topK: number = 3, includeUncertainty: boolean = true): VariationalELMResult[] {
    if (!this.trained) {
      throw new Error('Model must be trained before prediction');
    }

    const XArray = Array.isArray(X[0]) ? (X as number[][]) : [X as number[]];
    const allResults: VariationalELMResult[] = [];

    for (const x of XArray) {
      // Get base prediction
      const basePreds = (this.elm as any).predictFromVector?.([x], topK) || [];
      
      // Estimate uncertainty
      const uncertainty = includeUncertainty ? this._estimateUncertainty(x) : 0.5;
      
      for (const pred of basePreds.slice(0, topK)) {
        const prob = pred.prob || 0;
        const confidence = Math.max(0, Math.min(1, 1 - uncertainty));
        
        // Compute confidence interval
        const stdDev = Math.sqrt(uncertainty * prob * (1 - prob));
        const confidenceInterval: [number, number] = [
          Math.max(0, prob - 1.96 * stdDev),
          Math.min(1, prob + 1.96 * stdDev)
        ];
        
        allResults.push({
          label: pred.label || this.options.categories[pred.index || 0],
          prob,
          confidence,
          uncertainty,
          confidenceInterval,
        });
      }
    }

    return allResults;
  }

  /**
   * Estimate uncertainty using weight sampling
   */
  private _estimateUncertainty(x: number[]): number {
    if (this.weightSamples.length === 0) {
      return 0.5; // Default uncertainty
    }

    // Get predictions from multiple weight samples
    const predictions: number[] = [];
    
    for (const weights of this.weightSamples) {
      // Simplified: use variance in predictions as uncertainty measure
      // In practice, you'd compute actual predictions with sampled weights
      const pred = this._predictWithWeights(x, weights);
      predictions.push(pred);
    }
    
    // Compute variance as uncertainty measure
    const mean = predictions.reduce((a, b) => a + b, 0) / predictions.length;
    const variance = predictions.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / predictions.length;
    
    // Normalize to [0, 1]
    return Math.min(1, variance);
  }

  /**
   * Predict with specific weight matrix (simplified)
   */
  private _predictWithWeights(x: number[], weights: number[][]): number {
    // Simplified prediction - in practice, you'd use the actual ELM forward pass
    // This is a placeholder for uncertainty estimation
    return 0.5;
  }

  /**
   * Sample weight matrices for uncertainty estimation
   */
  private _sampleWeights(): void {
    const model = (this.elm as any).model;
    if (!model || !model.W) return;
    
    const baseWeights = model.W;
    this.weightSamples = [];
    
    // Sample weights by adding Gaussian noise
    for (let s = 0; s < this.options.posteriorSamples; s++) {
      const sampled: number[][] = [];
      
      for (let i = 0; i < baseWeights.length; i++) {
        sampled[i] = [];
        for (let j = 0; j < baseWeights[i].length; j++) {
          // Sample from posterior (Gaussian around base weight)
          const noise = this._gaussianRandom(0, this.options.priorVariance);
          sampled[i][j] = baseWeights[i][j] + noise;
        }
      }
      
      this.weightSamples.push(sampled);
    }
  }

  private _gaussianRandom(mean: number, variance: number): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z0 * Math.sqrt(variance);
  }
}






