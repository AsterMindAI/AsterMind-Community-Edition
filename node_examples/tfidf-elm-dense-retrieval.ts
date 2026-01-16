// © 2026 AsterMind AI Co. – All Rights Reserved.
// Patent Pending US 63/897,713
/**
 * Book Index — TF-IDF → ELM (Autoencoder) + Hybrid Re-rank (Dense ⊕ TF-IDF)
 *
 * What this shows
 *  - Build TF-IDF vectors for each markdown section (lexical signal).
 *  - Train a tiny ELM autoencoder (X→X) on TF-IDF and use its hidden layer as a dense embedding.
 *  - Retrieve with cosine KNN in dense space, then re-rank by a weighted blend:
 *        score = α * cosine_dense + (1-α) * cosine_tfidf
 *
 * Why this is nice
 *  - TF-IDF anchors exact keywords (“map”, “goroutine”, etc.).
 *  - The ELM smooths into a semantic space that tolerates phrasing changes.
 *  - The blend stabilizes results on technical text without heavyweight models.
 *
 * Pipeline
 *   Markdown ─► Section Split (#..######)
 *             ├► TF-IDF (L2) ──────────────┐
 *             └► ELM Autoencoder (X→X) ─► Dense (L2)
 *                     ▲                     │
 *               query TF-IDF (L2) ─────────┼──► store.query (dense prefilter)
 *                                           └──► blend: α*dense + (1-α)*tfidf
 *
 * CLI flags (all optional)
 *  --file=../public/go_textbook.md   Markdown source (default above)
 *  --vocab=5000                      TF-IDF vocab size (default 5000)
 *  --hidden=128                      ELM hidden size / embedding dim (default 128)
 *  --dropout=0.02                    ELM dropout (default 0.02)
 *  --act=gelu|relu|tanh|leakyRelu    ELM activation (default gelu)
 *  --alpha=0.7                       Blend weight α (dense) in [0,1] (default 0.7)
 *  --prefilter=200                   Preselect this many by dense before blending (default 200)
 *  --topK=5                          Results to show (default 5)
 *
 * Usage
 *  npx ts-node --esm node_examples/tfidf-elm-dense-retrieval.ts
 *  npx ts-node --esm node_examples/tfidf-elm-dense-retrieval.ts --alpha=0.75 --prefilter=300 --vocab=8000 --hidden=256 --act=gelu
 */

import fs from "fs";
import { ELM, TFIDFVectorizer, EmbeddingStore } from "@astermind/astermind-elm";

/* -------------------- tiny flag parser -------------------- */
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
const FILE = String(flags.file ?? "../public/go_textbook.md");
const VOCAB = Math.max(200, Number(flags.vocab ?? 5000));
const HIDDEN = Math.max(8, Number(flags.hidden ?? 128));
const DROPOUT = Number(flags.dropout ?? 0.02);
const ACT = String(flags.act ?? "gelu") as "gelu" | "relu" | "tanh" | "leakyRelu";
const ALPHA = Math.min(1, Math.max(0, Number(flags.alpha ?? 0.7)));
const PREFILTER = Math.max(TopKSafe(Number(flags.prefilter ?? 200)), 10);
const TOP_K = TopKSafe(Number(flags.topK ?? 5));

function TopKSafe(x: number) { return Math.max(1, Math.floor(Number.isFinite(x) ? x : 5)); }

/* ------------------------- utils -------------------------- */
const l2 = (v: number[]) => {
    const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    return n === 0 ? v : v.map((x) => x / n);
};
const dot = (a: number[], b: number[]) => {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
};

/* ---------------------- load + split ---------------------- */
// Split into sections by headings (# .. ######)
const rawText = fs.readFileSync(FILE, "utf8");
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

/* -------------------- TF-IDF features -------------------- */
console.log(`⏳ Computing TF-IDF (vocab=${VOCAB}) ...`);
const texts = sections.map((s) => `${s.heading}. ${s.content}`);
const vectorizer = new TFIDFVectorizer(texts, VOCAB);
const tfidfVectors = vectorizer.vectorizeAll().map(l2);
const Dtf = tfidfVectors[0]?.length ?? 0;
console.log(`✅ TF-IDF ready. D=${Dtf}`);

