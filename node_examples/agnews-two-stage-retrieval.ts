/**
 * AG News Two-Stage Retrieval (Node)
 * ─────────────────────────────────────────────────────────────────────────────
 * Compares three pipelines on a subset of AG News using cosine retrieval:
 *
 * Pipelines
 *  1) SBERT Baseline
 *     - Query/Reference texts → Sentence-BERT (Xenova/all-MiniLM-L6-v2, mean-pool)
 *     - Retrieval in raw SBERT space.
 *
 *  2) DeepELM-on-SBERT (unsupervised)
 *     - Train DeepELM (stacked ELM autoencoders) on REFERENCE SBERT only (Y_ref→Y_ref).
 *     - Transform both query and reference SBERT embeddings with DeepELM.
 *     - Retrieval in the refined DeepELM space.
 *
 *  3) UniversalEncoder → KELM → DeepELM
 *     - Fit KELM (Kernel ELM; RBF kernel) to regress from UniversalEncoder(char-level)
 *       features of REFERENCE texts → DeepELM(reference SBERT) space.
 *     - For a query: char-encode with UniversalEncoder → KELM predicts its embedding
 *       directly in the DeepELM reference space → cosine retrieval against the store
 *       built from DeepELM(reference).
 *
 * Why these three?
 *  - SBERT gives a strong out-of-box baseline.
 *  - DeepELM compresses/regularizes SBERT geometry (often preserves R@5, can shift R@1).
 *  - KELM provides a lightweight text→embedding mapper you can serialize and run anywhere.
 *
 * ── Data Flow (high-level) ───────────────────────────────────────────────────
 *
 *   AG News (train.csv) ── sample & split ──► [query texts]      [reference texts]
 *                                            │                   │
 *  (1) SBERT baseline:                       │                   │
 *     qSBERT = SBERT(query)                  │                   │ rSBERT = SBERT(ref)
 *     └── cosine KNN(qSBERT, rSBERT) ◄───────┘                   └───────────────┘
 *
 *  (2) DeepELM on SBERT:
 *     deep.fitAutoencoders(rSBERT)   // unsupervised on REF only (no leakage)
 *     qDeep = deep.transform(qSBERT)     rDeep = deep.transform(rSBERT)
 *     └── cosine KNN(qDeep, rDeep)
 *
 *  (3) KELM(UniversalEncoder→DeepELM):
 *     X_ref   = UniversalEncoder(ref texts, char mode, maxLen)
 *     targets = rDeep                                 // DeepELM(reference) embeddings
 *     kelm.fit(X_ref, targets)                        // regression
 *
 *     // Inference
 *     X_query = UniversalEncoder(query texts)
 *     qHat    = kelm.getEmbedding(X_query) · W        // kelmPredict(): Nyström/exact emb × readout
 *     └── cosine KNN(qHat, rDeep)
 *
 * ── Metrics ──────────────────────────────────────────────────────────────────
 *   - Recall@1, Recall@K, MRR computed over the query split
 *   - Cosine similarity; higher is better.
 *
 * ── CLI Flags (defaults) ─────────────────────────────────────────────────────
 *   --sample=1000         Number of rows from train.csv
 *   --split=0.2           Fraction routed to queries (rest are references)
 *   --topK=5              Evaluate Recall@K and show top-K demo hits
 *   --mode=auto           'nystrom' | 'exact' | 'auto' for KELM
 *   --m=512               Nyström landmark count (if mode=nystrom)
 *   --whiten=true         Nyström whitening toggle
 *   --ridge=0.01          Ridge regularization for KELM readout
 *   --gamma=auto          RBF gamma; 'auto' uses median heuristic on char features
 *   --maxLen=200          UniversalEncoder max char length
 *   --csv=...             Output CSV filename (defaults to timestamp)
 *
 * ── Output ───────────────────────────────────────────────────────────────────
 *   CSV with:
 *     pipeline, recall_at_1, recall_at_<K>, mrr, sample, split, topK, mode, m, whiten, maxLen, gamma, ridge
 *
 * ── Repro & Environment Notes ────────────────────────────────────────────────
 *   - Run with ESM:  npx ts-node --esm node_examples/agnews-two-stage.ts
 *   - First SBERT call downloads the ONNX weights via @xenova/transformers (CPU).
 *   - Ensure dataset exists at: ../public/ag-news-classification-dataset/train.csv
 *   - For small reference sets (≤ few thousand), 'exact' kernel is often simplest/strongest.
 *   - Results depend on the random sample/split; set process.env for seeding if needed.
 *
 * ── Extensibility ────────────────────────────────────────────────────────────
 *   - Swap UniversalEncoder for (TF-IDF ⊕ char) features, or try poly kernels.
 *   - Enable DeepELM classifier head with ref labels to nudge last-layer separation.
 *   - Persist KELM/DeepELM via toJSON() for downstream demos (CLI load & serve).
 */

