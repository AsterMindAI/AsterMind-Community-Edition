/**
 * ELMGenerator - Label-conditioned string generator using ELM
 * Trains an ELM to generate encoded strings based on labels + noise
 */

import { ELM } from '../../core/ELM.js';
import { StringEncoder } from '../encoders/StringEncoder';
import { LabeledSample } from '../types';
import { oneHotLabel, generateNoiseVector } from '../core/elm_utils';
import { validateForLabel } from '../core/validation';
import { PatternCorrector } from '../core/PatternCorrector';
import { SequenceContext } from '../core/SequenceContext';
// Type definitions - ELM will be available at runtime from AsterMind
// Using any for now to allow runtime import from dist or external package
type ELMConfig = {
  useTokenizer: false;
  inputSize: number;
  categories: string[];
  hiddenUnits: number;
  activation?: 'tanh' | 'relu' | 'leakyrelu' | 'sigmoid' | 'linear' | 'gelu';
  ridgeLambda?: number;
  task?: 'classification' | 'regression';
};

type ELMModel = {
  trainFromData(X: number[][], Y: number[] | number[][], options?: any): any;
  predictLogitsFromVector(vec: number[]): number[];
  predictProbaFromVector?(vec: number[]): number[]; // For classification
};

export interface ELMGeneratorConfig {
  maxLength: number;
  hiddenUnits?: number;
  activation?: 'tanh' | 'relu' | 'leakyrelu' | 'sigmoid' | 'linear' | 'gelu';
  ridgeLambda?: number;
  noiseSize?: number; // Size of noise vector
  seed?: number;
  useOneHot?: boolean; // Use one-hot encoding (better for classification)
  useClassification?: boolean; // Use classification instead of regression
  usePatternCorrection?: boolean; // Apply pattern-based correction
}

export class ELMGenerator {
  private encoder: StringEncoder;
  private elm: ELMModel | null = null;
  private labels: string[] = [];
  private config: ELMGeneratorConfig;
  private noiseSize: number;
  private patternCorrector: PatternCorrector | null = null;
  private sequenceContext: SequenceContext | null = null;
  private useClassification: boolean;

  constructor(config: ELMGeneratorConfig) {
    // Initialize and require license before allowing generator use
            this.config = {
      hiddenUnits: 128,
      activation: 'relu',
      ridgeLambda: 0.01,
      noiseSize: 32,
      useOneHot: false, // Default to false for memory efficiency (can enable for better accuracy)
      useClassification: false, // Default to regression for compatibility
      usePatternCorrection: true,
      ...config,
    };
    this.noiseSize = this.config.noiseSize!;
    this.useClassification = this.config.useClassification!;
    this.encoder = new StringEncoder({
      maxLength: config.maxLength,
      useOneHot: this.config.useOneHot ?? false, // Default to false for memory efficiency
    });
    
    if (this.config.usePatternCorrection) {
      this.patternCorrector = new PatternCorrector();
    }
    
    // Always use sequence context for better generation
    this.sequenceContext = new SequenceContext(3); // 3-grams
  }

  /**
   * Train the ELM generator on labeled samples
   */
  train(samples: LabeledSample[]): void {
    if (samples.length === 0) {
      throw new Error('Cannot train on empty dataset');
    }

    // Extract unique labels
    const uniqueLabels = Array.from(new Set(samples.map(s => s.label)));
    this.labels = uniqueLabels;

    // Extract all values for vocabulary building
    const allValues = samples.map(s => s.value);
    this.encoder.buildVocab(allValues);
    
    // Learn patterns if pattern correction is enabled
    if (this.patternCorrector) {
      this.patternCorrector.learnPatterns(samples);
    }
    
    // Learn sequence context
    if (this.sequenceContext) {
      this.sequenceContext.learnPatterns(allValues);
    }

    // Build training data
    const X: number[][] = [];
    const Y: number[][] = [];

    for (const sample of samples) {
      const labelIndex = this.labels.indexOf(sample.label);
      if (labelIndex === -1) {
        continue;
      }

      // Input: concat(oneHot(label), noiseVector)
      const labelOneHot = oneHotLabel(labelIndex, this.labels.length);
      const noise = generateNoiseVector(this.noiseSize, this.config.seed);
      const inputVector = [...labelOneHot, ...noise];
      X.push(inputVector);

      // Target: encoded(value)
      const encodedValue = this.encoder.encode(sample.value);
      Y.push(encodedValue);
    }

    if (X.length === 0) {
      throw new Error('No valid training samples after processing');
    }

    // Create ELM config
    const inputSize = this.labels.length + this.noiseSize;
    const outputSize = this.encoder.getVectorSize();

    const elmConfig: ELMConfig = {
      useTokenizer: false, // Numeric mode
      inputSize: inputSize,
      categories: this.useClassification ? [] : [], // For classification, we'll handle it differently
      hiddenUnits: this.config.hiddenUnits!,
      activation: this.config.activation!,
      // Use lower regularization for better pattern learning
      ridgeLambda: this.config.ridgeLambda! * 0.1, // Reduce regularization
      task: this.useClassification ? 'classification' : 'regression',
    };

    // Create and train ELM - resolve constructor robustly across CJS/ESM shapes
    // Replace dynamic require with direct constructor
    this.elm = new (ELM as any)(elmConfig) as unknown as ELMModel;
    this.elm.trainFromData(X, Y);
  }

