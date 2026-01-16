/**
 * StringEncoder - Encodes strings to vectors and decodes back
 * Compatible with ELM/KELM pipelines
 */

import { CharVocab } from './CharVocab';
import { FixedLength } from './FixedLength';
import { OneHot } from './OneHot';

export interface StringEncoderConfig {
  maxLength: number;
  charSet?: string;
  useOneHot?: boolean; // If false, uses index-based encoding
}

export class StringEncoder {
  private vocab: CharVocab;
  private config: StringEncoderConfig;

  constructor(config: StringEncoderConfig) {
    this.config = {
      useOneHot: false, // Default to index-based for efficiency
      ...config,
    };
    this.vocab = new CharVocab();
  }

  /**
   * Build vocabulary from training samples
   */
  buildVocab(samples: string[]): void {
    this.vocab.build(samples, this.config.charSet || CharVocab.getDefaultCharSet());
  }

  /**
   * Encode a string to a vector
   * @param str String to encode
   * @returns Encoded vector (either indices or one-hot)
   */
  encode(str: string): number[] {
    if (this.vocab.getSize() === 0) {
      throw new Error('Vocabulary not built. Call buildVocab() first.');
    }

    // Convert string to indices
    const indices: number[] = [];
    for (const char of str) {
      if (this.vocab.hasChar(char)) {
        indices.push(this.vocab.getIndex(char));
      } else {
        // For unknown characters, try to find a similar one or use space
        // If space is in vocab, use it; otherwise use 0 (which will be treated as padding)
        if (this.vocab.hasChar(' ')) {
          indices.push(this.vocab.getIndex(' '));
        } else {
          indices.push(0);
        }
      }
    }

    // Pad or truncate to fixed length
    const padded = FixedLength.padOrTruncate(
      indices,
      this.config.maxLength,
      0
    );

    // Convert to one-hot if requested
    if (this.config.useOneHot) {
      const vocabSize = this.vocab.getSize();
      const oneHotVectors: number[] = [];
      for (const idx of padded) {
        oneHotVectors.push(...OneHot.encode(idx, vocabSize));
      }
      return oneHotVectors;
    }

    return padded;
  }

  /**
   * Decode a vector back to a string
   * @param vector Encoded vector
   * @returns Decoded string
   */
  decode(vector: number[]): string {
    if (this.vocab.getSize() === 0) {
      throw new Error('Vocabulary not built. Call buildVocab() first.');
    }

    let indices: number[];

    if (this.config.useOneHot) {
      // Decode one-hot vectors
      const vocabSize = this.vocab.getSize();
      indices = [];
      for (let i = 0; i < vector.length; i += vocabSize) {
        const oneHot = vector.slice(i, i + vocabSize);
        try {
          indices.push(OneHot.decode(oneHot));
        } catch {
          // If decoding fails, use argmax as fallback
          const maxIdx = oneHot.indexOf(Math.max(...oneHot));
          indices.push(maxIdx);
        }
      }
      // Truncate to maxLength
      indices = indices.slice(0, this.config.maxLength);
    } else {
      // Direct index-based decoding
      indices = vector.slice(0, this.config.maxLength);
    }

    // Convert indices to characters, stopping at first padding
    let result = '';
    const vocabSize = this.vocab.getSize();
    const paddingIdx = 0; // Padding is always index 0
    
    for (const idx of indices) {
      // Clamp index to valid range
      const clampedIdx = Math.max(0, Math.min(vocabSize - 1, Math.round(idx)));
      
      // Stop decoding at first padding index (0)
      if (clampedIdx === paddingIdx) {
        break;
      }
      
      // Try to get character for this index
      try {
        const char = this.vocab.getChar(clampedIdx);
        // Skip null characters and control characters (except space, tab, newline)
        if (char === '\0' || (char.charCodeAt(0) < 32 && char !== ' ' && char !== '\t' && char !== '\n')) {
          break; // Stop at first invalid character
        }
        result += char;
      } catch {
        // Invalid index - stop decoding
        break;
      }
    }

    // Trim trailing whitespace but preserve internal spaces
    return result.trimEnd();
  }

  /**
   * Encode multiple strings
   */
  encodeBatch(strings: string[]): number[][] {
    return strings.map(str => this.encode(str));
  }

  /**
   * Decode multiple vectors
   */
  decodeBatch(vectors: number[][]): string[] {
    return vectors.map(vec => this.decode(vec));
  }

  /**
   * Get the output vector size
   */
  getVectorSize(): number {
    if (this.config.useOneHot) {
      return this.config.maxLength * this.vocab.getSize();
    }
    return this.config.maxLength;
  }

  /**
   * Get vocabulary size
   */
  getVocabSize(): number {
    return this.vocab.getSize();
  }

  /**
   * Get vocabulary
   */
  getVocab(): CharVocab {
    return this.vocab;
  }
}

