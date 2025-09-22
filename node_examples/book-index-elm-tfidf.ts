/**
 * Book Index (Hybrid Dense + TF-IDF) — Paragraph ELM + Indexer Chain
 *
 * What this demo shows
 *  - How to turn a long Markdown book into a searchable index using
 *    paragraph-level dense embeddings (Paragraph ELM → Indexer ELMChain),
 *    blended with a classic TF-IDF score.
 *  - Whitening of dense vectors (z-score + L2) to spread cosine geometry
 *    and avoid 0.99-everywhere collapse.
 *  - A tunable blend: total = α * dense + (1-α) * TF-IDF (min-max per query).
 *
 * Why this is useful
 *  - Dense vectors handle paraphrase and structure.
 *  - TF-IDF keeps keyword precision (critical for technical text).
 *  - Paragraph chunks return sharper, “local” hits than chapter-sized blocks.
 *
 * Pipeline
 *
 *    Markdown ── split→paragraphs ──► UniversalEncoder (char) ──► Paragraph ELM (X→X)
 *                                                        │
 *                                                        └─► Indexer ELMChain (stacked X→X) ──► Dense (z-score + L2)
 *                 └────────────────────────────────────────────────────────────────────────────► TF-IDF (vocab=N)
 *                                                                 │
 *                                                                 ▼
 *                                       Score each paragraph:
 *                                         dense = cosine(q_dense, d_dense)
 *                                         tfidf = cosine(q_tfidf, d_tfidf)
 *                                         total = α * dense' + (1-α) * tfidf'
 *                                           (min-max normalize dense' / tfidf' per query)
 *
 * CLI flags (all optional)
 *  --alpha=0.4         Dense weight α (default 0.4 → TF-IDF gets 0.6)
 *  --vocab=5000        TF-IDF vocabulary size
 *  --maxLen=256        UniversalEncoder char length
 *  --paraDim=128       Paragraph ELM hidden units
 *  --indexSeq=256,128  Indexer ELM hidden units (comma-sep list)
 *  --dropout=0.02      Dropout for all ELMs
 *  --topK=5            Retrieval top-K for printing
 *  --book=../public/go_textbook.md   Markdown source
 *  --weights=./elm_weights           Directory to cache/load weights
 *
 * Usage
 *  npx ts-node --esm node_examples/book-index-elm-tfidf.ts
 *  npx ts-node --esm node_examples/book-index-elm-tfidf.ts --alpha=0.5 --vocab=8000 --indexSeq=512,256,128
 */

import fs from "fs";
import {
    ELM,
    ELMChain,
    EmbeddingStore,
    UniversalEncoder,
    TFIDFVectorizer,
} from "@astermind/astermind-elm";

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

// ---------- config (with sensible defaults) ----------
const ALPHA = Math.min(1, Math.max(0, Number(flags.alpha ?? 0.4))); // dense weight
const VOCAB = Math.max(500, Number(flags.vocab ?? 5000));
const MAXLEN = Math.max(64, Number(flags.maxLen ?? 256));
const PARA_DIM = Math.max(16, Number(flags.paraDim ?? 128));
const INDEX_SEQ = String(flags.indexSeq ?? "256,128")
    .split(",")
    .map((s) => Math.max(8, Number(s.trim())));
const DROPOUT = Number(flags.dropout ?? 0.02);
const TOP_K = Math.max(1, Number(flags.topK ?? 5));
const BOOK_PATH = String(flags.book ?? "../public/go_textbook.md");
const WEIGHTS_DIR = String(flags.weights ?? "./elm_weights");

// ---------- helpers ----------
function l2(v: number[]): number[] {
    const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
    return v.map((x) => x / n);
}
function cosine(a: number[], b: number[]): number {
    let dot = 0, a2 = 0, b2 = 0;
    for (let i = 0; i < a.length; i++) {
        const ai = a[i], bi = b[i];
        dot += ai * bi; a2 += ai * ai; b2 += bi * bi;
    }
    const na = Math.sqrt(a2) || 1, nb = Math.sqrt(b2) || 1;
    return dot / (na * nb);
}
function ensureDir(dir: string) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
function splitParagraphs(s: string): string[] {
    // blank lines form a paragraph boundary; filter short bits
    return s
        .split(/\n\s*\n+/)
        .map((p) => p.replace(/\s+/g, " ").trim())
        .filter((p) => p.length > 40);
}
function minMaxNormalize(arr: number[]): number[] {
    let min = Infinity, max = -Infinity;
    for (const x of arr) { if (x < min) min = x; if (x > max) max = x; }
    const rng = max - min || 1;
    return arr.map((x) => (x - min) / rng);
}

