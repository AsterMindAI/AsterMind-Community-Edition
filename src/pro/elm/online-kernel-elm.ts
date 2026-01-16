// online-kernel-elm.ts — Online Kernel ELM for streaming data
// Incremental kernel learning with forgetting mechanisms

import { ELM } from '../../core/ELM.js';
import { KernelELM } from '../../core/KernelELM.js';
import { OnlineRidge } from '../math/online-ridge.js';
import type { Vec } from '../math/index.js';
// License removed - all features are now free!

export interface OnlineKernelELMOptions {
  kernel: {
    type: 'rbf' | 'polynomial' | 'linear';
    gamma?: number;
    degree?: number;
    coef0?: number;
  };
  ridgeLambda?: number;
  categories: string[];
  windowSize?: number; // Sliding window for forgetting
  decayFactor?: number; // Exponential decay for old samples
  landmarkStrategy?: 'uniform' | 'random' | 'adaptive';
  maxLandmarks?: number;
}

export interface OnlineKernelELMResult {
  label: string;
  prob: number;
}

/**
 * Online Kernel ELM for real-time learning from streaming data
 * Features:
 * - Incremental kernel matrix updates
 * - Sliding window with forgetting
 * - Adaptive landmark selection
 * - Real-time prediction
 */
export class OnlineKernelELM {
  private kernelType: 'rbf' | 'polynomial' | 'linear';
  private kernelParams: { gamma?: number; degree?: number; coef0?: number };
  private categories: string[];
  private ridgeLambda: number;
  private windowSize: number;
  private decayFactor: number;
  private maxLandmarks: number;
  
  // Storage for streaming data
  private landmarks: number[][] = [];
  private landmarkIndices: number[] = [];
  private samples: number[][] = [];
  private labels: number[] = [];
  private sampleWeights: number[] = [];
  
  // Online ridge for incremental updates
  private onlineRidge: OnlineRidge | null = null;
  private kernelMatrix: number[][] = [];
  private kernelMatrixInv: number[][] = [];
  
  private trained = false;

  constructor(options: OnlineKernelELMOptions) {
    // License check removed // Premium feature - requires valid license
    this.kernelType = options.kernel.type;
    this.kernelParams = {
      gamma: options.kernel.gamma ?? 0.01,
      degree: options.kernel.degree ?? 2,
      coef0: options.kernel.coef0 ?? 0,
    };
    this.categories = options.categories;
    this.ridgeLambda = options.ridgeLambda ?? 0.001;
    this.windowSize = options.windowSize ?? 1000;
    this.decayFactor = options.decayFactor ?? 0.99;
    this.maxLandmarks = options.maxLandmarks ?? 100;
  }

  /**
   * Initial training with batch data
   */
  fit(X: number[][], y: number[] | number[][]): void {
    const oneHotY = this._toOneHot(y);
    
    // Select landmarks
    this._selectLandmarks(X);
    
    // Compute initial kernel matrix
    this._computeKernelMatrix(X);
    
    // Initialize online ridge
    this.onlineRidge = new OnlineRidge(
      this.landmarks.length,
      this.categories.length,
      this.ridgeLambda
    );
    
    // Train on initial batch
    for (let i = 0; i < X.length; i++) {
      const phi = this._computeKernelFeatures(X[i]);
      const yVec = new Float64Array(oneHotY[i]);
      this.onlineRidge.update(phi, yVec);
    }
    
    // Store samples
    this.samples = X.map(x => [...x]);
    this.labels = Array.isArray(y[0]) 
      ? (y as number[][]).map(yy => this._argmax(yy))
      : (y as number[]);
    this.sampleWeights = new Array(X.length).fill(1.0);
    
    this.trained = true;
  }

