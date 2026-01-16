// attention-enhanced-elm.ts — Attention-Enhanced ELM with attention mechanisms
// Query-key-value attention and self-attention for sequences

import { ELM } from '../core/ELM.js';
export interface AttentionEnhancedELMOptions {
  categories: string[];
  hiddenUnits?: number;
  attentionHeads?: number; // Number of attention heads
  attentionDim?: number; // Dimension of attention space
  useSelfAttention?: boolean; // Use self-attention vs cross-attention
  activation?: 'relu' | 'tanh' | 'sigmoid' | 'linear';
  maxLen?: number;
  useTokenizer?: boolean;
}

export interface AttentionEnhancedELMResult {
  label: string;
  prob: number;
  attentionWeights?: number[][]; // Attention weights for interpretability
}

/**
 * Attention-Enhanced ELM with attention mechanisms
 * Features:
 * - Query-key-value attention in hidden layer
 * - Self-attention for sequences
 * - Multi-head attention support
 * - Context-aware classification
 */
export class AttentionEnhancedELM {
  private elm: ELM;
  private categories: string[];
  private options: Required<AttentionEnhancedELMOptions>;
  private attentionWeights: number[][][] = []; // [head][sequence][weight]
  private trained = false;

  constructor(options: AttentionEnhancedELMOptions) {
        
    this.categories = options.categories;
    this.options = {
      categories: options.categories,
      hiddenUnits: options.hiddenUnits ?? 256,
      attentionHeads: options.attentionHeads ?? 4,
      attentionDim: options.attentionDim ?? 64,
      useSelfAttention: options.useSelfAttention ?? true,
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
   * Train with attention-enhanced features
   */
  train(X: number[][], y: number[] | string[]): void {
    // Prepare labels
    const labelIndices = y.map(label => 
      typeof label === 'number' 
        ? label 
        : this.options.categories.indexOf(label as string)
    );

    // Extract features with attention
    const attentionFeatures = this._extractAttentionFeatures(X);
    
    // Train base ELM on attention-enhanced features
    (this.elm as any).setCategories?.(this.options.categories);
    (this.elm as any).trainFromData?.(attentionFeatures, labelIndices);
    
    this.trained = true;
  }

  /**
   * Predict with attention
   */
  predict(X: number[] | number[][], topK: number = 3, returnAttention: boolean = false): AttentionEnhancedELMResult[] {
    if (!this.trained) {
      throw new Error('Model must be trained before prediction');
    }

    const XArray = Array.isArray(X[0]) ? (X as number[][]) : [X as number[]];
    const results: AttentionEnhancedELMResult[] = [];

    for (const x of XArray) {
      // Extract attention features
      const attentionFeatures = this._extractAttentionFeatures([x])[0];
      
      // Predict
      const preds = (this.elm as any).predictFromVector?.([attentionFeatures], topK) || [];
      
      for (const pred of preds.slice(0, topK)) {
        const result: AttentionEnhancedELMResult = {
          label: pred.label || this.options.categories[pred.index || 0],
          prob: pred.prob || 0,
        };
        
        if (returnAttention && this.attentionWeights.length > 0) {
          result.attentionWeights = this.attentionWeights[this.attentionWeights.length - 1];
        }
        
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Extract features with attention mechanism
   */
  private _extractAttentionFeatures(X: number[][]): number[][] {
    const features: number[][] = [];
    
    for (const x of X) {
      // Compute attention for each head
      const headFeatures: number[][] = [];
      
      for (let head = 0; head < this.options.attentionHeads; head++) {
        const attentionOutput = this._computeAttention(x, head);
        headFeatures.push(attentionOutput);
      }
      
      // Concatenate all heads
      const concatenated = headFeatures.flat();
      
      // Project to hidden units size
      const projected = this._projectToHiddenSize(concatenated);
      features.push(projected);
    }
    
    return features;
  }

  /**
   * Compute attention for a sequence
   */
  private _computeAttention(x: number[], headIndex: number): number[] {
    // Simple attention mechanism: Q, K, V projection
    const seqLen = x.length;
    const dim = this.options.attentionDim;
    
    // Generate Q, K, V (simplified - using random projections)
    const Q = this._project(x, dim, `Q_${headIndex}`);
    const K = this._project(x, dim, `K_${headIndex}`);
    const V = this._project(x, dim, `V_${headIndex}`);
    
    // Compute attention scores: Q * K^T
    const scores: number[] = [];
    for (let i = 0; i < seqLen; i++) {
      let score = 0;
      for (let j = 0; j < dim; j++) {
        score += Q[j] * K[j];
      }
      scores.push(score / Math.sqrt(dim)); // Scaled dot-product
    }
    
    // Softmax attention weights
    const weights = this._softmax(scores);
    
    // Apply attention to values
    const output = new Array(dim).fill(0);
    for (let i = 0; i < seqLen; i++) {
      for (let j = 0; j < dim; j++) {
        output[j] += weights[i] * V[j];
      }
    }
    
    // Store attention weights for this head
    if (!this.attentionWeights[headIndex]) {
      this.attentionWeights[headIndex] = [];
    }
    this.attentionWeights[headIndex].push(weights);
    
    return output;
  }

  /**
   * Project input to attention dimension
   */
  private _project(x: number[], dim: number, key: string): number[] {
    // Simple linear projection (in practice, you'd use learned weights)
    const projected = new Array(dim).fill(0);
    const scale = Math.sqrt(2.0 / (x.length + dim));
    
    for (let i = 0; i < dim; i++) {
      for (let j = 0; j < x.length; j++) {
        // Simple hash-based projection for determinism
        const hash = this._hash(`${key}_${i}_${j}`);
        projected[i] += x[j] * (hash * scale);
      }
    }
    
    return projected;
  }

  /**
   * Project attention output to hidden units size
   */
  private _projectToHiddenSize(attentionOutput: number[]): number[] {
    const hiddenSize = this.options.hiddenUnits;
    const output = new Array(hiddenSize).fill(0);
    const scale = Math.sqrt(2.0 / (attentionOutput.length + hiddenSize));
    
    for (let i = 0; i < hiddenSize; i++) {
      for (let j = 0; j < attentionOutput.length; j++) {
        const hash = this._hash(`proj_${i}_${j}`);
        output[i] += attentionOutput[j] * (hash * scale);
      }
      // Apply activation
      if (this.options.activation === 'relu') {
        output[i] = Math.max(0, output[i]);
      } else if (this.options.activation === 'tanh') {
        output[i] = Math.tanh(output[i]);
      } else if (this.options.activation === 'sigmoid') {
        output[i] = 1 / (1 + Math.exp(-output[i]));
      }
    }
    
    return output;
  }

  private _softmax(logits: number[]): number[] {
    const max = Math.max(...logits);
    const exp = logits.map(x => Math.exp(x - max));
    const sum = exp.reduce((a, b) => a + b, 0);
    return exp.map(x => x / sum);
  }

  private _hash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return (hash / 2147483647); // Normalize to [-1, 1]
  }

  /**
   * Get attention weights for last prediction
   */
  getAttentionWeights(): number[][][] {
    return this.attentionWeights.map(head => [...head]);
  }
}






