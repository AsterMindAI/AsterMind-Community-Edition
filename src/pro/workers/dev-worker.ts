/// <reference path="./worker-types.d.ts" />
// worker.ts — AsterMind KELM Worker with OmegaRR + OmegaSum pipeline
// Retrieval (TF-IDF + Nyström kernels) → Rerank+Filter (OmegaRR) → Grounded Summary (OmegaSum)
//
// - Tree-aware markdown parsing, rich+plain chunk retention, parent backfill
// - Hybrid scoring with ridge-style damping
// - Drop-in reranker (ridge over engineered features) + MMR reducer
// - Constrained summarizer that only uses kept chunk text (with citations)

// License removed - all features are now free!
import { InfoFlowGraph } from '../infoflow/index.js';
import { InfoFlowGraphPWS } from '../infoflow/TransferEntropyPWS.js';
import { TEController, type Knobs } from '../infoflow/TEController.js';
import { rerankAndFilter, type Chunk as RRChunk, type ScoredChunk } from '../reranking/OmegaRR.js';
import { summarizeDeterministic } from '../summarization/OmegaSumDet.js';

import type {
  Settings, UiToWorker, WorkerMsg, Kernel, Section, SerializedModel
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
  buildIndex as buildIndexUtil,
  buildDenseDocs,
  type IndexState 
} from '../retrieval/index-builder.js';
import { 
  hybridRetrieve,
  topKIndices,
  type HybridRetrievalResult 
} from '../retrieval/hybrid-retriever.js';
import { 
  projectToDense,
  toTfidf,
  cosineSparse,
  kernelSim,
  type SparseVec 
} from '../retrieval/vectorization.js';
import { autoTune as autoTuneUtil } from '../utils/autotune.js';
import { exportModel as exportModelUtil, importModel as importModelUtil } from '../utils/model-serialization.js';
import { buildLandmarks } from '../retrieval/index-builder.js';

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

