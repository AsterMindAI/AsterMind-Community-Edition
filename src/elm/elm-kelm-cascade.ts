// elm-kelm-cascade.ts — ELM-KELM Cascade
// ELM feature extraction → KELM classification

import { ELM } from '../core/ELM.js';
import { KernelELM } from '../core/KernelELM.js';
export interface ELMKELMCascadeOptions {
  categories: string[];
  elmHiddenUnits?: number; // Hidden units for feature extraction ELM
  kelmKernel?: 'rbf' | 'polynomial' | 'linear' | 'sigmoid';
  kelmGamma?: number;
  kelmDegree?: number;
  kelmCoef0?: number;
  activation?: 'relu' | 'tanh' | 'sigmoid' | 'linear';
  maxLen?: number;
  useTokenizer?: boolean;
}

export interface ELMKELMCascadeResult {
  label: string;
  prob: number;
  extractedFeatures?: number[]; // Features extracted by ELM
}

/**
 * ELM-KELM Cascade
 * Features:
 * - ELM for feature extraction
 * - KELM for classification
 * - Hierarchical learning
 * - Efficiency + accuracy
 */
export class ELMKELMCascade {
  private elm: ELM; // Feature extraction
  private kelm: KernelELM; // Classification
  private categories: string[];
  private options: Required<ELMKELMCascadeOptions>;
  private trained = false;

  constructor(options: ELMKELMCascadeOptions) {
        
    this.categories = options.categories;
    this.options = {
      categories: options.categories,
      elmHiddenUnits: options.elmHiddenUnits ?? 256,
      kelmKernel: options.kelmKernel ?? 'rbf',
      kelmGamma: options.kelmGamma ?? 1.0,
      kelmDegree: options.kelmDegree ?? 2,
      kelmCoef0: options.kelmCoef0 ?? 0,
      activation: options.activation ?? 'relu',
      maxLen: options.maxLen ?? 100,
      useTokenizer: options.useTokenizer ?? true,
    };
    
    // Initialize ELM for feature extraction
    this.elm = new ELM({
      useTokenizer: this.options.useTokenizer ? true : undefined,
      hiddenUnits: this.options.elmHiddenUnits,
      categories: [], // No categories for feature extraction
      maxLen: this.options.maxLen,
      activation: this.options.activation,
    } as any);
    
    // Initialize KELM for classification
    this.kelm = new KernelELM({
      useTokenizer: false, // Already tokenized by ELM
      categories: this.options.categories,
      maxLen: undefined,
      kernel: this.options.kelmKernel,
      gamma: this.options.kelmGamma,
      degree: this.options.kelmDegree,
      coef0: this.options.kelmCoef0,
    } as any);
  }

  /**
   * Train cascade
   */
  train(X: number[][], y: number[] | string[]): void {
    // Prepare labels
    const labelIndices = y.map(label => 
      typeof label === 'number' 
        ? label 
        : this.options.categories.indexOf(label as string)
    );

    // Step 1: Train ELM for feature extraction (autoencoder-style)
    (this.elm as any).trainFromData?.(X, X.map((_, i) => i)); // Self-supervised
    
    // Step 2: Extract features using ELM
    const extractedFeatures = this._extractFeatures(X);
    
    // Step 3: Train KELM on extracted features
    (this.kelm as any).setCategories?.(this.options.categories);
    (this.kelm as any).trainFromData?.(extractedFeatures, labelIndices);
    
    this.trained = true;
  }

  /**
   * Extract features using ELM
   */
  private _extractFeatures(X: number[][]): number[][] {
    const features: number[][] = [];
    
    for (const x of X) {
      // Get hidden layer activations as features
      const logits = (this.elm as any).predictLogitsFromVector?.(x) || [];
      features.push(logits.length > 0 ? logits : x); // Fallback to input if no logits
    }
    
    return features;
  }

  /**
   * Predict with cascade
   */
  predict(X: number[] | number[][], topK: number = 3, returnFeatures: boolean = false): ELMKELMCascadeResult[] {
    if (!this.trained) {
      throw new Error('Model must be trained before prediction');
    }

    const XArray = Array.isArray(X[0]) ? (X as number[][]) : [X as number[]];
    const results: ELMKELMCascadeResult[] = [];

    for (const x of XArray) {
      // Step 1: Extract features
      const extractedFeatures = this._extractFeatures([x])[0];
      
      // Step 2: Classify with KELM
      const preds = (this.kelm as any).predictFromVector?.([extractedFeatures], topK) || [];
      
      for (const pred of preds.slice(0, topK)) {
        const result: ELMKELMCascadeResult = {
          label: pred.label || this.options.categories[pred.index || 0],
          prob: pred.prob || 0,
        };
        
        if (returnFeatures) {
          result.extractedFeatures = [...extractedFeatures];
        }
        
        results.push(result);
      }
    }

    return results;
  }
}






