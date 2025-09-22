/**
 * Weighted Hybrid Multi-Level Retrieval — Residual Student + RRF (Markdown Corpus)
 *
 * What this script demonstrates
 *  1) Parse a markdown “textbook” into (heading, content) sections.
 *  2) Build two families of signals:
 *       • TF-IDF baseline (lowercased text) for strong lexical grounding.
 *       • Dense paragraph embeddings from a stacked ELM “Paragraph Chain” (X→X).
 *  3) Train a small **Residual Student** ELM on supervised (query, target) pairs:
 *       student learns Δ = (target_chain − query_chain) and predicts q′ = q + Δ.
 *  4) **Hybrid retrieval** with:
 *       • Dynamic α for linear blend: score_lin = α·cos(student_dense) + (1−α)·cos(tfidf),
 *         where α adapts per query based on TF-IDF strength (higher α when TF-IDF is weak).
 *       • **RRF rank fusion** (scale-free) over TF-IDF, student-dense, and plain-dense:
 *         RRF(i) = Σ_c 1/(k + rank_c(i)), then add a small linear tie-breaker.
 *  5) Optional Stage-1 **shortlist** = union(top-N TF-IDF, top-N student-dense) for speed.
 *  6) Console mini-evaluation using a small supervised sample.
 *
 * Why this version
 *  - Residual student improves dense matching by learning a *direction* toward targets.
 *  - Dynamic α keeps lexical wins when TF is confident; leans dense when TF is weak.
 *  - RRF fusion is robust to score scales and often boosts recall@K.
 *  - All models are tiny ELMs; training and inference are CPU-friendly and cached.
 *
 * Pipeline Overview
 *
 *     Markdown (heading + content)
 *                │
 *      ┌─────────┴─────────┐
 *      │                   │
 *   TF-IDF (lowercase)   UniversalEncoder(char) → Paragraph Chain (ELM X→X)
 *      │                                     │
 *      │                         (supervised pairs encoded through the chain)
 *      │                                     │
 *      │                          Residual Student ELM (q → Δ)
 *      │                                     │
 *      └────────────┬──────────────┬─────────┘
 *                   │              │
 *           TF score(q, doc)   Dense scores
 *                                 ├─ plain: cos(q_chain, doc_chain)
 *                                 └─ student: cos(q_chain + Δ, doc_chain)
 *                   │              │
 *                   └───── RRF rank fusion + dynamic α linear blend ─────► Top-K
 *
 * CLI flags (all optional; defaults in parentheses)
 *  --vocab=8000         TF-IDF vocab cap (8000)
 *  --maxLen=120         UniversalEncoder max length (120)
 *  --seq=256,128        Paragraph chain hidden sizes, stacked (256,128)
 *  --dropout=0.02       Dropout for ELMs (0.02)
 *  --alpha=0.65         Baseline α for dense in linear blend (dynamic per query)
 *  --stage1=ALL         Stage-1 cap: number or ALL (ALL)
 *  --topK=5             Results to print (5)
 *  --mini_eval=10       #supervised pairs to sample for mini-eval (10)
 *
 * Inputs & assumptions
 *  - Corpus: ../../public/go_textbook.md (markdown with #/##/### headings).
 *  - Supervised pairs (optional, any subset present will be used):
 *      ../public/supervised_pairs.csv
 *      ../public/supervised_pairs_2.csv
 *      ../public/supervised_pairs_3.csv
 *      ../public/supervised_pairs_4.csv
 *  - Environment: Node 18+, ts-node, CPU (no GPU required).
 *  - Library: @astermind/astermind-elm (ELM, ELMChain, TFIDFVectorizer, UniversalEncoder).
 *
 * Outputs
 *  - Console: training/load logs, demo top-K results, mini-eval Hit@1/Hit@K.
 *  - JSON: ./embeddings/book_paragraph_embeddings.json (final chain embeddings + metadata).
 *  - Weights (auto-cached): ./elm_weights/paragraph_chain_L*.json, student_q2delta_*.json
 *
 * Usage
 *   npx ts-node --esm node_examples/train_weighted_hybrid_multilevel_pipeline.ts
 *   npx ts-node --esm node_examples/train_weighted_hybrid_multilevel_pipeline.ts \
 *     --vocab=8000 --seq=256,128 --alpha=0.65 --stage1=200 --topK=5
 */

import fs from "fs";
import { parse } from "csv-parse/sync";
import { ELM, ELMChain, TFIDFVectorizer, UniversalEncoder } from "@astermind/astermind-elm";

/*

/* ----------------------- tiny flag parser ----------------------- */
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

