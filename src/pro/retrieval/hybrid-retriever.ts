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

  // Hybrid scoring with ridge regularization
  const alphaClamped = clamp(alpha, 0, 1);
  const lambda = ridge ?? 0.08;

  const scores = denseScores.map((d, i) => {
    const t = tfidfScores[i];
    const b = beta * bonus[i];

    // Ridge damping on ALL components (dense, tfidf, and keyword bonus)
    const reg = 1 / (1 + lambda * (d * d + t * t + 0.5 * b * b));

    const s = reg * (alphaClamped * d + (1 - alphaClamped) * t + b);
    // soft clip extremes; helps prevent a single noisy dimension from dominating
    return Math.tanh(s);
  });

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

