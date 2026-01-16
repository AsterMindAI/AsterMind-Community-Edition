// Model serialization utilities
// Extracted from workers for reuse

// License removed - all features are now free!
import type { SerializedModel } from '../types.js';
import type { SparseVec } from '../retrieval/vectorization.js';

export interface ChunkData {
  heading: string;
  content: string;
  rich?: string;
  level?: number;
  secId?: number;
}

export interface ExportModelOptions {
  settings: any;
  vocabMap: Map<string, number>;
  idf: number[];
  chunks: ChunkData[];
  tfidfDocs: SparseVec[];
  landmarksIdx: number[];
  landmarkMat: Float64Array[];
  denseDocs?: Float64Array[];
  includeRich?: boolean;
  includeDense?: boolean;
}

/**
 * Small, deterministic hash (not cryptographic)
 */
export function quickHash(s: string): string {
  let h1 = 0x9e3779b1, h2 = 0x85ebca6b;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x85ebca6b);
    h2 = Math.imul(h2 ^ c, 0xc2b2ae35);
  }
  h1 = (h1 ^ (h2 >>> 15)) >>> 0;
  return ('00000000' + h1.toString(16)).slice(-8);
}

/**
 * Export model to serialized format
 */
export function exportModel(opts: ExportModelOptions): SerializedModel {
  // License check removed // Premium feature - requires valid license
  const {
    settings,
    vocabMap,
    idf,
    chunks,
    tfidfDocs,
    landmarksIdx,
    landmarkMat,
    denseDocs,
    includeRich = true,
    includeDense = false,
  } = opts;

  // 1) settings snapshot (clone to avoid accidental mutation)
  const settingsSnap = JSON.parse(JSON.stringify(settings || {}));

  // 2) vocab
  const vocab: [string, number][] = Array.from(vocabMap.entries());

  // 3) chunks (minimal text)
  const chunksSnap = chunks.map(c => ({
    heading: c.heading,
    content: c.content || '',
    rich: includeRich ? (c.rich || undefined) : undefined,
    level: c.level,
    secId: c.secId,
  }));

  // 4) tfidfDocs → array of pairs
  const tfidfPairs: Array<Array<[number, number]>> = tfidfDocs.map((m) => {
    const row: Array<[number, number]> = [];
    for (const [i, v] of m) row.push([i, v]);
    // sort indices for determinism
    row.sort((a, b) => a[0] - b[0]);
    return row;
  });

  // 5) Nyström landmarks and (optional) denseDocs
  const landmarkMatArr: number[][] = landmarkMat.map(v => Array.from(v));
  const denseDocsArr: number[][] | undefined = includeDense ? 
    (denseDocs?.map(v => Array.from(v)) || undefined) : undefined;

  const payload: SerializedModel = {
    version: 'astermind-pro-v1',
    savedAt: new Date().toISOString(),
    settings: settingsSnap,
    vocab,
    idf: Array.from(idf),
    chunks: chunksSnap,
    tfidfDocs: tfidfPairs,
    landmarksIdx: Array.from(landmarksIdx),
    landmarkMat: landmarkMatArr,
    denseDocs: denseDocsArr,
  };

  // (Optional) quick content hash for sanity (small & deterministic)
  payload.hash = quickHash(JSON.stringify({
    idf: payload.idf.slice(0, 64),
    vi: payload.vocab.length,
    ci: payload.chunks.length,
    lm: payload.landmarksIdx.length
  }));

  return payload;
}

/**
 * Import model from serialized format
 */
export interface ImportedModelState {
  settings: any;
  vocabMap: Map<string, number>;
  idf: number[];
  chunks: ChunkData[];
  tfidfDocs: SparseVec[];
  landmarksIdx: number[];
  landmarkMat: Float64Array[];
  denseDocs: Float64Array[];
}

export function importModel(
  model: SerializedModel,
  opts?: { recomputeDense?: boolean; buildDense?: (tfidfDocs: SparseVec[], vocabSize: number, landmarkMat: Float64Array[], kernel: string, sigma: number) => Float64Array[] }
): ImportedModelState {
  // License check removed // Premium feature - requires valid license
  if (model.version !== 'astermind-pro-v1' && model.version !== 'astermind-elm-v1') {
    throw new Error(`Unsupported model version: ${model.version}. Expected 'astermind-pro-v1' or 'astermind-elm-v1'`);
  }

  // 1) restore settings
  const settings = JSON.parse(JSON.stringify(model.settings || {}));

  // 2) vocab & idf
  const vocabMap = new Map(model.vocab);
  const idf = Float64Array.from(model.idf) as unknown as number[]; // keep as number[] for compatibility

  // 3) chunks
  const chunks = model.chunks.map(c => ({
    heading: c.heading,
    content: c.content || '',
    rich: c.rich,
    level: c.level,
    secId: c.secId
  }));

  // 4) tfidfDocs from pairs
  const tfidfDocs = model.tfidfDocs.map(row => {
    const m: SparseVec = new Map<number, number>();
    for (const [i, v] of row) m.set(i, v);
    return m;
  });

  // 5) Nyström landmarks
  const landmarksIdx = Array.from(model.landmarksIdx);
  const landmarkMat = model.landmarkMat.map(a => Float64Array.from(a));

  // 6) denseDocs: use stored or recompute
  const needRecompute = (opts?.recomputeDense === true) || !model.denseDocs || model.denseDocs.length !== tfidfDocs.length;
  let denseDocs: Float64Array[];
  if (needRecompute && opts?.buildDense) {
    denseDocs = opts.buildDense(
      tfidfDocs,
      vocabMap.size,
      landmarkMat,
      settings.kernel || 'rbf',
      settings.sigma || 1.0
    );
  } else if (needRecompute) {
    throw new Error('recomputeDense=true but buildDense function not provided');
  } else {
    denseDocs = model.denseDocs!.map(a => Float64Array.from(a));
  }

  return {
    settings,
    vocabMap,
    idf,
    chunks,
    tfidfDocs,
    landmarksIdx,
    landmarkMat,
    denseDocs,
  };
}


