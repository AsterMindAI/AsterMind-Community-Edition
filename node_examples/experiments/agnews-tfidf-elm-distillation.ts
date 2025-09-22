/**
 * AG News — TF-IDF Baseline + ELM Distillation (optional ensemble)
 *
 * What this shows
 *  - A classic, strong TF-IDF cosine baseline for text retrieval.
 *  - How stacked ELMs (trained as small autoencoders) can “distill” TF-IDF
 *    into a compact, cosine-friendly embedding space.
 *  - Optional ensembling of multiple ELM chains.
 *
 * Why keep this around
 *  - It’s fast, dependency-light (no GPUs), and easy to reason about.
 *  - Great as a “traditional baseline + light learning on top” companion
 *    to your SBERT/DeepELM/KELM demos.
 *
 * Pipeline Overview
 *
 *            ┌────────────┐
 *            │   Raw Text │
 *            └──────┬─────┘
 *                   │
 *                   ▼
 *            ┌────────────┐
 *            │   TF-IDF   │  (baseline embedding, D≈VocabSize)
 *            └──────┬─────┘
 *                   │
 *            Baseline Retrieval (cosine)
 *                   │
 *                   ▼
 *        ┌───────────────────────┐
 *        │  ELM Chain (stacked)  │  unsupervised: X→X on TF-IDF
 *        │  [ELM₁ → ELM₂ → …]    │  each yields lower-dim embeddings
 *        └───────────┬───────────┘
 *                    │
 *                    ▼
 *            Refined Embeddings (cosine)
 *                    │
 *                    ▼
 *       Retrieval + Metrics (Recall@1, Recall@K, MRR)
 *
 * CLI flags (all optional)
 *  --sample=5000         Number of rows from train.csv (default 5000)
 *  --split=0.2           Fraction used as queries (default 0.2)
 *  --topK=5              Evaluate up to Recall@K (default 5)
 *  --vocab=2000          TF-IDF vocab size (default 2000)
 *  --dropout=0.02        Dropout for ELM layers (default 0.02)
 *  --seq=512,256,128     Hidden units per layer (default 512,256,128)
 *  --ensemble=3          Number of ELM chains to ensemble (default 3)
 *  --csv=results.csv     Output CSV filename (default timestamped)
 *
 * Usage
 *  npx ts-node --esm node_examples/agnews-tfidf-elm-distillation.ts
 *  npx ts-node --esm node_examples/agnews-tfidf-elm-distillation.ts --sample=2000 --vocab=4000 --seq=512,256,128,64 --ensemble=5
 */

import fs from "fs";
import { parse } from "csv-parse/sync";
import { ELM, ELMChain, TFIDFVectorizer } from "@astermind/astermind-elm";


// ---------- tiny flag parser ----------
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

// ---------- config ----------
const SAMPLE = Number(flags.sample ?? 5000);
const SPLIT = Math.min(0.9, Math.max(0.05, Number(flags.split ?? 0.2)));
const TOP_K = Math.max(1, Number(flags.topK ?? 5));
const VOCAB = Math.max(200, Number(flags.vocab ?? 2000));
const DROPOUT = Number(flags.dropout ?? 0.02);
const SEQ = String(flags.seq ?? "512,256,128")
    .split(",")
    .map((s) => Math.max(1, Number(s.trim())));
const ENSEMBLE = Math.max(1, Number(flags.ensemble ?? 3));

