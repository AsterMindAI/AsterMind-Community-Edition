// Index building utilities
// Extracted from workers for reuse

// License removed - all features are now free!
import { tokenize } from '../utils/tokenization.js';
import { toTfidf, sparseToDense, type SparseVec } from './vectorization.js';
import type { Kernel } from '../types.js';

export interface IndexState {
  vocabMap: Map<string, number>;
  idf: number[];
  tfidfDocs: SparseVec[];
  landmarksIdx: number[];
  landmarkMat: Float64Array[];
  denseDocs: Float64Array[];
}

export interface BuildIndexOptions {
  chunks: Array<{ heading: string; content: string }>;
  vocab: number;
  landmarks: number;
  headingW: number;
  useStem: boolean;
  kernel: Kernel;
  sigma: number;
}

/**
 * Build vocabulary and IDF from chunks
 */
export function buildVocabAndIdf(
  chunks: Array<{ heading: string; content: string }>,
  vocabSize: number,
  useStem: boolean
): { vocabMap: Map<string, number>; idf: number[] } {
  const docsTokens: string[][] = chunks.map(ch =>
    tokenize((ch.heading + ' \n' + ch.content), useStem)
  );

  const df = new Map<string, number>();
  for (const toks of docsTokens) {
    const unique = new Set(toks);
    for (const t of unique) df.set(t, (df.get(t) || 0) + 1);
  }
  const sorted = [...df.entries()].sort((a, b) => b[1] - a[1]).slice(0, vocabSize);
  const vocabMap = new Map(sorted.map(([tok], i) => [tok, i]));
  const idf = new Array(vocabMap.size).fill(0);
  const N = docsTokens.length;
  for (const [tok, i] of vocabMap.entries()) {
    const dfi = df.get(tok) || 1;
    idf[i] = Math.log((N + 1) / (dfi + 1)) + 1;
  }

  return { vocabMap, idf };
}

/**
 * Build TF-IDF vectors for all chunks
 */
export function buildTfidfDocs(
  chunks: Array<{ heading: string; content: string }>,
  vocabMap: Map<string, number>,
  idf: number[],
  headingW: number,
  useStem: boolean
): SparseVec[] {
  return chunks.map(ch => {
    const toks = tokenize((ch.heading + ' \n' + ch.content), useStem);
    return toTfidf(toks, idf, vocabMap, headingW);
  });
}

/**
 * Build Nyström landmarks from TF-IDF documents
 */
export function buildLandmarks(
  tfidfDocs: SparseVec[],
  vocabSize: number,
  numLandmarks: number
): { landmarksIdx: number[]; landmarkMat: Float64Array[] } {
  const L = Math.max(32, numLandmarks);
  const step = Math.max(1, Math.floor(Math.max(1, tfidfDocs.length) / L));
  const landmarksIdx = Array.from({ length: L }, (_, k) => 
    Math.min(tfidfDocs.length - 1, k * step)
  );
  const landmarkMat = landmarksIdx.map(i => sparseToDense(tfidfDocs[i], vocabSize));
  return { landmarksIdx, landmarkMat };
}

/**
 * Build dense projections for all TF-IDF documents
 */
export function buildDenseDocs(
  tfidfDocs: SparseVec[],
  vocabSize: number,
  landmarkMat: Float64Array[],
  kernel: Kernel,
  sigma: number
): Float64Array[] {
  return tfidfDocs.map(v => {
    const x = sparseToDense(v, vocabSize);
    const feats = new Float64Array(landmarkMat.length);
    for (let j = 0; j < landmarkMat.length; j++) {
      const l = landmarkMat[j];
      feats[j] = baseKernel(x, l, kernel, sigma);
    }
    const n = Math.hypot(...feats);
    if (n > 0) for (let i = 0; i < feats.length; i++) feats[i] /= n;
    return feats;
  });
}

function baseKernel(a: Float64Array, b: Float64Array, k: Kernel, sigma: number): number {
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

function dotProd(a: Float64Array, b: Float64Array): number {
  let s = 0; 
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]; 
  return s;
}

/**
 * Build complete index from chunks
 */
export function buildIndex(opts: BuildIndexOptions): IndexState {
  // License check removed // Premium feature - requires valid license
  const { chunks, vocab, landmarks, headingW, useStem, kernel, sigma } = opts;

  // Build vocab and IDF
  const { vocabMap, idf } = buildVocabAndIdf(chunks, vocab, useStem);

  // Build TF-IDF vectors
  const tfidfDocs = buildTfidfDocs(chunks, vocabMap, idf, headingW, useStem);

  // Build landmarks
  const { landmarksIdx, landmarkMat } = buildLandmarks(tfidfDocs, vocabMap.size, landmarks);

  // Build dense projections
  const denseDocs = buildDenseDocs(tfidfDocs, vocabMap.size, landmarkMat, kernel, sigma);

  return {
    vocabMap,
    idf,
    tfidfDocs,
    landmarksIdx,
    landmarkMat,
    denseDocs,
  };
}


