/**
 * SequenceContext - Add sequence context to generation
 * Uses previous characters to inform next character prediction
 */

export class SequenceContext {
  private ngramPatterns: Map<string, Map<string, number>> = new Map();
  private n: number; // n-gram size

  constructor(n: number = 3) {
    this.n = n;
  }

  /**
   * Learn n-gram patterns from training data
   */
  learnPatterns(samples: string[]): void {
    this.ngramPatterns.clear();
    
    for (const sample of samples) {
      // Extract n-grams
      for (let i = 0; i <= sample.length - this.n; i++) {
        const ngram = sample.substring(i, i + this.n - 1); // Context (n-1 chars)
        const nextChar = sample[i + this.n - 1]; // Next character
        
        if (!this.ngramPatterns.has(ngram)) {
          this.ngramPatterns.set(ngram, new Map());
        }
        
        const charMap = this.ngramPatterns.get(ngram)!;
        charMap.set(nextChar, (charMap.get(nextChar) || 0) + 1);
      }
    }
  }

  /**
   * Get next character probabilities given context
   */
  getNextCharProbs(context: string): Map<string, number> {
    // Use last n-1 characters as context
    const ctx = context.length >= this.n - 1 
      ? context.substring(context.length - (this.n - 1))
      : context;
    
    const charCounts = this.ngramPatterns.get(ctx);
    if (!charCounts || charCounts.size === 0) {
      return new Map();
    }
    
    // Convert counts to probabilities
    const total = Array.from(charCounts.values()).reduce((a, b) => a + b, 0);
    const probs = new Map<string, number>();
    
    for (const [char, count] of charCounts.entries()) {
      probs.set(char, count / total);
    }
    
    return probs;
  }

  /**
   * Suggest next character based on context
   */
  suggestNextChar(context: string): string | null {
    const probs = this.getNextCharProbs(context);
    if (probs.size === 0) {
      return null;
    }
    
    // Return most likely character
    let bestChar = '';
    let bestProb = 0;
    
    for (const [char, prob] of probs.entries()) {
      if (prob > bestProb) {
        bestProb = prob;
        bestChar = char;
      }
    }
    
    return bestChar;
  }

  /**
   * Score how well a character fits the context
   */
  scoreChar(context: string, char: string): number {
    const probs = this.getNextCharProbs(context);
    return probs.get(char) || 0;
  }
}

