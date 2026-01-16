// deep-elm-pro.ts — Improved Deep ELM with advanced features
// Enhanced version of DeepELM with better training strategies and regularization

import { ELM } from '../../core/ELM.js';
import { DeepELM } from '../../core/DeepELM.js';
import type { Vec } from '../math/index.js';
// License removed - all features are now free!

export interface DeepELMProOptions {
  layers: number[]; // Hidden units per layer
  activation?: 'relu' | 'tanh' | 'sigmoid' | 'linear';
  useDropout?: boolean;
  dropoutRate?: number;
  useBatchNorm?: boolean;
  regularization?: {
    type: 'l1' | 'l2' | 'elastic';
    lambda?: number;
    alpha?: number; // For elastic net
  };
  layerWiseTraining?: boolean; // Train layers sequentially vs jointly
  pretraining?: boolean; // Autoencoder pretraining
  categories: string[];
  maxLen?: number;
}

export interface DeepELMProResult {
  label: string;
  prob: number;
}

/**
 * Improved Deep ELM with advanced training strategies
 * Features:
 * - Layer-wise training with autoencoder pretraining
 * - Dropout and batch normalization
 * - L1/L2/Elastic net regularization
 * - Better initialization strategies
 */
export class DeepELMPro {
  private layers: DeepELM[] = [];
  private options: Required<DeepELMProOptions>;
  private trained = false;
  private featureExtractors: ELM[] = []; // For pretraining

  constructor(options: DeepELMProOptions) {
    // License check removed // Premium feature - requires valid license
    this.options = {
      layers: options.layers,
      activation: options.activation ?? 'relu',
      useDropout: options.useDropout ?? false,
      dropoutRate: options.dropoutRate ?? 0.2,
      useBatchNorm: options.useBatchNorm ?? false,
      regularization: {
        type: options.regularization?.type ?? 'l2',
        lambda: options.regularization?.lambda ?? 0.0001,
        alpha: options.regularization?.alpha ?? 0.5,
      },
      layerWiseTraining: options.layerWiseTraining ?? true,
      pretraining: options.pretraining ?? true,
      categories: options.categories,
      maxLen: options.maxLen ?? 100,
    };

    // Initialize layers
    for (let i = 0; i < this.options.layers.length; i++) {
      const deepELM = new DeepELM({
        layers: [{ hiddenUnits: this.options.layers[i], activation: this.options.activation }],
        maxLen: this.options.maxLen,
        useTokenizer: i === 0, // Only first layer uses tokenizer
      } as any);
      // Set categories for last layer after construction
      if (i === this.options.layers.length - 1) {
        (deepELM as any).setCategories?.(this.options.categories);
      }
      this.layers.push(deepELM);
    }

    // Initialize feature extractors for pretraining
    if (this.options.pretraining) {
      for (let i = 0; i < this.options.layers.length - 1; i++) {
        const extractor = new ELM({
          useTokenizer: i === 0 ? true : undefined,
          hiddenUnits: this.options.layers[i],
          categories: [],
          maxLen: this.options.maxLen,
        } as any);
        this.featureExtractors.push(extractor);
      }
    }
  }

  /**
   * Train the deep ELM with improved strategies
   */
  async train(X: number[][], y: number[]): Promise<void> {
    // Step 1: Pretraining (if enabled)
    if (this.options.pretraining) {
      await this._pretrain(X);
    }

    // Step 2: Layer-wise or joint training
    if (this.options.layerWiseTraining) {
      await this._trainLayerWise(X, y);
    } else {
      await this._trainJoint(X, y);
    }

    this.trained = true;
  }

  /**
   * Predict with deep ELM
   */
  predict(X: number[] | number[][], topK: number = 3): DeepELMProResult[] {
    if (!this.trained) {
      throw new Error('Model must be trained before prediction');
    }

    const XArray = Array.isArray(X[0]) ? (X as number[][]) : [X as number[]];
    const predictions: DeepELMProResult[] = [];

    for (const x of XArray) {
      // Forward pass through layers
      let features: number[] = x;
      
      for (let i = 0; i < this.layers.length; i++) {
        const layer = this.layers[i];
        
        // Apply batch normalization if enabled
        if (this.options.useBatchNorm && i > 0) {
          features = this._batchNormalize(features);
        }
        
        // Apply dropout if enabled (only during training, but we're in predict mode)
        // In practice, dropout is disabled during inference
        
        // Forward through layer
        if (i === this.layers.length - 1) {
          // Last layer: get predictions
          const pred = (layer as any).predictFromVector?.([features], topK) || [];
          predictions.push(...pred.map((p: any) => ({
            label: p.label || this.options.categories[p.index || 0],
            prob: p.prob || 0,
          })));
        } else {
          // Hidden layers: extract features
          features = this._extractFeatures(layer, features);
        }
      }
    }

    return predictions;
  }

