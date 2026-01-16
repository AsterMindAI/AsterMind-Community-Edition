// © 2026 AsterMind AI Co. – All Rights Reserved.
// Patent Pending US 63/897,713
/**
 * AG News — Distill SBERT into Lightweight ELM Students (with Deep Teacher option)
 *
 * What this script demonstrates
 *  1) Compute a strong *teacher* embedding (Sentence-BERT). Optionally refine the
 *     teacher via DeepELM (autoencoders) for a compact, cosine-friendly space.
 *  2) Train small ELM chains (students) from simple char-level encodings to
 *     approximate the teacher. Train on reference texts only (no leakage).
 *  3) Evaluate retrieval (Recall@1, Recall@K, MRR) using score-level ensembling:
 *     average cosine scores from multiple student chains.
 *
 * Why this version often fares better than the plain student:
 *  - Teacher vectors are **L2-normalized** (good for cosine).
 *  - Optional **DeepELM teacher** learns a smoother, lower-dimensional target.
 *  - **Score-level ensemble** (average cosines) is more stable than averaging
 *    the embeddings directly.
 *
 * Pipeline Overview
 *
 *            ┌────────────┐
 *            │   Raw Text │
 *            └──────┬─────┘
 *                   │
 *                   ├────────────► Sentence-BERT (mean pool) ─────┐
 *                   │                                             │
 *                   │     (optional) DeepELM on SBERT             ▼
 *                   │                                   Teacher Embeddings (unit)
 *                   │
 *                   ▼
 *        ┌───────────────────────────────┐
 *        │    ELM Student Chain (×N)     │
 *        │  char-enc → ELM1 → … → ELMk   │
 *        │  train each layer: X → Y*     │  (deep supervision to teacher)
 *        └───────────────┬──────────────┘
 *                        │
 *       per-chain embeddings (unit)      … for queries & references
 *                        │
 *                        ▼
 *        Average per-chain cosine scores  (score-level ensemble)
 *                        │
 *                        ▼
 *         Retrieval + Metrics (R@1, R@K, MRR)
 *
 * CLI flags (all optional)
 *  --sample=5000         Number of rows from train.csv (default 5000)
 *  --split=0.2           Fraction as queries (default 0.2)
 *  --topK=5              Evaluate up to Recall@K (default 5)
 *  --seq=512,256,128     Hidden units per ELM chain layer (default 512,256,128)
 *  --act=gelu            Activation for all student layers (relu|gelu|tanh|leakyRelu)
 *  --dropout=0.02        Dropout for student layers (default 0.02)
 *  --ensemble=3          Number of student chains to ensemble (default 3)
 *  --maxLen=200          UniversalEncoder (char) max length (default 200)
 *  --teacher=raw         Teacher type: raw (SBERT) | deep (DeepELM on SBERT). Default raw
 *  --csv=results.csv     Output CSV filename (default timestamped)
 *
 * Usage
 *   npx ts-node --esm node_examples/agnews-elm-distill-sbert.ts
 *   npx ts-node --esm node_examples/agnews-elm-distill-sbert.ts --teacher=deep --seq=1024,512,256 --dropout=0.01 --ensemble=5
 */

