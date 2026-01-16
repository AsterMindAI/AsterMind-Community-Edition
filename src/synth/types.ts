/**
 * Core type definitions for OmegaSynth
 */

export interface LabeledSample {
  label: string;
  value: string;
}

export type SyntheticMode = 'retrieval' | 'elm' | 'hybrid' | 'exact' | 'perfect';

export interface OmegaSynthConfig {
  mode: SyntheticMode;
  maxLength?: number;
  seed?: number;
  exactMode?: boolean; // For hybrid mode: use 0% jitter
  useOneHot?: boolean; // Use one-hot encoding for better accuracy
  useClassification?: boolean; // Use classification instead of regression
  usePatternCorrection?: boolean; // Apply pattern-based post-processing
}

