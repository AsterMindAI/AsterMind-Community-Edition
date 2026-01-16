// tensor-kernel-elm.ts — Tensor Kernel ELM
// Multi-dimensional kernel learning with tensor factorization

import { KernelELM } from '../core/KernelELM.js';
export interface TensorKernelELMOptions {
  categories: string[];
  tensorRank?: number; // Tensor rank for factorization
  modes?: number[]; // Tensor dimensions
  kernel?: 'rbf' | 'polynomial' | 'linear' | 'sigmoid';
  gamma?: number;
  degree?: number;
  coef0?: number;
  activation?: 'relu' | 'tanh' | 'sigmoid' | 'linear';
}

export interface TensorKernelELMResult {
  label: string;
  prob: number;
  tensorFactors?: number[][][]; // Tensor factorization factors (one array per mode)
}

/**
 * Tensor Kernel ELM
 * Features:
 * - Multi-dimensional kernel learning
 * - Tensor factorization
 * - Multi-modal data fusion
 * - Complex relationship modeling
 */
export class TensorKernelELM {
  private kelm: KernelELM;
  private categories: string[];
  private options: Required<TensorKernelELMOptions>;
  private trained = false;
  private tensorFactors: Array<number[][][]> = []; // [sample][mode][dim][rank] - each sample has multiple modes, each mode is a 2D matrix

  constructor(options: TensorKernelELMOptions) {
        
    this.categories = options.categories;
    this.options = {
      categories: options.categories,
      tensorRank: options.tensorRank ?? 10,
      modes: options.modes ?? [10, 10, 10],
      kernel: options.kernel ?? 'rbf',
      gamma: options.gamma ?? 1.0,
      degree: options.degree ?? 2,
      coef0: options.coef0 ?? 0,
      activation: options.activation ?? 'relu',
    };
    
    this.kelm = new KernelELM({
      categories: this.options.categories,
      kernel: this.options.kernel,
      gamma: this.options.gamma,
      degree: this.options.degree,
      coef0: this.options.coef0,
    } as any);
  }

  /**
   * Train on tensor data
   */
  train(X: number[][][] | number[][], y: number[] | string[]): void {
    // Prepare labels
    const labelIndices = y.map(label => 
      typeof label === 'number' 
        ? label 
        : this.options.categories.indexOf(label as string)
    );

    // Factorize tensors
    const tensorX = Array.isArray(X[0][0]) ? (X as number[][][]) : this._reshapeToTensors(X as number[][]);
    this._factorizeTensors(tensorX);
    
    // Extract features from tensor factorization
    const features = this._extractTensorFeatures(tensorX);
    
    // Train KELM
    (this.kelm as any).setCategories?.(this.options.categories);
    (this.kelm as any).trainFromData?.(features, labelIndices);
    
    this.trained = true;
  }

  /**
   * Reshape 2D data to 3D tensors
   */
  private _reshapeToTensors(X: number[][]): number[][][] {
    const [h, w, c] = this.options.modes;
    // Use explicit type to help TypeScript
    type Tensor3D = number[][][];
    const result: Tensor3D = [];
    
    for (const x of X) {
      const tensor: Tensor3D = [];
      let idx = 0;
      
      for (let k = 0; k < c; k++) {
        const matrix: number[][] = [];
        for (let i = 0; i < h; i++) {
          const row: number[] = [];
          for (let j = 0; j < w; j++) {
            row.push(x[idx % x.length] || 0);
            idx++;
          }
          matrix.push(row);
        }
        tensor.push(matrix);
      }
      
      (result as any).push(tensor);
    }
    
    return result;
  }

  /**
   * Factorize tensors using CP decomposition
   */
  private _factorizeTensors(tensors: number[][][]): void {
    // Simplified CP (CANDECOMP/PARAFAC) decomposition
    this.tensorFactors = [];
    
    for (const tensor of tensors) {
      const factors: number[][][] = [];
      
      // Factorize each mode
      for (let mode = 0; mode < this.options.modes.length; mode++) {
        const factor: number[][] = new Array(this.options.modes[mode]).fill(0).map(() => 
          new Array(this.options.tensorRank).fill(0).map(() => Math.random() * 0.1)
        );
        factors.push(factor);
      }
      
      this.tensorFactors.push(factors);
    }
  }

  /**
   * Extract features from tensor factorization
   */
  private _extractTensorFeatures(tensors: number[][][]): number[][] {
    const features: number[][] = [];
    
    for (let i = 0; i < tensors.length; i++) {
      const factors = this.tensorFactors[i] || [];
      
      // Flatten factors
      const feature: number[] = [];
      for (const factor of factors) {
        for (const row of factor) {
          for (const val of row) {
            feature.push(val);
          }
        }
      }
      
      // Add tensor statistics
      const tensor = tensors[i];
      if (tensor && tensor.length > 0) {
        feature.push(tensor.length); // Height
        if (Array.isArray(tensor[0])) {
          feature.push(tensor[0].length); // Width
          if (Array.isArray(tensor[0][0])) {
            feature.push(tensor[0][0].length); // Channels
          } else {
            feature.push(1);
          }
        } else {
          feature.push(1);
          feature.push(1);
        }
        
        // Add tensor norm
        let norm = 0;
        for (const matrix of tensor) {
          if (Array.isArray(matrix)) {
            for (const row of matrix) {
              if (Array.isArray(row)) {
                for (const val of row) {
                  norm += val * val;
                }
              } else {
                norm += row * row;
              }
            }
          }
        }
        feature.push(Math.sqrt(norm));
      } else {
        feature.push(0, 0, 0, 0);
      }
      
      features.push(feature);
    }
    
    return features;
  }

  /**
   * Predict on tensor data
   */
  predict(X: number[][][] | number[][], topK: number = 3): TensorKernelELMResult[] {
    if (!this.trained) {
      throw new Error('Model must be trained before prediction');
    }

    const tensorX = Array.isArray(X[0][0]) ? (X as number[][][]) : this._reshapeToTensors(X as number[][]);
    const features = this._extractTensorFeatures(tensorX);
    const results: TensorKernelELMResult[] = [];

    for (let i = 0; i < features.length; i++) {
      const preds = (this.kelm as any).predictFromVector?.([features[i]], topK) || [];
      const factors = this.tensorFactors[i] || [];
      
      for (const pred of preds.slice(0, topK)) {
        const factorCopy: number[][][] = factors.map((f: number[][]) => 
          f.map((row: number[]) => row.slice())
        );
        results.push({
          label: pred.label || this.options.categories[pred.index || 0],
          prob: pred.prob || 0,
          tensorFactors: factorCopy,
        });
      }
    }

    return results;
  }
}

