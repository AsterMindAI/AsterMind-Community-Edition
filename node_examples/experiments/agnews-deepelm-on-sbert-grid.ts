/**
 * AG News — DeepELM Ablation on SBERT (Reference-Only Stacked Autoencoders)
 *
 * What this script demonstrates
 *  1) Build a strong baseline: Sentence-BERT (all-MiniLM-L6-v2, mean-pooled) + cosine KNN.
 *  2) Train DeepELM (a stack of ELM autoencoders, i.e., X→X) **only on REFERENCE SBERT** to avoid leakage.
 *  3) Transform both query and reference SBERT with the trained DeepELM and evaluate retrieval quality
 *     (Recall@1, Recall@K, MRR).
 *  4) Run an ablation over layer widths, per-layer activation schemes, and dropout, logging each config.
 *
 * Why this approach
 *  - Keeps SBERT’s semantics while shaping a smoother, cosine-friendly representation.
 *  - Reference-only fitting mirrors real-world indexer training and prevents test leakage.
 *  - Results are interpretable (unsupervised AE objective) and comparable against the SBERT baseline.
 *
 * Pipeline Overview
 *
 *            ┌────────────┐
 *            │   Raw Text │
 *            └──────┬─────┘
 *                   │ tokenize
 *                   ▼
 *            ┌───────────────────────┐
 *            │ Sentence-BERT (teacher)│  mean-pool → unit-norm
 *            └──────────┬────────────┘
 *                       │ fit AE stack on **reference only**
 *                       ▼
 *                 ┌───────────┐
 *                 │  DeepELM  │  (stacked ELM autoencoders)
 *                 └─────┬─────┘
 *                       │ transform queries & refs → unit-norm
 *                       ▼
 *           Retrieval + Metrics (cosine; R@1, R@K, MRR)
 *
 * Ablation grid (editable in code)
 *  - hiddenUnitSequences:
 *      [512,256,128], [256,128,64,32], [256,128,64,32,16], [128,64,32,16,8,4]
 *  - activationSchemes:
 *      all_relu, all_gelu, all_leaky, hybrid_rgL (relu→gelu→leaky), hybrid_grL (gelu→relu→leaky)
 *  - dropouts: 0.0, 0.02, 0.05
 *
 * CLI flags (all optional)
 *  --sample=1000      Number of rows from train.csv (default 1000)
 *  --split=0.2        Fraction used as queries (default 0.2)
 *  --topK=5           Evaluate up to Recall@K (default 5)
 *  --repeats=3        Runs per configuration (default 3)
 *  --csv=results.csv  Output CSV filename (default timestamped)
 *
 * Inputs & assumptions
 *  - Dataset: ../../public/ag-news-classification-dataset/train.csv  (label,text CSV)
 *  - Model:  Xenova/all-MiniLM-L6-v2 (downloaded on first run by @xenova/transformers)
 *  - Environment: Node 18+, ts-node, no GPU required.
 *
 * Outputs
 *  - Console: SBERT baseline and per-config DeepELM metrics.
 *  - CSV: one row per config/run with recall@1, recall@K, MRR, and config metadata.
 *
 * Usage
 *   npx ts-node --esm node_examples/deepelm-ablation.ts
 *   npx ts-node --esm node_examples/deepelm-ablation.ts --sample=5000 --repeats=2 --csv=deepelm_results.csv
 */

import fs from "fs";
import { parse } from "csv-parse/sync";
import { pipeline } from "@xenova/transformers";
import { DeepELM } from "@astermind/astermind-elm";

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

const SAMPLE = Number(flags.sample ?? 1000);
const SPLIT = Math.min(0.9, Math.max(0.05, Number(flags.split ?? 0.2)));
const TOP_K = Math.max(1, Number(flags.topK ?? 5));
const REPEATS = Math.max(1, Number(flags.repeats ?? 3));

