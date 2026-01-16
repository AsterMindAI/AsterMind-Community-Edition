/**
 * PerfectGenerator - Best of all worlds
 * Combines exact retrieval, pattern matching, and improved ELM generation
 * Provides highest realism with good variation
 */

import { ExactGenerator } from './ExactGenerator';
import { HybridGenerator } from './HybridGenerator';
import { ELMGenerator } from './ELMGenerator';
import { LabeledSample } from '../types';
import { PatternCorrector } from '../core/PatternCorrector';
import { validateForLabel } from '../core/validation';
export interface PerfectGeneratorConfig {
  maxLength: number;
  seed?: number;
  preferExact?: boolean; // Prefer exact matches over generated
  usePatternMatching?: boolean;
  useImprovedELM?: boolean; // Use classification + one-hot
  elmHiddenUnits?: number;
  elmActivation?: 'tanh' | 'relu' | 'leakyrelu' | 'sigmoid' | 'linear' | 'gelu';
  elmRidgeLambda?: number;
  noiseSize?: number;
}

export class PerfectGenerator {
  private exact: ExactGenerator;
  private hybrid: HybridGenerator;
  private elm: ELMGenerator | null = null;
  private patternCorrector: PatternCorrector;
  private config: PerfectGeneratorConfig;
  private trainingSamples: LabeledSample[] = [];

  constructor(config: PerfectGeneratorConfig) {
    // Initialize and require license before allowing generator use
            this.config = {
      preferExact: true,
      usePatternMatching: true,
      useImprovedELM: false, // Default to false to avoid memory issues (creates duplicate ELM)
      elmHiddenUnits: 128, // Reduced from 256 for memory efficiency
      elmActivation: 'relu',
      elmRidgeLambda: 0.001, // Lower regularization
      noiseSize: 32,
      ...config,
    };

    this.exact = new ExactGenerator({
      seed: config.seed,
      usePatternMatching: this.config.usePatternMatching,
    });

    this.hybrid = new HybridGenerator({
      maxLength: config.maxLength,
      seed: config.seed,
      exactMode: false, // Allow some jitter for variation
      jitterStrength: 0.02, // Very low jitter (2%)
      useOneHot: false, // Disable one-hot to reduce memory (was: this.config.useImprovedELM)
      useClassification: false, // Disable classification to reduce memory (was: this.config.useImprovedELM)
      usePatternCorrection: true,
      elmHiddenUnits: this.config.elmHiddenUnits, // Now uses reduced 128 instead of 256
      elmActivation: this.config.elmActivation,
      elmRidgeLambda: this.config.elmRidgeLambda,
      noiseSize: this.config.noiseSize,
    });

    // Only create standalone ELM if explicitly requested AND useImprovedELM is true
    // This avoids duplicate ELM training (HybridGenerator already has one)
    if (this.config.useImprovedELM && config.useImprovedELM === true) {
      this.elm = new ELMGenerator({
        maxLength: config.maxLength,
        seed: config.seed,
        hiddenUnits: this.config.elmHiddenUnits,
        activation: this.config.elmActivation,
        ridgeLambda: this.config.elmRidgeLambda,
        noiseSize: this.config.noiseSize,
        useOneHot: false, // Disable one-hot to reduce memory
        useClassification: false, // Disable classification to reduce memory
        usePatternCorrection: true,
      });
    }

    this.patternCorrector = new PatternCorrector();
  }

  /**
   * Train the perfect generator
   */
  train(samples: LabeledSample[]): void {
    this.trainingSamples = samples;
    
    // Train generators in order of priority (exact is fastest)
    this.exact.train(samples);
    
    // Only train hybrid if we need it (lazy training)
    // We'll train it on first use if needed
    
    // Learn patterns (lightweight)
    this.patternCorrector.learnPatterns(samples);
  }
  
