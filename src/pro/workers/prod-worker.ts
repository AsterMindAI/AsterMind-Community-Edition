/// <reference path="./worker-types.d.ts" />
// prod-worker.ts — AsterMind Pro Production Worker (Inference Only)
// Production-optimized worker for inference-only workloads
// - No training, autotune, or reindexing capabilities
// - Loads pre-trained models via SerializedModel
// - Optimized for query answering only

// License removed - all features are now free!
import { InfoFlowGraph } from '../infoflow/index.js';
import { InfoFlowGraphPWS } from '../infoflow/TransferEntropyPWS.js';
import { TEController, type Knobs } from '../infoflow/TEController.js';
import { rerankAndFilter, type Chunk as RRChunk, type ScoredChunk } from '../reranking/OmegaRR.js';
import { summarizeDeterministic } from '../summarization/OmegaSumDet.js';

import type {
  Settings, ProductionUiToWorker, ProductionWorkerMsg, Kernel, Section, SerializedModel
} from '../types.js';

// Import astermind from base package
import { Tokenizer } from '../../preprocessing/Tokenizer.js';
import { TFIDFVectorizer } from '../../ml/TFIDF.js';
import { ELM } from '../../core/ELM.js';
import { OnlineELM } from '../../core/OnlineELM.js';

// Import extracted modules
import { 
  parseMarkdownToSections, 
  backfillEmptyParents, 
  flattenSections,
  type Chunk,
  type SectionNode 
} from '../utils/markdown.js';
import { tokenize, expandQuery } from '../utils/tokenization.js';
import { 
  hybridRetrieve,
  type HybridRetrievalResult 
} from '../retrieval/hybrid-retriever.js';
import { 
  projectToDense,
  toTfidf,
  type SparseVec 
} from '../retrieval/vectorization.js';
import { importModel as importModelUtil } from '../utils/model-serialization.js';
import { buildDenseDocs } from '../retrieval/index-builder.js';

// SerializedModel is imported from types.ts

/* =========================
   Global State
========================= */

let SETTINGS: Settings;

let IFLOW: InfoFlowGraph | InfoFlowGraphPWS | null = null;
let CTRL: TEController | null = null;

let sections: Section[] = []; // legacy flat (kept for compatibility/debug)
let chunks: Chunk[] = [];

let vocabMap = new Map<string, number>(); // token -> id
let idf: number[] = [];
let tfidfDocs: SparseVec[] = []; // chunk vectors

// Dense (Nyström) state
let landmarksIdx: number[] = [];
let landmarkMat: Float64Array[] = []; // landmark vectors in sparse->dense kernel space
let denseDocs: Float64Array[] = [];

// post() loosened to any to allow new message kinds like 'kept'
const post = (m: any) => (postMessage as any)(m);

self.addEventListener('message', (e: MessageEvent<ProductionUiToWorker>) => {
  // Production worker - inference only
  const msg = e.data as any;
  const action = (msg && msg.action) as string;
  const payload = (msg && msg.payload) ?? {};

  (async () => {
    try {
      // License check - all worker actions require a valid license
      // License check removed
      
      if (action === 'init') {
        // Production: load from SerializedModel only
        if (!payload.model) {
          throw new Error('Production worker requires a SerializedModel in init payload');
        }
        await importModel(payload.model);
        post({ type: 'ready' });
      }
      else if (action === 'ask') {
        if (payload?.settings) Object.assign(SETTINGS, payload.settings);
        const res = await answer(payload.q);
        post({ type: 'answer', text: res.answer });
        post({ type: 'results', items: res.items });
        post({ type: 'stats', text: res.stats });
      }
      else {
        throw new Error(`Unknown action: ${action}. Production worker only supports 'init' and 'ask'`);
      }
    } catch (err: any) {
      post({ type: 'error', error: String(err?.message || err) });
    }
  })();
});

post({ type: 'ready' });

/* =========================
   Markdown Tree Parsing + Chunking
========================= */
// Markdown parsing functions are now imported from '../utils/markdown.js'

/* =========================
   Load + Index
========================= */

// Production worker: loadAndIndex and buildIndex removed - use importModel instead

/* =========================
   Retrieval → Rerank/Filter → Summarize (ridge-regularized hybrid)
========================= */

