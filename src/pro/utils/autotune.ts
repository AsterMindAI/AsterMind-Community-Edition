// Auto-tuning utilities for hyperparameter optimization
// Extracted from dev-worker for reuse

// License removed - all features are now free!
import { tokenize } from './tokenization.js';
import { toTfidf, cosineSparse, projectToDense, kernelSim, type SparseVec } from '../retrieval/vectorization.js';
import { topKIndices } from '../retrieval/hybrid-retriever.js';
import { buildLandmarks, buildDenseDocs } from '../retrieval/index-builder.js';
import type { Kernel, Settings } from '../types.js';

export interface AutoTuneOptions {
  chunks: Array<{ heading: string; content: string }>;
  vocabMap: Map<string, number>;
  idf: number[];
  tfidfDocs: SparseVec[];
  vocabSize: number;
  budget?: number;
  sampleQueries?: number;
  currentSettings: Partial<Settings>;
}

export interface AutoTuneResult {
  bestSettings: Partial<Settings>;
  bestScore: number;
  trials: number;
}

/**
 * Sample queries from corpus
 */
export function sampleQueriesFromCorpus(
  chunks: Array<{ heading: string; content: string }>,
  n: number,
  useStem: boolean
): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const s = chunks[Math.floor(Math.random() * chunks.length)];
    // short synthetic queries from headings + nouns-ish tokens
    const toks = tokenize((s.heading + ' ' + s.content).slice(0, 400), useStem)
      .filter(t => t.length > 3)
      .slice(0, 40);
    const uniq = Array.from(new Set(toks));
    out.push(uniq.slice(0, 6).join(' '));
  }
  return out;
}

/**
 * Compute penalty for configuration complexity
 */
export function penalty(cfg: any): number {
  const lmCost = (cfg.landmarks - 128) / 512;
  const vocabCost = (cfg.vocab - 8000) / 24000;
  const preCost = (cfg.prefilter - 200) / 1200;
  return 0.02 * (lmCost + vocabCost + preCost);
}

/**
 * Jaccard similarity between two index arrays
 */
export function jaccard(a: number[], b: number[]): number {
  const A = new Set(a); 
  const B = new Set(b);
  let inter = 0; 
  for (const x of A) if (B.has(x)) inter++;
  const uni = new Set([...A, ...B]).size;
  return uni ? inter / uni : 0;
}

/**
 * Clamp value between min and max
 */
function clamp(x: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, x));
}

/**
 * Pick random element from array
 */
function pick<T>(arr: T[]): T { 
  return arr[Math.floor(Math.random() * arr.length)]; 
}

/**
 * Random number in range
 */
function randRange(a: number, b: number): number { 
  return a + Math.random() * (b - a); 
}

/**
 * Mutate object with patch
 */
function mutate<T extends object>(base: T, patch: Partial<T>): T {
  return Object.assign({}, base, patch);
}

/**
 * Auto-tune hyperparameters
 */