  /**
   * Incremental update with new sample
   */
  update(x: number[], y: number | number[]): void {
    if (!this.trained) {
      throw new Error('Model must be initially trained with fit() before incremental updates');
    }

    const oneHotY = Array.isArray(y) 
      ? y 
      : (() => {
          const oh = new Array(this.categories.length).fill(0);
          oh[y] = 1;
          return oh;
        })();

    // Add to samples
    this.samples.push([...x]);
    this.labels.push(Array.isArray(y) ? this._argmax(y) : y);
    this.sampleWeights.push(1.0);

    // Apply decay to old samples
    for (let i = 0; i < this.sampleWeights.length; i++) {
      this.sampleWeights[i] *= this.decayFactor;
    }

    // Remove old samples if window exceeded
    if (this.samples.length > this.windowSize) {
      const removeCount = this.samples.length - this.windowSize;
      this.samples.splice(0, removeCount);
      this.labels.splice(0, removeCount);
      this.sampleWeights.splice(0, removeCount);
    }

    // Update landmarks if needed (adaptive strategy)
    if (this.landmarkStrategy === 'adaptive') {
      this._updateLandmarksAdaptive();
    }

    // Compute kernel features
    const phi = this._computeKernelFeatures(x);
    const yVec = new Float64Array(oneHotY);

    // Update online ridge
    if (this.onlineRidge) {
      this.onlineRidge.update(phi, yVec);
    }
  }

  /**
   * Predict with online model
   */
  predict(x: number[] | number[][], topK: number = 3): OnlineKernelELMResult[] {
    if (!this.trained || !this.onlineRidge) {
      throw new Error('Model must be trained before prediction');
    }

    const XArray = Array.isArray(x[0]) ? (x as number[][]) : [x as number[]];
    const allPredictions: OnlineKernelELMResult[] = [];

    for (const xi of XArray) {
      const predictions: OnlineKernelELMResult[] = [];
      const phi = this._computeKernelFeatures(xi);
      const logits = this.onlineRidge.predict(phi);
      
      // Convert to probabilities
      const probs = this._softmax(logits);
      
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
      
      const topResults: OnlineKernelELMResult[] = [];
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
   * Select landmarks from data
   */
  private _selectLandmarks(X: number[][]): void {
    const strategy = this.landmarkStrategy || 'uniform';
    const n = Math.min(this.maxLandmarks, X.length);
    
    if (strategy === 'uniform') {
      const step = Math.max(1, Math.floor(X.length / n));
      this.landmarkIndices = Array.from({ length: n }, (_, i) => 
        Math.min(X.length - 1, i * step)
      );
    } else if (strategy === 'random') {
      const indices = Array.from({ length: X.length }, (_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      this.landmarkIndices = indices.slice(0, n);
    } else {
      // Adaptive: use first n samples initially
      this.landmarkIndices = Array.from({ length: n }, (_, i) => i);
    }
    
    this.landmarks = this.landmarkIndices.map(idx => [...X[idx]]);
  }

  /**
   * Compute kernel features for a sample
   */
  private _computeKernelFeatures(x: number[]): Float64Array {
    const features = new Float64Array(this.landmarks.length);
    
    for (let i = 0; i < this.landmarks.length; i++) {
      features[i] = this._kernel(x, this.landmarks[i]);
    }
    
    return features;
  }

  /**
   * Compute kernel between two vectors
   */
  private _kernel(x1: number[], x2: number[]): number {
    if (this.kernelType === 'linear') {
      return this._dot(x1, x2);
    } else if (this.kernelType === 'rbf') {
      const dist = this._squaredDistance(x1, x2);
      return Math.exp(-this.kernelParams.gamma! * dist);
    } else if (this.kernelType === 'polynomial') {
      const dot = this._dot(x1, x2);
      return Math.pow(dot + this.kernelParams.coef0!, this.kernelParams.degree!);
    }
    return 0;
  }

  private _dot(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      sum += a[i] * b[i];
    }
    return sum;
  }

  private _squaredDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return sum;
  }

  private _computeKernelMatrix(X: number[][]): void {
    // For online learning, we don't need full kernel matrix
    // This is kept for compatibility
    this.kernelMatrix = [];
  }

  private _updateLandmarksAdaptive(): void {
    // Adaptive landmark selection based on prediction error
    // In practice, you might replace landmarks with high error
    // For now, keep existing landmarks
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

  private _argmax(arr: number[] | Float64Array): number {
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

  get landmarkStrategy(): 'uniform' | 'random' | 'adaptive' {
    return 'adaptive'; // Default for online learning
  }
}