async function answer(q: string) {
  // Use hybrid retrieval
  const retrievalResult = hybridRetrieve({
    query: q,
    chunks,
    vocabMap,
    idf,
    tfidfDocs,
    denseDocs,
    landmarksIdx,
    landmarkMat,
    vocabSize: vocabMap.size,
    kernel: (SETTINGS as any).kernel,
    sigma: (SETTINGS as any).sigma,
    alpha: (SETTINGS as any).alpha,
    beta: (SETTINGS as any).beta ?? 0,
    ridge: (SETTINGS as any).ridge ?? 0.08,
    headingW: (SETTINGS as any).headingW ?? 1.0,
    useStem: (SETTINGS as any).useStem,
    expandQuery: (SETTINGS as any).expandQuery ?? false,
    topK: (SETTINGS as any).topK,
    prefilter: (SETTINGS as any).prefilter,
  });

  const finalIdxs = retrievalResult.indices;
  const items = retrievalResult.items;

  // --- TE: Retriever (Query -> Hybrid scores) ---
  if (IFLOW) {
    // Build query vector for InfoFlow tracking
    const qexp = (SETTINGS as any).expandQuery ? expandQuery(q) : q;
    const toks = tokenize(qexp, (SETTINGS as any).useStem);
    const qvec = toTfidf(toks, idf, vocabMap, 1.0);
    const qdense = projectToDense(qvec, vocabMap.size, landmarkMat, (SETTINGS as any).kernel, (SETTINGS as any).sigma);
    
    // Represent query as a small vector: [avg_tfidf, avg_dense]
    const qSig = [avg(Array.from(qvec.values())), avg(qdense)];
    // Represent scores as a short vector: stats over current candidate pool
    const scoreSig = [
      avg(retrievalResult.tfidfScores), avg(retrievalResult.denseScores), avg(retrievalResult.scores)
    ];
    if (isFiniteVec(qSig) && isFiniteVec(scoreSig)) {
      IFLOW.get('Retriever:Q->Score').push(qSig, scoreSig);
    }
  }

  // ---------- NEW: OmegaRR + OmegaSum ----------
  // Prepare reranker input from the SAME selected chunks, passing the hybrid score as a prior.
  const rerankInput: RRChunk[] = finalIdxs.map(i => {
    const c = chunks[i];
    return {
      heading: c.heading,
      content: c.content || "",      // index/plain text (no code fences needed)
      rich: c.rich,                  // keep rich for code-aware summarization
      level: c.level,
      secId: c.secId,
      // OmegaRR reads score_base as prior
      // @ts-ignore
      score_base: scores[i]
    } as RRChunk & { score_base: number };
  });

  // ---------- OmegaRR: rerank+filter (single call) ----------
  const kept: ScoredChunk[] = rerankAndFilter(q, rerankInput, {
    lambdaRidge: 1e-2,
    probThresh: 0.45,
    epsilonTop: 0.05,
    useMMR: true,
    mmrLambda: 0.7,
    budgetChars: 1200,
    randomProjDim: 32,
  });

  // --- TE: OmegaRR engineered features driving score ---
  if (IFLOW) {
    for (const k of kept) {
      const f = (k as any)._features as number[] | undefined;
      if (f && f.length && isFiniteVec(f) && Number.isFinite(k.score_rr)) {
        IFLOW.get('OmegaRR:Feat->Score').push(f, [k.score_rr]);
      }
    }
  }

  // ---------- OmegaSumDet: deterministic, context-locked summarization ----------
  // Map OmegaRR fields into the simple ScoredChunk shape expected by OmegaSumDet.
  // We treat the array order of `kept` as the rrRank (0..N-1) for stability.
  const detInput = kept.map((k, i) => ({
    heading: k.heading,
    content: k.content || "",
    rich: k.rich,
    level: k.level,
    secId: k.secId,
    rrScore: (k as any).score_rr ?? 0,
    rrRank: i,
  }));

  const sum = summarizeDeterministic(q, detInput, {
    // output shaping
    maxAnswerChars: 1100,
    maxBullets: 3,
    includeCitations: true,
    addFooter: true,
    preferCode: true,
    // weights — conservative rrWeight so reranker doesn’t dominate query-alignment
    teWeight: 0.25,
    queryWeight: 0.50,
    evidenceWeight: 0.15,
    rrWeight: 0.10,
    // bonuses/thresholds
    codeBonus: 0.05,
    headingBonus: 0.04,
    jaccardDedupThreshold: 0.6,
    // HARD gates to prevent off-topic leakage
    allowOffTopic: false,
    minQuerySimForCode: 0.35,
    // keep answers focused on the most aligned heading
    focusTopAlignedHeadings: 1,
    maxSectionsInAnswer: 1,
  });

  // --- TE: Kept -> Summary (grounded influence) ---
  if (IFLOW && kept.length > 0) {
    // Build a compact "kept" signature: average TF-IDF over kept contents
    const keptTokens = kept.map(k => tokenize(k.content || '', (SETTINGS as any).useStem));
    const keptVecs = keptTokens.map(toks => toTfidf(toks, idf, vocabMap, 1.0));
    // Average over kept vectors into one dense projection to keep spaces consistent
    let keptDense = new Float64Array(landmarksIdx.length);
    let cnt = 0;
    for (const v of keptVecs) {
      const d = projectToDense(v, vocabMap.size, landmarkMat, (SETTINGS as any).kernel, (SETTINGS as any).sigma);
      // sanitize non-finite
      for (let i = 0; i < d.length; i++) if (!Number.isFinite(d[i])) d[i] = 0;
      for (let i = 0; i < keptDense.length; i++) keptDense[i] += d[i];
      cnt++;
    }
    if (cnt > 0) for (let i = 0; i < keptDense.length; i++) keptDense[i] /= cnt;

    // Summary signature: project answer text using same pipeline
    const sumTok = tokenize(sum.text || '', (SETTINGS as any).useStem);
    const sumVec = toTfidf(sumTok, idf, vocabMap, 1.0);
    const sumDense = projectToDense(sumVec, vocabMap.size, landmarkMat, (SETTINGS as any).kernel, (SETTINGS as any).sigma);
    for (let i = 0; i < sumDense.length; i++) if (!Number.isFinite(sumDense[i])) sumDense[i] = 0;

    const kd = Array.from(keptDense);
    const sd = Array.from(sumDense);
    if (isFiniteVec(kd) && isFiniteVec(sd)) {
      IFLOW.get('Omega:Kept->Summary').push(kd, sd);
    }
  }

  if (IFLOW) post({ type: 'infoflow', te: IFLOW.snapshot() });

  const alpha = (SETTINGS as any).alpha;
  const lambda = (SETTINGS as any).ridge ?? 0.08;
  const tf = mean(retrievalResult.tfidfScores, finalIdxs);
  const de = mean(retrievalResult.denseScores, finalIdxs);
  const teSnap = IFLOW ? IFLOW.snapshot() : null;
  const teLine = teSnap
    ? ` | TE bits — Q→Score ${fmt(teSnap['Retriever:Q->Score'])}, Feat→Score ${fmt(teSnap['OmegaRR:Feat->Score'])}, Kept→Summary ${fmt(teSnap['Omega:Kept->Summary'])}`
    : '';
  const stats = `α=${alpha.toFixed(2)} σ=${((SETTINGS as any).sigma).toFixed(2)} K=${(SETTINGS as any).kernel} λ=${lambda.toFixed(3)} | tfidf ${tf.toFixed(3)} dense ${de.toFixed(3)} | kept ${kept.length}${teLine}`;
  // Return grounded answer + original retrieved list + debug kept list
  return {
    answer: sum.text,
    items,
    stats,
    kept: kept.map(k => ({
      heading: k.heading,
      p: Number(k.p_relevant.toFixed(3)),
      rr: Number(k.score_rr.toFixed(3))
    }))
  };
}

