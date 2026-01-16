// sparse-kernel-elm.ts — Sparse Kernel ELM
// Sparse kernel matrix approximation with landmark selection

import { KernelELM } from '../core/KernelELM.js';
export interface SparseKernelELMOptions {
  categories: string[];
  kernelType?: 'rbf' | 'polynomial' | 'linear' | 'sigmoid';
  numLandmarks?: number; // Number of landmark points
  landmarkSelection?: 'random' | 'kmeans' | 'diverse'; // Landmark selection strategy
  gamma?: number; // RBF gamma
  degree?: number; // Polynomial degree
  coef0?: number; // Polynomial coefficient
  activation?: 'relu' | 'tanh' | 'sigmoid' | 'linear';
  maxLen?: number;
  useTokenizer?: boolean;
}

export interface SparseKernelELMResult {
  label: string;
  prob: number;
}

/**
 * Sparse Kernel ELM with landmark-based approximation
 * Features:
 * - Sparse kernel matrix approximation
 * - Landmark selection strategies
 * - Reduced computational complexity
 * - Scalable to large datasets
 */
export class SparseKernelELM {
  private kelm: KernelELM;
  private categories: string[];
  private options: Required<SparseKernelELMOptions>;
  private landmarks: number[][] = [];
  private trained = false;

  constructor(options: SparseKernelELMOptions) {
        
    this.categories = options.categories;
    this.options = {
      categories: options.categories,
      kernelType: options.kernelType ?? 'rbf',
      numLandmarks: options.numLandmarks ?? 100,
      landmarkSelection: options.landmarkSelection ?? 'kmeans',
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
   * Train with sparse kernel approximation
   */
  train(X: number[][], y: number[] | string[]): void {
    // Prepare labels
    const labelIndices = y.map(label => 
      typeof label === 'number' 
        ? label 
        : this.options.categories.indexOf(label as string)
    );

    // Select landmarks
    this._selectLandmarks(X);
    
    // Train on landmarks (reduced dataset)
    (this.kelm as any).setCategories?.(this.options.categories);
    (this.kelm as any).trainFromData?.(this.landmarks, 
      this._getLandmarkLabels(X, y, labelIndices));
    
    this.trained = true;
  }

  /**
   * Select landmark points
   */
  private _selectLandmarks(X: number[][]): void {
    const numLandmarks = Math.min(this.options.numLandmarks, X.length);
    
    if (this.options.landmarkSelection === 'random') {
      // Random selection
      const indices = new Set<number>();
      while (indices.size < numLandmarks) {
        indices.add(Math.floor(Math.random() * X.length));
      }
      this.landmarks = Array.from(indices).map(i => [...X[i]]);
    } else if (this.options.landmarkSelection === 'kmeans') {
      // K-means centroids as landmarks
      this.landmarks = this._kmeansLandmarks(X, numLandmarks);
    } else if (this.options.landmarkSelection === 'diverse') {
      // Diverse selection (maximize distance)
      this.landmarks = this._diverseLandmarks(X, numLandmarks);
    } else {
      // Default: first N points
      this.landmarks = X.slice(0, numLandmarks).map(x => [...x]);
    }
  }

  /**
   * K-means landmark selection
   */
  private _kmeansLandmarks(X: number[][], k: number): number[][] {
    // Simplified k-means (in practice, use proper k-means)
    const centroids: number[][] = [];
    const dim = X[0].length;
    
    // Initialize centroids randomly
    for (let i = 0; i < k; i++) {
      const idx = Math.floor(Math.random() * X.length);
      centroids.push([...X[idx]]);
    }
    
    // Simple iteration (simplified)
    for (let iter = 0; iter < 10; iter++) {
      const clusters: number[][][] = Array(k).fill(null).map(() => []);
      
      // Assign points to nearest centroid
      for (const x of X) {
        let minDist = Infinity;
        let nearest = 0;
        for (let i = 0; i < k; i++) {
          const dist = this._euclideanDistance(x, centroids[i]);
          if (dist < minDist) {
            minDist = dist;
            nearest = i;
          }
        }
        clusters[nearest].push(x);
      }
      
      // Update centroids
      for (let i = 0; i < k; i++) {
        if (clusters[i].length > 0) {
          const newCentroid = new Array(dim).fill(0);
          for (const point of clusters[i]) {
            for (let j = 0; j < dim; j++) {
              newCentroid[j] += point[j];
            }
          }
          for (let j = 0; j < dim; j++) {
            newCentroid[j] /= clusters[i].length;
          }
          centroids[i] = newCentroid;
        }
      }
    }
    
    return centroids;
  }

  /**
   * Diverse landmark selection
   */
  private _diverseLandmarks(X: number[][], k: number): number[][] {
    const landmarks: number[][] = [];
    
    // Start with random point
    let firstIdx = Math.floor(Math.random() * X.length);
    landmarks.push([...X[firstIdx]]);
    
    // Greedily select points that maximize minimum distance
    while (landmarks.length < k) {
      let maxMinDist = -1;
      let bestIdx = -1;
      
      for (let i = 0; i < X.length; i++) {
        const minDist = Math.min(
          ...landmarks.map(l => this._euclideanDistance(X[i], l))
        );
        
        if (minDist > maxMinDist) {
          maxMinDist = minDist;
          bestIdx = i;
        }
      }
      
      if (bestIdx >= 0) {
        landmarks.push([...X[bestIdx]]);
      } else {
        break;
      }
    }
    
    return landmarks;
  }

  /**
   * Get labels for landmarks
   */
  private _getLandmarkLabels(X: number[][], y: (number | string)[], labelIndices: number[]): number[] {
    const landmarkLabels: number[] = [];
    
    for (const landmark of this.landmarks) {
      // Find nearest point in X
      let minDist = Infinity;
      let nearestIdx = 0;
      
      for (let i = 0; i < X.length; i++) {
        const dist = this._euclideanDistance(landmark, X[i]);
        if (dist < minDist) {
          minDist = dist;
          nearestIdx = i;
        }
      }
      
      landmarkLabels.push(labelIndices[nearestIdx]);
    }
    
    return landmarkLabels;
  }

  private _euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }
    return Math.sqrt(sum);
  }

  /**
   * Predict using sparse kernel
   */
  predict(X: number[] | number[][], topK: number = 3): SparseKernelELMResult[] {
    if (!this.trained) {
      throw new Error('Model must be trained before prediction');
    }

    const XArray = Array.isArray(X[0]) ? (X as number[][]) : [X as number[]];
    const results: SparseKernelELMResult[] = [];

    for (const x of XArray) {
      // Use landmarks for prediction
      const preds = (this.kelm as any).predictFromVector?.([x], topK) || [];
      
      for (const pred of preds.slice(0, topK)) {
        results.push({
          label: pred.label || this.options.categories[pred.index || 0],
          prob: pred.prob || 0,
        });
      }
    }

    return results;
  }

  /**
   * Get selected landmarks
   */
  getLandmarks(): number[][] {
    return this.landmarks.map(l => [...l]);
  }
}