/* ----------------------- config (with CLI) ---------------------- */
const VOCAB = Math.max(500, Number(flags.vocab ?? 8000));
const MAXLEN = Math.max(60, Number(flags.maxLen ?? 120));
const SEQ = String(flags.seq ?? "256,128")
    .split(",")
    .map((s) => Math.max(1, Number(s.trim())));
const DROPOUT = Number(flags.dropout ?? 0.02);
const BASE_ALPHA = Math.min(0.95, Math.max(0.05, Number(flags.alpha ?? 0.65))); // baseline; dynamic per query
const STAGE1 = String(flags.stage1 ?? "ALL"); // "ALL" or a number as string
const TOPK = Math.max(1, Number(flags.topK ?? 5));
const MINI_EVAL = Math.max(0, Number(flags.mini_eval ?? 10));

/* ---------------------------- utils ----------------------------- */
const EPS = 1e-12;
const l2 = (v: number[]) => {
    let s = 0;
    for (let i = 0; i < v.length; i++) s += v[i] * v[i];
    const n = Math.sqrt(s);
    if (!isFinite(n) || n < EPS) return v.map(() => 0);
    const inv = 1 / n;
    return v.map((x) => x * inv);
};
const cosine = (a: number[], b: number[]) => {
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
};
const zeroCenter = (X: number[][]) => {
    const d = X[0].length;
    const mean = Array(d).fill(0);
    for (const v of X) for (let j = 0; j < d; j++) mean[j] += v[j];
    for (let j = 0; j < d; j++) mean[j] /= X.length;
    return X.map((v) => v.map((x, j) => x - mean[j]));
};
function processEmbeddings(embs: number[][], label = "") {
    const centered = zeroCenter(embs);
    const normalized = centered.map(l2);
    // tiny stats
    let sum = 0,
        cnt = 0,
        min = Infinity,
        max = -Infinity;
    for (const v of normalized) {
        for (const x of v) {
            sum += x;
            cnt++;
            if (x < min) min = x;
            if (x > max) max = x;
        }
    }
    console.log(
        `✅ [${label}] Embeds: mean=${(sum / (cnt || 1)).toFixed(6)} min=${min.toFixed(
            6
        )} max=${max.toFixed(6)}`
    );
    return normalized;
}

function ranks(values: number[]): number[] {
    const order = values.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
    const r = Array(values.length).fill(0);
    order.forEach((o, idx) => (r[o.i] = idx + 1)); // 1=best rank
    return r;
}
const rrfScore = (rank: number, k = 60) => 1 / (k + rank);

/* ---------------------- 1) Load the corpus ---------------------- */
const corpusPath = "../../public/go_textbook.md";
const rawText = fs.readFileSync(corpusPath, "utf8");

