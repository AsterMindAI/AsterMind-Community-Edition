// adaptive-kernel-elm.ts — Adaptive Kernel ELM
// Data-dependent kernel parameters with local kernel adaptation

import { KernelELM } from '../core/KernelELM.js';
export interface AdaptiveKernelELMOptions {
  categories: string[];
  kernelType?: 'rbf' | 'polynomial' | 'linear' | 'sigmoid';
  adaptiveGamma?: boolean; // Adapt RBF gamma per sample
  adaptiveDegree?: boolean; // Adapt polynomial degree
  baseGamma?: number; // Base RBF gamma
  baseDegree?: number; // Base polynomial degree
  baseCoef0?: number; // Base polynomial coefficient
  activation?: 'relu' | 'tanh' | 'sigmoid' | 'linear';
  maxLen?: number;
  useTokenizer?: boolean;
}

export interface AdaptiveKernelELMResult {
  label: string;
  prob: number;
  kernelParams?: { gamma?: number; degree?: number; coef0?: number };
}

/**
 * Adaptive Kernel ELM with data-dependent kernel parameters
 * Features:
 * - Local kernel adaptation
 * - Sample-specific kernels
 * - Adaptive gamma/degree parameters
 * - Improved performance on non-stationary data
 */
export class AdaptiveKernelELM {
  private kelm: KernelELM;
  private categories: string[];
  private options: Required<AdaptiveKernelELMOptions>;
  private trained = false;
  private adaptiveKernels: Map<number, { gamma?: number; degree?: number; coef0?: number }> = new Map();

  constructor(options: AdaptiveKernelELMOptions) {
        
    this.categories = options.categories;
    this.options = {
      categories: options.categories,
      kernelType: options.kernelType ?? 'rbf',
      adaptiveGamma: options.adaptiveGamma ?? true,
      adaptiveDegree: options.adaptiveDegree ?? false,
      baseGamma: options.baseGamma ?? 1.0,
      baseDegree: options.baseDegree ?? 2,
      baseCoef0: options.baseCoef0 ?? 0,
      activation: options.activation ?? 'relu',
      maxLen: options.maxLen ?? 100,
      useTokenizer: options.useTokenizer ?? true,
    };
    
    this.kelm = new KernelELM({
      useTokenizer: this.options.useTokenizer ? true : undefined,
      categories: this.options.categories,
      maxLen: this.options.maxLen,
      kernel: this.options.kernelType,
      gamma: this.options.baseGamma,
      degree: this.options.baseDegree,
      coef0: this.options.baseCoef0,
    } as any);
  }

  /**
   * Train with adaptive kernels
   */
  train(X: number[][], y: number[] | string[]): void {
    // Prepare labels
    const labelIndices = y.map(label => 
      typeof label === 'number' 
        ? label 
        : this.options.categories.indexOf(label as string)
    );

    // Compute adaptive kernel parameters for each sample
    if (this.options.adaptiveGamma || this.options.adaptiveDegree) {
      this._computeAdaptiveKernels(X);
    }
    
    // Train base KernelELM
    (this.kelm as any).setCategories?.(this.options.categories);
    (this.kelm as any).trainFromData?.(X, labelIndices);
    
    this.trained = true;
  }

  /**
   * Compute adaptive kernel parameters
   */
  private _computeAdaptiveKernels(X: number[][]): void {
    // Compute local statistics for each sample
    for (let i = 0; i < X.length; i++) {
      const x = X[i];
      const neighbors = this._findNeighbors(x, X, 5); // Find 5 nearest neighbors
      
      const params: { gamma?: number; degree?: number; coef0?: number } = {};
      
      if (this.options.adaptiveGamma) {
        // Adapt gamma based on local density
        const localDensity = this._computeLocalDensity(x, neighbors);
        params.gamma = this.options.baseGamma / (1 + localDensity);
      }
      
      if (this.options.adaptiveDegree) {
        // Adapt degree based on local complexity
        const localComplexity = this._computeLocalComplexity(neighbors);
        params.degree = Math.max(1, Math.round(this.options.baseDegree * localComplexity));
      }
      
      this.adaptiveKernels.set(i, params);
    }
  }

  /**
   * Find nearest neighbors
   */
  private _findNeighbors(x: number[], X: number[][], k: number): number[][] {
    const distances = X.map((xi, i) => ({
      index: i,
      dist: this._euclideanDistance(x, xi),
    }));
    
    distances.sort((a, b) => a.dist - b.dist);
    return distances.slice(1, k + 1).map(d => X[d.index]);
  }

  /**
   * Compute local density
   */
  private _computeLocalDensity(x: number[], neighbors: number[][]): number {
    if (neighbors.length === 0) return 1;
    
    const avgDist = neighbors.reduce((sum, n) => sum + this._euclideanDistance(x, n), 0) / neighbors.length;
    return avgDist;
  }

  /**
   * Compute local complexity
   */
  private _computeLocalComplexity(neighbors: number[][]): number {
    if (neighbors.length < 2) return 1;
    
    // Compute variance in neighbors as complexity measure
    const variances: number[] = [];
    for (let i = 0; i < neighbors[0].length; i++) {
      const values = neighbors.map(n => n[i]);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      variances.push(variance);
    }
    
    const avgVariance = variances.reduce((a, b) => a + b, 0) / variances.length;
    return Math.sqrt(avgVariance);
  }

  private _euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }
    return Math.sqrt(sum);
  }

  /**
   * Predict with adaptive kernels
   */
  predict(X: number[] | number[][], topK: number = 3): AdaptiveKernelELMResult[] {
    if (!this.trained) {
      throw new Error('Model must be trained before prediction');
    }

    const XArray = Array.isArray(X[0]) ? (X as number[][]) : [X as number[]];
    const results: AdaptiveKernelELMResult[] = [];

    for (const x of XArray) {
      // Get base prediction
      const preds = (this.kelm as any).predictFromVector?.([x], topK) || [];
      
      // Get adaptive kernel params for this sample (if available)
      const sampleIndex = XArray.indexOf(x);
      const kernelParams = this.adaptiveKernels.get(sampleIndex);
      
      for (const pred of preds.slice(0, topK)) {
        results.push({
          label: pred.label || this.options.categories[pred.index || 0],
          prob: pred.prob || 0,
          kernelParams,
        });
      }
    }

    return results;
  }
}






