/**
 * HybridGenerator - Blends Retrieval + ELM jitter for realism + variation
 * 1. Retrieve real sample
 * 2. Encode
 * 3. Apply ELM noise
 * 4. Decode
 */

import { RetrievalGenerator } from './RetrievalGenerator';
import { ELMGenerator } from './ELMGenerator';
import { StringEncoder } from '../encoders/StringEncoder';
import { LabeledSample } from '../types';
import { validateForLabel } from '../core/validation';
import { PatternCorrector } from '../core/PatternCorrector';
export interface HybridGeneratorConfig {
  maxLength: number;
  elmHiddenUnits?: number;
  elmActivation?: 'tanh' | 'relu' | 'leakyrelu' | 'sigmoid' | 'linear' | 'gelu';
  elmRidgeLambda?: number;
  noiseSize?: number;
  jitterStrength?: number; // How much to jitter (0-1)
  exactMode?: boolean; // If true, jitterStrength is set to 0
  useOneHot?: boolean;
  useClassification?: boolean;
  usePatternCorrection?: boolean;
  seed?: number;
}

export class HybridGenerator {
  private retrieval: RetrievalGenerator;
  private elm: ELMGenerator;
  private encoder: StringEncoder;
  private config: HybridGeneratorConfig;
  private jitterStrength: number;
  private patternCorrector: PatternCorrector | null = null;

  constructor(config: HybridGeneratorConfig) {
    // Initialize and require license before allowing generator use
            this.config = {
      elmHiddenUnits: 128,
      elmActivation: 'relu',
      elmRidgeLambda: 0.01,
      noiseSize: 32,
      jitterStrength: 0.05, // 5% jitter by default (reduced for better realism)
      exactMode: false,
      useOneHot: false, // Default to false for memory efficiency
      useClassification: false,
      usePatternCorrection: true,
      ...config,
    };
    
    // If exact mode, set jitter to 0
    if (this.config.exactMode) {
      this.jitterStrength = 0;
    } else {
      this.jitterStrength = this.config.jitterStrength!;
    }

    this.retrieval = new RetrievalGenerator(config.seed);
    this.elm = new ELMGenerator({
      maxLength: config.maxLength,
      hiddenUnits: this.config.elmHiddenUnits,
      activation: this.config.elmActivation,
      ridgeLambda: this.config.elmRidgeLambda,
      noiseSize: this.config.noiseSize,
      useOneHot: this.config.useOneHot,
      useClassification: this.config.useClassification,
      usePatternCorrection: this.config.usePatternCorrection,
      seed: config.seed,
    });

    this.encoder = new StringEncoder({
      maxLength: config.maxLength,
      useOneHot: this.config.useOneHot ?? false, // Default to false for memory efficiency
    });
    
    if (this.config.usePatternCorrection) {
      this.patternCorrector = new PatternCorrector();
    }
  }

  /**
   * Train the hybrid generator on labeled samples
   */
  train(samples: LabeledSample[]): void {
    // Train retrieval
    this.retrieval.ingest(samples);

    // Build encoder vocabulary
    const allValues = samples.map(s => s.value);
    this.encoder.buildVocab(allValues);

    // Train ELM for jittering
    this.elm.train(samples);
    
    // Learn patterns if pattern correction is enabled
    if (this.patternCorrector) {
      this.patternCorrector.learnPatterns(samples);
    }
  }

