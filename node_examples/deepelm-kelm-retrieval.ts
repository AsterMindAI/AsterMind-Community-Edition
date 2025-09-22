/**
 * BEST Two-Stage Retrieval Experiment: DeepELM (Answer Space) + KELM (Query→Embedding)
 *
 * This script demonstrates a stronger retrieval pipeline that leverages:
 *  1) DeepELM to learn a structured embedding space for ANSWERS (targets).
 *  2) Kernel ELM (KELM, Nyström + whitening) to regress from QUERIES into that answer space.
 *
 * Steps:
 *  1. Define a small set of Q/A pairs (here: Go programming examples).
 *  2. Encode queries (X) and targets (Y) using UniversalEncoder (char-level).
 *  3. Train DeepELM as a stack of autoencoders on Y (unsupervised: Y→Y) to get E_targets = φ_deep(Y).
 *  4. Train KELM (task='regression') to map queries into that space: f_kelm(X) ≈ E_targets.
 *  5. At inference, embed a new query with KELM into the DeepELM answer space and
 *     retrieve nearest answers by cosine similarity via EmbeddingStore.
 *
 * Why this is better:
 *  - DeepELM builds a richer answer representation before we ever map queries.
 *  - KELM (with Nyström + whitening) is sample-efficient and stabilizes cosine geometry.
 *
 * Minimal CLI flags (no deps):
 *   --topK=3              Top-K retrieval
 *   --m=256               Nyström landmarks
 *   --whiten=true         Apply whitening to Nyström features
 *   --ridge=0.01          Ridge regularization for KELM
 *   --gamma=auto          RBF gamma (auto uses median heuristic on X)
 *   --mode=nystrom        'nystrom' | 'exact'
 *   --saveEmb=emb.json    Optional: export target embeddings (E_targets)
 *   --saveKELM=kelm.json  Optional: export trained KELM snapshot
 *
 * Usage:
 *   npx ts-node --esm node_examples/deepelm-kelm-retrieval.ts
 *   npx ts-node --esm node_examples/deepelm-kelm-retrieval.ts --topK=5 --m=512 --whiten=true --ridge=0.02
 */

import {
    UniversalEncoder,
    KernelELM,
    DeepELM,
    EmbeddingStore,
} from "@astermind/astermind-elm";
import * as fs from "fs";

// ---------- tiny flag parser (no deps) ----------
type Flags = Record<string, string | boolean>;
function parseFlags(argv: string[]): Flags {
    const out: Flags = {};
    for (const a of argv.slice(2)) {
        if (!a.startsWith("--")) continue;
        const [k, v] = a.slice(2).split("=");
        out[k] = v === undefined ? true : (v as string);
    }
    return out;
}
const flags = parseFlags(process.argv);

const TOP_K = Number(flags.topK ?? 3);
const M = Number(flags.m ?? 256); // Nyström landmarks
const WHITEN = String(flags.whiten ?? "true") === "true";
const RIDGE = Number(flags.ridge ?? 1e-2);
const MODE = String(flags.mode ?? "nystrom") as "nystrom" | "exact";
const SAVE_EMB = typeof flags.saveEmb === "string" ? String(flags.saveEmb) : "";
const SAVE_KELM = typeof flags.saveKELM === "string" ? String(flags.saveKELM) : "";
const MAXLEN = Number((flags as any).maxLen ?? 100);

// ---------- utils ----------
const l2 = (v: number[]) => {
    const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    return n === 0 ? v : v.map((x) => x / n);
};

