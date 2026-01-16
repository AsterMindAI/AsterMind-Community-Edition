/**
 * OneHot - One-hot encoding utilities
 */

export class OneHot {
  /**
   * Encode an index as a one-hot vector
   * @param index Index to encode
   * @param size Size of the one-hot vector
   */
  static encode(index: number, size: number): number[] {
    if (index < 0 || index >= size) {
      throw new Error(`Index ${index} out of range [0, ${size})`);
    }

    const vector = new Array(size).fill(0);
    vector[index] = 1;
    return vector;
  }

  /**
   * Decode a one-hot vector to an index
   * @param vector One-hot vector
   */
  static decode(vector: number[]): number {
    const index = vector.indexOf(1);
    if (index === -1) {
      throw new Error('Invalid one-hot vector: no element equals 1');
    }
    return index;
  }

  /**
   * Encode multiple indices as one-hot vectors
   * @param indices Array of indices
   * @param size Size of each one-hot vector
   */
  static encodeBatch(indices: number[], size: number): number[][] {
    return indices.map(idx => this.encode(idx, size));
  }

  /**
   * Decode multiple one-hot vectors to indices
   * @param vectors Array of one-hot vectors
   */
  static decodeBatch(vectors: number[][]): number[] {
    return vectors.map(vec => this.decode(vec));
  }
}






