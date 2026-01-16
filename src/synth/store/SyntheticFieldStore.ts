/**
 * SyntheticFieldStore - Storage for labeled samples
 * Supports insert, get, and sample operations
 */

import { LabeledSample } from '../types';

export class SyntheticFieldStore {
  private store: Map<string, string[]> = new Map();

  /**
   * Insert a labeled sample into the store
   */
  insert(sample: LabeledSample): void {
    if (!this.store.has(sample.label)) {
      this.store.set(sample.label, []);
    }
    this.store.get(sample.label)!.push(sample.value);
  }

  /**
   * Insert multiple samples at once
   */
  insertMany(samples: LabeledSample[]): void {
    for (const sample of samples) {
      this.insert(sample);
    }
  }

  /**
   * Get all values for a given label
   */
  get(label: string): string[] {
    return this.store.get(label) || [];
  }

  /**
   * Sample k values uniformly at random for a given label
   */
  sample(label: string, k: number = 1): string[] {
    const values = this.get(label);
    if (values.length === 0) {
      return [];
    }

    const result: string[] = [];
    const indices = new Set<number>();

    // Simple uniform random sampling without replacement
    while (result.length < k && indices.size < values.length) {
      const idx = Math.floor(Math.random() * values.length);
      if (!indices.has(idx)) {
        indices.add(idx);
        result.push(values[idx]);
      }
    }

    return result;
  }

  /**
   * Check if a label exists in the store
   */
  hasLabel(label: string): boolean {
    return this.store.has(label);
  }

  /**
   * Get all labels in the store
   */
  getLabels(): string[] {
    return Array.from(this.store.keys());
  }

  /**
   * Get the count of samples for a label
   */
  count(label: string): number {
    return this.get(label).length;
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.store.clear();
  }
}






