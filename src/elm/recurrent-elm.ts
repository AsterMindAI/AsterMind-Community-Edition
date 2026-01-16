// recurrent-elm.ts — Recurrent ELM (R-ELM)
// Recurrent connections in ELM for sequence modeling

import { ELM } from '../core/ELM.js';
import { OnlineELM } from '../core/OnlineELM.js';
export interface RecurrentELMOptions {
  categories: string[];
  hiddenUnits?: number;
  recurrentUnits?: number; // Number of recurrent units
  sequenceLength?: number; // Input sequence length
  activation?: 'relu' | 'tanh' | 'sigmoid' | 'linear';
  maxLen?: number;
  useTokenizer?: boolean;
}

export interface RecurrentELMResult {
  label: string;
  prob: number;
  hiddenState?: number[]; // Final hidden state
}

/**
 * Recurrent ELM for sequence modeling
 * Features:
 * - Recurrent connections
 * - Sequence modeling
 * - Temporal dependencies
 * - Memory of past inputs
 */
export class RecurrentELM {
  private elm: ELM;
  private categories: string[];
  private options: Required<RecurrentELMOptions>;
  private hiddenState: number[] = [];
  private trained = false;

  constructor(options: RecurrentELMOptions) {
        
    this.categories = options.categories;
    this.options = {
      categories: options.categories,
      hiddenUnits: options.hiddenUnits ?? 256,
      recurrentUnits: options.recurrentUnits ?? 128,
      sequenceLength: options.sequenceLength ?? 10,
      activation: options.activation ?? 'tanh',
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
    
    // Initialize hidden state
    this.hiddenState = new Array(this.options.recurrentUnits).fill(0);
  }

  /**
   * Train on sequences
   */
  train(X: number[][][], y: number[] | string[]): void {
    // Prepare labels
    const labelIndices = y.map(label => 
      typeof label === 'number' 
        ? label 
        : this.options.categories.indexOf(label as string)
    );

    // Process sequences with recurrent connections
    const features = this._processSequences(X);
    
    // Train ELM
    (this.elm as any).setCategories?.(this.options.categories);
    (this.elm as any).trainFromData?.(features, labelIndices);
    
    this.trained = true;
  }

  /**
   * Process sequences with recurrent connections
   */
  private _processSequences(sequences: number[][][]): number[][] {
    const features: number[][] = [];
    
    for (const sequence of sequences) {
      // Reset hidden state for each sequence
      this.hiddenState = new Array(this.options.recurrentUnits).fill(0);
      
      // Process sequence step by step
      for (const step of sequence) {
        // Combine input with hidden state
        const combined = [...step, ...this.hiddenState];
        
        // Update hidden state (simplified recurrent update)
        this._updateHiddenState(step);
      }
      
      // Use final hidden state + last input as features
      const finalFeatures = [...sequence[sequence.length - 1] || [], ...this.hiddenState];
      features.push(finalFeatures);
    }
    
    return features;
  }

  /**
   * Update hidden state (recurrent connection)
   */
  private _updateHiddenState(input: number[]): void {
    // Simplified recurrent update: h_t = tanh(W * [x_t; h_{t-1}])
    const combined = [...input, ...this.hiddenState];
    const newState = new Array(this.options.recurrentUnits).fill(0);
    
    // Simple linear transformation (in practice, use learned weights)
    for (let i = 0; i < this.options.recurrentUnits; i++) {
      let sum = 0;
      for (let j = 0; j < combined.length; j++) {
        // Simple hash-based weight (in practice, use learned weights)
        const hash = this._hash(`recurrent_${i}_${j}`);
        sum += combined[j] * hash;
      }
      
      // Apply activation
      if (this.options.activation === 'tanh') {
        newState[i] = Math.tanh(sum);
      } else if (this.options.activation === 'relu') {
        newState[i] = Math.max(0, sum);
      } else if (this.options.activation === 'sigmoid') {
        newState[i] = 1 / (1 + Math.exp(-sum));
      } else {
        newState[i] = sum;
      }
    }
    
    this.hiddenState = newState;
  }

  private _hash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return (hash / 2147483647) * 0.1; // Small weights
  }

  /**
   * Predict on sequence
   */
  predict(X: number[][] | number[][][], topK: number = 3): RecurrentELMResult[] {
    if (!this.trained) {
      throw new Error('Model must be trained before prediction');
    }

    const sequences = Array.isArray(X[0][0]) 
      ? (X as number[][][])
      : [X as number[][]];
    
    const results: RecurrentELMResult[] = [];

    for (const sequence of sequences) {
      // Process sequence
      this.hiddenState = new Array(this.options.recurrentUnits).fill(0);
      for (const step of sequence) {
        this._updateHiddenState(step);
      }
      
      const finalFeatures = [...sequence[sequence.length - 1] || [], ...this.hiddenState];
      const preds = (this.elm as any).predictFromVector?.([finalFeatures], topK) || [];
      
      for (const pred of preds.slice(0, topK)) {
        results.push({
          label: pred.label || this.options.categories[pred.index || 0],
          prob: pred.prob || 0,
          hiddenState: [...this.hiddenState],
        });
      }
    }

    return results;
  }

  /**
   * Reset hidden state
   */
  resetState(): void {
    this.hiddenState = new Array(this.options.recurrentUnits).fill(0);
  }
}