const CSV_FILE =
    typeof flags.csv === "string"
        ? String(flags.csv)
        : `deepelm_ablation_${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;

// ---------- helpers ----------
function cosine(a: number[], b: number[]): number {
    let dot = 0, a2 = 0, b2 = 0;
    for (let i = 0; i < a.length; i++) {
        const ai = a[i], bi = b[i];
        dot += ai * bi; a2 += ai * ai; b2 += bi * bi;
    }
    const na = Math.sqrt(a2) || 1, nb = Math.sqrt(b2) || 1;
    return dot / (na * nb);
}

function l2(v: number[]): number[] {
    let s = 0; for (let i = 0; i < v.length; i++) s += v[i] * v[i];
    const inv = 1 / (Math.sqrt(s) || 1);
    return v.map(x => x * inv);
}

function evaluateRecallMRR(
    query: number[][],
    reference: number[][],
    qLabels: string[],
    rLabels: string[],
    k: number
) {
    let hits1 = 0, hitsK = 0, rr = 0;
    for (let i = 0; i < query.length; i++) {
        const scores = reference.map((emb, j) => ({
            label: rLabels[j],
            score: cosine(query[i], emb),
        }));
        scores.sort((a, b) => b.score - a.score);
        const ranked = scores.map(s => s.label);
        if (ranked[0] === qLabels[i]) hits1++;
        if (ranked.slice(0, k).includes(qLabels[i])) hitsK++;
        const rank = ranked.indexOf(qLabels[i]);
        rr += rank === -1 ? 0 : 1 / (rank + 1);
    }
    const n = query.length;
    return { recall1: hits1 / n, recallK: hitsK / n, mrr: rr / n };
}

// ---------- ablation grids ----------
const hiddenUnitSequences: number[][] = [
    [512, 256, 128],
    [256, 128, 64, 32],
    [256, 128, 64, 32, 16],
    [128, 64, 32, 16, 8, 4],
];

// Keep to activations known in your library: 'relu' | 'gelu' | 'leakyrelu'
type Act = "relu" | "gelu" | "leakyrelu";

// A few per-layer activation patterns to try
const activationSchemes: Record<string, (i: number) => Act> = {
    all_relu: () => "relu",
    all_gelu: () => "gelu",
    all_leaky: () => "leakyrelu",
    hybrid_rgL: (i) => (i % 3 === 0 ? "relu" : i % 3 === 1 ? "gelu" : "leakyrelu"),
    hybrid_grL: (i) => (i % 3 === 0 ? "gelu" : i % 3 === 1 ? "relu" : "leakyrelu"),
};

const dropouts = [0.0, 0.02, 0.05];

// ---------- main ----------
(async () => {
    // Load AG News (train.csv)
    const csvFile = fs.readFileSync("../../public/ag-news-classification-dataset/train.csv", "utf8");
    const raw = parse(csvFile, { skip_empty_lines: true }) as string[][];
    const records = raw.map(row => ({ text: row[1].trim(), label: row[0].trim() }));

    const sample = records.slice(0, SAMPLE);
    const texts = sample.map(r => r.text);
    const labels = sample.map(r => r.label);

    const splitIdx = Math.max(1, Math.floor(texts.length * SPLIT));
    const queryTexts = texts.slice(0, splitIdx);
    const refTexts = texts.slice(splitIdx);
    const queryLabels = labels.slice(0, splitIdx);
    const refLabels = labels.slice(splitIdx);

    // SBERT embeddings (once)
    console.log(`⏳ Loading Sentence-BERT (Xenova/all-MiniLM-L6-v2) ...`);
    const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    const allSBERT = (await embedder(texts, { pooling: "mean" })).tolist() as number[][];
    const qSBERT = allSBERT.slice(0, splitIdx);
    const rSBERT = allSBERT.slice(splitIdx);
    const D = rSBERT[0].length;

    // Baseline in SBERT space
    const base = evaluateRecallMRR(qSBERT, rSBERT, queryLabels, refLabels, TOP_K);
    console.log(`\n📊 SBERT baseline → R@1=${(base.recall1 * 100).toFixed(1)} R@${TOP_K}=${(base.recallK * 100).toFixed(1)} MRR=${base.mrr.toFixed(3)}`);

    const lines: string[] = [
        `config,run,recall_at_1,recall_at_${TOP_K},mrr,sample,split,topK,layers,activation_scheme,dropout`
    ];
    lines.push(`SBERT,NA,${base.recall1.toFixed(4)},${base.recallK.toFixed(4)},${base.mrr.toFixed(4)},${SAMPLE},${SPLIT},${TOP_K},-,-,-`);

    // DeepELM ablations
    for (const seq of hiddenUnitSequences) {
        for (const [schemeName, scheme] of Object.entries(activationSchemes)) {
            for (const dropout of dropouts) {
                for (let run = 1; run <= REPEATS; run++) {
                    console.log(`\n🔹 DeepELM config: layers=[${seq.join(",")}], act=${schemeName}, dropout=${dropout} (run ${run}/${REPEATS})`);

                    const deep = new DeepELM({
                        inputDim: D,
                        layers: seq.map((h, i) => ({
                            hiddenUnits: h,
                            activation: scheme(i),      // per-layer activation
                            ridgeLambda: 1e-2,
                            dropout,
                        })),
                        numClasses: 4,                 // not used here; no classifier
                        clfHiddenUnits: 0,
                        clfActivation: "linear",
                        clfWeightInit: "xavier",
                        normalizeEach: false,
                        normalizeFinal: true,
                    } as any);

                    console.time("deep.fitAE");
                    deep.fitAutoencoders(rSBERT);    // fit on reference only (no leakage)
                    console.timeEnd("deep.fitAE");

                    const rDeep = (deep.transform(rSBERT) as number[][]).map(l2);
                    const qDeep = (deep.transform(qSBERT) as number[][]).map(l2);
                    const res = evaluateRecallMRR(qDeep, rDeep, queryLabels, refLabels, TOP_K);

                    console.log(`✅ DeepELM → R@1=${(res.recall1 * 100).toFixed(1)} R@${TOP_K}=${(res.recallK * 100).toFixed(1)} MRR=${res.mrr.toFixed(3)}`);

                    lines.push(
                        `DeepELM_${seq.join("-")},${run},${res.recall1.toFixed(4)},${res.recallK.toFixed(4)},${res.mrr.toFixed(4)},` +
                        `${SAMPLE},${SPLIT},${TOP_K},"${seq.join("-")}",${schemeName},${dropout}`
                    );
                }
            }
        }
    }

    fs.writeFileSync(CSV_FILE, lines.join("\n"));
    console.log(`\n💾 Saved ablation results → ${CSV_FILE}`);
    console.log(`\n✅ Done.`);
})().catch(e => {
    console.error(e);
    process.exit(1);
});
