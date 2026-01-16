// OmegaRR.ts
// Reranker + Reducer for AsterMind docs
// - Extracts rich query–chunk features (sparse text + structural signals)
// - Trains a tiny ridge model on-the-fly with weak supervision (per query)
// - Produces score_rr and p_relevant
// - Filters with threshold + MMR coverage under a character budget
// - (v2) Optionally exposes engineered features (values + names) for TE/diagnostics

// License removed - all features are now free!

/* ========================== Types ========================== */

export type Chunk = {
    heading: string;
    content: string;
    rich?: string;
    level?: number;
    secId?: number;
    score_base?: number; // optional prior from baseline retriever
};

export type ScoredChunk = Chunk & {
    score_rr: number;
    p_relevant: number;
    /** Engineered feature vector used by the ridge reranker (if exposeFeatures=true) */
    _features?: number[];
    /** Names for _features; same array for all rows (if attachFeatureNames=true) */
    _feature_names?: string[];
};

export type RerankOptions = {
    lambdaRidge?: number;        // L2 strength
    useMMR?: boolean;
    mmrLambda?: number;          // tradeoff relevance vs novelty
    probThresh?: number;         // keep only if p>=probThresh
    epsilonTop?: number;         // keep near-top band: max-ε
    budgetChars?: number;        // character budget for final filtered set
    randomProjDim?: number;      // extra projected dims from tfidf (dense hint)

    /** NEW: attach _features to outputs (default true) */
    exposeFeatures?: boolean;
    /** NEW: also attach _feature_names (default false) */
    attachFeatureNames?: boolean;
};

/* ====================== Tokenization ======================= */

const STOP = new Set([
    "a", "an", "the", "and", "or", "but", "if", "then", "else", "for", "to", "of", "in", "on", "at", "by", "with",
    "is", "are", "was", "were", "be", "been", "being", "as", "from", "that", "this", "it", "its", "you", "your",
    "i", "we", "they", "he", "she", "them", "his", "her", "our", "us", "do", "does", "did", "done", "not", "no",
    "yes", "can", "could", "should", "would", "may", "might", "into", "about", "over", "under", "between"
]);

