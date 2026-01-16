/**
 * PatternCorrector - Post-processing pattern matching and correction
 * Learns patterns from training data and applies them to generated samples
 */

import { LabeledSample } from '../types';

export interface Pattern {
  label: string;
  examples: string[];
  commonPrefixes: string[];
  commonSuffixes: string[];
  charFrequency: Map<string, number>;
  lengthDistribution: number[];
}

export class PatternCorrector {
  private patterns: Map<string, Pattern> = new Map();

  /**
   * Learn patterns from training data
   */
  learnPatterns(samples: LabeledSample[]): void {
    const byLabel = new Map<string, string[]>();
    
    // Group samples by label
    for (const sample of samples) {
      if (!byLabel.has(sample.label)) {
        byLabel.set(sample.label, []);
      }
      byLabel.get(sample.label)!.push(sample.value);
    }

    // Learn patterns for each label
    for (const [label, values] of byLabel.entries()) {
      this.learnPattern(label, values);
    }
  }

  /**
   * Learn pattern for a specific label
   */
  private learnPattern(label: string, examples: string[]): void {
    if (examples.length === 0) return;

    // Extract common prefixes (first 1-3 characters)
    const prefixCounts = new Map<string, number>();
    const suffixCounts = new Map<string, number>();
    const charFreq = new Map<string, number>();
    const lengths: number[] = [];

    for (const example of examples) {
      lengths.push(example.length);
      
      // Prefixes
      for (let len = 1; len <= Math.min(3, example.length); len++) {
        const prefix = example.substring(0, len);
        prefixCounts.set(prefix, (prefixCounts.get(prefix) || 0) + 1);
      }
      
      // Suffixes
      for (let len = 1; len <= Math.min(3, example.length); len++) {
        const suffix = example.substring(example.length - len);
        suffixCounts.set(suffix, (suffixCounts.get(suffix) || 0) + 1);
      }
      
      // Character frequency
      for (const char of example) {
        charFreq.set(char, (charFreq.get(char) || 0) + 1);
      }
    }

    // Get common prefixes (appear in >10% of examples - lowered from 20% for better pattern matching)
    const commonPrefixes = Array.from(prefixCounts.entries())
      .filter(([_, count]) => count / examples.length > 0.1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15) // Increased from 10 to 15
      .map(([prefix]) => prefix);

    // Get common suffixes (appear in >10% of examples - lowered from 20% for better pattern matching)
    const commonSuffixes = Array.from(suffixCounts.entries())
      .filter(([_, count]) => count / examples.length > 0.1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15) // Increased from 10 to 15
      .map(([suffix]) => suffix);

    // Normalize character frequencies
    const totalChars = Array.from(charFreq.values()).reduce((a, b) => a + b, 0);
    for (const [char, count] of charFreq.entries()) {
      charFreq.set(char, count / totalChars);
    }

    this.patterns.set(label, {
      label,
      examples,
      commonPrefixes,
      commonSuffixes,
      charFrequency: charFreq,
      lengthDistribution: lengths,
    });
  }

  /**
   * Correct a generated string using learned patterns
   */
  correct(generated: string, label: string): string {
    const pattern = this.patterns.get(label);
    if (!pattern) {
      return generated; // No pattern learned, return as-is
    }

    let corrected = generated;

    // 1. Check if it matches a known example (exact match)
    if (pattern.examples.includes(generated)) {
      return generated; // Already perfect
    }

    // 2. Check prefix/suffix patterns
    const hasValidPrefix = pattern.commonPrefixes.some(prefix => 
      corrected.toLowerCase().startsWith(prefix.toLowerCase())
    );
    const hasValidSuffix = pattern.commonSuffixes.some(suffix => 
      corrected.toLowerCase().endsWith(suffix.toLowerCase())
    );

    // 3. If no valid prefix, try to fix it
    if (!hasValidPrefix && pattern.commonPrefixes.length > 0) {
      const mostCommonPrefix = pattern.commonPrefixes[0];
      // Only fix if the generated string is very different
      if (corrected.length > 0 && !corrected.toLowerCase().startsWith(mostCommonPrefix[0].toLowerCase())) {
        // Don't change, but note it for scoring
      }
    }

    // 4. Check character frequency (remove unlikely characters)
    const charFreq = pattern.charFrequency;
    let cleaned = '';
    for (const char of corrected) {
      const freq = charFreq.get(char) || 0;
      // Keep character if it appears in >0.5% of training data (lowered from 1%), or if it's common (space, etc.)
      if (freq > 0.005 || /[a-zA-Z0-9\s]/.test(char)) {
        cleaned += char;
      }
    }
    if (cleaned.length > 0) {
      corrected = cleaned;
    }

    // 5. Check length distribution
    const avgLength = pattern.lengthDistribution.reduce((a, b) => a + b, 0) / pattern.lengthDistribution.length;
    const minLength = Math.min(...pattern.lengthDistribution);
    const maxLength = Math.max(...pattern.lengthDistribution);
    
    // Truncate if too long
    if (corrected.length > maxLength * 1.5) {
      corrected = corrected.substring(0, Math.floor(maxLength * 1.2));
    }

    return corrected;
  }

  /**
   * Score how well a generated string matches the pattern
   */
  score(generated: string, label: string): number {
    const pattern = this.patterns.get(label);
    if (!pattern) {
      return 0.5; // Unknown pattern, neutral score
    }

    let score = 0;
    let factors = 0;

    // 1. Exact match bonus
    if (pattern.examples.includes(generated)) {
      return 1.0; // Perfect match
    }

    // 2. Prefix match (30% weight)
    const prefixMatch = pattern.commonPrefixes.some(prefix => 
      generated.toLowerCase().startsWith(prefix.toLowerCase())
    );
    score += prefixMatch ? 0.3 : 0;
    factors++;

    // 3. Suffix match (20% weight)
    const suffixMatch = pattern.commonSuffixes.some(suffix => 
      generated.toLowerCase().endsWith(suffix.toLowerCase())
    );
    score += suffixMatch ? 0.2 : 0;
    factors++;

    // 4. Character frequency match (30% weight)
    const charFreq = pattern.charFrequency;
    let charScore = 0;
    let charCount = 0;
    for (const char of generated) {
      const freq = charFreq.get(char) || 0;
      charScore += freq;
      charCount++;
    }
    score += (charCount > 0 ? charScore / charCount : 0) * 0.3;
    factors++;

    // 5. Length match (20% weight)
    const avgLength = pattern.lengthDistribution.reduce((a, b) => a + b, 0) / pattern.lengthDistribution.length;
    const lengthDiff = Math.abs(generated.length - avgLength) / avgLength;
    const lengthScore = Math.max(0, 1 - lengthDiff);
    score += lengthScore * 0.2;
    factors++;

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Get pattern for a label
   */
  getPattern(label: string): Pattern | undefined {
    return this.patterns.get(label);
  }
}

