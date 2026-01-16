/**
 * FixedLength - Utilities for fixed-length padding and truncation
 */

export class FixedLength {
  /**
   * Pad or truncate an array to a fixed length
   * @param arr Array to pad/truncate
   * @param length Target length
   * @param padValue Value to use for padding (default: 0)
   */
  static padOrTruncate<T>(arr: T[], length: number, padValue: T = 0 as T): T[] {
    if (arr.length === length) {
      return [...arr];
    }

    if (arr.length > length) {
      // Truncate
      return arr.slice(0, length);
    }

    // Pad
    const result = [...arr];
    while (result.length < length) {
      result.push(padValue);
    }
    return result;
  }

  /**
   * Pad or truncate a string to a fixed length
   * @param str String to pad/truncate
   * @param length Target length
   * @param padChar Character to use for padding (default: space)
   */
  static padOrTruncateString(str: string, length: number, padChar: string = ' '): string {
    if (str.length === length) {
      return str;
    }

    if (str.length > length) {
      // Truncate
      return str.slice(0, length);
    }

    // Pad
    return str + padChar.repeat(length - str.length);
  }
}