  /**
   * Generate a hybrid sample (retrieval + jitter)
   * @param label Label to generate for
   * @param noiseSeed Optional seed for deterministic output
   */
  generate(label: string, noiseSeed?: number): string {
    // Step 1: Retrieve real sample
    const retrieved = this.retrieval.sampleOne(label);
    if (!retrieved) {
      // Fallback to pure ELM if no retrieval available
      return this.elm.generate(label, noiseSeed);
    }

    // Step 2: Encode
    const encoded = this.encoder.encode(retrieved);

    // Step 3: Apply ELM noise/jitter
    // Generate a jittered version using ELM
    const jittered = this.applyJitter(encoded, label, noiseSeed);

    // Step 4: Decode
    const decoded = this.encoder.decode(jittered);
    
    // Step 5: Apply pattern correction if enabled
    let corrected = decoded;
    if (this.patternCorrector) {
      corrected = this.patternCorrector.correct(decoded, label);
    }
    
    // Step 6: Validate and clean using label-specific rules
    const validation = validateForLabel(label, corrected);
    
    // If validation fails, try jittering again with different noise (up to 2 attempts)
    if (!validation.isValid) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const newSeed = noiseSeed !== undefined ? noiseSeed + attempt + 1000 : undefined;
        const newJittered = this.applyJitter(encoded, label, newSeed);
        const newDecoded = this.encoder.decode(newJittered);
        let newCorrected = newDecoded;
        if (this.patternCorrector) {
          newCorrected = this.patternCorrector.correct(newDecoded, label);
        }
        const newValidation = validateForLabel(label, newCorrected);
        if (newValidation.isValid) {
          return newValidation.cleaned;
        }
      }
      // If all attempts fail, return original (retrieved is always valid)
      return retrieved;
    }
    
    return validation.cleaned;
  }

  /**
   * Apply jitter to an encoded vector
   */
  private applyJitter(encoded: number[], label: string, noiseSeed?: number): number[] {
    // Generate ELM output for the label
    const elmOutput = this.generateELMVector(label, noiseSeed);

    // If ELM output is empty or invalid, return original (no jitter)
    if (!elmOutput || elmOutput.length === 0 || elmOutput.every(v => v === 0)) {
      return encoded;
    }

    // Blend: (1 - jitterStrength) * original + jitterStrength * elmOutput
    // Use smaller jitter to preserve more of the original
    const effectiveJitter = Math.min(this.jitterStrength, 0.05); // Cap at 5% jitter
    const jittered = encoded.map((val, idx) => {
      const elmVal = elmOutput[idx] || 0;
      return (1 - effectiveJitter) * val + effectiveJitter * elmVal;
    });

    // Convert blended continuous values to integer indices
    // Round and clamp to valid vocabulary range
    const vocabSize = this.encoder.getVocabSize();
    const indices = jittered.map(val => {
      // Clamp value first
      const clamped = Math.max(0, Math.min(vocabSize - 1, val));
      const idx = Math.round(clamped);
      return Math.max(0, Math.min(vocabSize - 1, idx));
    });

    return indices;
  }

  /**
   * Generate an ELM vector for jittering
   */
  private generateELMVector(label: string, noiseSeed?: number): number[] {
    try {
      // Try to get ELM prediction
      const elmGenerated = this.elm.generate(label, noiseSeed);
      // Only encode if we got a non-empty string
      if (elmGenerated && elmGenerated.length > 0) {
        return this.encoder.encode(elmGenerated);
      }
      // If empty, return zero vector (no jitter)
      return new Array(this.encoder.getVectorSize()).fill(0);
    } catch {
      // If ELM fails, return zero vector (no jitter)
      return new Array(this.encoder.getVectorSize()).fill(0);
    }
  }

  /**
   * Generate multiple hybrid samples
   */
  generateBatch(label: string, count: number): string[] {
    const results: string[] = [];
    const seen = new Set<string>();
    let attempts = 0;
    const maxAttempts = count * 5; // Allow up to 5x attempts to get valid unique samples
    
    while (results.length < count && attempts < maxAttempts) {
      const seed = this.config.seed !== undefined 
        ? this.config.seed + attempts 
        : Date.now() + attempts;
      const generated = this.generate(label, seed);
      
      // Only add if valid, non-empty, and unique
      if (generated && generated.length > 0 && !seen.has(generated.toLowerCase())) {
        results.push(generated);
        seen.add(generated.toLowerCase());
      }
      attempts++;
    }
    
    return results;
  }

  /**
   * Get all available labels
   */
  getLabels(): string[] {
    return this.retrieval.getLabels();
  }

  /**
   * Check if generator is trained
   */
  isTrained(): boolean {
    return this.retrieval.hasLabel(this.getLabels()[0] || '') && this.elm.isTrained();
  }
}