// Median heuristic for RBF gamma on X (uses random pair sampling)
function medianGamma(X: number[][], maxPairs = 2000): number {
    const N = X.length;
    if (N < 2) return 0.5; // fallback
    const idx = (n: number) => Math.floor(Math.random() * n);
    const vals: number[] = [];
    const pairs = Math.min(maxPairs, (N * (N - 1)) / 2);
    for (let k = 0; k < pairs; k++) {
        const i = idx(N), j = idx(N);
        if (i === j) continue;
        let d2 = 0;
        const xi = X[i], xj = X[j];
        for (let t = 0; t < xi.length; t++) {
            const diff = xi[t] - xj[t];
            d2 += diff * diff;
        }
        vals.push(d2);
    }
    if (!vals.length) return 0.5;
    vals.sort((a, b) => a - b);
    const med = vals[Math.floor(vals.length / 2)];
    if (med <= 1e-12) return 0.5;
    // RBF: k(x,x') = exp(-gamma * ||x-x'||^2)
    return 1 / (2 * med);
}

// KernelELM forward (regression logits ≈ predicted embedding)
function kelmPredict(model: any, X: number[][]): number[][] {
    const emb = model.getEmbedding(X); // (N x m)
    const snap = model.toJSON();
    const W: number[][] = snap.W; // (m x D_out)
    const N = emb.length, m = emb[0].length, D = W[0].length;
    const out = Array.from({ length: N }, () => Array(D).fill(0));
    for (let i = 0; i < N; i++) {
        const ei = emb[i];
        for (let k = 0; k < m; k++) {
            const eik = ei[k];
            const Wk = W[k];
            for (let j = 0; j < D; j++) out[i][j] += eik * Wk[j];
        }
    }
    return out;
}

// ---------- demo dataset ----------
const pairs: Array<{ id: string; query: string; target: string; tag?: string }> = [
    {
        id: "go-map",
        query: "How do you declare a map in Go?",
        target: "You declare a map with the syntax: var m map[keyType]valueType",
        tag: "go",
    },
    {
        id: "go-slice",
        query: "How do you create a slice?",
        target: "Slices are created using []type{}, for example: s := []int{1,2,3}",
        tag: "go",
    },
    {
        id: "go-for",
        query: "How do you write a for loop?",
        target: "The for loop in Go looks like: for i := 0; i < n; i++ { ... }",
        tag: "go",
    },
];

// ---------- encode ----------
const encoder = new UniversalEncoder({
    maxLen: MAXLEN,
    mode: "char",
    useTokenizer: false,
});

const X = pairs.map((p) => encoder.normalize(encoder.encode(p.query)));
const Y = pairs.map((p) => encoder.normalize(encoder.encode(p.target)));

console.log(`⚙️ DeepELM pretraining on answers (Y) ...`);

// ---------- DeepELM on ANSWERS (unsupervised Y→Y) ----------
const deep = new DeepELM({
    layers: [
        { hiddenUnits: 256, activation: "gelu", ridgeLambda: 1e-2, dropout: 0.05 },
        { hiddenUnits: 128, activation: "relu", ridgeLambda: 1e-2, dropout: 0.05 },
    ],
    // linear classifier head disabled; we only need last-layer features for retrieval
    clfHiddenUnits: 0,
    clfActivation: "linear",
    clfWeightInit: "xavier",
    normalizeEach: false,
    normalizeFinal: true,
} as any);

// Unsupervised autoencoders produce a refined embedding space for answers
const t0 = Date.now();
deep.fitAutoencoders(Y);
const deepMs = Date.now() - t0;
console.log(`✅ DeepELM autoencoders trained in ${(deepMs / 1000).toFixed(3)}s`);

// Last-layer features for answers
const E_targets_raw = deep.transform(Y) as number[][];
const E_targets = E_targets_raw.map(l2);

// Optional: export answer embeddings for inspection
if (SAVE_EMB) {
    fs.writeFileSync(
        SAVE_EMB,
        JSON.stringify(
            pairs.map((p, i) => ({
                id: p.id,
                vec: Array.from(E_targets[i]),
                meta: { text: p.target, tag: p.tag ?? "go" },
            })),
            null,
            2
        ),
        "utf-8"
    );
    console.log(`💾 Saved answer embeddings → ${SAVE_EMB}`);
}

