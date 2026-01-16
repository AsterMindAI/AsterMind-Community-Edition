// fuzzy-elm.ts — Fuzzy ELM
// Fuzzy logic + ELM for uncertainty handling and soft classification

import { ELM } from '../core/ELM.js';
export interface FuzzyELMOptions {
  categories: string[];
  hiddenUnits?: number;
  fuzzyMembership?: 'triangular' | 'gaussian' | 'trapezoidal'; // Membership function type
  fuzzificationLevel?: number; // Degree of fuzzification
  activation?: 'relu' | 'tanh' | 'sigmoid' | 'linear';
  maxLen?: number;
  useTokenizer?: boolean;
}

export interface FuzzyELMResult {
  label: string;
  prob: number;
  membership?: number; // Fuzzy membership value
  confidence?: number; // Confidence in classification
}

/**
 * Fuzzy ELM
 * Features:
 * - Fuzzy logic integration
 * - Uncertainty handling
 * - Soft classification
 * - Membership functions
 */
export class FuzzyELM {
  private elm: ELM;
  private categories: string[];
  private options: Required<FuzzyELMOptions>;
  private trained = false;
  private membershipParams: Map<string, { center: number; width: number }> = new Map();

  constructor(options: FuzzyELMOptions) {
        
    this.categories = options.categories;
    this.options = {
      categories: options.categories,
      hiddenUnits: options.hiddenUnits ?? 256,
      fuzzyMembership: options.fuzzyMembership ?? 'gaussian',
      fuzzificationLevel: options.fuzzificationLevel ?? 0.5,
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
   * Train with fuzzy logic
   */
  train(X: number[][], y: number[] | string[]): void {
    // Prepare labels
    const labelIndices = y.map(label => 
      typeof label === 'number' 
        ? label 
        : this.options.categories.indexOf(label as string)
    );

    // Fuzzify input features
    const fuzzifiedX = this._fuzzifyFeatures(X);
    
    // Compute membership parameters
    this._computeMembershipParams(X, labelIndices);
    
    // Train ELM on fuzzified features
    (this.elm as any).setCategories?.(this.options.categories);
    (this.elm as any).trainFromData?.(fuzzifiedX, labelIndices);
    
    this.trained = true;
  }

  /**
   * Fuzzify input features
   */
  private _fuzzifyFeatures(X: number[][]): number[][] {
    const fuzzified: number[][] = [];
    
    for (const x of X) {
      const fuzzy = x.map(val => this._fuzzifyValue(val));
      fuzzified.push(fuzzy);
    }
    
    return fuzzified;
  }

  /**
   * Fuzzify a single value
   */
  private _fuzzifyValue(value: number): number {
    // Apply fuzzification based on membership function
    if (this.options.fuzzyMembership === 'triangular') {
      // Triangular membership
      const center = 0;
      const width = this.options.fuzzificationLevel;
      if (Math.abs(value - center) <= width) {
        return 1 - Math.abs(value - center) / width;
      }
      return 0;
    } else if (this.options.fuzzyMembership === 'gaussian') {
      // Gaussian membership
      const center = 0;
      const sigma = this.options.fuzzificationLevel;
      return Math.exp(-Math.pow(value - center, 2) / (2 * sigma * sigma));
    } else if (this.options.fuzzyMembership === 'trapezoidal') {
      // Trapezoidal membership
      const center = 0;
      const width = this.options.fuzzificationLevel;
      const dist = Math.abs(value - center);
      if (dist <= width * 0.5) {
        return 1;
      } else if (dist <= width) {
        return 1 - (dist - width * 0.5) / (width * 0.5);
      }
      return 0;
    }
    
    return value; // Default: no fuzzification
  }

  /**
   * Compute membership parameters for each category
   */
  private _computeMembershipParams(X: number[][], y: number[]): void {
    // Compute mean and std for each category
    const categoryData = new Map<number, number[][]>();
    
    for (let i = 0; i < X.length; i++) {
      const label = y[i];
      if (!categoryData.has(label)) {
        categoryData.set(label, []);
      }
      categoryData.get(label)!.push(X[i]);
    }
    
    for (const [label, data] of categoryData) {
      const mean = this._computeMean(data);
      const std = this._computeStd(data, mean);
      
      this.membershipParams.set(this.options.categories[label], {
        center: mean,
        width: std * 2, // 2 standard deviations
      });
    }
  }

  private _computeMean(data: number[][]): number {
    if (data.length === 0) return 0;
    const sum = data.reduce((s, x) => s + x.reduce((a, b) => a + b, 0), 0);
    const count = data.length * (data[0]?.length || 1);
    return sum / count;
  }

  private _computeStd(data: number[][], mean: number): number {
    if (data.length === 0) return 1;
    const variance = data.reduce((s, x) => 
      s + x.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0), 0
    ) / (data.length * (data[0]?.length || 1));
    return Math.sqrt(variance);
  }

  /**
   * Compute fuzzy membership for a prediction
   */
  private _computeMembership(label: string, features: number[]): number {
    const params = this.membershipParams.get(label);
    if (!params) return 0.5; // Default membership
    
    const mean = features.reduce((a, b) => a + b, 0) / features.length;
    const dist = Math.abs(mean - params.center);
    
    if (this.options.fuzzyMembership === 'gaussian') {
      return Math.exp(-Math.pow(dist, 2) / (2 * params.width * params.width));
    } else {
      // Triangular
      if (dist <= params.width) {
        return 1 - dist / params.width;
      }
      return 0;
    }
  }

  /**
   * Predict with fuzzy logic
   */
  predict(X: number[] | number[][], topK: number = 3): FuzzyELMResult[] {
    if (!this.trained) {
      throw new Error('Model must be trained before prediction');
    }

    const XArray = Array.isArray(X[0]) ? (X as number[][]) : [X as number[]];
    const results: FuzzyELMResult[] = [];

    for (const x of XArray) {
      // Fuzzify input
      const fuzzified = this._fuzzifyFeatures([x])[0];
      
      // Get base prediction
      const preds = (this.elm as any).predictFromVector?.([fuzzified], topK) || [];
      
      for (const pred of preds.slice(0, topK)) {
        const label = pred.label || this.options.categories[pred.index || 0];
        const prob = pred.prob || 0;
        
        // Compute fuzzy membership
        const membership = this._computeMembership(label, x);
        
        // Combine probability with membership
        const confidence = prob * membership;
        
        results.push({
          label,
          prob,
          membership,
          confidence,
        });
      }
    }

    return results;
  }
}