  /**
   * Lazy train hybrid generator
   */
  private ensureHybridTrained(): void {
    if (!this.hybrid.isTrained() && this.trainingSamples.length > 0) {
      this.hybrid.train(this.trainingSamples);
    }
  }
  
  /**
   * Lazy train ELM generator
   */
  private ensureELMTrained(): void {
    if (this.elm && !this.elm.isTrained() && this.trainingSamples.length > 0) {
      this.elm.train(this.trainingSamples);
    }
  }

  /**
   * Generate with best strategy
   */
  generate(label: string, seed?: number): string {
    const candidates: Array<{ value: string; score: number; source: string }> = [];

    // 1. Try exact retrieval first (100% realistic)
    try {
      const exact = this.exact.generate(label, seed);
      if (exact) {
        candidates.push({ value: exact, score: 1.0, source: 'exact' });
      }
    } catch (error) {
      // No exact match available
    }

    // 2. Try exact with variation (95-100% realistic)
    try {
      const exactVar = this.exact.generateWithVariation(label, seed);
      if (exactVar && exactVar !== candidates[0]?.value) {
        const score = this.patternCorrector.score(exactVar, label);
        candidates.push({ value: exactVar, score: score * 0.95, source: 'exact-variation' });
      }
    } catch (error) {
      // Skip
    }

    // 3. Try hybrid (80-90% realistic) - lazy train if needed
    try {
      this.ensureHybridTrained();
      const hybrid = this.hybrid.generate(label, seed);
      if (hybrid && !candidates.some(c => c.value === hybrid)) {
        const score = this.patternCorrector.score(hybrid, label);
        const validation = validateForLabel(label, hybrid);
        const finalScore = validation.isValid ? score * 0.85 : score * 0.5;
        candidates.push({ value: hybrid, score: finalScore, source: 'hybrid' });
      }
    } catch (error) {
      // Skip
    }

    // 4. Try improved ELM if available (75-85% realistic) - lazy train if needed
    if (this.elm) {
      try {
        this.ensureELMTrained();
        const elmGen = this.elm.generate(label, seed);
        if (elmGen && !candidates.some(c => c.value === elmGen)) {
          const score = this.patternCorrector.score(elmGen, label);
          const validation = validateForLabel(label, elmGen);
          const finalScore = validation.isValid ? score * 0.8 : score * 0.4;
          candidates.push({ value: elmGen, score: finalScore, source: 'elm' });
        }
      } catch (error) {
        // Skip
      }
    }

    // 5. Select best candidate
    if (candidates.length === 0) {
      throw new Error(`No samples found for label: ${label}`);
    }

    // Sort by score (highest first)
    candidates.sort((a, b) => b.score - a.score);

    // If preferExact and we have exact match, use it
    if (this.config.preferExact) {
      const exactCandidate = candidates.find(c => c.source === 'exact');
      if (exactCandidate && exactCandidate.score >= 0.9) {
        return exactCandidate.value;
      }
    }

    // Return highest scoring candidate
    return candidates[0].value;
  }

  /**
   * Generate multiple samples with best strategy
   */
  generateBatch(label: string, count: number): string[] {
    const results: string[] = [];
    const seen = new Set<string>();
    let attempts = 0;
    const maxAttempts = count * 5;

    while (results.length < count && attempts < maxAttempts) {
      const seed = this.config.seed !== undefined 
        ? this.config.seed + attempts 
        : Date.now() + attempts;

      try {
        const generated = this.generate(label, seed);
        
        if (generated && generated.length > 0 && !seen.has(generated.toLowerCase())) {
          results.push(generated);
          seen.add(generated.toLowerCase());
        }
      } catch (error) {
        // Skip errors
      }

      attempts++;
    }

    return results;
  }

  /**
   * Get all available labels
   */
  getLabels(): string[] {
    return this.exact.getLabels();
  }

  /**
   * Check if generator is trained
   */
  isTrained(): boolean {
    // At minimum, exact generator should be trained
    return this.exact.isTrained();
  }
}

