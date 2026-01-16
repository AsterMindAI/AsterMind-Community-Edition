/**
 * ELM utilities for OmegaSynth
 * Helper functions for working with ELM models
 */

/**
 * Create one-hot vector for a label index
 */
export function oneHotLabel(labelIndex: number, numLabels: number): number[] {
  const vector = new Array(numLabels).fill(0);
  if (labelIndex >= 0 && labelIndex < numLabels) {
    vector[labelIndex] = 1;
  }
  return vector;
}

/**
 * Generate random noise vector
 */
export function generateNoiseVector(size: number, seed?: number): number[] {
  const rng = seed !== undefined ? new SeededRNG(seed) : null;
  const noise: number[] = [];
  for (let i = 0; i < size; i++) {
    const value = rng ? rng.next() : Math.random();
    // Normalize to [-1, 1]
    noise.push(value * 2 - 1);
  }
  return noise;
}

/**
 * Seeded random number generator
 */
class SeededRNG {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 2 ** 32;
    return this.seed / 2 ** 32;
  }
}






