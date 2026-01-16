// forgetting-online-elm.ts — Forgetting Online ELM with time-decay for concept drift
// Handles concept drift by decaying old samples over time

// Import OnlineELM directly - now that we're using ES modules, this works!
import { OnlineELM } from '../core/OnlineELM.js';

export interface ForgettingOnlineELMOptions {
  categories: string[];
  hiddenUnits?: number;
  decayRate?: number; // Exponential decay rate (0-1, higher = faster forgetting)
  windowSize?: number; // Maximum number of samples to keep
  timeBasedDecay?: boolean; // Use time-based decay vs sample-based
  activation?: 'relu' | 'tanh' | 'sigmoid' | 'linear';
}

export interface ForgettingOnlineELMResult {
  label: string;
  prob: number;
}

interface TimestampedSample {
  x: number[];
  y: number[];
  timestamp: number;
  weight: number;
}

/**
 * Forgetting Online ELM with time-decay for concept drift
 * Features:
 * - Exponential decay of old samples
 * - Time-based or sample-based forgetting
 * - Sliding window for memory efficiency
 * - Handles concept drift automatically
 */
export class ForgettingOnlineELM {
  private elm: OnlineELM | null = null;
  private categories: string[];
  private options: Required<ForgettingOnlineELMOptions>;
  private samples: TimestampedSample[] = [];
  private trained = false;
  private currentTime = 0;

  constructor(options: ForgettingOnlineELMOptions) {
        
    this.categories = options.categories;
    this.options = {
      categories: options.categories,
      hiddenUnits: options.hiddenUnits ?? 256,
      decayRate: options.decayRate ?? 0.99,
      windowSize: options.windowSize ?? 1000,
      timeBasedDecay: options.timeBasedDecay ?? false,
      activation: options.activation ?? 'relu',
    };
    
    // inputDim will be set during first fit
    // Note: OnlineELM will be initialized during fit() when we have inputDim
    this.elm = null;
  }

  /**
   * Initial training with batch data
   */
  fit(X: number[][], y: number[] | number[][]): void {
    const oneHotY = this._toOneHot(y);
    
    // Store samples with timestamps
    for (let i = 0; i < X.length; i++) {
      this.samples.push({
        x: [...X[i]],
        y: [...oneHotY[i]],
        timestamp: this.currentTime++,
        weight: 1.0,
      });
    }
    
    // Train on all samples (will initialize OnlineELM if needed)
    this._retrain();
    
    this.trained = true;
  }

  /**
   * Incremental update with forgetting mechanism
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

    // Apply decay to existing samples
    this._applyDecay();

    // Add new sample
    this.samples.push({
      x: [...x],
      y: [...oneHotY],
      timestamp: this.currentTime++,
      weight: 1.0,
    });

    // Remove old samples if window exceeded
    if (this.samples.length > this.options.windowSize) {
      const removeCount = this.samples.length - this.options.windowSize;
      this.samples.splice(0, removeCount);
    }

    // Retrain with weighted samples
    this._retrain();
  }

  /**
   * Predict with forgetting model
   */
  predict(x: number[] | number[][], topK: number = 3): ForgettingOnlineELMResult[] {
    if (!this.trained) {
      throw new Error('Model must be trained before prediction');
    }

    const XArray = Array.isArray(x[0]) ? (x as number[][]) : [x as number[]];
    const results: ForgettingOnlineELMResult[] = [];

    for (const xi of XArray) {
      const predVec = this.elm ? this.elm.predictLogitsFromVector(xi) : null;
      
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
   * Apply decay to all samples
   */
  private _applyDecay(): void {
    if (this.options.timeBasedDecay) {
      // Time-based: decay based on time difference
      const currentTime = this.currentTime;
      for (const sample of this.samples) {
        const timeDiff = currentTime - sample.timestamp;
        sample.weight *= Math.pow(this.options.decayRate, timeDiff);
      }
    } else {
      // Sample-based: uniform decay
      for (const sample of this.samples) {
        sample.weight *= this.options.decayRate;
      }
    }
  }

  /**
   * Retrain model with weighted samples
   */
  private _retrain(): void {
    if (this.samples.length === 0) return;
    
    // Get inputDim from first sample
    const inputDim = this.samples[0].x.length;
    
    // Reinitialize ELM if inputDim changed or not set
    if (!this.elm || (this.elm && this.elm.inputDim !== inputDim)) {
      this.elm = new OnlineELM({
        inputDim: inputDim,
        outputDim: this.categories.length,
        hiddenUnits: this.options.hiddenUnits,
        activation: this.options.activation,
      });
    }

    // Train with weighted samples
    // In practice, you'd use weighted training
    // For now, we'll use samples with weights above threshold
    const threshold = 0.01;
    const activeSamples = this.samples.filter(s => s.weight > threshold);

    // Batch samples for efficiency
    const X: number[][] = [];
    const Y: number[][] = [];
    
    for (const sample of activeSamples) {
      // Repeat samples based on weight (simplified approach)
      const repetitions = Math.max(1, Math.floor(sample.weight * 10));
      for (let i = 0; i < repetitions; i++) {
        X.push(sample.x);
        Y.push(sample.y);
      }
    }
    
    if (X.length > 0) {
      this.elm.fit(X, Y);
    }
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

  /**
   * Get sample statistics
   */
  getSampleStats(): { total: number; active: number; avgWeight: number } {
    const active = this.samples.filter(s => s.weight > 0.01).length;
    const avgWeight = this.samples.length > 0
      ? this.samples.reduce((sum, s) => sum + s.weight, 0) / this.samples.length
      : 0;
    
    return {
      total: this.samples.length,
      active,
      avgWeight,
    };
  }
}

