// time-series-elm.ts — Time-Series ELM for temporal pattern recognition
// Sequence-to-sequence ELM with temporal dependencies

import { ELM } from '../core/ELM.js';
import { OnlineELM } from '../core/OnlineELM.js';
export interface TimeSeriesELMOptions {
  categories: string[];
  hiddenUnits?: number;
  sequenceLength?: number; // Length of input sequences
  lookbackWindow?: number; // How many past steps to consider
  useRecurrent?: boolean; // Use recurrent connections
  activation?: 'relu' | 'tanh' | 'sigmoid' | 'linear';
  maxLen?: number;
  useTokenizer?: boolean;
}

export interface TimeSeriesELMResult {
  label: string;
  prob: number;
  forecast?: number[]; // Future predictions (if forecasting)
}

/**
 * Time-Series ELM for temporal pattern recognition
 * Features:
 * - Temporal pattern recognition
 * - Optional recurrent connections
 * - Sequence-to-sequence prediction
 * - Forecasting capabilities
 */
export class TimeSeriesELM {
  private elm: ELM;
  private categories: string[];
  private options: Required<TimeSeriesELMOptions>;
  private history: number[][] = []; // Store recent history for recurrent mode
  private trained = false;

  constructor(options: TimeSeriesELMOptions) {
        
    this.categories = options.categories;
    this.options = {
      categories: options.categories,
      hiddenUnits: options.hiddenUnits ?? 256,
      sequenceLength: options.sequenceLength ?? 10,
      lookbackWindow: options.lookbackWindow ?? 5,
      useRecurrent: options.useRecurrent ?? false,
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
   * Train on time-series data
   * @param X Sequences of features (each element is a time step)
   * @param y Labels for each sequence
   */
  train(X: number[][][], y: number[] | string[]): void {
    // Prepare labels
    const labelIndices = y.map(label => 
      typeof label === 'number' 
        ? label 
        : this.options.categories.indexOf(label as string)
    );

    // Flatten sequences to features
    const flattenedFeatures = this._flattenSequences(X);
    
    // Train base ELM
    (this.elm as any).setCategories?.(this.options.categories);
    (this.elm as any).trainFromData?.(flattenedFeatures, labelIndices);
    
    this.trained = true;
  }

  /**
   * Train on single sequences (convenience method)
   */
  trainSequences(sequences: number[][][], labels: number[] | string[]): void {
    this.train(sequences, labels);
  }

  /**
   * Predict from time-series sequence
   */
  predict(sequence: number[][] | number[][][], topK: number = 3): TimeSeriesELMResult[] {
    if (!this.trained) {
      throw new Error('Model must be trained before prediction');
    }

    const sequences = Array.isArray(sequence[0][0]) 
      ? (sequence as number[][][]) 
      : [sequence as number[][]];
    
    const allResults: TimeSeriesELMResult[] = [];

    for (const seq of sequences) {
      // Flatten sequence to features
      const features = this._flattenSequence(seq);
      
      // Update history if using recurrent mode
      if (this.options.useRecurrent) {
        this._updateHistory(features);
        // Use history-enhanced features
        const enhancedFeatures = this._enhanceWithHistory(features);
        const preds = (this.elm as any).predictFromVector?.([enhancedFeatures], topK) || [];
        allResults.push(...preds.map((p: any) => ({
          label: p.label || this.options.categories[p.index || 0],
          prob: p.prob || 0,
        })));
      } else {
        const preds = (this.elm as any).predictFromVector?.([features], topK) || [];
        allResults.push(...preds.map((p: any) => ({
          label: p.label || this.options.categories[p.index || 0],
          prob: p.prob || 0,
        })));
      }
    }

    return allResults;
  }

  /**
   * Forecast future values (for regression/forecasting tasks)
   */
  forecast(sequence: number[][], steps: number = 1): number[][] {
    if (!this.trained) {
      throw new Error('Model must be trained before forecasting');
    }

    const forecasts: number[][] = [];
    let currentSeq = [...sequence];
    
    for (let step = 0; step < steps; step++) {
      const features = this._flattenSequence(currentSeq);
      const pred = (this.elm as any).predictLogitsFromVector?.(features) || [];
      
      // Use prediction as next step (simplified - in practice, you'd have a regression head)
      forecasts.push([...pred]);
      
      // Update sequence for next step
      currentSeq.push(pred);
      if (currentSeq.length > this.options.sequenceLength) {
        currentSeq.shift();
      }
    }
    
    return forecasts;
  }

  /**
   * Flatten sequences to feature vectors
   */
  private _flattenSequences(sequences: number[][][]): number[][] {
    return sequences.map(seq => this._flattenSequence(seq));
  }

  /**
   * Flatten a single sequence
   */
  private _flattenSequence(sequence: number[][]): number[] {
    // Concatenate all time steps
    const flattened: number[] = [];
    
    // Take last lookbackWindow steps
    const relevantSteps = sequence.slice(-this.options.lookbackWindow);
    
    for (const step of relevantSteps) {
      flattened.push(...step);
    }
    
    // Pad if necessary
    while (flattened.length < this.options.lookbackWindow * (sequence[0]?.length || 1)) {
      flattened.push(0);
    }
    
    return flattened;
  }

  /**
   * Update history for recurrent mode
   */
  private _updateHistory(features: number[]): void {
    this.history.push([...features]);
    
    // Keep only recent history
    if (this.history.length > this.options.lookbackWindow) {
      this.history.shift();
    }
  }

  /**
   * Enhance features with history (recurrent mode)
   */
  private _enhanceWithHistory(currentFeatures: number[]): number[] {
    if (this.history.length === 0) {
      return currentFeatures;
    }
    
    // Concatenate history with current features
    const historyFeatures = this.history.flat();
    return [...historyFeatures, ...currentFeatures];
  }

  /**
   * Clear history (useful for new sequences)
   */
  clearHistory(): void {
    this.history = [];
  }
}