import fs from "fs";
import { parse } from "csv-parse/sync";
import { pipeline } from "@xenova/transformers";
import {
    ELM,
    ELMChain,
    DeepELM,
    UniversalEncoder,
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

/* ------------------------- config ------------------------- */
const SAMPLE = Number(flags.sample ?? 5000);
const SPLIT = Math.min(0.9, Math.max(0.05, Number(flags.split ?? 0.2)));
const TOP_K = Math.max(1, Number(flags.topK ?? 5));
const SEQ = String(flags.seq ?? "512,256,128")
    .split(",")
    .map((s) => Math.max(1, Number(s.trim())));
const ACT = String(flags.act ?? "gelu") as "relu" | "gelu" | "tanh" | "leakyRelu";
const DROPOUT = Number(flags.dropout ?? 0.02);
const ENSEMBLE = Math.max(1, Number(flags.ensemble ?? 3));
const MAXLEN = Math.max(16, Number(flags.maxLen ?? 200));
const TEACHER = String(flags.teacher ?? "raw") as "raw" | "deep";

const CSV_FILE =
    typeof flags.csv === "string"
        ? String(flags.csv)
        : `agnews_elm_distill_sbert_${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;

/* ------------------------- utils ------------------------- */
const l2 = (v: number[]) => {
    const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    return n === 0 ? v : v.map((x) => x / n);
};

function cosine(a: number[], b: number[]): number {
    let d = 0, a2 = 0, b2 = 0;
    for (let i = 0; i < a.length; i++) {
        const ai = a[i], bi = b[i];
        d += ai * bi; a2 += ai * ai; b2 += bi * bi;
    }
    const na = Math.sqrt(a2) || 1, nb = Math.sqrt(b2) || 1;
    return d / (na * nb);
}

function evaluateFromScores(
    scores: number[][],         // shape: Q x R
    qLabels: string[],
    rLabels: string[],
    k: number
) {
    let hits1 = 0, hitsK = 0, rr = 0;
    for (let i = 0; i < scores.length; i++) {
        const row = scores[i].map((s, j) => ({ j, s }));
        row.sort((a, b) => b.s - a.s);
        const ranked = row.map(({ j }) => rLabels[j]);
        if (ranked[0] === qLabels[i]) hits1++;
        if (ranked.slice(0, k).includes(qLabels[i])) hitsK++;
        const r = ranked.indexOf(qLabels[i]);
        rr += r === -1 ? 0 : 1 / (r + 1);
    }
    const n = scores.length;
    return { recall1: hits1 / n, recallK: hitsK / n, mrr: rr / n };
}

/* Average cosine scores across multiple student chains */
function ensembleScores(
    chains: ELMChain[],
    qX: number[][],
    rX: number[][]
): number[][] {
    const per = chains.map((c) => ({
        q: (c.getEmbedding(qX) as number[][]).map(l2),
        r: (c.getEmbedding(rX) as number[][]).map(l2),
    }));
    const Q = qX.length, R = rX.length;
    const S: number[][] = Array.from({ length: Q }, () => Array(R).fill(0));
    const inv = 1 / per.length;
    for (const { q, r } of per) {
        for (let i = 0; i < Q; i++) {
            for (let j = 0; j < R; j++) {
                S[i][j] += inv * cosine(q[i], r[j]);
            }
        }
    }
    return S;
}

/* ------------------------- main ------------------------- */
(async () => {
    // 1) Load AG News
    const csvFile = fs.readFileSync(
        "../public/ag-news-classification-dataset/train.csv",
        "utf8"
    );
    const raw = parse(csvFile, { skip_empty_lines: true }) as string[][];
    const records = raw.map((row) => ({ text: row[1].trim(), label: row[0].trim() }));

    const sample = records.slice(0, SAMPLE);
    const texts = sample.map((r) => r.text);
    const labels = sample.map((r) => r.label);

    const splitIdx = Math.max(1, Math.floor(texts.length * SPLIT));
    const qTexts = texts.slice(0, splitIdx);
    const rTexts = texts.slice(splitIdx);
    const qLabels = labels.slice(0, splitIdx);
    const rLabels = labels.slice(splitIdx);

    // 2) Teacher = SBERT (mean-pool), then L2-normalize
    console.log(`⏳ Loading Sentence-BERT (Xenova/all-MiniLM-L6-v2) ...`);
    const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    const qSBERT = (await embedder(qTexts, { pooling: "mean" })).tolist() as number[][];
    const rSBERT = (await embedder(rTexts, { pooling: "mean" })).tolist() as number[][];
    const Dsb = rSBERT[0].length;

    const qSB = qSBERT.map(l2);
    const rSB = rSBERT.map(l2);

    // Baseline (raw SBERT)
    const baseScores: number[][] = Array.from({ length: qSB.length }, (_, i) =>
        rSB.map((v) => cosine(qSB[i], v))
    );
    const base = evaluateFromScores(baseScores, qLabels, rLabels, TOP_K);
    console.log(
        `\n📊 SBERT baseline → R@1=${(base.recall1 * 100).toFixed(1)} ` +
        `R@${TOP_K}=${(base.recallK * 100).toFixed(1)} MRR=${base.mrr.toFixed(3)}`
    );

    // 3) Optional: DeepELM teacher on reference SBERT
    let qTeach = qSB;
    let rTeach = rSB;
    let TEACH_DIM = Dsb;

    if (TEACHER === "deep") {
        console.log(`\n⚙️ DeepELM teacher on reference SBERT (unsupervised autoencoders) ...`);
        const deep = new DeepELM({
            inputDim: Dsb,
            layers: [
                { hiddenUnits: 512, activation: "gelu", ridgeLambda: 1e-2, dropout: 0.05 },
                { hiddenUnits: 256, activation: "relu", ridgeLambda: 1e-2, dropout: 0.05 },
                { hiddenUnits: 128, activation: "relu", ridgeLambda: 1e-2, dropout: 0.05 },
            ],
            clfHiddenUnits: 0,
            clfActivation: "linear",
            clfWeightInit: "xavier",
            normalizeEach: false,
            normalizeFinal: true,
        } as any);

        console.time("deep.fitAE");
        deep.fitAutoencoders(rSB);      // fit on references only (no leakage)
        console.timeEnd("deep.fitAE");

        rTeach = (deep.transform(rSB) as number[][]).map(l2);
        qTeach = (deep.transform(qSB) as number[][]).map(l2);
        TEACH_DIM = rTeach[0].length;

        // Optional deep teacher baseline
        const deepScores: number[][] = Array.from({ length: qTeach.length }, (_, i) =>
            rTeach.map((v) => cosine(qTeach[i], v))
        );
        const deepBase = evaluateFromScores(deepScores, qLabels, rLabels, TOP_K);
        console.log(
            `✅ DeepELM-on-SBERT baseline → R@1=${(deepBase.recall1 * 100).toFixed(1)} ` +
            `R@${TOP_K}=${(deepBase.recallK * 100).toFixed(1)} MRR=${deepBase.mrr.toFixed(3)}`
        );
    }

    // 4) Train ELM student chains to the teacher (deep supervision)
    console.log(`\n⚙️ Training ELM student chain(s) with deep supervision to ${TEACHER === "deep" ? "DeepELM-SBERT" : "SBERT"} ...`);

    // Char encoder (student input)
    const uni = new UniversalEncoder({ maxLen: MAXLEN, mode: "char", useTokenizer: false });
    const qEnc = qTexts.map((t) => uni.normalize(uni.encode(t)));
    const rEnc = rTexts.map((t) => uni.normalize(uni.encode(t)));

    const chains: ELMChain[] = [];

    for (let e = 0; e < ENSEMBLE; e++) {
        const elms = SEQ.map((h, i) =>
            new ELM({
                activation: ACT,
                hiddenUnits: h,
                maxLen: MAXLEN,
                categories: [], // numeric mode
                log: { modelName: `Student#${e + 1}/Layer#${i + 1}`, verbose: false },
                metrics: { accuracy: 0.0 },
                dropout: DROPOUT,
            })
        );

        // Train on references only: at each layer, regress to teacher space (deep supervision)
        let curRef = rEnc;
        for (const elm of elms) {
            // Fit readout to teacher
            elm.trainFromData(curRef, rTeach, { reuseWeights: false });
            // Move to next layer's input (embeddings of current layer)
            curRef = elm.getEmbedding(curRef) as number[][];
        }

        chains.push(new ELMChain(elms));
    }

    // 5) Score-level ensemble evaluation
    const scores = ensembleScores(chains, qEnc, rEnc);
    const stud = evaluateFromScores(scores, qLabels, rLabels, TOP_K);
    console.log(
        `✅ ELM-Student (${ENSEMBLE} chain${ENSEMBLE > 1 ? "s" : ""}, seq=${SEQ.join("-")}, act=${ACT}, dropout=${DROPOUT}, teacher_dim=${TEACH_DIM}) → ` +
        `R@1=${(stud.recall1 * 100).toFixed(1)} ` +
        `R@${TOP_K}=${(stud.recallK * 100).toFixed(1)} ` +
        `MRR=${stud.mrr.toFixed(3)}`
    );

    // 6) CSV export
    const lines = [
        "pipeline,recall_at_1,recall_at_" + TOP_K + ",mrr,sample,split,topK,seq,act,dropout,ensemble,teacher,teacher_dim",
        `SBERT${TEACHER === "deep" ? "_DeepELM_teacher" : ""},${(TEACHER === "deep" ? "" : base.recall1.toFixed(4)) || "-"},${(TEACHER === "deep" ? "" : base.recallK.toFixed(4)) || "-"},${(TEACHER === "deep" ? "" : base.mrr.toFixed(4)) || "-"},${SAMPLE},${SPLIT},${TOP_K},-,-,-,-,raw,${Dsb}`,
        `ELM_Student,${stud.recall1.toFixed(4)},${stud.recallK.toFixed(4)},${stud.mrr.toFixed(4)},${SAMPLE},${SPLIT},${TOP_K},"${SEQ.join("-")}",${ACT},${DROPOUT},${ENSEMBLE},${TEACHER},${TEACH_DIM}`,
    ];
    // If deep teacher was used, append its baseline too (for completeness)
    if (TEACHER === "deep") {
        const deepScoresOut: number[][] = Array.from({ length: qTeach.length }, (_, i) =>
            rTeach.map((v) => cosine(qTeach[i], v))
        );
        const deepBase = evaluateFromScores(deepScoresOut, qLabels, rLabels, TOP_K);
        lines.splice(1, 0,
            `DeepELM_on_SBERT,${deepBase.recall1.toFixed(4)},${deepBase.recallK.toFixed(4)},${deepBase.mrr.toFixed(4)},${SAMPLE},${SPLIT},${TOP_K},-,-,-,-,deep,${TEACH_DIM}`
        );
    }

    fs.writeFileSync(CSV_FILE, lines.join("\n"));
    console.log(`\n💾 Saved results → ${CSV_FILE}`);

    // 7) Pretty sample retrieval (student ensemble)
    const demoIdx = 0;
    const row = scores[demoIdx].map((s, j) => ({ j, s }));
    row.sort((a, b) => b.s - a.s);
    console.log(`\n🔎 Demo query: ${qTexts[demoIdx]}`);
    row.slice(0, 5).forEach(({ j, s }, i) =>
        console.log(`${i + 1}. [${s.toFixed(4)}] ${rLabels[j]} — ${rTexts[j]}`)
    );

    console.log(`\n✅ Done.`);
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