function tokenize(s: string): string[] {
    return s
        .toLowerCase()
        .replace(/[`*_#>~=\[\]{}()!?.:,;'"<>|/\\+-]+/g, " ")
        .split(/\s+/)
        .filter(t => t && !STOP.has(t));
}

function unique<T>(arr: T[]): T[] { return Array.from(new Set(arr)); }

/* ====================== TF-IDF & BM25 ====================== */

type SparseVec = Map<number, number>;

type CorpusStats = {
    vocab: Map<string, number>;   // term -> id
    idf: number[];                // id -> idf
    avgLen: number;               // avg doc length (in tokens)
    df: number[];                 // doc freq
};

function buildCorpusStats(docs: string[]): { stats: CorpusStats, tf: SparseVec[], docLens: number[] } {
    const vocab = new Map<string, number>();
    const tfs: SparseVec[] = [];
    const docLens: number[] = [];
    let nextId = 0;

    for (const d of docs) {
        const toks = tokenize(d);
        docLens.push(toks.length);
        const tf = new Map<number, number>();
        for (const w of toks) {
            let id = vocab.get(w);
            if (id === undefined) { id = nextId++; vocab.set(w, id); }
            tf.set(id, (tf.get(id) || 0) + 1);
        }
        tfs.push(tf);
    }

    const N = docs.length;
    const df = Array(nextId).fill(0);
    for (const tf of tfs) for (const id of tf.keys()) df[id] += 1;

    const idf = df.map(df_i => Math.log((N + 1) / (df_i + 1)) + 1);
    const avgLen = docLens.reduce((a, b) => a + b, 0) / Math.max(1, N);

    return { stats: { vocab, idf, avgLen, df }, tf: tfs, docLens };
}

function tfidfVector(tf: SparseVec, idf: number[]): SparseVec {
    const out = new Map<number, number>();
    let norm2 = 0;
    for (const [i, f] of tf) {
        const val = (f) * (idf[i] || 0);
        out.set(i, val);
        norm2 += val * val;
    }
    const norm = Math.sqrt(norm2) || 1e-12;
    for (const [i, v] of out) out.set(i, v / norm);
    return out;
}

function cosine(a: SparseVec, b: SparseVec): number {
    const [small, large] = a.size < b.size ? [a, b] : [b, a];
    let dot = 0;
    for (const [i, v] of small) {
        const u = large.get(i);
        if (u !== undefined) dot += v * u;
    }
    return dot;
}

function bm25Score(qTf: SparseVec, dTf: SparseVec, stats: CorpusStats, dLen: number, k1 = 1.5, b = 0.75): number {
    let score = 0;
    for (const [i] of qTf) {
        const f = dTf.get(i) || 0;
        if (f <= 0) continue;
        const idf = Math.log(((stats.df[i] || 0) + 0.5) / ((stats.idf.length - (stats.df[i] || 0)) + 0.5) + 1);
        const denom = f + k1 * (1 - b + b * (dLen / (stats.avgLen || 1)));
        score += idf * ((f * (k1 + 1)) / (denom || 1e-12));
    }
    return score;
}

/* ========== Light Random Projection from TF-IDF (dense hint) ========== */

function projectSparse(vec: SparseVec, dim: number, seed = 1337): Float64Array {
    // deterministic per (feature, j) hash: simple LCG/xorshift mix
    const out = new Float64Array(dim);
    for (const [i, v] of vec) {
        let s = (i * 2654435761) >>> 0;
        for (let j = 0; j < dim; j++) {
            s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
            const r = ((s >>> 0) / 4294967296) * 2 - 1; // [-1,1]
            out[j] += v * r;
        }
    }
    let n2 = 0; for (let j = 0; j < dim; j++) n2 += out[j] * out[j];
    const n = Math.sqrt(n2) || 1e-12;
    for (let j = 0; j < dim; j++) out[j] /= n;
    return out;
}

/* ===================== Structural Signals ===================== */

function containsGoCodeBlock(s: string): boolean {
    return /```+\s*go([\s\S]*?)```/i.test(s) || /\bfunc\s+\w+\s*\(.*\)\s*\w*\s*{/.test(s);
}
function containsCodeBlock(s: string): boolean {
    return /```+/.test(s) || /{[^}]*}/.test(s);
}
function headingQueryMatch(head: string, q: string): number {
    const ht = unique(tokenize(head));
    const qt = new Set(tokenize(q));
    if (ht.length === 0 || qt.size === 0) return 0;
    let hit = 0; for (const t of ht) if (qt.has(t)) hit++;
    return hit / ht.length;
}
function jaccard(a: string, b: string): number {
    const A = new Set(tokenize(a));
    const B = new Set(tokenize(b));
    let inter = 0; for (const t of A) if (B.has(t)) inter++;
    const uni = A.size + B.size - inter;
    return uni === 0 ? 0 : inter / uni;
}
function golangSpecFlag(s: string): number {
    return /(golang\.org|go\.dev|pkg\.go\.dev)/i.test(s) ? 1 : 0;
}

/* ===================== Feature Extraction ===================== */

type FeaturePack = { names: string[]; values: number[]; };

function buildFeatures(
    q: string,
    chunk: Chunk,
    qTfIdf: SparseVec,
    cTfIdf: SparseVec,
    qTfRaw: SparseVec,
    cTfRaw: SparseVec,
    stats: CorpusStats,
    cLen: number,
    projQ?: Float64Array,
    projC?: Float64Array
): FeaturePack {
    const f: number[] = [];
    const names: string[] = [];

    // 1) Sparse sims
    const cos = cosine(qTfIdf, cTfIdf);
    f.push(cos); names.push("cosine_tfidf");

    const bm25 = bm25Score(qTfRaw, cTfRaw, stats, cLen);
    f.push(bm25); names.push("bm25");

    // 2) Heading & lexical overlaps
    const hMatch = headingQueryMatch(chunk.heading || "", q);
    f.push(hMatch); names.push("heading_match_frac");

    const jac = jaccard(q, chunk.content || "");
    f.push(jac); names.push("jaccard_tokens");

    // 3) Structural flags
    const hasGo = containsGoCodeBlock(chunk.rich || chunk.content || "");
    const hasCode = containsCodeBlock(chunk.rich || chunk.content || "");
    f.push(hasGo ? 1 : 0); names.push("flag_go_code");
    f.push(hasCode ? 1 : 0); names.push("flag_any_code");

    // 4) Source cues
    f.push(golangSpecFlag(chunk.content || "") ? 1 : 0); names.push("flag_go_spec_link");

    // 5) Prior score (baseline)
    f.push((chunk.score_base ?? 0)); names.push("prior_score_base");

    // 6) Length heuristics (prefer concise answers)
    const lenChars = (chunk.content || "").length;
    f.push(1 / Math.sqrt(1 + lenChars)); names.push("len_inv_sqrt");

    // 7) Dense hint from projection
    if (projQ && projC) {
        let dot = 0, l1 = 0;
        for (let i = 0; i < projQ.length; i++) {
            dot += projQ[i] * projC[i];
            l1 += Math.abs(projQ[i] - projC[i]);
        }
        f.push(dot); names.push("proj_dot");
        f.push(l1 / projQ.length); names.push("proj_l1mean");
    }

    return { names, values: f };
}

/* ======================== Ridge Model ======================== */

class Ridge {
    private w: Float64Array | null = null;
    private mu: Float64Array | null = null;
    private sigma: Float64Array | null = null;

    fit(X: number[][], y: number[], lambda = 1e-2) {
        const n = X.length;
        const d = X[0]?.length || 0;
        if (n === 0 || d === 0) { this.w = new Float64Array(d); return; }

        // standardize
        const mu = new Float64Array(d);
        const sig = new Float64Array(d);
        for (let j = 0; j < d; j++) {
            let m = 0; for (let i = 0; i < n; i++) m += X[i][j];
            m /= n; mu[j] = m;
            let v = 0; for (let i = 0; i < n; i++) { const z = X[i][j] - m; v += z * z; }
            sig[j] = Math.sqrt(v / n) || 1;
        }

        const Z = Array.from({ length: n }, (_, i) => new Float64Array(d));
        for (let i = 0; i < n; i++) for (let j = 0; j < d; j++) Z[i][j] = (X[i][j] - mu[j]) / sig[j];

        // A = Z^T Z + λI, Zy = Z^T y
        const A = Array.from({ length: d }, () => new Float64Array(d));
        const Zy = new Float64Array(d);
        for (let i = 0; i < n; i++) {
            const zi = Z[i];
            const yi = y[i];
            for (let j = 0; j < d; j++) {
                Zy[j] += zi[j] * yi;
                const zij = zi[j];
                for (let k = 0; k <= j; k++) A[j][k] += zij * zi[k];
            }
        }
        for (let j = 0; j < d; j++) { for (let k = 0; k < j; k++) A[k][j] = A[j][k]; A[j][j] += lambda; }

        // Cholesky solve
        const L = Array.from({ length: d }, () => new Float64Array(d));
        for (let i = 0; i < d; i++) {
            for (let j = 0; j <= i; j++) {
                let sum = A[i][j];
                for (let k = 0; k < j; k++) sum -= L[i][k] * L[j][k];
                L[i][j] = (i === j) ? Math.sqrt(Math.max(sum, 1e-12)) : (sum / (L[j][j] || 1e-12));
            }
        }
        const z = new Float64Array(d);
        for (let i = 0; i < d; i++) {
            let s = Zy[i];
            for (let k = 0; k < i; k++) s -= L[i][k] * z[k];
            z[i] = s / (L[i][i] || 1e-12);
        }
        const w = new Float64Array(d);
        for (let i = d - 1; i >= 0; i--) {
            let s = z[i];
            for (let k = i + 1; k < d; k++) s -= L[k][i] * w[k];
            w[i] = s / (L[i][i] || 1e-12);
        }

        this.w = w; this.mu = mu; this.sigma = sig;
    }

    predict(x: number[]): number {
        if (!this.w || !this.mu || !this.sigma) return 0;
        let s = 0;
        for (let j = 0; j < this.w.length; j++) {
            const z = (x[j] - this.mu[j]) / this.sigma[j];
            s += this.w[j] * z;
        }
        return s;
    }
}

/* ===================== Weak Supervision ===================== */

function generateWeakLabel(q: string, chunk: Chunk, feats: FeaturePack): number {
    const txt = (chunk.rich || chunk.content || "");
    let y = 0;

    const qIsGoFunc =
        /\bgo\b/.test(q.toLowerCase()) && /(define|declare|function|func)/i.test(q);
    if (qIsGoFunc && containsGoCodeBlock(txt)) y = Math.max(y, 1.0);

    const headHit = headingQueryMatch(chunk.heading || "", q);
    if (headHit >= 0.34 && containsCodeBlock(txt)) y = Math.max(y, 0.8);

    const cosIdx = feats.names.indexOf("cosine_tfidf");
    const bm25Idx = feats.names.indexOf("bm25");
    const cos = cosIdx >= 0 ? feats.values[cosIdx] : 0;
    const bm = bm25Idx >= 0 ? feats.values[bm25Idx] : 0;
    if (cos > 0.25) y = Math.max(y, 0.6);
    if (bm > 1.0) y = Math.max(y, 0.6);

    const priorIdx = feats.names.indexOf("prior_score_base");
    const prior = priorIdx >= 0 ? feats.values[priorIdx] : 0;
    if ((chunk.score_base ?? 0) > 0) y = Math.max(y, Math.min(0.6, 0.2 + 0.5 * prior));

    return y;
}

function sigmoid(x: number): number {
    if (x >= 0) { const z = Math.exp(-x); return 1 / (1 + z); }
    else { const z = Math.exp(x); return z / (1 + z); }
}

/* ========================= MMR Filter ========================= */

function mmrFilter(
    scored: ScoredChunk[],
    lambda = 0.7,
    budgetChars = 1200
): ScoredChunk[] {
    const sel: ScoredChunk[] = [];
    const docs = scored.map(s => s.content || "");
    const { stats, tf: tfList } = buildCorpusStats(docs);
    const tfidf = tfList.map(tf => tfidfVector(tf, stats.idf));
    const selectedIdx = new Set<number>();
    let used = 0;

    while (selectedIdx.size < scored.length) {
        let bestIdx = -1, bestVal = -Infinity;

        for (let i = 0; i < scored.length; i++) {
            if (selectedIdx.has(i)) continue;
            const cand = scored[i];
            let red = 0;
            for (const j of selectedIdx) {
                const sim = cosine(tfidf[i], tfidf[j]);
                if (sim > red) red = sim;
            }
            const val = lambda * cand.score_rr - (1 - lambda) * red;
            if (val > bestVal) { bestVal = val; bestIdx = i; }
        }
        if (bestIdx < 0) break;

        const chosen = scored[bestIdx];
        const addLen = (chosen.content || "").length;
        if (used + addLen > budgetChars && sel.length > 0) break;

        sel.push(chosen);
        used += addLen;
        selectedIdx.add(bestIdx);
    }
    return sel;
}

/* ========================= Public API ========================= */

/** Train per-query ridge model and score chunks. */
export function rerank(
    query: string,
    chunks: Chunk[],
    opts: RerankOptions = {}
): ScoredChunk[] {
    // License check removed // Premium feature - requires valid license
    const {
        lambdaRidge = 1e-2,
        randomProjDim = 32,
        exposeFeatures = true,
        attachFeatureNames = false,
    } = opts;

    const docs = [query, ...chunks.map(c => c.content || "")];
    const { stats, tf: tfRaw, docLens } = buildCorpusStats(docs);
    const tfidfAll = tfRaw.map(tf => tfidfVector(tf, stats.idf));

    const qTfRaw = tfRaw[0];
    const qTfIdf = tfidfAll[0];
    const projQ = randomProjDim > 0 ? projectSparse(qTfIdf, randomProjDim) : undefined;

    const X: number[][] = [];
    const y: number[] = [];
    const featPacks: FeaturePack[] = [];

    for (let i = 0; i < chunks.length; i++) {
        const c = chunks[i];
        const cTfRaw = tfRaw[i + 1];
        const cTfIdf = tfidfAll[i + 1];
        const projC = randomProjDim > 0 ? projectSparse(cTfIdf, randomProjDim, 1337 + i) : undefined;

        const feats = buildFeatures(
            query, c,
            qTfIdf, cTfIdf,
            qTfRaw, cTfRaw,
            stats, docLens[i + 1] || 1,
            projQ, projC
        );
        featPacks.push(feats);
        X.push(feats.values);

        const label = generateWeakLabel(query, c, feats);
        y.push(label);
    }

    const allSame = y.every(v => Math.abs(v - y[0]) < 1e-9);
    if (allSame) {
        const cosIdx = featPacks[0].names.indexOf("cosine_tfidf");
        if (cosIdx >= 0) {
            for (let i = 0; i < y.length; i++) y[i] = Math.max(0, Math.min(1, 0.2 + 0.6 * X[i][cosIdx]));
        }
    }

    const rr = new Ridge();
    rr.fit(X, y, lambdaRidge);

    let minS = Infinity, maxS = -Infinity;
    const rawScores = X.map(x => rr.predict(x));
    for (const s of rawScores) { if (s < minS) minS = s; if (s > maxS) maxS = s; }
    const range = Math.max(1e-9, maxS - minS);

    const featureNames = attachFeatureNames ? featPacks[0]?.names ?? [] : undefined;

    const scored: ScoredChunk[] = chunks.map((c, i) => {
        const s01 = (rawScores[i] - minS) / range;
        const p = sigmoid((rawScores[i] - 0.5 * (minS + maxS)) / (0.2 * range + 1e-6));
        const base: ScoredChunk = {
            ...c,
            score_rr: s01,
            p_relevant: p,
        };
        if (exposeFeatures) (base as any)._features = X[i];
        if (featureNames) (base as any)._feature_names = featureNames;
        return base;
    });

    scored.sort((a, b) => b.score_rr - a.score_rr);
    return scored;
}

/** Filter scored chunks using probability/near-top thresholds and MMR coverage. */
export function filterMMR(
    scored: ScoredChunk[],
    opts: RerankOptions = {}
): ScoredChunk[] {
    // License check removed // Premium feature - requires valid license
    const {
        probThresh = 0.45,
        epsilonTop = 0.05,
        useMMR = true,
        mmrLambda = 0.7,
        budgetChars = 1200
    } = opts;

    if (scored.length === 0) return [];

    const top = scored[0].score_rr;
    const bandKept = scored.filter(s => s.p_relevant >= probThresh && s.score_rr >= (top - epsilonTop));
    const seed = bandKept.length > 0 ? bandKept : [scored[0]];

    if (!useMMR) {
        const out: ScoredChunk[] = [];
        let used = 0;
        for (const s of seed) {
            const add = (s.content || "").length;
            if (used + add > budgetChars && out.length > 0) break;
            out.push(s);
            used += add;
        }
        return out;
    }

    const boosted = scored.map(s => ({
        ...s,
        score_rr: seed.includes(s as any) ? s.score_rr + 0.01 : s.score_rr
    }));

    return mmrFilter(boosted, mmrLambda, budgetChars);
}

/** Convenience: run rerank then filter. */
export function rerankAndFilter(
    query: string,
    chunks: Chunk[],
    opts: RerankOptions = {}
): ScoredChunk[] {
    // License check removed // Premium feature - requires valid license
    const scored = rerank(query, chunks, opts);
    return filterMMR(scored, opts);
}

/* ========================= Debug Utilities ========================= */

export function explainFeatures(
    query: string,
    chunks: Chunk[],
    opts: { randomProjDim?: number } = {}
): { names: string[], rows: { heading: string, features: number[] }[] } {
    const rpd = opts.randomProjDim ?? 32;
    const docs = [query, ...chunks.map(c => c.content || "")];
    const { stats, tf: tfRaw } = buildCorpusStats(docs);
    const tfidfAll = tfRaw.map(tf => tfidfVector(tf, stats.idf));
    const projQ = rpd > 0 ? projectSparse(tfidfAll[0], rpd) : undefined;

    const namesRef: string[] = [];
    const rows: { heading: string, features: number[] }[] = [];
    for (let i = 0; i < chunks.length; i++) {
        const feats = buildFeatures(
            query, chunks[i], tfidfAll[0], tfidfAll[i + 1], tfRaw[0], tfRaw[i + 1], stats, 1,
            projQ, rpd > 0 ? projectSparse(tfidfAll[i + 1], rpd, 1337 + i) : undefined
        );
        if (namesRef.length === 0) namesRef.push(...feats.names);
        rows.push({ heading: chunks[i].heading, features: feats.values });
    }
    return { names: namesRef, rows };
}