self.addEventListener('message', (e: MessageEvent<UiToWorker>) => {
  // union-safe destructuring
  const msg = e.data as any;
  const action = (msg && msg.action) as string;
  const payload = (msg && msg.payload) ?? {};

  (async () => {
    try {
      // License check - all worker actions require a valid license
      // License check removed
      
      if (action === 'init') {
        SETTINGS = { ...(payload?.settings || {}) } as Settings;
        await loadAndIndex(payload?.chaptersPath || '/chapters.json');
      }
      else if (action === 'reindex') {
        Object.assign(SETTINGS, payload?.settings || {});
        await buildIndex();
      }
      else if (action === 'ask') {
        if (payload?.settings) Object.assign(SETTINGS, payload.settings);
        const res = await answer(payload.q);
        post({ type: 'answer', text: res.answer });
        post({ type: 'results', items: res.items });
        post({ type: 'stats', text: res.stats });
        if (res.kept) post({ type: 'kept', items: res.kept });
      }
      else if (action === 'autotune') {
        await autoTune(payload || {});
      }
      else if (action === 'reset') {
        sections = []; chunks = []; vocabMap.clear(); idf = []; tfidfDocs = []; denseDocs = [];
        post({ type: 'ready' });
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

async function loadAndIndex(chaptersPath: string) {
  const meta = await (await fetch(chaptersPath)).json() as { files: string[] };
  const files = meta.files || [];
  const parsedRoots: SectionNode[] = [];

  if ((SETTINGS as any).enableInfoFlow) {
    const common = {
      window: Math.max(32, (SETTINGS as any).infoFlowWindow ?? 256),
      condLags: Math.max(1, (SETTINGS as any).infoFlowCondLags ?? 1),
      xLags: 1,
      ridge: 1e-6,
      bits: true,
    };
    IFLOW = (SETTINGS as any).infoFlowMode === 'pws'
      ? new InfoFlowGraphPWS({ ...common, usePWS: true, tailQuantile: 0.9, tailBoost: 4, jitterSigma: 0.15, pwsIters: 8 })
      : new InfoFlowGraph(common as any); // Phase-1
  } else {
    IFLOW = null;
  }

  for (const f of files) {
    const raw = await (await fetch('/' + f)).text();
    // Ignore top-level # doc title; start at ## and deeper
    const root = parseMarkdownToSections(raw, { stripCode: (SETTINGS as any).stripCode ?? true, stripLinks: true });
    backfillEmptyParents(root);
    parsedRoots.push(root);
  }

  // Build flat arrays for compatibility & vectorization
  sections = [];
  chunks = [];
  for (const root of parsedRoots) {
    const flat = flattenSections(root);
    chunks.push(...flat);
    for (const c of flat) sections.push({ heading: c.heading, content: c.content });
  }

  await buildIndex();
}

async function buildIndex() {
  // Chunks already exist (tree-aware). Do NOT re-slice from `sections` here.
  const indexState = buildIndexUtil({
    chunks,
    vocab: (SETTINGS as any).vocab,
    landmarks: (SETTINGS as any).landmarks,
    headingW: (SETTINGS as any).headingW,
    useStem: (SETTINGS as any).useStem,
    kernel: (SETTINGS as any).kernel,
    sigma: (SETTINGS as any).sigma,
  });

  vocabMap = indexState.vocabMap;
  idf = indexState.idf;
  tfidfDocs = indexState.tfidfDocs;
  landmarksIdx = indexState.landmarksIdx;
  landmarkMat = indexState.landmarkMat;
  denseDocs = indexState.denseDocs;

  post({ type: 'indexed', docs: chunks.length, stats: `${chunks.length} chunks • vocab ${vocabMap.size} • L=${(SETTINGS as any).landmarks}` });
}

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
   Auto-Tune
========================= */

async function autoTune(payload: Partial<Settings> & { budget?: number; sampleQueries?: number; }) {
  const result = await autoTuneUtil({
    chunks: chunks.map(c => ({ heading: c.heading, content: c.content })),
    vocabMap,
    idf,
    tfidfDocs,
    vocabSize: vocabMap.size,
    budget: payload.budget,
    sampleQueries: payload.sampleQueries,
    currentSettings: SETTINGS as any,
  }, (trial, best, note) => {
    post({ type: 'autotune/progress', trial, best, note });
  });

  Object.assign(SETTINGS as any, result.bestSettings);
  const { landmarksIdx: newLandmarksIdx, landmarkMat: newLandmarkMat } = buildLandmarks(tfidfDocs, vocabMap.size, (SETTINGS as any).landmarks);
  landmarksIdx = newLandmarksIdx;
  landmarkMat = newLandmarkMat;
  denseDocs = buildDenseDocs(tfidfDocs, vocabMap.size, landmarkMat, (SETTINGS as any).kernel, (SETTINGS as any).sigma);
  post({ type: 'autotune/done', best: SETTINGS, score: result.bestScore });
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
export async function exportModel(opts?: { includeRich?: boolean; includeDense?: boolean; }): Promise<SerializedModel> {
  return exportModelUtil({
    settings: SETTINGS,
    vocabMap,
    idf,
    chunks,
    tfidfDocs,
    landmarksIdx,
    landmarkMat,
    denseDocs,
    includeRich: opts?.includeRich,
    includeDense: opts?.includeDense,
  });
}

export function downloadModelJSON(model: SerializedModel, filename = 'astermind-elm.model.json') {
  const blob = new Blob([JSON.stringify(model)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  (postMessage as any)({ type: 'download/url', url, filename }); // your UI can catch this and create an <a download>
}

// Only if you call from Node context, not the worker
export async function saveModelToFs(model: SerializedModel, path: string) {
  const fs = await import('node:fs/promises');
  await fs.writeFile(path, JSON.stringify(model));
}

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
