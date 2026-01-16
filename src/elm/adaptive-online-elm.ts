// adaptive-online-elm.ts — Adaptive Online ELM with dynamic hidden unit adjustment
// Adjusts hidden units dynamically based on data complexity

// Import OnlineELM directly - now that we're using ES modules, this works!
import { OnlineELM } from '../core/OnlineELM.js';
export interface AdaptiveOnlineELMOptions {
  categories: string[];
  initialHiddenUnits?: number;
  minHiddenUnits?: number;
  maxHiddenUnits?: number;
  growthThreshold?: number; // Error threshold to trigger growth
  shrinkThreshold?: number; // Performance threshold to trigger shrinkage
  growthFactor?: number; // Multiplier for hidden unit growth
  shrinkFactor?: number; // Multiplier for hidden unit shrinkage
  activation?: 'relu' | 'tanh' | 'sigmoid' | 'linear';
  maxLen?: number;
  useTokenizer?: boolean;
}

export interface AdaptiveOnlineELMResult {
  label: string;
  prob: number;
}

/**
 * Adaptive Online ELM that dynamically adjusts hidden units
 * Features:
 * - Grows hidden units when error is high
 * - Shrinks hidden units when performance is stable
 * - Maintains efficiency while adapting to data complexity
 */
export class AdaptiveOnlineELM {
  private elm: OnlineELM | null = null;
  private categories: string[];
  private options: Required<AdaptiveOnlineELMOptions>;
  private currentHiddenUnits: number;
  private trained = false;
  private errorHistory: number[] = [];
  private performanceHistory: number[] = [];

  constructor(options: AdaptiveOnlineELMOptions) {
        
    this.categories = options.categories;
    this.options = {
      categories: options.categories,
      initialHiddenUnits: options.initialHiddenUnits ?? 128,
      minHiddenUnits: options.minHiddenUnits ?? 32,
      maxHiddenUnits: options.maxHiddenUnits ?? 1024,
      growthThreshold: options.growthThreshold ?? 0.3,
      shrinkThreshold: options.shrinkThreshold ?? 0.1,
      growthFactor: options.growthFactor ?? 1.5,
      shrinkFactor: options.shrinkFactor ?? 0.8,
      activation: options.activation ?? 'relu',
      maxLen: options.maxLen ?? 100,
      useTokenizer: options.useTokenizer ?? true,
    };
    
    this.currentHiddenUnits = this.options.initialHiddenUnits;
    this._initializeELM();
  }

  /**
   * Initialize or reinitialize ELM with current hidden units
   */
  private _initializeELM(inputDim?: number): void {
    // inputDim must be provided if elm is null or needs reinitialization
    if (inputDim === undefined && this.elm && typeof (this.elm as any).inputDim === 'number') {
      inputDim = (this.elm as any).inputDim;
    }
    
    if (inputDim === undefined) {
      // Can't initialize without inputDim
      return;
    }
    
    this.elm = new OnlineELM({
      inputDim: inputDim,
      outputDim: this.categories.length,
      hiddenUnits: this.currentHiddenUnits,
      activation: this.options.activation,
    });
  }

  /**
   * Train with batch data
   */
  fit(X: number[][], y: number[] | number[][]): void {
    // Convert to one-hot if needed
    const oneHotY = this._toOneHot(y);
    
    // Initialize or reinitialize if needed
    if (!this.elm || (this.elm && typeof (this.elm as any).inputDim === 'number' && (this.elm as any).inputDim === 0)) {
      if (X.length > 0) {
        this._initializeELM(X[0].length);
      }
    }
    
    if (!this.elm) {
      throw new Error('Failed to initialize ELM model');
    }
    
    // Initial training with OnlineELM
    if (this.elm) {
      this.elm.fit(X, oneHotY);
    }
    
    // Evaluate and potentially adjust
    const error = this._evaluateError(X, oneHotY);
    this.errorHistory.push(error);
    
    // Adaptive adjustment (may reinitialize ELM)
    this._adaptHiddenUnits(error);
    
    this.trained = true;
  }

  /**
   * Incremental update with adaptive adjustment
   */
  update(x: number[], y: number | number[]): void {
    if (!this.trained || !this.elm) {
      throw new Error('Model must be initially trained with fit() before incremental updates');
    }

    const oneHotY = Array.isArray(y) 
      ? y 
      : (() => {
          const oh = new Array(this.categories.length).fill(0);
          oh[y] = 1;
          return oh;
        })();

    // Update model with OnlineELM
    if (this.elm) {
      this.elm.update([x], [oneHotY]);
    } else {
      throw new Error('Model not initialized');
    }

    // Evaluate recent performance
    const recentError = this._evaluateRecentError();
    this.errorHistory.push(recentError);
    
    // Keep history limited
    if (this.errorHistory.length > 100) {
      this.errorHistory.shift();
    }

    // Adaptive adjustment (may reinitialize ELM)
    this._adaptHiddenUnits(recentError);
  }

