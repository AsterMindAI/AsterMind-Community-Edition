// Hybrid retrieval system (sparse + dense + keyword bonus)
// Extracted from workers for reuse

// License removed - all features are now free!
import { tokenize, expandQuery } from '../utils/tokenization.js';
import { toTfidf, cosineSparse, kernelSim, projectToDense, type SparseVec } from './vectorization.js';
import type { Kernel } from '../types.js';

export interface RetrievedChunk {
  heading: string;
  content: string;
  rich?: string;
  score?: number;
  index?: number;
}

export interface HybridRetrievalOptions {
  query: string;
  chunks: Array<{ heading: string; content: string; rich?: string }>;
  vocabMap: Map<string, number>;
  idf: number[];
  tfidfDocs: SparseVec[];
  denseDocs: Float64Array[];
  landmarksIdx: number[];
  landmarkMat: Float64Array[];
  vocabSize: number;
  kernel: Kernel;
  sigma: number;
  alpha: number;        // dense/sparse mix (0-1)
  beta: number;         // keyword bonus weight
  ridge: number;        // ridge regularization
  headingW: number;
  useStem: boolean;
  expandQuery: boolean;
  topK: number;
  prefilter?: number;
  /**
   * Score fusion strategy:
   *  - "normalized" (default): min-max normalize the dense and sparse score
   *    columns across candidates, then convex blend (alpha) plus the keyword
   *    bonus. Strong matches are rewarded, not damped.
   *  - "damped" (legacy): the original ridge-damped tanh formula, which shrinks
   *    a component precisely when it is large (penalizing the best matches).
   */
  fusion?: "normalized" | "damped";
}

export interface HybridRetrievalResult {
  items: RetrievedChunk[];
  scores: number[];
  indices: number[];
  tfidfScores: number[];
  denseScores: number[];
}

/**
 * Compute keyword bonus scores for chunks
 */
export function keywordBonus(
  chunks: Array<{ content: string; rich?: string }>, 
  query: string
): number[] {
  const kws = Array.from(new Set(query.toLowerCase().split(/\W+/).filter(t => t.length > 2)));
  const syntaxBoost = /\b(define|declare|syntax|example|function|struct|map|interface)\b/i.test(query);
  return chunks.map(c => {
    const text = (c as any).rich || c.content || '';
    const lc = text.toLowerCase();
    let hit = 0;
    for (const k of kws) if (lc.includes(k)) hit++;
    if (syntaxBoost && /```/.test(text)) hit += 5; // strong bonus for code presence
    return Math.min(1.0, hit * 0.03);
  });
}

/**
 * Get top K indices from scores
 */
export function topKIndices(arr: number[] | Float64Array, k: number): number[] {
  const idx = Array.from(arr, (_, i) => i);
  idx.sort((i, j) => (arr[j] - arr[i]));
  return idx.slice(0, k);
}

/**
 * Clamp value between min and max
 */
function clamp(x: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, x));
}

/**
 * Perform hybrid retrieval (sparse + dense + keyword bonus)
 */
export function hybridRetrieve(opts: HybridRetrievalOptions): HybridRetrievalResult {
  // License check removed // Premium feature - requires valid license
  const {
    query,
    chunks,
    vocabMap,
    idf,
    tfidfDocs,
    denseDocs,
    landmarksIdx,
    landmarkMat,
    vocabSize,
    kernel,
    sigma,
    alpha,
    beta,
    ridge,
    headingW,
    useStem,
    expandQuery: shouldExpand,
    topK: k,
    prefilter,
    fusion = "normalized",
  } = opts;

  // Expand query if needed
  const qexp = shouldExpand ? expandQuery(query) : query;
  const toks = tokenize(qexp, useStem);
  const qvec = toTfidf(toks, idf, vocabMap, headingW);
  const qdense = projectToDense(qvec, vocabSize, landmarkMat, kernel, sigma);

  // Compute sparse (TF-IDF) scores
  const tfidfScores = tfidfDocs.map(v => cosineSparse(v, qvec));

  // Compute dense (kernel) scores
  const denseScores = denseDocs.map((v) => kernelSim(v, qdense, kernel, sigma));

  // Compute keyword bonus
  const bonus = keywordBonus(chunks, query);

  // Hybrid scoring
  const alphaClamped = clamp(alpha, 0, 1);
  const lambda = ridge ?? 0.08;

  let scores: number[];
  if (fusion === "damped") {
    // Legacy path: ridge damping shrinks a component when it is large, which
    // penalizes the strongest matches. Kept for comparison / backward compat.
    scores = denseScores.map((d, i) => {
      const t = tfidfScores[i];
      const b = beta * bonus[i];
      const reg = 1 / (1 + lambda * (d * d + t * t + 0.5 * b * b));
      const s = reg * (alphaClamped * d + (1 - alphaClamped) * t + b);
      return Math.tanh(s);
    });
  } else {
    // Normalized fusion: put dense and sparse on the same 0-1 scale across the
    // candidate set, blend by alpha, then add the (already bounded) keyword bonus.
    const norm = (xs: number[]): number[] => {
      let lo = Infinity, hi = -Infinity;
      for (const x of xs) { if (x < lo) lo = x; if (x > hi) hi = x; }
      const range = hi - lo;
      if (!isFinite(range) || range < 1e-12) return xs.map(() => 0);
      return xs.map(x => (x - lo) / range);
    };
    const dN = norm(denseScores);
    const tN = norm(tfidfScores);
    scores = dN.map((d, i) => alphaClamped * d + (1 - alphaClamped) * tN[i] + beta * bonus[i]);
  }

  // Pre-filter then final topK (retrieval stage)
  const pre = Math.max(k, prefilter ?? 0);
  const idxs = topKIndices(scores, pre);
  const finalIdxs = topKIndices(idxs.map(i => scores[i]), k).map(k => idxs[k]);

  // Build result items
  const items = finalIdxs.map(i => {
    const c = chunks[i];
    const body = (c.rich && c.rich.trim()) || (c.content && c.content.trim()) || '(see subsections)';
    return { 
      score: scores[i], 
      heading: c.heading, 
      content: body,
      index: i,
    };
  });

  return {
    items,
    scores: finalIdxs.map(i => scores[i]),
    indices: finalIdxs,
    tfidfScores: finalIdxs.map(i => tfidfScores[i]),
    denseScores: finalIdxs.map(i => denseScores[i]),
  };
}