// ---------- KELM regression X → E_targets ----------
const outDim = E_targets[0].length;
const autoGamma = medianGamma(X);
const gamma = String(flags.gamma ?? "auto") === "auto" ? autoGamma : Number(flags.gamma);

const N = X.length;
const wantNystrom = MODE === "nystrom";
const mEff = wantNystrom ? Math.max(1, Math.min(M, N)) : 0;
// If we barely have data, exact kernel is safer.
const modeEff: "nystrom" | "exact" = wantNystrom && N >= 2 ? "nystrom" : "exact";

if (wantNystrom && M !== mEff) {
    console.log(`ℹ️ Clamping Nyström landmarks m from ${M} → ${mEff} (N=${N}).`);
}
if (modeEff !== MODE) {
    console.log(`ℹ️ Switching mode from '${MODE}' → '${modeEff}' due to small N=${N}.`);
}

console.log(
    `⚙️ Training KELM (task=regression, mode=${modeEff}${modeEff === "nystrom" ? `, m=${mEff}, whiten=${WHITEN}` : ""
    }, ridge=${RIDGE}, gamma=${gamma.toFixed(6)}) ...`
);

const kelm = new KernelELM({
    outputDim: outDim,
    task: "regression",
    ridgeLambda: RIDGE,
    mode: modeEff,
    ...(modeEff === "nystrom" ? { nystrom: { m: mEff, whiten: WHITEN } } : {}),
    kernel: { type: "rbf", gamma },
});

const t1 = Date.now();
kelm.fit(X, E_targets);
const kelmMs = Date.now() - t1;
console.log(`✅ KELM trained in ${(kelmMs / 1000).toFixed(3)}s`);

// ---------- Retrieval store on E_targets ----------
const store = new EmbeddingStore(outDim, { storeUnit: true, alsoStoreRaw: false });
pairs.forEach((p, i) =>
    store.add({ id: p.id, vec: E_targets[i], meta: { text: p.target, tag: p.tag ?? "go" } })
);

// ---------- retrieval ----------
type Hit = { id: string; score: number; text: string };
function retrieve(query: string, topK = TOP_K, tagFilter?: string): Hit[] {
    const qv = encoder.normalize(encoder.encode(query));
    const qhat = l2(kelmPredict(kelm, [qv])[0]); // predicted embedding in DeepELM answer space

    const hits = store.query(qhat, topK, {
        metric: "cosine",
        returnVectors: false,
        filter: tagFilter ? (meta: any, id: any) => (meta as any)?.tag === tagFilter : undefined,
    });

    return hits.map((h: any) => ({
        id: h.id,
        score: h.score,
        text: h.meta?.text as string,
    }));
}

// ---------- tiny-set metrics ----------
function evalRecall1MRR(): { recall1: number; mrr: number } {
    let r1 = 0;
    let rrSum = 0;
    for (let i = 0; i < pairs.length; i++) {
        const q = pairs[i].query;
        const gold = pairs[i].id;
        const hits = retrieve(q, Math.max(TOP_K, pairs.length));
        const rank = hits.findIndex((h) => h.id === gold);
        if (rank === 0) r1 += 1;
        if (rank !== -1) rrSum += 1 / (rank + 1);
    }
    return { recall1: r1 / pairs.length, mrr: rrSum / pairs.length };
}

// ---------- demo ----------
const sampleQ = "How do you declare a map in Go?";
const results = retrieve(sampleQ, TOP_K, "go");

console.log(`\n🔍 Query: "${sampleQ}"`);
results.forEach((r, i) => console.log(`${i + 1}. (cos=${r.score.toFixed(4)}) ${r.text}`));

const { recall1, mrr } = evalRecall1MRR();
console.log(`\n📊 Tiny-set metrics → Recall@1=${(recall1 * 100).toFixed(1)}%  MRR=${mrr.toFixed(3)}`);

console.log(`\n✅ Done.`);