export async function autoTune(
  opts: AutoTuneOptions,
  onProgress?: (trial: number, best: number, note: string) => void
): Promise<AutoTuneResult> {
  // License check removed // Premium feature - requires valid license
  const {
    chunks,
    vocabMap,
    idf,
    tfidfDocs,
    vocabSize,
    budget = 40,
    sampleQueries: Qn = 24,
    currentSettings,
  } = opts;

  const budgetClamped = Math.max(10, Math.min(200, budget));
  const QnClamped = Math.max(8, Math.min(60, Qn));
  const useStem = (currentSettings.useStem ?? true);
  const queries = sampleQueriesFromCorpus(chunks, QnClamped, useStem);

  // Pre-compute TF-IDF top-K for each query (baseline)
  const tfidfTops = queries.map(q => {
    const qv = toTfidf(tokenize(q, useStem), idf, vocabMap, 1);
    const scores = tfidfDocs.map(v => cosineSparse(v, qv));
    return topKIndices(scores, (currentSettings.topK ?? 8));
  });

  let best = { score: -Infinity, cfg: { ...currentSettings } as any };

  // Cache for dense docs (keyed by kernel params)
  const denseCache = new Map<string, Float64Array[]>();
  const denseDocsFor = (cfg: any) => {
    // ridge doesn't affect projection; key on kernel params only
    const key = `${cfg.kernel}:${cfg.landmarks}:${cfg.sigma}`;
    let dd = denseCache.get(key);
    if (!dd) {
      const { landmarksIdx, landmarkMat } = buildLandmarks(tfidfDocs, vocabSize, cfg.landmarks);
      dd = buildDenseDocs(tfidfDocs, vocabSize, landmarkMat, cfg.kernel, cfg.sigma);
      denseCache.set(key, dd);
    }
    return dd!;
  };

  let trial = 0;
  const tryCfg = (cfg: any, note: string) => {
    const jScores: number[] = [];
    const dd = denseDocsFor(cfg);
    const alpha = clamp(cfg.alpha, 0, 1);
    const lambda = (cfg.ridge ?? 0.05) as number;

    for (let qi = 0; qi < queries.length; qi++) {
      const q = queries[qi];
      const qv = toTfidf(tokenize(q, cfg.useStem), idf, vocabMap, 1);
      const { landmarksIdx, landmarkMat } = buildLandmarks(tfidfDocs, vocabSize, cfg.landmarks);
      const qd = projectToDense(qv, vocabSize, landmarkMat, cfg.kernel, cfg.sigma);

      const tfidfScores = tfidfDocs.map(v => cosineSparse(v, qv));
      
      // Compute dense scores using kernel similarity
      const denseScoresSimple = dd.map((v) => kernelSim(v, qd, cfg.kernel, cfg.sigma));

      // ridge-regularized hybrid (bonus off during tuning)
      const hybrid = denseScoresSimple.map((d, i) => {
        const t = tfidfScores[i];
        const reg = 1 / (1 + lambda * (d * d + t * t));
        return reg * (alpha * d + (1 - alpha) * t);
      });

      const idxs = topKIndices(hybrid, cfg.topK);
      jScores.push(jaccard(tfidfTops[qi], idxs));
    }
    const score = (jScores.reduce((a, b) => a + b, 0) / jScores.length) - penalty(cfg);
    if (score > best.score) best = { score, cfg: { ...cfg } };
    if (onProgress) onProgress(++trial, best.score, note);
  };

  // random warmup
  for (let i = 0; i < Math.floor(budgetClamped * 0.6); i++) {
    const cfg: any = mutate(currentSettings, {
      alpha: randRange(0.55, 0.95),
      beta: randRange(0.0, 0.35),
      sigma: randRange(0.18, 0.75),
      kernel: pick<Kernel>(['rbf', 'cosine', 'poly2']),
      vocab: pick([8000, 10000, 12000, 15000]),
      landmarks: pick([128, 192, 256, 320, 384]),
      prefilter: pick([200, 300, 400, 600]),
      topK: pick([4, 6, 8]),
      headingW: randRange(1.5, 4.5),
      chunk: pick([450, 550, 650]),
      overlap: pick([50, 75, 100]),
      penalizeLinks: true,
      stripCode: true,
      expandQuery: true,
      useStem: true,
      ridge: randRange(0.02, 0.18),
    });
    tryCfg(cfg, 'random');
  }

  // refinement
  for (let i = trial; i < budgetClamped; i++) {
    const b: any = best.cfg;
    const cfg: any = mutate(b, {
      alpha: clamp(b.alpha + randRange(-0.1, 0.1), 0.4, 0.98),
      beta: clamp(b.beta + randRange(-0.1, 0.1), 0, 0.4),
      sigma: clamp(b.sigma + randRange(-0.08, 0.08), 0.12, 1.0),
      kernel: b.kernel,
      vocab: b.vocab,
      landmarks: b.landmarks,
      prefilter: b.prefilter,
      topK: b.topK,
      headingW: clamp(b.headingW + randRange(-0.4, 0.4), 1.0, 6.0),
      chunk: b.chunk,
      overlap: b.overlap,
      penalizeLinks: b.penalizeLinks,
      stripCode: b.stripCode,
      expandQuery: b.expandQuery,
      useStem: b.useStem,
      ridge: clamp((b.ridge ?? 0.05) + randRange(-0.02, 0.02), 0.0, 0.2),
    });
    tryCfg(cfg, 'refine');
  }

  return {
    bestSettings: best.cfg,
    bestScore: best.score,
    trials: trial,
  };
}

