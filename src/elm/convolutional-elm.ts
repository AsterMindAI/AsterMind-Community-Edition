// convolutional-elm.ts — Convolutional ELM (C-ELM)
// Convolutional layers + ELM for image/sequence processing

import { ELM } from '../core/ELM.js';
export interface ConvolutionalELMOptions {
  categories: string[];
  inputShape?: number[]; // [height, width, channels] for images
  filters?: number[]; // Number of filters per layer
  kernelSizes?: number[]; // Kernel sizes per layer
  poolSizes?: number[]; // Pooling sizes per layer
  hiddenUnits?: number; // Final ELM hidden units
  activation?: 'relu' | 'tanh' | 'sigmoid' | 'linear';
  maxLen?: number;
  useTokenizer?: boolean;
}

export interface ConvolutionalELMResult {
  label: string;
  prob: number;
  featureMaps?: number[][]; // Extracted feature maps
}

/**
 * Convolutional ELM
 * Features:
 * - Convolutional layers for feature extraction
 * - ELM for classification
 * - Translation invariance
 * - Image/sequence processing
 */
export class ConvolutionalELM {
  private elm: ELM;
  private categories: string[];
  private options: Required<ConvolutionalELMOptions>;
  private trained = false;

  constructor(options: ConvolutionalELMOptions) {
        
    this.categories = options.categories;
    this.options = {
      categories: options.categories,
      inputShape: options.inputShape ?? [28, 28, 1],
      filters: options.filters ?? [32, 64],
      kernelSizes: options.kernelSizes ?? [3, 3],
      poolSizes: options.poolSizes ?? [2, 2],
      hiddenUnits: options.hiddenUnits ?? 256,
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
   * Train on image/sequence data
   */
  train(X: number[][][] | number[][], y: number[] | string[]): void {
    // Prepare labels
    const labelIndices = y.map(label => 
      typeof label === 'number' 
        ? label 
        : this.options.categories.indexOf(label as string)
    );

    // Extract convolutional features
    const images = Array.isArray(X[0][0]) ? (X as number[][][]) : (X as number[][]).map(x => [x]);
    const features = this._extractConvolutionalFeatures(images);
    
    // Train ELM on features
    (this.elm as any).setCategories?.(this.options.categories);
    (this.elm as any).trainFromData?.(features, labelIndices);
    
    this.trained = true;
  }

  /**
   * Extract features using convolutional layers
   */
  private _extractConvolutionalFeatures(images: number[][][]): number[][] {
    const features: number[][] = [];
    
    for (const image of images) {
      let current: number[][] | number[][][] = image;
      
      // Apply convolutional layers
      for (let layer = 0; layer < this.options.filters.length; layer++) {
        const convInput = Array.isArray(current[0][0]) 
          ? (current as number[][][])[0] 
          : (current as number[][]);
        const convOutput = this._convLayer(convInput, 
          this.options.filters[layer], 
          this.options.kernelSizes[layer] || 3);
        current = this._poolLayer(convOutput, this.options.poolSizes[layer] || 2);
      }
      
      // Flatten
      const flattened = this._flatten(current);
      features.push(flattened);
    }
    
    return features;
  }

  /**
   * Convolutional layer (simplified)
   */
  private _convLayer(input: number[][], numFilters: number, kernelSize: number): number[][][] {
    // Simplified convolution (in practice, use proper convolution)
    const output: number[][][] = [];
    
    for (let f = 0; f < numFilters; f++) {
      const featureMap: number[][] = [];
      for (let i = 0; i < input.length; i++) {
        featureMap[i] = [];
        for (let j = 0; j < input[i].length; j++) {
          // Simple convolution (simplified)
          let sum = 0;
          for (let ki = 0; ki < kernelSize; ki++) {
            for (let kj = 0; kj < kernelSize; kj++) {
              const row = i + ki - Math.floor(kernelSize / 2);
              const col = j + kj - Math.floor(kernelSize / 2);
              if (row >= 0 && row < input.length && col >= 0 && col < input[i].length) {
                sum += input[row][col] || 0;
              }
            }
          }
          featureMap[i][j] = Math.max(0, sum / (kernelSize * kernelSize)); // ReLU
        }
      }
      output.push(featureMap);
    }
    
    return output;
  }

  /**
   * Pooling layer
   */
  private _poolLayer(input: number[][][] | number[][], poolSize: number): number[][][] {
    // Simplified pooling
    const images = Array.isArray(input[0][0]) 
      ? (input as number[][][])
      : [input as number[][]];
    
    const pooled: number[][][] = [];
    
    for (const img of images) {
      const pooledImg: number[][] = [];
      for (let i = 0; i < img.length; i += poolSize) {
        pooledImg[i / poolSize] = [];
        for (let j = 0; j < img[i].length; j += poolSize) {
          // Max pooling
          let max = -Infinity;
          for (let pi = 0; pi < poolSize && i + pi < img.length; pi++) {
            for (let pj = 0; pj < poolSize && j + pj < img[i].length; pj++) {
              max = Math.max(max, img[i + pi][j + pj] || 0);
            }
          }
          pooledImg[i / poolSize][j / poolSize] = max;
        }
      }
      pooled.push(pooledImg);
    }
    
    return pooled;
  }

  /**
   * Flatten feature maps
   */
  private _flatten(featureMaps: number[][][] | number[][]): number[] {
    if (Array.isArray(featureMaps[0][0])) {
      const maps = featureMaps as number[][][];
      const flattened: number[] = [];
      for (const map of maps) {
        for (const row of map) {
          flattened.push(...row);
        }
      }
      return flattened;
    } else {
      const map = featureMaps as number[][];
      const flattened: number[] = [];
      for (const row of map) {
        flattened.push(...row);
      }
      return flattened;
    }
  }

  /**
   * Predict
   */
  predict(X: number[][][] | number[][], topK: number = 3): ConvolutionalELMResult[] {
    if (!this.trained) {
      throw new Error('Model must be trained before prediction');
    }

    const images = Array.isArray(X[0][0]) ? (X as number[][][]) : (X as number[][]).map(x => [x]);
    const features = this._extractConvolutionalFeatures(images);
    const results: ConvolutionalELMResult[] = [];

    for (const feature of features) {
      const preds = (this.elm as any).predictFromVector?.([feature], topK) || [];
      
      for (const pred of preds.slice(0, topK)) {
        results.push({
          label: pred.label || this.options.categories[pred.index || 0],
          prob: pred.prob || 0,
        });
      }
    }

    return results;
  }
}