// ---------- 1) load and chunk the book (paragraph-level) ----------
const rawText = fs.readFileSync(BOOK_PATH, "utf8");

// Split by “### Day …” blocks, then into paragraphs per block
const blocks = rawText.split(/\n(?=### Day )/);
const sections = blocks.flatMap((block) => {
    const lines = block.split("\n");
    const headingLine = lines.find((l) => /^### Day /.test(l)) || "";
    const content = lines.filter((l) => !/^### Day /.test(l)).join("\n");
    const paras = splitParagraphs(content);
    return paras.map((p) => ({
        heading: headingLine.replace(/^### /, "").trim(),
        content: p,
    }));
}).filter((s) => s.content.length > 40);

console.log(`✅ Parsed ${sections.length} sections.`);

// ---------- 2) TF-IDF features ----------
const texts = sections.map((s) => `${s.heading}. ${s.content}`);
console.log(`⏳ Computing TF-IDF (vocab=${VOCAB}) ...`);
const tfidf = new TFIDFVectorizer(texts, VOCAB);
const tfidfVectors: number[][] = tfidf.vectorizeAll().map(l2);
console.log(`✅ TF-IDF ready. D=${tfidfVectors[0]?.length ?? 0}`);

// ---------- 3) UniversalEncoder (char) ----------
const encoder = new UniversalEncoder({
    maxLen: MAXLEN,
    mode: "char",
    useTokenizer: false,
});

// Precompute encoder vectors (normalized)
const encVectors: number[][] = texts.map((t) => l2(encoder.normalize(encoder.encode(t))));

// ---------- 4) Paragraph ELM (X→X on encoder outputs) ----------
ensureDir(WEIGHTS_DIR);
const paraPath = `${WEIGHTS_DIR}/paragraph_elm.json`;
const paraELM = new ELM({
    activation: "relu",
    hiddenUnits: PARA_DIM,
    maxLen: encVectors[0].length,
    categories: [],
    log: { modelName: "ParagraphELM", verbose: true },
    dropout: DROPOUT,
});
if (fs.existsSync(paraPath)) {
    paraELM.loadModelFromJSON(fs.readFileSync(paraPath, "utf8"));
    console.log(`✅ Loaded ParagraphELM weights ← ${paraPath}`);
} else {
    console.log(`⚙️ Training ParagraphELM (X→X on encoder outputs) ...`);
    paraELM.trainFromData(encVectors, encVectors);
    fs.writeFileSync(paraPath, JSON.stringify(paraELM.model));
    console.log(`💾 Saved ParagraphELM → ${paraPath}`);
}
let denseEmbeds: number[][] = paraELM.computeHiddenLayer(encVectors).map(l2);

// ---------- 5) Indexer ELMChain (stacked refinement X→X) ----------
const indexELMs = INDEX_SEQ.map((h, i) => new ELM({
    activation: "relu",
    hiddenUnits: h,
    maxLen: denseEmbeds[0].length,
    categories: [],
    log: { modelName: `IndexerELM_${i + 1}`, verbose: true },
    dropout: DROPOUT,
}));

indexELMs.forEach((elm, i) => {
    const p = `${WEIGHTS_DIR}/indexer_layer_${i + 1}.json`;
    if (fs.existsSync(p)) {
        elm.loadModelFromJSON(fs.readFileSync(p, "utf8"));
        console.log(`✅ Loaded Indexer layer #${i + 1} ← ${p}`);
    } else {
        console.log(`⚙️ Training Indexer layer #${i + 1} (X→X) ...`);
        elm.trainFromData(denseEmbeds, denseEmbeds);
        fs.writeFileSync(p, JSON.stringify(elm.model));
        console.log(`💾 Saved Indexer layer #${i + 1} → ${p}`);
    }
    denseEmbeds = elm.computeHiddenLayer(denseEmbeds).map(l2);
});
const indexer = new ELMChain(indexELMs);
console.log(`✅ Indexer chain ready (seq=${INDEX_SEQ.join("-")}, dropout=${DROPOUT}).`);

// ---------- 6) Whitening (z-score per dimension) + L2 ----------
// Compute on the entire dataset once; reuse for queries
const D = denseEmbeds[0].length;
const mu = Array(D).fill(0);
for (const v of denseEmbeds) for (let j = 0; j < D; j++) mu[j] += v[j];
for (let j = 0; j < D; j++) mu[j] /= denseEmbeds.length;

const sig = Array(D).fill(0);
for (const v of denseEmbeds) for (let j = 0; j < D; j++) {
    const d = v[j] - mu[j]; sig[j] += d * d;
}
for (let j = 0; j < D; j++) sig[j] = Math.sqrt(sig[j] / denseEmbeds.length) || 1;

// Apply whitening + L2
denseEmbeds = denseEmbeds.map((v) => {
    const z = v.map((x, j) => (x - mu[j]) / sig[j]);
    return l2(z);
});

// ---------- 7) Dense store ----------
const store = new EmbeddingStore(D, { storeUnit: true });
sections.forEach((s, i) => {
    store.add({ id: String(i), vec: denseEmbeds[i], meta: { heading: s.heading, text: s.content } });
});
console.log(`📦 Dense store: N=${store.size()} dim=${store.dimension()}`);

// Save offline bundle (optional)
fs.writeFileSync(
    "./embeddings.json",
    JSON.stringify(
        sections.map((s, i) => ({
            vec: denseEmbeds[i],
            tfidf: tfidfVectors[i],
            meta: { heading: s.heading, text: s.content },
        })),
        null,
        2
    )
);
console.log(`💾 Saved embeddings → embeddings.json`);

// ---------- 8) Retrieval (dense + TF-IDF with per-query min-max) ----------
function embedQueryDense(q: string): number[] {
    const qEnc = l2(encoder.normalize(encoder.encode(q)));
    const qPara = paraELM.computeHiddenLayer([qEnc])[0];
    // pass through indexer chain
    let cur = l2(qPara);
    for (const elm of indexELMs) {
        cur = l2(elm.computeHiddenLayer([cur])[0]);
    }
    // apply the same whitening
    const z = cur.map((x, j) => (x - mu[j]) / sig[j]);
    return l2(z);
}

function retrieve(query: string, topK = TOP_K) {
    const qDense = embedQueryDense(query);
    const qTfidf = l2(tfidf.vectorize(query));

    // dense scores for ALL docs (so we can min-max scale consistently)
    const denseHits = store.query(qDense, store.size(), { metric: "cosine", returnVectors: false });
    const dn: number[] = Array(store.size()).fill(0);
    for (let i = 0; i < denseHits.length; i++) {
        const h = denseHits[i];
        const idx: number = h.index; // EmbeddingStore guarantees 'index'
        dn[idx] = h.score;
    }

    // tfidf scores for ALL docs
    const tn: number[] = tfidfVectors.map((v) => cosine(qTfidf, v));

    // min-max normalize both
    const dnN = minMaxNormalize(dn);
    const tnN = minMaxNormalize(tn);

    // blend and rank
    const scored = dnN.map((_, idx) => {
        const total = ALPHA * dnN[idx] + (1 - ALPHA) * tnN[idx];
        return { idx, total, dense: dnN[idx], tfidf: tnN[idx] };
    });
    scored.sort((a, b) => b.total - a.total);
    return scored.slice(0, Math.min(topK, scored.length)).map(({ idx, total, dense, tfidf }) => ({
        heading: sections[idx].heading,
        snippet: sections[idx].content.slice(0, 200),
        total,
        dense,
        tfidf,
    }));
}

// ---------- 9) Demo ----------
const demoQ = "How do you declare a map in Go?";
console.log(`\n🔎 Query: ${demoQ}`);
const results = retrieve(demoQ, TOP_K);
results.forEach((r, i) => {
    console.log(
        `${i + 1}. [total=${r.total.toFixed(4)} | dense=${r.dense.toFixed(4)} | tfidf=${r.tfidf.toFixed(4)}] ` +
        `${r.heading} — ${r.snippet.replace(/\s+/g, " ")}...`
    );
});

console.log(`\n✅ Done.`);
