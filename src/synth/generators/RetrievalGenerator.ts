/**
 * RetrievalGenerator - Simple deterministic retrieval sampler
 * Uniform random sampling from stored labeled samples
 */

import { SyntheticFieldStore } from '../store/SyntheticFieldStore';
import { LabeledSample } from '../types';
/**
 * Seeded random number generator for deterministic testing
 */
class SeededRNG {
  private seed: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed;
  }

  next(): number {
    // Linear congruential generator
    this.seed = (this.seed * 1664525 + 1013904223) % 2 ** 32;
    return this.seed / 2 ** 32;
  }

  setSeed(seed: number): void {
    this.seed = seed;
  }
}

export class RetrievalGenerator {
  private store: SyntheticFieldStore;
  private rng: SeededRNG;
  private seed?: number;

  constructor(seed?: number) {
    // Initialize and require license before allowing generator use
            this.store = new SyntheticFieldStore();
    this.seed = seed;
    this.rng = new SeededRNG(seed);
  }

  /**
   * Ingest labeled samples into the store
   */
  ingest(samples: LabeledSample[]): void {
    this.store.insertMany(samples);
  }

  /**
   * Sample k values for a given label
   * Returns empty array if label doesn't exist or has no samples
   */
  sample(label: string, k: number = 1): string[] {
    const values = this.store.get(label);
    if (values.length === 0) {
      return [];
    }

    const result: string[] = [];
    const availableIndices = Array.from({ length: values.length }, (_, i) => i);

    // Sample k values (or all if k > available)
    const sampleCount = Math.min(k, values.length);
    for (let i = 0; i < sampleCount; i++) {
      const randomIndex = Math.floor(this.rng.next() * availableIndices.length);
      const selectedIndex = availableIndices.splice(randomIndex, 1)[0];
      result.push(values[selectedIndex]);
    }

    return result;
  }

  /**
   * Get a single sample (convenience method)
   */
  sampleOne(label: string): string | null {
    const samples = this.sample(label, 1);
    return samples.length > 0 ? samples[0] : null;
  }

  /**
   * Check if a label has samples
   */
  hasLabel(label: string): boolean {
    return this.store.hasLabel(label) && this.store.count(label) > 0;
  }

  /**
   * Get all available labels
   */
  getLabels(): string[] {
    return this.store.getLabels();
  }

  /**
   * Reset the generator (clears store and optionally resets seed)
   */
  reset(seed?: number): void {
    this.store.clear();
    if (seed !== undefined) {
      this.seed = seed;
      this.rng.setSeed(seed);
    }
  }
}