const CSV_FILE =
    typeof flags.csv === "string"
        ? String(flags.csv)
        : `agnews_tfidf_elm_${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;

// ---------- utils ----------
const l2 = (v: number[]) => {
    const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    return n === 0 ? v : v.map((x) => x / n);
};

function cosine(a: number[], b: number[]): number {
    let dot = 0, a2 = 0, b2 = 0;
    for (let i = 0; i < a.length; i++) {
        const ai = a[i], bi = b[i];
        dot += ai * bi; a2 += ai * ai; b2 += bi * bi;
    }
    const na = Math.sqrt(a2) || 1, nb = Math.sqrt(b2) || 1;
    return dot / (na * nb);
}

function evaluateRecallMRR(
    query: number[][],
    reference: number[][],
    qLabels: string[],
    rLabels: string[],
    k: number
) {
    let hitsAt1 = 0, hitsAtK = 0, rr = 0;
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
        rr += rank === -1 ? 0 : 1 / (rank + 1);
    }
    const n = query.length;
    return { recall1: hitsAt1 / n, recallK: hitsAtK / n, mrr: rr / n };
}

(async () => {
    // 1) Load AG News CSV
    const csvFile = fs.readFileSync(
        "../../public/ag-news-classification-dataset/train.csv",
        "utf8"
    );
    const raw = parse(csvFile, { skip_empty_lines: true }) as string[][];
    const records = raw.map((row) => ({ text: row[1].trim(), label: row[0].trim() }));

    const sample = records.slice(0, SAMPLE);
    const texts = sample.map((r) => r.text);
    const labels = sample.map((r) => r.label);

    // Split queries/references
    const splitIdx = Math.max(1, Math.floor(texts.length * SPLIT));
    const qTexts = texts.slice(0, splitIdx);
    const rTexts = texts.slice(splitIdx);
    const qLabels = labels.slice(0, splitIdx);
    const rLabels = labels.slice(splitIdx);

    // 2) TF-IDF vectors
    console.log(`⏳ Computing TF-IDF (vocab=${VOCAB}) ...`);
    const vectorizer = new TFIDFVectorizer(texts, VOCAB);
    const allTFIDF = vectorizer.vectorizeAll().map((v: number[]) => l2(v));
    const qTF = allTFIDF.slice(0, splitIdx);
    const rTF = allTFIDF.slice(splitIdx);
    console.log(`✅ TF-IDF ready. D=${allTFIDF[0]?.length ?? 0}`);

    // 3) Baseline (TF-IDF cosine)
    const base = evaluateRecallMRR(qTF, rTF, qLabels, rLabels, TOP_K);
    console.log(
        `\n📊 TF-IDF baseline → R@1=${(base.recall1 * 100).toFixed(1)} ` +
        `R@${TOP_K}=${(base.recallK * 100).toFixed(1)} MRR=${base.mrr.toFixed(3)}`
    );

    // 4) ELM distillation on TF-IDF (unsupervised X→X), optional ensemble
    console.log(`\n⚙️ Training ELM chain(s) on TF-IDF (unsupervised autoencoders) ...`);
    const chains: ELMChain[] = [];

    for (let e = 0; e < ENSEMBLE; e++) {
        const elms = SEQ.map((h, i) =>
            new ELM({
                activation: "relu",
                hiddenUnits: h,
                maxLen: 50,
                categories: [],                     // numeric mode
                log: { modelName: `TFIDF-ELM#${i + 1}`, verbose: false },
                metrics: { accuracy: 0.0 },
                dropout: DROPOUT,
            })
        );

        // Unsupervised: each layer learns X→X on its current input
        let cur = rTF; // fit on references only (no leakage)
        for (const elm of elms) {
            elm.trainFromData(cur, cur);
            cur = elm.getEmbedding(cur) as number[][];
        }

        chains.push(new ELMChain(elms));
    }

    // Transform both sides through each chain and average (simple late fusion)
    function applyEnsemble(X: number[][]): number[][] {
        const outs = chains.map((c) => (c.getEmbedding(X) as number[][]).map(l2));
        if (outs.length === 1) return outs[0];
        const N = outs[0].length, D = outs[0][0].length;
        const avg: number[][] = Array.from({ length: N }, () => Array(D).fill(0));
        for (const Y of outs) {
            for (let i = 0; i < N; i++) {
                const yi = Y[i];
                for (let j = 0; j < D; j++) avg[i][j] += yi[j];
            }
        }
        const inv = 1 / outs.length;
        for (let i = 0; i < N; i++) for (let j = 0; j < D; j++) avg[i][j] *= inv;
        return avg.map(l2);
    }

    const qELM = applyEnsemble(qTF);
    const rELM = applyEnsemble(rTF);
    const elmRes = evaluateRecallMRR(qELM, rELM, qLabels, rLabels, TOP_K);

    console.log(
        `✅ ELM-on-TF-IDF (${ENSEMBLE} chain${ENSEMBLE > 1 ? "s" : ""}, seq=${SEQ.join(
            "-"
        )}, dropout=${DROPOUT}) → ` +
        `R@1=${(elmRes.recall1 * 100).toFixed(1)} ` +
        `R@${TOP_K}=${(elmRes.recallK * 100).toFixed(1)} ` +
        `MRR=${elmRes.mrr.toFixed(3)}`
    );

    // 5) CSV export
    const lines = [
        "pipeline,recall_at_1,recall_at_" + TOP_K + ",mrr,sample,split,topK,vocab,seq,dropout,ensemble",
        `TFIDF,${base.recall1.toFixed(4)},${base.recallK.toFixed(4)},${base.mrr.toFixed(
            4
        )},${SAMPLE},${SPLIT},${TOP_K},${VOCAB},-,-,-`,
        `ELM_on_TFIDF,${elmRes.recall1.toFixed(4)},${elmRes.recallK.toFixed(
            4
        )},${elmRes.mrr.toFixed(4)},${SAMPLE},${SPLIT},${TOP_K},${VOCAB},"${SEQ.join(
            "-"
        )}",${DROPOUT},${ENSEMBLE}`,
    ];
    fs.writeFileSync(CSV_FILE, lines.join("\n"));
    console.log(`\n💾 Saved results → ${CSV_FILE}`);

    // 6) Pretty sample retrieval (ELM space)
    const demoQ = qTexts[0];
    // find 5 nearest via cosine
    const scores = rELM.map((v, j) => ({ j, s: cosine(qELM[0], v) }));
    scores.sort((a, b) => b.s - a.s);
    console.log(`\n🔎 Demo query: ${demoQ}`);
    scores.slice(0, 5).forEach(({ j, s }, i) =>
        console.log(`${i + 1}. [${s.toFixed(4)}] ${rLabels[j]} — ${rTexts[j]}`)
    );

    console.log(`\n✅ Done.`);
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
