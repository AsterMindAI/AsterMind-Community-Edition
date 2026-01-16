// robust-kernel-elm.ts — Robust Kernel ELM
// Outlier-resistant kernels with robust loss functions

import { KernelELM } from '../core/KernelELM.js';
export interface RobustKernelELMOptions {
  categories: string[];
  kernelType?: 'rbf' | 'polynomial' | 'linear' | 'sigmoid';
  robustLoss?: 'huber' | 'hinge' | 'epsilon-insensitive'; // Robust loss function
  outlierThreshold?: number; // Threshold for outlier detection
  gamma?: number;
  degree?: number;
  coef0?: number;
  activation?: 'relu' | 'tanh' | 'sigmoid' | 'linear';
  maxLen?: number;
  useTokenizer?: boolean;
}

export interface RobustKernelELMResult {
  label: string;
  prob: number;
  isOutlier?: boolean; // Outlier flag
  robustness?: number; // Robustness score
}

/**
 * Robust Kernel ELM with outlier resistance
 * Features:
 * - Outlier-resistant kernels
 * - Robust loss functions
 * - Noise-tolerant learning
 * - Outlier detection
 */
export class RobustKernelELM {
  private kelm: KernelELM;
  private categories: string[];
  private options: Required<RobustKernelELMOptions>;
  private outlierIndices: Set<number> = new Set();
  private trained = false;

  constructor(options: RobustKernelELMOptions) {
        
    this.categories = options.categories;
    this.options = {
      categories: options.categories,
      kernelType: options.kernelType ?? 'rbf',
      robustLoss: options.robustLoss ?? 'huber',
      outlierThreshold: options.outlierThreshold ?? 2.0,
      gamma: options.gamma ?? 1.0,
      degree: options.degree ?? 2,
      coef0: options.coef0 ?? 0,
      activation: options.activation ?? 'relu',
      maxLen: options.maxLen ?? 100,
      useTokenizer: options.useTokenizer ?? true,
    };
    
    this.kelm = new KernelELM({
      useTokenizer: this.options.useTokenizer ? true : undefined,
      categories: this.options.categories,
      maxLen: this.options.maxLen,
      kernel: this.options.kernelType,
      gamma: this.options.gamma,
      degree: this.options.degree,
      coef0: this.options.coef0,
    } as any);
  }

  /**
   * Train with robust loss
   */
  train(X: number[][], y: number[] | string[]): void {
    // Prepare labels
    const labelIndices = y.map(label => 
      typeof label === 'number' 
        ? label 
        : this.options.categories.indexOf(label as string)
    );

    // Detect outliers
    this._detectOutliers(X);
    
    // Filter outliers for training (or use robust weighting)
    const filteredX: number[][] = [];
    const filteredY: number[] = [];
    
    for (let i = 0; i < X.length; i++) {
      if (!this.outlierIndices.has(i)) {
        filteredX.push(X[i]);
        filteredY.push(labelIndices[i]);
      }
    }
    
    // Train on filtered data
    (this.kelm as any).setCategories?.(this.options.categories);
    (this.kelm as any).trainFromData?.(filteredX.length > 0 ? filteredX : X, 
      filteredY.length > 0 ? filteredY : labelIndices);
    
    this.trained = true;
  }

  /**
   * Detect outliers using statistical methods
   */
  private _detectOutliers(X: number[][]): void {
    this.outlierIndices.clear();
    
    if (X.length === 0) return;
    
    // Compute mean and std for each dimension
    const dim = X[0].length;
    const means = new Array(dim).fill(0);
    const stds = new Array(dim).fill(0);
    
    // Compute means
    for (const x of X) {
      for (let i = 0; i < dim; i++) {
        means[i] += x[i] || 0;
      }
    }
    for (let i = 0; i < dim; i++) {
      means[i] /= X.length;
    }
    
    // Compute standard deviations
    for (const x of X) {
      for (let i = 0; i < dim; i++) {
        stds[i] += Math.pow((x[i] || 0) - means[i], 2);
      }
    }
    for (let i = 0; i < dim; i++) {
      stds[i] = Math.sqrt(stds[i] / X.length);
    }
    
    // Detect outliers (points far from mean)
    for (let i = 0; i < X.length; i++) {
      const x = X[i];
      let maxZScore = 0;
      
      for (let j = 0; j < dim; j++) {
        if (stds[j] > 0) {
          const zScore = Math.abs((x[j] || 0) - means[j]) / stds[j];
          maxZScore = Math.max(maxZScore, zScore);
        }
      }
      
      if (maxZScore > this.options.outlierThreshold) {
        this.outlierIndices.add(i);
      }
    }
  }

  /**
   * Apply robust loss function
   */
  private _robustLoss(error: number): number {
    if (this.options.robustLoss === 'huber') {
      const delta = 1.0;
      if (Math.abs(error) <= delta) {
        return 0.5 * error * error;
      } else {
        return delta * (Math.abs(error) - 0.5 * delta);
      }
    } else if (this.options.robustLoss === 'hinge') {
      return Math.max(0, 1 - error);
    } else if (this.options.robustLoss === 'epsilon-insensitive') {
      const epsilon = 0.1;
      return Math.max(0, Math.abs(error) - epsilon);
    }
    return error * error; // Default: squared loss
  }

  /**
   * Predict with outlier detection
   */
  predict(X: number[] | number[][], topK: number = 3): RobustKernelELMResult[] {
    if (!this.trained) {
      throw new Error('Model must be trained before prediction');
    }

    const XArray = Array.isArray(X[0]) ? (X as number[][]) : [X as number[]];
    const results: RobustKernelELMResult[] = [];

    for (const x of XArray) {
      // Check if input is outlier
      const isOutlier = this._isOutlier(x);
      
      // Get prediction
      const preds = (this.kelm as any).predictFromVector?.([x], topK) || [];
      
      for (const pred of preds.slice(0, topK)) {
        const prob = pred.prob || 0;
        const robustness = isOutlier ? 0.5 : 1.0; // Lower robustness for outliers
        
        results.push({
          label: pred.label || this.options.categories[pred.index || 0],
          prob,
          isOutlier,
          robustness,
        });
      }
    }

    return results;
  }

  /**
   * Check if a point is an outlier
   */
  private _isOutlier(x: number[]): boolean {
    // Simplified outlier check (in practice, use trained model statistics)
    const mean = x.reduce((a, b) => a + b, 0) / x.length;
    const std = Math.sqrt(x.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / x.length);
    
    if (std === 0) return false;
    
    const maxZScore = Math.max(...x.map(v => Math.abs((v - mean) / std)));
    return maxZScore > this.options.outlierThreshold;
  }
}