// Parse sections by headings (#..######)
const rawSections = rawText.split(/\n(?=#{1,6}\s)/);
const sections = rawSections
    .map((block) => {
        const lines = block.split("\n").filter(Boolean);
        const headingLine = lines.find((l) => /^#{1,6}\s/.test(l)) || "";
        const contentLines = lines.filter((l) => !/^#{1,6}\s/.test(l));
        return {
            heading: headingLine.replace(/^#{1,6}\s/, "").trim(),
            content: contentLines.join(" ").trim(),
        };
    })
    .filter((s) => s.content.length > 30);

console.log(`✅ Parsed ${sections.length} sections.`);

/* -------------------- 2) TF-IDF features ------------------------ */
console.log(`⏳ Computing TF-IDF (vocab=${VOCAB}) ...`);
const texts = sections.map((s) => `${s.heading} ${s.content}`.toLowerCase());
const tfidf = new TFIDFVectorizer(texts, VOCAB);
const tfAll = texts.map((t) => l2(tfidf.vectorize(t)));
console.log(`✅ TF-IDF ready. D=${tfAll[0].length}`);

/* -------------------- 3) Base paragraph vectors ----------------- */
const encoder = new UniversalEncoder({
    maxLen: MAXLEN,
    charSet:
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:;!?()[]{}<>+-=*/%\"'`_#|\\ \t",
    mode: "char",
    useTokenizer: false,
});
const paraBase = texts.map((t) => l2(encoder.normalize(encoder.encode(t))));
console.log(`✅ Base paragraph vectors (dim=${paraBase[0].length}).`);

/* ---------------- 4) Paragraph chain (X→X stacking) -------------- */
let cur = paraBase;
const chainLayers: ELM[] = [];
for (let i = 0; i < SEQ.length; i++) {
    const h = SEQ[i];
    const elm = new ELM({
        activation: i % 2 === 0 ? "relu" : "tanh",
        hiddenUnits: h,
        maxLen: cur[0].length,
        categories: [],
        log: { modelName: `paragraph_chain_L${i + 1}_h${h}`, verbose: true },
        dropout: DROPOUT,
        weightInit: "xavier",
    });
    const path = `./elm_weights/paragraph_chain_L${i + 1}_h${h}.json`;
    if (fs.existsSync(path)) {
        elm.loadModelFromJSON(fs.readFileSync(path, "utf-8"));
        console.log(`✅ Loaded paragraph_chain layer ${i + 1} (h=${h}).`);
    } else {
        console.log(`⚙️ Training paragraph_chain layer ${i + 1} (X→X) ...`);
        elm.trainFromData(cur, cur);
        fs.writeFileSync(path, JSON.stringify(elm.model));
        console.log(`💾 Saved paragraph_chain layer ${i + 1} → ${path}`);
    }
    cur = processEmbeddings(elm.computeHiddenLayer(cur), `chain_L${i + 1}`);
    chainLayers.push(elm);
}
const paragraphChain = new ELMChain(chainLayers);
const paraEmb = cur; // final chain space
console.log(
    `✅ Paragraph chain ready (seq=${SEQ.join("-")}, dropout=${DROPOUT}).`
);

/* ------------- 5) Supervised pairs → Residual student ----------- */
const supPaths = [
    "../public/supervised_pairs.csv",
    "../public/supervised_pairs_2.csv",
    "../public/supervised_pairs_3.csv",
    "../public/supervised_pairs_4.csv",
];

let pairs: { query: string; target: string }[] = [];
for (const p of supPaths) {
    if (!fs.existsSync(p)) continue;
    const csv = fs.readFileSync(p, "utf8");
    const rows = parse(csv, { skip_empty_lines: true }) as string[][];
    for (const r of rows) {
        const q = (r[0] ?? "").trim();
        const t = (r[1] ?? "").trim();
        if (q && t) pairs.push({ query: q, target: t });
    }
}
console.log(`✅ Loaded ${pairs.length} supervised pairs.`);

// Encode pairs through the same encoder + chain, then L2
const supQraw = pairs.map((p) =>
    l2(encoder.normalize(encoder.encode(p.query)))
);
const supTraw = pairs.map((p) =>
    l2(encoder.normalize(encoder.encode(p.target)))
);
const supQ = supQraw.map(
    (v) => l2((paragraphChain.getEmbedding([v])[0] as number[]) ?? v) // to chain space
);
const supT = supTraw.map(
    (v) => l2((paragraphChain.getEmbedding([v])[0] as number[]) ?? v)
);

// Residual targets: Δ = T − Q
const supDelta = supQ.map((q, i) => q.map((x, j) => supT[i][j] - x));

const student = new ELM({
    activation: "gelu",
    hiddenUnits: SEQ[SEQ.length - 1], // same dim as chain tail (usually 128)
    maxLen: supQ[0].length,
    categories: [],
    log: { modelName: "StudentELM(q→Δ)", verbose: true },
    dropout: DROPOUT,
    weightInit: "xavier",
});
const studentPath = `./elm_weights/student_q2delta_in${supQ[0].length}_out${SEQ[
    SEQ.length - 1
]}.json`;
if (fs.existsSync(studentPath)) {
    student.loadModelFromJSON(fs.readFileSync(studentPath, "utf-8"));
    console.log(`✅ Loaded StudentELM (q→Δ).`);
} else {
    console.log(`⚙️ Training StudentELM (q→Δ in chain space) …`);
    student.trainFromData(supQ, supDelta);
    fs.writeFileSync(studentPath, JSON.stringify(student.model));
    console.log(`💾 Saved StudentELM → ${studentPath}`);
}

/* ---------------------- 6) Retrieval bits ----------------------- */
function encodeThroughChain(text: string): number[] {
    const v0 = l2(encoder.normalize(encoder.encode(text)));
    const vC = (paragraphChain.getEmbedding([v0])[0] as number[]) ?? v0;
    return l2(vC);
}
function studentPredict(qChain: number[]): number[] {
    const d = (student.computeHiddenLayer([qChain])[0] as number[]) ?? qChain.map(() => 0);
    // residual add, then L2
    const pred = qChain.map((x, j) => x + d[j]);
    return l2(pred);
}

// Optional Stage-1 shortlist (by TF and densePred union)
function stage1Candidates(
    tfScores: number[],
    densePred: number[],
    cap: number | "ALL"
): number[] {
    if (cap === "ALL") return tfScores.map((_, i) => i);
    const n = Math.min(tfScores.length, cap);
    const topTF = tfScores
        .map((v, i) => ({ v, i }))
        .sort((a, b) => b.v - a.v)
        .slice(0, Math.floor(n / 2))
        .map((x) => x.i);
    const topDP = densePred
        .map((v, i) => ({ v, i }))
        .sort((a, b) => b.v - a.v)
        .slice(0, Math.ceil(n / 2))
        .map((x) => x.i);
    return Array.from(new Set([...topTF, ...topDP]));
}

function retrieve(query: string, topK = TOPK) {
    const qTF = l2(tfidf.vectorize(query.toLowerCase()));
    const tfScores = tfAll.map((v) => cosine(qTF, v));

    const qChain = encodeThroughChain(query);
    const qPred = studentPredict(qChain);
    const densePred = paraEmb.map((v) => cosine(qPred, v));   // student (q + Δ)
    const densePlain = paraEmb.map((v) => cosine(qChain, v)); // backup dense

    // Dynamic α: strong TF → lower α; weak TF → higher α
    const tfMax = Math.max(...tfScores);
    const dynAlpha = Math.min(
        0.85,
        Math.max(0.45, BASE_ALPHA + (0.85 - BASE_ALPHA) * (1 - tfMax))
    );

    // Stage-1 shortlist (optional)
    const cap =
        STAGE1.toUpperCase?.() === "ALL" ? ("ALL" as const) : Math.max(10, Number(STAGE1) || 200);
    const candIdx = stage1Candidates(tfScores, densePred, cap);

    // RRF over three signals + tiny linear tiebreak
    const rTF = ranks(tfScores);
    const rDP = ranks(densePred);
    const rDC = ranks(densePlain);

    const fused = candIdx.map((i) => {
        const rrf =
            rrfScore(rTF[i]) * (1 - dynAlpha) +
            0.8 * rrfScore(rDP[i]) +
            0.2 * rrfScore(rDC[i]);
        const linear = dynAlpha * densePred[i] + (1 - dynAlpha) * tfScores[i];
        return {
            i,
            total: rrf + 0.05 * linear,
            dense: densePred[i],
            tfidf: tfScores[i],
        };
    });

    fused.sort((a, b) => b.total - a.total);
    return fused.slice(0, topK).map((r) => ({
        total: r.total,
        dense: r.dense,
        tfidf: r.tfidf,
        heading: sections[r.i].heading,
        text: sections[r.i].content,
    }));
}

/* ---------------------- 7) Save embeddings ---------------------- */
const embRecs = sections.map((s, i) => ({
    embedding: paraEmb[i],
    metadata: { heading: s.heading, text: s.content },
}));
fs.mkdirSync("./embeddings", { recursive: true });
fs.writeFileSync(
    "./embeddings/book_paragraph_embeddings.json",
    JSON.stringify(embRecs, null, 2)
);
console.log(`💾 Saved paragraph embeddings → ./embeddings/book_paragraph_embeddings.json`);

/* ------------------------ 8) Demo query ------------------------- */
const sampleQ = "How do you declare a map in Go?";
const results = retrieve(sampleQ, TOPK);
console.log(`\n🔎 Query: ${sampleQ}`);
results.forEach((r, i) =>
    console.log(
        `${i + 1}. [total=${r.total.toFixed(4)} | dense=${r.dense.toFixed(
            4
        )} | tfidf=${r.tfidf.toFixed(4)}] ${r.heading} — ${r.text.slice(0, 120)}…`
    )
);

/* ---------------------- 9) Mini-evaluation ---------------------- */
function miniEval(k = TOPK, samples = MINI_EVAL) {
    if (pairs.length === 0 || samples <= 0) {
        console.log(`\n🧪 Mini-eval skipped (no supervised pairs).`);
        return;
    }
    const N = Math.min(samples, pairs.length);
    let hit1 = 0,
        hitK = 0;
    for (let i = 0; i < N; i++) {
        const q = pairs[i].query;
        const t = pairs[i].target.toLowerCase();
        const top = retrieve(q, k);

        const idx1 = top[0]?.text.toLowerCase().includes(t) || top[0]?.heading.toLowerCase().includes(t);
        if (idx1) hit1++;

        const anyK = top.some(
            (r) =>
                r.text.toLowerCase().includes(t) ||
                r.heading.toLowerCase().includes(t)
        );
        if (anyK) hitK++;
    }
    console.log(
        `\n🧪 Mini-eval: Hit@1 ${(100 * (hit1 / N)).toFixed(1)}% (${hit1}/${N})  •  Hit@${k} ${(100 * (hitK / N)).toFixed(1)}% (${hitK}/${N})`
    );
}

console.log(
    `\n{ sections: ${sections.length}, tfidf_dim: ${tfAll[0].length}, chain_dim: ${paraEmb[0].length
    }, alpha_base: ${BASE_ALPHA}, stage1: ${STAGE1} }`
);
miniEval(TOPK, MINI_EVAL);
console.log(`\n✅ Done.`);