  /**
   * Generate a string for a given label
   * @param label Label to generate for
   * @param noiseSeed Optional seed for noise generation (for deterministic output)
   */
  generate(label: string, noiseSeed?: number): string {
    if (!this.elm) {
      throw new Error('Model not trained. Call train() first.');
    }

    const labelIndex = this.labels.indexOf(label);
    if (labelIndex === -1) {
      throw new Error(`Label '${label}' not found in training data`);
    }

    // Create input: concat(oneHot(label), noiseVector)
    const labelOneHot = oneHotLabel(labelIndex, this.labels.length);
    const noise = generateNoiseVector(
      this.noiseSize,
      noiseSeed !== undefined ? noiseSeed : this.config.seed
    );
    const inputVector = [...labelOneHot, ...noise];

    // Predict based on mode
    let decoded: string;
    
    if (this.useClassification && this.config.useOneHot && typeof (this.elm as any).predictProbaFromVector === 'function') {
      // Classification mode with one-hot: use probabilities
      const vocabSize = this.encoder.getVocabSize();
      const maxLength = this.config.maxLength;
      const vectorSize = vocabSize * maxLength;
      
      // Get probabilities for each position
      const probs = (this.elm as any).predictProbaFromVector(inputVector);
      
      // Reshape to [maxLength, vocabSize] and use argmax
      const indices: number[] = [];
      for (let pos = 0; pos < maxLength; pos++) {
        const posProbs = probs.slice(pos * vocabSize, (pos + 1) * vocabSize);
        const maxIdx = posProbs.indexOf(Math.max(...posProbs));
        indices.push(maxIdx);
      }
      
      decoded = this.encoder.decode(indices);
    } else {
      // Regression mode: use logits and round
      const prediction = this.elm.predictLogitsFromVector(inputVector);
      
      // Convert logits to indices with proper quantization
      const vocabSize = this.encoder.getVocabSize();
      const indices = prediction.map(val => {
        // Clamp value to reasonable range first (prevent extreme values)
        const clamped = Math.max(-vocabSize, Math.min(vocabSize * 2, val));
        // Round to nearest integer
        const rounded = Math.round(clamped);
        // Clamp to valid vocabulary range [0, vocabSize-1]
        const idx = Math.max(0, Math.min(vocabSize - 1, rounded));
        return idx;
      });
      
      decoded = this.encoder.decode(indices);
    }
    
    // Apply pattern correction if enabled
    let corrected = decoded;
    if (this.patternCorrector) {
      corrected = this.patternCorrector.correct(decoded, label);
    }
    
    // Apply sequence context refinement
    if (this.sequenceContext && corrected.length > 0) {
      corrected = this.refineWithSequenceContext(corrected, label);
    }
    
    // Validate and clean the decoded string using label-specific rules
    const validation = validateForLabel(label, corrected);
    
    // If validation fails, try to generate again with different noise (up to 3 attempts)
    if (!validation.isValid) {
      for (let attempt = 0; attempt < 3; attempt++) {
        const baseSeed = noiseSeed !== undefined ? noiseSeed : (this.config.seed ?? Date.now());
        const newNoise = generateNoiseVector(
          this.noiseSize, baseSeed + attempt + 1000
        );
        const newInputVector = [...labelOneHot, ...newNoise];
        
        let newDecoded: string;
        if (this.useClassification && this.config.useOneHot && typeof (this.elm as any).predictProbaFromVector === 'function') {
          const vocabSize = this.encoder.getVocabSize();
          const maxLength = this.config.maxLength;
          const probs = (this.elm as any).predictProbaFromVector(newInputVector);
          const newIndices: number[] = [];
          for (let pos = 0; pos < maxLength; pos++) {
            const posProbs = probs.slice(pos * vocabSize, (pos + 1) * vocabSize);
            const maxIdx = posProbs.indexOf(Math.max(...posProbs));
            newIndices.push(maxIdx);
          }
          newDecoded = this.encoder.decode(newIndices);
        } else {
          const newPrediction = this.elm.predictLogitsFromVector(newInputVector);
          const vocabSize = this.encoder.getVocabSize();
          const newIndices = newPrediction.map(val => {
            const clamped = Math.max(-vocabSize, Math.min(vocabSize * 2, val));
            const rounded = Math.round(clamped);
            return Math.max(0, Math.min(vocabSize - 1, rounded));
          });
          newDecoded = this.encoder.decode(newIndices);
        }
        
        // Apply pattern correction
        if (this.patternCorrector) {
          newDecoded = this.patternCorrector.correct(newDecoded, label);
        }
        
        const newValidation = validateForLabel(label, newDecoded);
        if (newValidation.isValid) {
          return newValidation.cleaned;
        }
      }
      // If all attempts fail, return empty string
      return '';
    }
    
    return validation.cleaned;
  }