  /**
   * Predict with adaptive model
   */
  predict(x: number[] | number[][], topK: number = 3): AdaptiveOnlineELMResult[] {
    if (!this.trained || !this.elm) {
      throw new Error('Model must be trained before prediction');
    }

    const XArray = Array.isArray(x[0]) ? (x as number[][]) : [x as number[]];
    const results: AdaptiveOnlineELMResult[] = [];

    for (const xi of XArray) {
      if (!this.elm) continue;
      const predVec = this.elm.predictLogitsFromVector(xi);
      
      if (!predVec) continue;

      // Convert to probabilities
      const probs = this._softmax(Array.from(predVec));
      
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

      for (let i = 0; i < Math.min(topK, indexed.length); i++) {
        results.push({
          label: indexed[i].label,
          prob: indexed[i].prob,
        });
      }
    }

    return results;
  }

  /**
   * Adapt hidden units based on error
   */
  private _adaptHiddenUnits(currentError: number): void {
    if (this.errorHistory.length < 5) return; // Need some history

    const avgError = this.errorHistory.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, this.errorHistory.length);
    const recentError = this.errorHistory.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, this.errorHistory.length);

    // Grow if error is high
    if (recentError > this.options.growthThreshold && 
        this.currentHiddenUnits < this.options.maxHiddenUnits) {
      const newUnits = Math.min(
        this.options.maxHiddenUnits,
        Math.floor(this.currentHiddenUnits * this.options.growthFactor)
      );
      
      if (newUnits > this.currentHiddenUnits) {
        const oldInputDim = this.elm && typeof (this.elm as any).inputDim === 'number' 
          ? (this.elm as any).inputDim 
          : undefined;
        this.currentHiddenUnits = newUnits;
        if (oldInputDim !== undefined) {
          this._initializeELM(oldInputDim);
        }
        // Note: In practice, you'd want to store recent data for retraining
        // For now, model will need to be retrained
      }
    }
    
    // Shrink if error is low and stable
    if (recentError < this.options.shrinkThreshold && 
        avgError < this.options.shrinkThreshold &&
        this.currentHiddenUnits > this.options.minHiddenUnits) {
      const newUnits = Math.max(
        this.options.minHiddenUnits,
        Math.floor(this.currentHiddenUnits * this.options.shrinkFactor)
      );
      
      if (newUnits < this.currentHiddenUnits) {
        const oldInputDim = this.elm && typeof (this.elm as any).inputDim === 'number'
          ? (this.elm as any).inputDim
          : undefined;
        this.currentHiddenUnits = newUnits;
        if (oldInputDim !== undefined) {
          this._initializeELM(oldInputDim);
        }
      }
    }
  }

  /**
   * Evaluate error on data
   */
  private _evaluateError(X: number[][], y: number[][]): number {
    if (!this.elm) return 1.0;
    
    let totalError = 0;
    let count = 0;
    
    for (let i = 0; i < Math.min(100, X.length); i++) {
      const pred = (this.elm as any).transform?.([X[i]]) || (this.elm as any).predict?.([X[i]]);
      const predVec = Array.isArray(pred) ? pred[0] : pred;
      
      if (!predVec) continue;
      
      const trueIdx = this._argmax(y[i]);
      const predIdx = this._argmax(Array.from(predVec));
      
      if (trueIdx !== predIdx) totalError++;
      count++;
    }
    
    return count > 0 ? totalError / count : 1.0;
  }

  /**
   * Evaluate recent error (for incremental updates)
   */
  private _evaluateRecentError(): number {
    // Use last few predictions for error estimate
    // In practice, you'd track actual errors
    if (this.errorHistory.length === 0) return 0.5;
    return this.errorHistory[this.errorHistory.length - 1];
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

  private _softmax(logits: number[]): number[] {
    const max = Math.max(...logits);
    const exp = logits.map(x => Math.exp(x - max));
    const sum = exp.reduce((a, b) => a + b, 0);
    return exp.map(x => x / sum);
  }

  private _argmax(arr: number[]): number {
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

  /**
   * Get current number of hidden units
   */
  getHiddenUnits(): number {
    return this.currentHiddenUnits;
  }

  /**
   * Get error history
   */
  getErrorHistory(): number[] {
    return [...this.errorHistory];
  }
}