/* --------------- ELM autoencoder (X→X on TF-IDF) --------------- */
console.log(`⚙️ Training ELM autoencoder (X→X) on TF-IDF ...`);
const elm = new ELM({
    categories: [],                 // numeric/autoencoder mode
    hiddenUnits: HIDDEN,
    maxLen: Dtf,
    activation: ACT,
    dropout: DROPOUT,
    weightInit: "xavier",
    log: { modelName: "ELM-TFIDF-AE", verbose: true, toFile: false },
});

// load or train weights
fs.mkdirSync("./elm_weights", { recursive: true });
const weightsFile = `./elm_weights/elm_tfidf_autoencoder_${VOCAB}v_${HIDDEN}h_${ACT}.json`;
if (fs.existsSync(weightsFile)) {
    elm.loadModelFromJSON(fs.readFileSync(weightsFile, "utf-8"));
    console.log(`✅ Loaded ELM weights → ${weightsFile}`);
} else {
    elm.trainFromData(tfidfVectors, tfidfVectors);
    fs.writeFileSync(weightsFile, JSON.stringify(elm.model));
    console.log(`💾 Saved ELM weights → ${weightsFile}`);
}

/* ------------------ dense embeddings + store ------------------ */
const denseEmbeddings = elm.computeHiddenLayer(tfidfVectors).map(l2);
const store = new EmbeddingStore<{ heading: string; text: string }>(HIDDEN, { storeUnit: true });
sections.forEach((s, i) => {
    store.add({ id: String(i), vec: denseEmbeddings[i], meta: { heading: s.heading, text: s.content } });
});
console.log(`📦 Dense store: N=${sections.length} dim=${HIDDEN}`);

// optional artifact for inspection
fs.writeFileSync(
    "./embeddings.json",
    JSON.stringify(
        sections.map((s, i) => ({ embedding: denseEmbeddings[i], heading: s.heading, text: s.content })),
        null,
        2
    )
);
console.log(`💾 Saved embeddings → embeddings.json`);

/* ------------------------- retrieval ------------------------- */
type Hit = {
    rank: number;
    score: number;
    dense: number;
    tfidf: number;
    heading: string;
    snippet: string;
};

function retrieve(query: string, topK = TOP_K, alpha = ALPHA, prefilter = PREFILTER): Hit[] {
    // query encodings (both normalized)
    const qTF = l2(vectorizer.vectorize(query));
    const qDense = l2(elm.computeHiddenLayer([qTF])[0]);

    // dense prefilter (avoid scoring all sections)
    const kPref = Math.max(prefilter, topK);
    const denseHits = store.query(qDense, kPref, { metric: "cosine" });

    // blend dense + TFIDF on the prefiltered pool
    const scored = denseHits.map((h: { id: any; score: any; }, i: number) => {
        const idx = Number(h.id);
        const dense = h.score;                          // cosine in dense space (both unit)
        const tfidf = dot(qTF, tfidfVectors[idx]);      // cosine in tf-idf space (both unit)
        const total = alpha * dense + (1 - alpha) * tfidf;
        return { idx, rank: i + 1, total, dense, tfidf };
    });

    scored.sort((a: { total: number; }, b: { total: number; }) => b.total - a.total);
    return scored.slice(0, topK).map(({ idx, total, dense, tfidf }: any, r: number) => ({
        rank: r + 1,
        score: total,
        dense,
        tfidf,
        heading: sections[idx].heading,
        snippet: sections[idx].content.slice(0, 180),
    }));
}

/* -------------------------- demo run -------------------------- */
const DEMO_Q = "How do you declare a map in Go?";
const results = retrieve(DEMO_Q);

console.log(`\n🔎 Query: ${DEMO_Q}`);
results.forEach((r) =>
    console.log(
        `${r.rank}. [total=${r.score.toFixed(4)} | dense=${r.dense.toFixed(4)} | tfidf=${r.tfidf.toFixed(4)}] ${r.heading} — ${r.snippet}...`
    )
);

console.log(`\n✅ Done.`);
