// ensemble-kernel-elm.ts — Ensemble Kernel ELM
// Multiple KELM models with different kernels, voting/weighted combination

import { KernelELM } from '../core/KernelELM.js';
export interface EnsembleKernelELMOptions {
  categories: string[];
  kernels?: Array<{
    type: 'rbf' | 'polynomial' | 'linear' | 'sigmoid';
    gamma?: number;
    degree?: number;
    coef0?: number;
    weight?: number; // Weight for this kernel in ensemble
  }>;
  votingType?: 'majority' | 'weighted' | 'average'; // Voting strategy
  activation?: 'relu' | 'tanh' | 'sigmoid' | 'linear';
  maxLen?: number;
  useTokenizer?: boolean;
}

export interface EnsembleKernelELMResult {
  label: string;
  prob: number;
  votes?: number; // Number of models voting for this label
  confidence?: number; // Ensemble confidence
}

/**
 * Ensemble Kernel ELM
 * Features:
 * - Multiple KELM models with different kernels
 * - Voting/weighted combination
 * - Diversity promotion
 * - Robust predictions
 */
export class EnsembleKernelELM {
  private models: KernelELM[] = [];
  private categories: string[];
  private options: Required<EnsembleKernelELMOptions> & { kernels: Array<{ type: 'rbf' | 'polynomial' | 'linear' | 'sigmoid'; gamma?: number; degree?: number; coef0?: number; weight: number }> };
  private trained = false;

  constructor(options: EnsembleKernelELMOptions) {
        
    this.categories = options.categories;
    
    // Default kernels if not provided
    const defaultKernels = options.kernels || [
      { type: 'rbf' as const, gamma: 1.0, weight: 1.0 },
      { type: 'polynomial' as const, degree: 2, coef0: 0, weight: 1.0 },
      { type: 'linear' as const, weight: 1.0 },
    ];
    
    this.options = {
      categories: options.categories,
      kernels: defaultKernels.map(k => ({ ...k, weight: k.weight ?? 1.0 })),
      votingType: options.votingType ?? 'weighted',
      activation: options.activation ?? 'relu',
      maxLen: options.maxLen ?? 100,
      useTokenizer: options.useTokenizer ?? true,
    };
    
    // Initialize models for each kernel
    for (const kernel of this.options.kernels) {
      const kelm = new KernelELM({
        useTokenizer: this.options.useTokenizer ? true : undefined,
        categories: this.options.categories,
        maxLen: this.options.maxLen,
        kernel: kernel.type,
        gamma: kernel.gamma,
        degree: kernel.degree,
        coef0: kernel.coef0,
      } as any);
      
      this.models.push(kelm);
    }
  }

  /**
   * Train ensemble
   */
  train(X: number[][], y: number[] | string[]): void {
    // Prepare labels
    const labelIndices = y.map(label => 
      typeof label === 'number' 
        ? label 
        : this.options.categories.indexOf(label as string)
    );

    // Train each model
    for (const model of this.models) {
      (model as any).setCategories?.(this.options.categories);
      (model as any).trainFromData?.(X, labelIndices);
    }
    
    this.trained = true;
  }

  /**
   * Predict with ensemble voting
   */
  predict(X: number[] | number[][], topK: number = 3): EnsembleKernelELMResult[] {
    if (!this.trained) {
      throw new Error('Model must be trained before prediction');
    }

    const XArray = Array.isArray(X[0]) ? (X as number[][]) : [X as number[]];
    const allResults: EnsembleKernelELMResult[] = [];

    for (const x of XArray) {
      // Get predictions from all models
      const modelPredictions: Array<Array<{ label: string; prob: number; index: number }>> = [];
      
      for (const model of this.models) {
        const preds = (model as any).predictFromVector?.([x], topK) || [];
        modelPredictions.push(preds.map((p: any) => ({
          label: p.label || this.options.categories[p.index || 0],
          prob: p.prob || 0,
          index: p.index || 0,
        })));
      }
      
      // Combine predictions
      const combined = this._combinePredictions(modelPredictions, topK);
      allResults.push(...combined);
    }

    return allResults;
  }

  /**
   * Combine predictions from multiple models
   */
  private _combinePredictions(
    modelPredictions: Array<Array<{ label: string; prob: number; index: number }>>,
    topK: number
  ): EnsembleKernelELMResult[] {
    // Aggregate predictions by label
    const labelScores = new Map<string, { prob: number; votes: number; weight: number }>();
    
    for (let modelIdx = 0; modelIdx < modelPredictions.length; modelIdx++) {
      const kernel = this.options.kernels[modelIdx];
      const weight = kernel.weight;
      
      for (const pred of modelPredictions[modelIdx]) {
        if (!labelScores.has(pred.label)) {
          labelScores.set(pred.label, { prob: 0, votes: 0, weight: 0 });
        }
        
        const score = labelScores.get(pred.label)!;
        if (this.options.votingType === 'majority') {
          score.votes += 1;
        } else if (this.options.votingType === 'weighted') {
          score.prob += pred.prob * weight;
          score.weight += weight;
          score.votes += 1;
        } else if (this.options.votingType === 'average') {
          score.prob += pred.prob;
          score.votes += 1;
        }
      }
    }
    
    // Normalize and sort
    const results: EnsembleKernelELMResult[] = [];
    
    for (const [label, score] of labelScores) {
      let finalProb: number;
      
      if (this.options.votingType === 'majority') {
        finalProb = score.votes / this.models.length;
      } else if (this.options.votingType === 'weighted') {
        finalProb = score.weight > 0 ? score.prob / score.weight : 0;
      } else {
        finalProb = score.votes > 0 ? score.prob / score.votes : 0;
      }
      
      results.push({
        label,
        prob: finalProb,
        votes: score.votes,
        confidence: finalProb * (score.votes / this.models.length),
      });
    }
    
    // Sort by probability and return top K
    results.sort((a, b) => b.prob - a.prob);
    return results.slice(0, topK);
  }
}






