/**
 * ExactGenerator - Perfect retrieval with pattern-based variations
 * Provides 100% realistic data by using exact training samples + pattern matching
 */

import { RetrievalGenerator } from './RetrievalGenerator';
import { PatternCorrector } from '../core/PatternCorrector';
import { LabeledSample } from '../types';
import { validateForLabel } from '../core/validation';
export interface ExactGeneratorConfig {
  seed?: number;
  usePatternMatching?: boolean;
  maxVariations?: number;
}

export class ExactGenerator {
  private retrieval: RetrievalGenerator;
  private patternCorrector: PatternCorrector;
  private config: ExactGeneratorConfig;
  private trainingSamples: LabeledSample[] = [];

  constructor(config: ExactGeneratorConfig = {}) {
    // Initialize and require license before allowing generator use
            this.config = {
      usePatternMatching: true,
      maxVariations: 10,
      ...config,
    };
    this.retrieval = new RetrievalGenerator(config.seed);
    this.patternCorrector = new PatternCorrector();
  }

  /**
   * Train the exact generator
   */
  train(samples: LabeledSample[]): void {
    this.trainingSamples = samples;
    this.retrieval.ingest(samples);
    
    if (this.config.usePatternMatching) {
      this.patternCorrector.learnPatterns(samples);
    }
  }

  /**
   * Generate an exact sample (100% realistic)
   */
  generate(label: string, seed?: number): string {
    // 1. Try exact retrieval first (100% realistic)
    const exact = this.retrieval.sampleOne(label);
    if (exact) {
      return exact; // ✅ 100% realistic
    }

    // 2. If pattern matching enabled, try pattern-based generation
    if (this.config.usePatternMatching) {
      const pattern = this.patternCorrector.getPattern(label);
      if (pattern && pattern.examples.length > 0) {
        // Return a random example from the pattern
        const randomIndex = seed !== undefined 
          ? seed % pattern.examples.length 
          : Math.floor(Math.random() * pattern.examples.length);
        return pattern.examples[randomIndex];
      }
    }

    throw new Error(`No samples found for label: ${label}`);
  }

  /**
   * Generate with pattern-based variations
   */
  generateWithVariation(label: string, seed?: number): string {
    // Get base sample
    const base = this.generate(label, seed);
    
    if (!this.config.usePatternMatching) {
      return base;
    }

    // Try to create variations using pattern matching
    const pattern = this.patternCorrector.getPattern(label);
    if (!pattern) {
      return base;
    }

    // Simple variation: combine prefix from one example with suffix from another
    if (pattern.examples.length >= 2) {
      const seed1 = seed !== undefined ? seed : Date.now();
      const seed2 = seed1 + 1000;
      const idx1 = seed1 % pattern.examples.length;
      const idx2 = seed2 % pattern.examples.length;
      
      if (idx1 !== idx2) {
        const ex1 = pattern.examples[idx1];
        const ex2 = pattern.examples[idx2];
        
        // Try combining if they're similar length
        if (Math.abs(ex1.length - ex2.length) <= 2) {
          const mid = Math.floor(ex1.length / 2);
          const variation = ex1.substring(0, mid) + ex2.substring(mid);
          
          // Validate the variation
          const validation = validateForLabel(label, variation);
          if (validation.isValid) {
            // Score the variation
            const score = this.patternCorrector.score(variation, label);
            if (score > 0.6) { // Only use if reasonably good
              return validation.cleaned;
            }
          }
        }
      }
    }

    return base;
  }

  /**
   * Generate multiple exact samples
   */
  generateBatch(label: string, count: number): string[] {
    const results: string[] = [];
    const seen = new Set<string>();
    
    // Try to get unique exact samples
    for (let i = 0; i < count * 2 && results.length < count; i++) {
      const seed = this.config.seed !== undefined 
        ? this.config.seed + i 
        : Date.now() + i;
      
      let generated: string;
      if (i < count && this.config.usePatternMatching) {
        // First half: exact matches
        generated = this.generate(label, seed);
      } else {
        // Second half: try variations
        generated = this.generateWithVariation(label, seed);
      }
      
      if (generated && !seen.has(generated.toLowerCase())) {
        results.push(generated);
        seen.add(generated.toLowerCase());
      }
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
    return this.retrieval.getLabels().length > 0;
  }
}

