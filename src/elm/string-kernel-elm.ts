// string-kernel-elm.ts — String Kernel ELM
// String kernels for text/DNA/protein sequences

import { KernelELM } from '../core/KernelELM.js';
export interface StringKernelELMOptions {
  categories: string[];
  kernelType?: 'ngram' | 'subsequence' | 'spectrum'; // String kernel type
  n?: number; // N-gram size or subsequence length
  lambda?: number; // Decay factor for subsequence kernel
  activation?: 'relu' | 'tanh' | 'sigmoid' | 'linear';
  maxLen?: number;
}

export interface StringKernelELMResult {
  label: string;
  prob: number;
}

/**
 * String Kernel ELM for sequence data
 * Features:
 * - N-gram kernels
 * - Subsequence kernels
 * - Spectrum kernels
 * - Text/DNA/protein sequence analysis
 */
export class StringKernelELM {
  private kelm: KernelELM;
  private categories: string[];
  private options: Required<StringKernelELMOptions>;
  private trained = false;
  private vocabulary: Set<string> = new Set();

  constructor(options: StringKernelELMOptions) {
        
    this.categories = options.categories;
    this.options = {
      categories: options.categories,
      kernelType: options.kernelType ?? 'ngram',
      n: options.n ?? 3,
      lambda: options.lambda ?? 0.5,
      activation: options.activation ?? 'relu',
      maxLen: options.maxLen ?? 100,
    };
    
    // Use polynomial kernel as base (will be adapted for strings)
    this.kelm = new KernelELM({
      categories: this.options.categories,
      kernel: 'polynomial',
      degree: this.options.n,
    } as any);
  }

  /**
   * Train on string sequences
   */
  train(X: string[] | number[][], y: number[] | string[]): void {
    // Prepare labels
    const labelIndices = y.map(label => 
      typeof label === 'number' 
        ? label 
        : this.options.categories.indexOf(label as string)
    );

    // Convert strings to feature vectors
    const stringX = X as string[];
    const featureVectors = this._stringsToFeatures(stringX);
    
    // Train KELM
    (this.kelm as any).setCategories?.(this.options.categories);
    (this.kelm as any).trainFromData?.(featureVectors, labelIndices);
    
    this.trained = true;
  }

  /**
   * Convert strings to feature vectors using string kernels
   */
  private _stringsToFeatures(strings: string[]): number[][] {
    // Build vocabulary
    this.vocabulary.clear();
    for (const s of strings) {
      const ngrams = this._extractNgrams(s);
      for (const ngram of ngrams) {
        this.vocabulary.add(ngram);
      }
    }
    
    const vocabArray = Array.from(this.vocabulary);
    const features: number[][] = [];
    
    for (const s of strings) {
      const feature = new Array(vocabArray.length).fill(0);
      const ngrams = this._extractNgrams(s);
      
      for (const ngram of ngrams) {
        const idx = vocabArray.indexOf(ngram);
        if (idx >= 0) {
          feature[idx] += 1;
        }
      }
      
      // Normalize
      const sum = feature.reduce((a, b) => a + b, 0);
      if (sum > 0) {
        for (let i = 0; i < feature.length; i++) {
          feature[i] /= sum;
        }
      }
      
      features.push(feature);
    }
    
    return features;
  }

  /**
   * Extract n-grams from string
   */
  private _extractNgrams(s: string): string[] {
    const ngrams: string[] = [];
    
    if (this.options.kernelType === 'ngram' || this.options.kernelType === 'spectrum') {
      // N-gram extraction
      for (let i = 0; i <= s.length - this.options.n; i++) {
        ngrams.push(s.substring(i, i + this.options.n));
      }
    } else if (this.options.kernelType === 'subsequence') {
      // Subsequence extraction (simplified)
      for (let i = 0; i <= s.length - this.options.n; i++) {
        ngrams.push(s.substring(i, i + this.options.n));
      }
    }
    
    return ngrams;
  }

  /**
   * Predict on strings
   */
  predict(X: string[] | number[][], topK: number = 3): StringKernelELMResult[] {
    if (!this.trained) {
      throw new Error('Model must be trained before prediction');
    }

    const stringX = X as string[];
    const featureVectors = this._stringsToFeatures(stringX);
    const results: StringKernelELMResult[] = [];

    for (const features of featureVectors) {
      const preds = (this.kelm as any).predictFromVector?.([features], topK) || [];
      
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






