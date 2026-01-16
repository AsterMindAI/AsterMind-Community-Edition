// Vectorization utilities for sparse and dense vectors
// Extracted from workers for reuse

import type { Kernel } from '../types.js';

export type SparseVec = Map<number, number>;

/**
 * Compute TF-IDF vector from tokens
 */
export function toTfidf(
  tokens: string[], 
  idf: number[], 
  vmap: Map<string, number>, 
  headingW = 1
): SparseVec {
  const counts = new Map<number, number>();
  let atHeading = true;
  // crude heuristic: first 8 tokens considered heading-weighted
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const id = vmap.get(t);
    if (id === undefined) continue;
    const w = (atHeading && i < 8) ? headingW : 1;
    counts.set(id, (counts.get(id) || 0) + w);
  }
  const maxTf = Math.max(1, ...counts.values());
  const v: SparseVec = new Map();
  for (const [i, c] of counts) {
    const tf = 0.5 + 0.5 * (c / maxTf);
    v.set(i, tf * (idf[i] || 0));
  }
  return v;
}

/**
 * Cosine similarity between two sparse vectors
 */
export function cosineSparse(a: SparseVec, b: SparseVec): number {
  let dot = 0, na = 0, nb = 0;
  for (const [i, av] of a) {
    na += av * av;
    const bv = b.get(i); 
    if (bv) dot += av * bv;
  }
  for (const [, bv] of b) nb += bv * bv;
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Convert sparse vector to dense Float64Array
 */
export function sparseToDense(v: SparseVec, dim: number): Float64Array {
  const x = new Float64Array(dim);
  for (const [i, val] of v) x[i] = val;
  return x;
}

/**
 * Dot product of two dense vectors
 */
export function dotProd(a: Float64Array, b: Float64Array): number {
  let s = 0; 
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]; 
  return s;
}

/**
 * Base kernel function (RBF, cosine, or poly2)
 */
export function baseKernel(a: Float64Array, b: Float64Array, k: Kernel, sigma: number): number {
  if (k === 'cosine') {
    const dot = dotProd(a, b), na = Math.hypot(...a), nb = Math.hypot(...b);
    return (na && nb) ? (dot / (na * nb)) : 0;
  } else if (k === 'poly2') {
    const dot = dotProd(a, b);
    return (dot + 1) ** 2;
  } else {
    let s = 0; 
    for (let i = 0; i < a.length; i++) { 
      const d = a[i] - b[i]; 
      s += d * d; 
    }
    return Math.exp(-s / Math.max(1e-9, 2 * sigma * sigma));
  }
}

/**
 * Kernel similarity between two dense vectors
 */
export function kernelSim(a: Float64Array, b: Float64Array, k: Kernel, sigma: number): number {
  if (k === 'cosine') {
    const dot = dotProd(a, b), na = Math.hypot(...a), nb = Math.hypot(...b);
    return (na && nb) ? (dot / (na * nb)) : 0;
  } else if (k === 'poly2') {
    const dot = dotProd(a, b);
    return (dot + 1) ** 2;
  } else {
    let s = 0; 
    for (let i = 0; i < a.length; i++) { 
      const d = a[i] - b[i]; 
      s += d * d; 
    }
    return Math.exp(-s / Math.max(1e-9, 2 * sigma * sigma));
  }
}

/**
 * Project sparse vector to dense using Nyström landmarks
 */
export function projectToDense(
  v: SparseVec, 
  vocabSize: number,
  landmarkMat: Float64Array[],
  kernel: Kernel,
  sigma: number
): Float64Array {
  const x = sparseToDense(v, vocabSize);
  const feats = new Float64Array(landmarkMat.length);
  for (let j = 0; j < landmarkMat.length; j++) {
    const l = landmarkMat[j];
    feats[j] = baseKernel(x, l, kernel, sigma);
  }
  const n = Math.hypot(...feats);
  if (n > 0) for (let i = 0; i < feats.length; i++) feats[i] /= n;
  return feats;
}