/* =========================
   Misc helpers (worker-specific)
========================= */

function avg(arr: number[] | Float64Array): number {
  let s = 0; for (let i = 0; i < arr.length; i++) s += arr[i]; return s / Math.max(1, arr.length);
}

function isFiniteVec(v: number[] | Float64Array) {
  if (!v || v.length === 0) return false;
  for (let i = 0; i < v.length; i++) if (!Number.isFinite(v[i])) return false;
  return true;
}

function fmt(x: number | undefined) {
  return Number.isFinite(x as number) ? (x as number).toFixed(4) : '0';
}

function mean(arr: number[], idx: number[]): number {
  if (idx.length === 0) return 0;
  let s = 0; for (const i of idx) s += arr[i]; return s / idx.length;
}

// Production worker: exportModel removed - use dev-worker for model export
// Production worker: importModel is needed for loading pre-trained models
export async function importModel(model: SerializedModel, opts?: { recomputeDense?: boolean }) {
  const imported = importModelUtil(model, {
    ...opts,
    buildDense: (tfidfDocs, vocabSize, landmarkMat, kernel, sigma) => 
      buildDenseDocs(tfidfDocs, vocabSize, landmarkMat, kernel as any, sigma),
  });

  SETTINGS = imported.settings;
  vocabMap = imported.vocabMap;
  idf = imported.idf;
  chunks = imported.chunks;
  tfidfDocs = imported.tfidfDocs;
  landmarksIdx = imported.landmarksIdx;
  landmarkMat = imported.landmarkMat;
  denseDocs = imported.denseDocs;

  // legacy `sections` for UI/debug parity (optional)
  sections = chunks.map(c => ({ heading: c.heading, content: c.content || '' }));

  // Done. You can now call answer(q) immediately—no corpus needed.
}

// All duplicate functions removed - now using extracted modules from '../retrieval' and '../utils'