import fs from "fs";
import { parse } from "csv-parse/sync";
import { pipeline } from "@xenova/transformers";
import {
    UniversalEncoder,
    KernelELM,
    DeepELM,
    EmbeddingStore,
} from "@astermind/astermind-elm";

/* ------------------------- tiny flag parser ------------------------- */
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

const SAMPLE = Number(flags.sample ?? 1000);
const SPLIT = Math.min(0.9, Math.max(0.05, Number(flags.split ?? 0.2)));
const TOP_K = Math.max(1, Number(flags.topK ?? 5));

const MODE = String(flags.mode ?? "auto") as "auto" | "exact" | "nystrom";
const M = Number(flags.m ?? 512);
const WHITEN = String(flags.whiten ?? "true") === "true";
const MAXLEN = Number(flags.maxLen ?? 512);

const CSV_FILE =
    typeof flags.csv === "string"
        ? String(flags.csv)
        : `agnews_two_stage_${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;

/* ----------------------------- utils ----------------------------- */
const toUnit = (M: number[][]) =>
    M.map((v) => {
        const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
        return v.map((x) => x / n);
    });

function cosine(a: number[], b: number[]) {
    let dot = 0,
        a2 = 0,
        b2 = 0;
    for (let i = 0; i < a.length; i++) {
        const ai = a[i],
            bi = b[i];
        dot += ai * bi;
        a2 += ai * ai;
        b2 += bi * bi;
    }
    const na = Math.sqrt(a2) || 1;
    const nb = Math.sqrt(b2) || 1;
    return dot / (na * nb);
}

function evaluateRecallMRR(
    query: number[][],
    reference: number[][],
    qLabels: string[],
    rLabels: string[],
    k: number
) {
    let hitsAt1 = 0,
        hitsAtK = 0,
        reciprocalRanks = 0;
    for (let i = 0; i < query.length; i++) {
        const qs = query[i];
        const scores = reference.map((emb, j) => ({
            label: rLabels[j],
            score: cosine(qs, emb),
        }));
        scores.sort((a, b) => b.score - a.score);
        const ranked = scores.map((s) => s.label);
        if (ranked[0] === qLabels[i]) hitsAt1++;
        if (ranked.slice(0, k).includes(qLabels[i])) hitsAtK++;
        const rank = ranked.indexOf(qLabels[i]);
        reciprocalRanks += rank === -1 ? 0 : 1 / (rank + 1);
    }
    return {
        recall1: hitsAt1 / query.length,
        recallK: hitsAtK / query.length,
        mrr: reciprocalRanks / query.length,
    };
}

// Median-heuristic gamma on encoder vectors
function medianGamma(X: number[][], maxPairs = 2000): number {
    const N = X.length;
    if (N < 2) return 0.5;
    const idx = (n: number) => Math.floor(Math.random() * n);
    const vals: number[] = [];
    const pairs = Math.min(maxPairs, (N * (N - 1)) / 2);
    for (let k = 0; k < pairs; k++) {
        const i = idx(N),
            j = idx(N);
        if (i === j) continue;
        const xi = X[i],
            xj = X[j];
        let d2 = 0;
        for (let t = 0; t < xi.length; t++) {
            const diff = xi[t] - xj[t];
            d2 += diff * diff;
        }
        vals.push(d2);
    }
    if (!vals.length) return 0.5;
    vals.sort((a, b) => a - b);
    const med = vals[Math.floor(vals.length / 2)];
    return med <= 1e-12 ? 0.5 : 1 / (2 * med);
}

/** Robust KELM forward:
 *  1) prefer model.predict(X) (regression output)
 *  2) try predictLogitsFromVectors
 *  3) fallback: getEmbedding(X) * (W|Beta) from toJSON()
 */
function kelmPredict(model: any, X: number[][]): number[][] {
    // 1) direct regression
    try {
        if (typeof model.predict === "function") {
            const y = model.predict(X);
            if (Array.isArray(y) && Array.isArray(y[0])) return y as number[][];
        }
    } catch { }
    // 2) logits-from-vectors
    try {
        if (typeof model.predictLogitsFromVectors === "function") {
            const y = model.predictLogitsFromVectors(X);
            if (Array.isArray(y) && Array.isArray(y[0])) return y as number[][];
        }
    } catch { }
    // 3) emb * W (or Beta)
    try {
        if (typeof model.getEmbedding === "function") {
            const E = model.getEmbedding(X) as number[][];
            if (!Array.isArray(E) || !Array.isArray(E[0])) {
                throw new Error("getEmbedding returned empty/invalid");
            }
            const snap = typeof model.toJSON === "function" ? model.toJSON() : {};
            const W = snap?.W ?? snap?.Beta ?? (model as any).W ?? (model as any).Beta;
            if (!Array.isArray(W) || !Array.isArray(W[0])) {
                throw new Error("no readout matrix (W/Beta) found on model");
            }
            const N = E.length;
            const m = E[0].length;
            const D = W[0].length;
            const out = Array.from({ length: N }, () => Array(D).fill(0));
            for (let i = 0; i < N; i++) {
                const ei = E[i];
                for (let k = 0; k < m; k++) {
                    const eik = ei[k];
                    const Wk = W[k];
                    for (let j = 0; j < D; j++) out[i][j] += eik * Wk[j];
                }
            }
            return out;
        }
    } catch (e) {
        // fall through to final throw
    }
    throw new Error(
        "kelmPredict: unable to produce outputs from KernelELM (no predict / logits / embedding * W available)"
    );
}

function shuffleInPlace<T>(a: T[]) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
}

/* ------------------------------ main ------------------------------ */
(async () => {
    // 1) Load + parse AG News (skip header). CSV: [label, title, description]
    const csvFile = fs.readFileSync(
        "../public/ag-news-classification-dataset/train.csv",
        "utf8"
    );
    const raw = parse(csvFile, { skip_empty_lines: true, from_line: 2 }) as string[][];
    const all = raw.map((row) => ({
        text: `${row[1].trim()}. ${row[2]?.trim() ?? ""}`.trim(),
        label: row[0].trim(),
    }));

    // Shuffle, then sample
    shuffleInPlace(all);
    const sample = all.slice(0, SAMPLE);
    const texts = sample.map((r) => r.text);
    const labels = sample.map((r) => r.label);

    // Split into query/reference
    const splitIdx = Math.max(1, Math.floor(texts.length * SPLIT));
    const queryTexts = texts.slice(0, splitIdx);
    const refTexts = texts.slice(splitIdx);
    const queryLabels = labels.slice(0, splitIdx);
    const refLabels = labels.slice(splitIdx);

    // 2) SBERT embeddings (cosine-normalized)
    console.log(`⏳ Loading Sentence-BERT (Xenova/all-MiniLM-L6-v2) ...`);
    const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    const qSBERT = toUnit((await embedder(queryTexts, { pooling: "mean" })).tolist() as number[][]);
    const rSBERT = toUnit((await embedder(refTexts, { pooling: "mean" })).tolist() as number[][]);
    const D = rSBERT[0].length;

    // 3) Baseline in SBERT space
    const base = evaluateRecallMRR(qSBERT, rSBERT, queryLabels, refLabels, TOP_K);
    console.log(
        `\n📊 SBERT baseline → R@1=${(base.recall1 * 100).toFixed(1)} R@${TOP_K}=${(
            base.recallK * 100
        ).toFixed(1)} MRR=${base.mrr.toFixed(3)}`
    );

    // 4) DeepELM on reference SBERT (unsupervised)
    console.log(`\n⚙️ DeepELM pretraining on reference SBERT ...`);
    const deep = new DeepELM({
        inputDim: D,
        layers: [
            { hiddenUnits: 384, activation: "gelu", ridgeLambda: 1e-2, dropout: 0.0 },
            { hiddenUnits: 192, activation: "relu", ridgeLambda: 1e-2, dropout: 0.0 },
        ],
        numClasses: 4, // required by config; classifier head not used
        clfHiddenUnits: 0,
        clfActivation: "linear",
        clfWeightInit: "xavier",
        normalizeEach: true,
        normalizeFinal: true,
    } as any);

    console.time("deep.fitAE");
    deep.fitAutoencoders(rSBERT); // fit only on reference to avoid leakage
    console.timeEnd("deep.fitAE");

    const rDeep = toUnit(deep.transform(rSBERT) as number[][]);
    const qDeep = toUnit(deep.transform(qSBERT) as number[][]);

    const deepRes = evaluateRecallMRR(qDeep, rDeep, queryLabels, refLabels, TOP_K);
    console.log(
        `✅ DeepELM-on-SBERT → R@1=${(deepRes.recall1 * 100).toFixed(1)} R@${TOP_K}=${(
            deepRes.recallK * 100
        ).toFixed(1)} MRR=${deepRes.mrr.toFixed(3)}`
    );

    // 5) KELM: UniversalEncoder(char) → DeepELM(reference) space
    console.log(`\n⚙️ Training KELM (UniversalEncoder → DeepELM space) ...`);
    const uni = new UniversalEncoder({
        maxLen: MAXLEN,
        mode: "char",
        useTokenizer: false,
    });

    const X_ref = refTexts.map((t) => uni.normalize(uni.encode(t)));
    const outDim = rDeep[0].length;

    // Choose kernel mode (auto: exact for smaller N, nystrom otherwise)
    const N = X_ref.length;
    const modeEff: "exact" | "nystrom" =
        MODE === "exact" ? "exact" :
            MODE === "nystrom" ? "nystrom" :
                (N >= 1500 ? "nystrom" : "exact");

    let mEff = 0;
    if (modeEff === "nystrom") {
        mEff = Math.max(1, Math.min(M, N));
        if (M !== mEff) console.log(`ℹ️ Clamping Nyström m from ${M} → ${mEff} (N=${N}).`);
    }

    // Tiny sweep (gamma, ridge) using a 10% validation slice of the reference
    const autoGamma = medianGamma(X_ref);
    const gammaGrid = [autoGamma * 0.5, autoGamma, autoGamma * 2];
    const ridgeGrid = [5e-3, 1e-2, 2e-2];

    const cut = Math.max(1, Math.floor(0.1 * N));
    const X_val = X_ref.slice(0, cut);
    const Y_val = rDeep.slice(0, cut);
    const X_tr = X_ref.slice(cut);
    const Y_tr = rDeep.slice(cut);

    let best = { score: -Infinity, gamma: autoGamma, ridge: 1e-2 };

    for (const g of gammaGrid) {
        for (const r of ridgeGrid) {
            const trial = new KernelELM({
                outputDim: outDim,
                task: "regression",
                mode: modeEff,
                ridgeLambda: r,
                ...(modeEff === "nystrom" ? { nystrom: { m: mEff, whiten: WHITEN } } : {}),
                kernel: { type: "rbf", gamma: g },
            });
            trial.fit(X_tr, Y_tr);

            // score = average cosine on the tiny hold-out
            const predVal = toUnit(kelmPredict(trial, X_val));
            let s = 0;
            for (let i = 0; i < predVal.length; i++) s += cosine(predVal[i], Y_val[i]);
            s /= Math.max(1, predVal.length);
            if (s > best.score) best = { score: s, gamma: g, ridge: r };
        }
    }

    // Train final KELM on full reference with best (gamma, ridge)
    const kelm = new KernelELM({
        outputDim: outDim,
        task: "regression",
        mode: modeEff,
        ridgeLambda: best.ridge,
        ...(modeEff === "nystrom" ? { nystrom: { m: mEff, whiten: WHITEN } } : {}),
        kernel: { type: "rbf", gamma: best.gamma },
    });

    console.time("kelm.fit");
    kelm.fit(X_ref, rDeep);
    console.timeEnd("kelm.fit");

    // Build retrieval store on reference (DeepELM space)
    const store = new EmbeddingStore(outDim, { storeUnit: true });
    refTexts.forEach((text, i) => {
        store.add({
            id: String(i),
            vec: rDeep[i],
            meta: { text, label: refLabels[i] },
        });
    });

    // Predict query embeddings via KELM and evaluate
    const X_query = queryTexts.map((t) => uni.normalize(uni.encode(t)));
    const qHat = toUnit(kelmPredict(kelm, X_query));

    function evalViaStore(
        qVecs: number[][],
        qLabels: string[],
        k: number
    ): { recall1: number; recallK: number; mrr: number } {
        let hits1 = 0,
            hitsK = 0,
            rr = 0;
        for (let i = 0; i < qVecs.length; i++) {
            const hits = store.query(qVecs[i], Math.max(k, 10), {
                metric: "cosine",
                returnVectors: false,
            });
            const ranked = hits.map((h: { meta: any; }) => (h.meta as any)?.label as string);
            if (ranked[0] === qLabels[i]) hits1++;
            if (ranked.slice(0, k).includes(qLabels[i])) hitsK++;
            const r = ranked.indexOf(qLabels[i]);
            rr += r === -1 ? 0 : 1 / (r + 1);
        }
        const n = qVecs.length;
        return { recall1: hits1 / n, recallK: hitsK / n, mrr: rr / n };
    }

    const kelmRes = evalViaStore(qHat, queryLabels, TOP_K);
    console.log(
        `✅ KELM(UniversalEncoder→DeepELM) → R@1=${(kelmRes.recall1 * 100).toFixed(
            1
        )} R@${TOP_K}=${(kelmRes.recallK * 100).toFixed(1)} MRR=${kelmRes.mrr.toFixed(3)}`
    );

    // 6) CSV export
    const lines = [
        "pipeline,recall_at_1,recall_at_" +
        TOP_K +
        ",mrr,sample,split,topK,mode,m,whiten,maxLen,gamma,ridge",
        `SBERT,${base.recall1.toFixed(4)},${base.recallK.toFixed(4)},${base.mrr.toFixed(
            4
        )},${SAMPLE},${SPLIT},${TOP_K},-,-,-,-,-`,
        `DeepELM_on_SBERT,${deepRes.recall1.toFixed(4)},${deepRes.recallK.toFixed(
            4
        )},${deepRes.mrr.toFixed(4)},${SAMPLE},${SPLIT},${TOP_K},-,-,-,-,-`,
        `KELM_UniEnc_to_DeepELM,${kelmRes.recall1.toFixed(4)},${kelmRes.recallK.toFixed(
            4
        )},${kelmRes.mrr.toFixed(4)},${SAMPLE},${SPLIT},${TOP_K},${modeEff},${modeEff === "nystrom" ? mEff : "-"
        },${modeEff === "nystrom" ? WHITEN : "-"},${MAXLEN},${best.gamma.toExponential(
            3
        )},${best.ridge}`,
    ];
    fs.writeFileSync(CSV_FILE, lines.join("\n"));
    console.log(`\n💾 Saved results → ${CSV_FILE}`);

    // 7) Pretty sample retrieval (KELM→DeepELM)
    const demoIdx = 0;
    const demoQ = queryTexts[demoIdx];
    const demoQhat = qHat[demoIdx];
    const demoHits = store.query(demoQhat, 5, { metric: "cosine" });
    console.log(`\n🔎 Demo query: ${demoQ}`);
    demoHits.forEach((h: { score: number; meta: any; }, i: number) =>
        console.log(
            `${i + 1}. [${h.score.toFixed(4)}] ${String((h.meta as any)?.label)} — ${(h.meta as any)?.text
            }`
        )
    );

    console.log(`\n✅ Done.`);
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