  /**
   * Generate multiple strings for a label with confidence-based selection
   */
  generateBatch(label: string, count: number): string[] {
    const candidates: Array<{ value: string; score: number }> = [];
    const seen = new Set<string>();
    let attempts = 0;
    const maxAttempts = count * 10; // Allow up to 10x attempts to get valid unique samples
    
    // Generate candidates with scoring
    while (attempts < maxAttempts) {
      const seed = this.config.seed !== undefined 
        ? this.config.seed + attempts 
        : Date.now() + attempts;
      
      try {
        const generated = this.generate(label, seed);
        
        if (generated && generated.length > 0 && !seen.has(generated.toLowerCase())) {
          // Score the candidate
          let score = 1.0;
          
          // Pattern match score
          if (this.patternCorrector) {
            score = this.patternCorrector.score(generated, label);
          }
          
          // Validation score (valid = 1.0, invalid = 0.0)
          const validation = validateForLabel(label, generated);
          if (!validation.isValid) {
            score = 0;
          }
          
          candidates.push({ value: generated, score });
          seen.add(generated.toLowerCase());
        }
      } catch (error) {
        // Skip errors
      }
      
      attempts++;
    }
    
    // Sort by score and return top candidates
    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, count).map(c => c.value);
  }

  /**
   * Refine generated string using sequence context
   */
  private refineWithSequenceContext(generated: string, label: string): string {
    if (!this.sequenceContext || generated.length === 0) {
      return generated;
    }
    
    // Try to improve the string by checking sequence context
    let refined = '';
    for (let i = 0; i < generated.length; i++) {
      const context = refined; // Use what we've built so far
      const currentChar = generated[i];
      
      // Check if current char fits the context
      const contextScore = this.sequenceContext.scoreChar(context, currentChar);
      
      // If score is very low, try to suggest better character
      if (contextScore < 0.1 && context.length > 0) {
        const suggested = this.sequenceContext.suggestNextChar(context);
        if (suggested && suggested !== currentChar) {
          // Only replace if it's a significant improvement
          refined += suggested;
        } else {
          refined += currentChar;
        }
      } else {
        refined += currentChar;
      }
      
      // Stop if we hit padding or invalid character
      if (currentChar === '\0' || currentChar.charCodeAt(0) === 0) {
        break;
      }
    }
    
    return refined;
  }

  /**
   * Get all trained labels
   */
  getLabels(): string[] {
    return [...this.labels];
  }

  /**
   * Check if model is trained
   */
  isTrained(): boolean {
    return this.elm !== null;
  }
}

