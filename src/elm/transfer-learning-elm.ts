// transfer-learning-elm.ts — Transfer Learning ELM
// Pre-trained ELM adaptation, domain adaptation, and few-shot learning

import { ELM } from '../core/ELM.js';
export interface TransferLearningELMOptions {
  categories: string[];
  sourceModel?: any; // Pre-trained ELM model
  freezeBase?: boolean; // Freeze base layers
  fineTuneLayers?: number; // Number of layers to fine-tune
  hiddenUnits?: number;
  activation?: 'relu' | 'tanh' | 'sigmoid' | 'linear';
  maxLen?: number;
  useTokenizer?: boolean;
}

export interface TransferLearningELMResult {
  label: string;
  prob: number;
}

/**
 * Transfer Learning ELM
 * Features:
 * - Pre-trained model adaptation
 * - Domain adaptation
 * - Few-shot learning
 * - Fine-tuning capabilities
 */
export class TransferLearningELM {
  private elm: ELM;
  private sourceModel: any | null = null;
  private categories: string[];
  private options: Required<Omit<TransferLearningELMOptions, 'sourceModel'>> & { sourceModel: any | null };
  private trained = false;

  constructor(options: TransferLearningELMOptions) {
        
    this.categories = options.categories;
    this.sourceModel = options.sourceModel || null;
    this.options = {
      categories: options.categories,
      sourceModel: this.sourceModel,
      freezeBase: options.freezeBase ?? false,
      fineTuneLayers: options.fineTuneLayers ?? 1,
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
    
    // Transfer weights from source model if available
    if (this.sourceModel) {
      this._transferWeights();
    }
  }

  /**
   * Transfer weights from source model
   */
  private _transferWeights(): void {
    if (!this.sourceModel) return;
    
    const sourceModelData = (this.sourceModel as any).model;
    const targetModel = (this.elm as any).model;
    
    if (!sourceModelData || !targetModel) return;
    
    // Transfer hidden layer weights if dimensions match
    if (sourceModelData.W && targetModel.W) {
      const sourceW = sourceModelData.W;
      const targetW = targetModel.W;
      
      // Copy matching dimensions
      for (let i = 0; i < Math.min(sourceW.length, targetW.length); i++) {
        for (let j = 0; j < Math.min(sourceW[i]?.length || 0, targetW[i]?.length || 0); j++) {
          if (!this.options.freezeBase) {
            targetW[i][j] = sourceW[i][j];
          }
        }
      }
    }
    
    // Transfer biases if available
    if (sourceModelData.b && targetModel.b) {
      const sourceB = sourceModelData.b;
      const targetB = targetModel.b;
      
      for (let i = 0; i < Math.min(sourceB.length, targetB.length); i++) {
        if (!this.options.freezeBase) {
          targetB[i] = sourceB[i];
        }
      }
    }
  }

  /**
   * Train with transfer learning
   * @param X Target domain features
   * @param y Target domain labels
   */
  train(X: number[][], y: number[] | string[]): void {
    // Prepare labels
    const labelIndices = y.map(label => 
      typeof label === 'number' 
        ? label 
        : this.options.categories.indexOf(label as string)
    );

    // If source model exists and we're not freezing, fine-tune
    if (this.sourceModel && !this.options.freezeBase) {
      // Fine-tune: train on new data with transferred weights
      (this.elm as any).setCategories?.(this.options.categories);
      (this.elm as any).trainFromData?.(X, labelIndices, {
        reuseWeights: true, // Reuse transferred weights
      });
    } else {
      // Standard training
      (this.elm as any).setCategories?.(this.options.categories);
      (this.elm as any).trainFromData?.(X, labelIndices);
    }
    
    this.trained = true;
  }

  /**
   * Few-shot learning: train with very few examples
   */
  fewShotTrain(X: number[][], y: number[] | string[], shots: number = 5): void {
    if (!this.sourceModel) {
      throw new Error('Few-shot learning requires a pre-trained source model');
    }
    
    // Use only a few examples
    const limitedX = X.slice(0, shots);
    const limitedY = y.slice(0, shots);
    
    // Fine-tune on limited data
    this.train(limitedX, limitedY);
  }

  /**
   * Predict with transferred model
   */
  predict(X: number[] | number[][], topK: number = 3): TransferLearningELMResult[] {
    if (!this.trained) {
      throw new Error('Model must be trained before prediction');
    }

    const XArray = Array.isArray(X[0]) ? (X as number[][]) : [X as number[]];
    const results: TransferLearningELMResult[] = [];

    for (const x of XArray) {
      const preds = (this.elm as any).predictFromVector?.([x], topK) || [];
      
      for (const pred of preds.slice(0, topK)) {
        results.push({
          label: pred.label || this.options.categories[pred.index || 0],
          prob: pred.prob || 0,
        });
      }
    }

    return results;
  }

  /**
   * Load pre-trained model
   */
  loadSourceModel(model: any): void {
    this.sourceModel = model;
    this._transferWeights();
  }

  /**
   * Export current model for use as source in other transfers
   */
  exportModel(): any {
    return {
      model: (this.elm as any).model,
      categories: this.options.categories,
      config: {
        hiddenUnits: this.options.hiddenUnits,
        activation: this.options.activation,
      },
    };
  }
}