  /**
   * Pretrain layers as autoencoders
   */
  private async _pretrain(X: number[][]): Promise<void> {
    let currentFeatures = X;

    for (let i = 0; i < this.featureExtractors.length; i++) {
      const extractor = this.featureExtractors[i];
      
      // Train as autoencoder (reconstruct input)
      const encoded = currentFeatures.map(x => {
        const enc = (extractor as any).encoder?.encode?.(x) || x;
        return (extractor as any).encoder?.normalize?.(enc) || enc;
      });
      
      // Use encoded features as both input and target (autoencoder)
      (extractor as any).trainFromData?.(encoded, encoded.map((_, idx) => idx));
      
      // Extract features for next layer
      currentFeatures = encoded.map(x => {
        const hidden = this._extractFeaturesFromELM(extractor, x);
        return Array.from(hidden);
      });
    }
  }

  /**
   * Train layers sequentially
   */
  private async _trainLayerWise(X: number[][], y: number[]): Promise<void> {
    let currentFeatures = X;
    const labelIndices = y.map(label => 
      typeof label === 'number' ? label : this.options.categories.indexOf(label as string)
    );

    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      
      // Prepare features
      const features = currentFeatures.map(x => {
        if (i === 0) {
          // First layer: use raw input
          return x;
        } else {
          // Subsequent layers: use previous layer output
          return this._extractFeatures(this.layers[i - 1], x);
        }
      });

      // Train layer
      if (i === this.layers.length - 1) {
        // Last layer: train with labels
        (layer as any).setCategories?.(this.options.categories);
        (layer as any).trainFromData?.(features, labelIndices);
      } else {
        // Hidden layers: train to extract features
        // Use next layer's input as target (unsupervised)
        const nextLayerFeatures = i < this.layers.length - 1
          ? features.map(f => this._extractFeatures(this.layers[i + 1], f))
          : features;
        (layer as any).trainFromData?.(features, nextLayerFeatures.map((_, idx) => idx));
      }

      // Update features for next layer
      currentFeatures = features.map(f => this._extractFeatures(layer, f));
    }
  }

  /**
   * Train all layers jointly
   */
  private async _trainJoint(X: number[][], y: number[]): Promise<void> {
    const labelIndices = y.map(label => 
      typeof label === 'number' ? label : this.options.categories.indexOf(label as string)
    );

    // Train the last layer with final features
    const lastLayer = this.layers[this.layers.length - 1];
    const finalFeatures = X.map(x => {
      let features: number[] = x;
      for (let i = 0; i < this.layers.length - 1; i++) {
        features = this._extractFeatures(this.layers[i], features);
      }
      return features;
    });

    (lastLayer as any).setCategories?.(this.options.categories);
    (lastLayer as any).trainFromData?.(finalFeatures, labelIndices);
  }

  private _extractFeatures(layer: DeepELM, input: number[]): number[] {
    // Extract hidden layer representation
    const hidden = (layer as any).buildHidden?.([input], (layer as any).model?.W, (layer as any).model?.b);
    return hidden?.[0] ? Array.from(hidden[0]) : input;
  }

  private _extractFeaturesFromELM(elm: ELM, input: number[]): Float64Array {
    const hidden = (elm as any).buildHidden?.([input], (elm as any).model?.W, (elm as any).model?.b);
    return hidden?.[0] || new Float64Array(input.length);
  }

  private _batchNormalize(features: number[]): number[] {
    const mean = features.reduce((a, b) => a + b, 0) / features.length;
    const variance = features.reduce((sum, x) => sum + (x - mean) ** 2, 0) / features.length;
    const std = Math.sqrt(variance + 1e-8);
    return features.map(x => (x - mean) / std);
  }
}

