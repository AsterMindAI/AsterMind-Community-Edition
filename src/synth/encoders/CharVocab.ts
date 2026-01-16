/**
 * CharVocab - Character vocabulary builder
 * Builds a vocabulary from character sets and training data
 */

export class CharVocab {
  private charToIndex: Map<string, number> = new Map();
  private indexToChar: Map<number, string> = new Map();
  private size: number = 0;

  /**
   * Build vocabulary from a set of strings
   * @param samples Array of strings to build vocabulary from
   * @param charSet Optional predefined character set (e.g., alphanumeric + punctuation)
   */
  build(samples: string[], charSet?: string): void {
    const chars = new Set<string>();

    // Add padding character first (index 0) - use null character
    // This ensures index 0 is always padding
    chars.add('\0');

    // Add predefined character set if provided
    if (charSet) {
      for (const char of charSet) {
        // Skip null character if it's in the charSet (we already added it)
        if (char !== '\0') {
          chars.add(char);
        }
      }
    }

    // Add all characters from samples
    for (const sample of samples) {
      for (const char of sample) {
        // Skip null characters from samples (we use it for padding)
        if (char !== '\0') {
          chars.add(char);
        }
      }
    }

    // Sort characters for consistent ordering, but keep null char at index 0
    const sortedChars = Array.from(chars).sort((a, b) => {
      // Ensure null char is always first
      if (a === '\0') return -1;
      if (b === '\0') return 1;
      return a.localeCompare(b);
    });

    // Build mappings
    this.charToIndex.clear();
    this.indexToChar.clear();
    this.size = sortedChars.length;

    sortedChars.forEach((char, index) => {
      this.charToIndex.set(char, index);
      this.indexToChar.set(index, char);
    });
  }

  /**
   * Get index for a character
   */
  getIndex(char: string): number {
    const index = this.charToIndex.get(char);
    if (index === undefined) {
      throw new Error(`Character '${char}' not in vocabulary`);
    }
    return index;
  }

  /**
   * Get character for an index
   */
  getChar(index: number): string {
    const char = this.indexToChar.get(index);
    if (char === undefined) {
      throw new Error(`Index ${index} not in vocabulary`);
    }
    return char;
  }

  /**
   * Check if character exists in vocabulary
   */
  hasChar(char: string): boolean {
    return this.charToIndex.has(char);
  }

  /**
   * Get vocabulary size
   */
  getSize(): number {
    return this.size;
  }

  /**
   * Get all characters in vocabulary
   */
  getChars(): string[] {
    return Array.from(this.charToIndex.keys()).sort();
  }

  /**
   * Get default character set (alphanumeric + common punctuation)
   */
  static getDefaultCharSet(): string {
    return 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' +
           ' !"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~';
  }
}

