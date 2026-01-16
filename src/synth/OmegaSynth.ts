/**
 * OmegaSynth - Main class
 * Unified interface for synthetic data generation
 */

import { OmegaSynthConfig, LabeledSample, SyntheticMode } from './types';
import { RetrievalGenerator } from './generators/RetrievalGenerator';
import { ELMGenerator } from './generators/ELMGenerator';
import { HybridGenerator } from './generators/HybridGenerator';
import { ExactGenerator } from './generators/ExactGenerator';
import { PerfectGenerator } from './generators/PerfectGenerator';
export class OmegaSynth {
  private config: OmegaSynthConfig;
  private generator: RetrievalGenerator | ELMGenerator | HybridGenerator | ExactGenerator | PerfectGenerator | null = null;
  private seed?: number;

  constructor(config: OmegaSynthConfig) {
    this.config = {
      maxLength: 32,
      ...config,
    };
    this.seed = config.seed;

    // Initialize generator based on mode
    this.initializeGenerator();
  }

  private initializeGenerator(): void {
    const commonConfig = {
      maxLength: this.config.maxLength || 32,
      seed: this.seed,
    };

    switch (this.config.mode) {
      case 'retrieval':
        this.generator = new RetrievalGenerator(this.seed);
        break;
      case 'elm':
        this.generator = new ELMGenerator({
          ...commonConfig,
          hiddenUnits: 128,
          activation: 'relu',
          ridgeLambda: 0.01,
          noiseSize: 32,
          useOneHot: this.config.useOneHot ?? false, // Default to false for memory efficiency
          useClassification: this.config.useClassification ?? false,
          usePatternCorrection: this.config.usePatternCorrection ?? true,
        });
        break;
      case 'hybrid':
        this.generator = new HybridGenerator({
          ...commonConfig,
          elmHiddenUnits: 128,
          elmActivation: 'relu',
          elmRidgeLambda: 0.01,
          noiseSize: 32,
          jitterStrength: this.config.exactMode ? 0 : 0.05,
          exactMode: this.config.exactMode ?? false,
          useOneHot: this.config.useOneHot ?? false, // Default to false for memory efficiency
          useClassification: this.config.useClassification ?? false,
          usePatternCorrection: this.config.usePatternCorrection ?? true,
        });
        break;
      case 'exact':
        this.generator = new ExactGenerator({
          seed: this.seed,
          usePatternMatching: true,
        });
        break;
      case 'perfect':
        this.generator = new PerfectGenerator({
          ...commonConfig,
          preferExact: true,
          usePatternMatching: true,
          useImprovedELM: true,
          elmHiddenUnits: 256,
          elmActivation: 'relu',
          elmRidgeLambda: 0.001,
          noiseSize: 32,
        });
        break;
      default:
        throw new Error(`Unknown mode: ${this.config.mode}`);
    }
  }

  /**
   * Train the generator on a dataset
   * @param dataset Array of labeled samples
   */
  async train(dataset: LabeledSample[]): Promise<void> {
    if (!this.generator) {
      throw new Error('Generator not initialized');
    }

    if (this.config.mode === 'retrieval') {
      (this.generator as RetrievalGenerator).ingest(dataset);
    } else if (this.config.mode === 'elm') {
      (this.generator as ELMGenerator).train(dataset);
    } else if (this.config.mode === 'hybrid') {
      (this.generator as HybridGenerator).train(dataset);
    } else if (this.config.mode === 'exact') {
      (this.generator as ExactGenerator).train(dataset);
    } else if (this.config.mode === 'perfect') {
      (this.generator as PerfectGenerator).train(dataset);
    }
  }

  /**
   * Generate a synthetic value for a given label
   * @param label Label to generate for
   * @param seed Optional seed for deterministic generation
   */
  async generate(label: string, seed?: number): Promise<string> {
    if (!this.generator) {
      throw new Error('Generator not initialized. Call train() first.');
    }

    if (this.config.mode === 'retrieval') {
      const result = (this.generator as RetrievalGenerator).sampleOne(label);
      if (!result) {
        throw new Error(`No samples found for label: ${label}`);
      }
      return result;
    } else if (this.config.mode === 'elm') {
      return (this.generator as ELMGenerator).generate(label, seed);
    } else if (this.config.mode === 'hybrid') {
      return (this.generator as HybridGenerator).generate(label, seed);
    } else if (this.config.mode === 'exact') {
      return (this.generator as ExactGenerator).generate(label, seed);
    } else if (this.config.mode === 'perfect') {
      return (this.generator as PerfectGenerator).generate(label, seed);
    }

    throw new Error(`Unknown mode: ${this.config.mode}`);
  }

  /**
   * Generate multiple synthetic values for a label
   * @param label Label to generate for
   * @param count Number of samples to generate
   */
  async generateBatch(label: string, count: number): Promise<string[]> {
    if (!this.generator) {
      throw new Error('Generator not initialized. Call train() first.');
    }

    if (this.config.mode === 'retrieval') {
      return (this.generator as RetrievalGenerator).sample(label, count);
    } else if (this.config.mode === 'elm') {
      return (this.generator as ELMGenerator).generateBatch(label, count);
    } else if (this.config.mode === 'hybrid') {
      return (this.generator as HybridGenerator).generateBatch(label, count);
    } else if (this.config.mode === 'exact') {
      return (this.generator as ExactGenerator).generateBatch(label, count);
    } else if (this.config.mode === 'perfect') {
      return (this.generator as PerfectGenerator).generateBatch(label, count);
    }

    throw new Error(`Unknown mode: ${this.config.mode}`);
  }

  /**
   * Get all available labels
   */
  getLabels(): string[] {
    if (!this.generator) {
      return [];
    }

    if (this.config.mode === 'retrieval') {
      return (this.generator as RetrievalGenerator).getLabels();
    } else if (this.config.mode === 'elm') {
      return (this.generator as ELMGenerator).getLabels();
    } else if (this.config.mode === 'hybrid') {
      return (this.generator as HybridGenerator).getLabels();
    } else if (this.config.mode === 'exact') {
      return (this.generator as ExactGenerator).getLabels();
    } else if (this.config.mode === 'perfect') {
      return (this.generator as PerfectGenerator).getLabels();
    }

    return [];
  }

  /**
   * Check if the generator is trained
   */
  isTrained(): boolean {
    if (!this.generator) {
      return false;
    }

    if (this.config.mode === 'retrieval') {
      const labels = (this.generator as RetrievalGenerator).getLabels();
      return labels.length > 0;
    } else if (this.config.mode === 'elm') {
      return (this.generator as ELMGenerator).isTrained();
    } else if (this.config.mode === 'hybrid') {
      return (this.generator as HybridGenerator).isTrained();
    } else if (this.config.mode === 'exact') {
      return (this.generator as ExactGenerator).isTrained();
    } else if (this.config.mode === 'perfect') {
      return (this.generator as PerfectGenerator).isTrained();
    }

    return false;
  }

  /**
   * Set seed for deterministic generation
   */
  setSeed(seed: number): void {
    this.seed = seed;
    // Reinitialize generator with new seed
    this.initializeGenerator();
  }
}

