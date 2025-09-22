/**
 * Multi-View Encoder → ELM (per-view) → Fusion → Indexer ELMChain → Hybrid Retrieval
 * - Fixes TF-IDF case-sensitivity (lowercases docs & query)
 * - Applies heading boost to TF-IDF query too
 * - Stage-1 shortlist = dense ∪ tfidf before hybrid rerank
 *
 * CLI (examples)
 *   npx ts-node --esm node_examples/multiview-encoder-elm-fusion.ts --alpha=0.55 --stage1=150 --tfstage=120 --seq=512,256,128 --vocab=8000 --headBoost=3
 */

import fs from "fs";
import { ELM, ELMChain, TFIDFVectorizer, UniversalEncoder } from "@astermind/astermind-elm";

/* ------------------------------ tiny flag parser ------------------------------ */
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

/* ---------------------------------- config ----------------------------------- */
const ALPHA = Math.min(0.99, Math.max(0, Number(flags.alpha ?? 0.55)));
const STAGE1 = Math.max(5, Number(flags.stage1 ?? 150));     // dense shortlist
const TF_STAGE = Math.max(5, Number(flags.tfstage ?? 120));     // tf-idf shortlist
const SEQ = String(flags.seq ?? "512,256,128").split(",").map(s => Math.max(1, Number(s.trim())));
const DROPOUT = Number(flags.dropout ?? 0.02);
const MAX_LEN = Math.max(32, Number(flags.maxLen ?? 160));
const VOCAB = Math.max(500, Number(flags.vocab ?? 8000));
const HEAD_BOOST = Math.max(1, Number(flags.headBoost ?? 3));
const WORD_DIM = Math.max(8, Number(flags.wordDim ?? 64));
const SENT_DIM = Math.max(8, Number(flags.sentDim ?? 64));
const PARA_DIM = Math.max(16, Number(flags.paraDim ?? 128));
const TOP_K = Math.max(1, Number(flags.topK ?? 5));
const RUN_EVAL = Number(flags.eval ?? 1) !== 0;

/* --------------------------------- helpers ----------------------------------- */
const l2 = (v: number[]) => {
    let s = 0; for (let i = 0; i < v.length; i++) s += v[i] * v[i];
    if (s === 0) return v.slice();
    const inv = 1 / Math.sqrt(s);
    return v.map(x => x * inv);
};
const dot = (a: number[], b: number[]) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
const cosine = (a: number[], b: number[]) => {
    let ab = 0, aa = 0, bb = 0;
    for (let i = 0; i < a.length; i++) { const x = a[i], y = b[i]; ab += x * y; aa += x * x; bb += y * y }
    const na = Math.sqrt(aa) || 1, nb = Math.sqrt(bb) || 1; return ab / (na * nb);
};
const avgVectors = (M: number[][]): number[] => {
    if (!M.length) return [];
    const D = M[0].length, out = new Array<number>(D).fill(0);
    for (let i = 0; i < M.length; i++) { const v = M[i]; for (let j = 0; j < D; j++) out[j] += v[j]; }
    const inv = 1 / M.length; for (let j = 0; j < D; j++) out[j] *= inv; return out;
};
const zeroCenter = (M: number[][]): number[][] => {
    if (!M.length) return M;
    const N = M.length, D = M[0].length, mean = new Array<number>(D).fill(0);
    for (let i = 0; i < N; i++) for (let j = 0; j < D; j++) mean[j] += M[i][j];
    const inv = 1 / N; for (let j = 0; j < D; j++) mean[j] *= inv;
    return M.map(v => v.map((x, j) => x - mean[j]));
};
const ensureDir = (d: string) => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); };

/* ----------------------------- heading boosting ------------------------------ */
function withHeadingBoost(heading: string, content: string): string {
    const boost = Array(HEAD_BOOST).fill(heading).join(". ");
    return `${boost}. ${content}`;
}

/* --------------------------------- load book --------------------------------- */
const rawText = fs.readFileSync("../../public/go_textbook.md", "utf8");
const rawSections = rawText.split(/\n(?=#+ )/);
const sections = rawSections.map(block => {
    const lines = block.split("\n").filter(Boolean);
    const headingLine = lines.find(l => /^#+ /.test(l)) || "";
    const contentLines = lines.filter(l => !/^#+ /.test(l));
    return {
        heading: headingLine.replace(/^#+ /, "").trim(),
        content: contentLines.join(" ").trim(),
    };
}).filter(s => s.content.length > 30);

console.log(`✅ Parsed ${sections.length} sections.`);

/* ------------------------------- base encoders -------------------------------- */
const encoder = new UniversalEncoder({
    maxLen: MAX_LEN,
    charSet: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:;!?()[]{}<>+-=*/%\"'`_#|\\ \t",
    mode: "token",
    useTokenizer: true,
});
const enc = (t: string) => l2(encoder.normalize(encoder.encode(t)));

/* ------------------------------- TF-IDF (boost) ------------------------------- */
/* LOWERCASE here to kill case-mismatch sparsity */
const tfidfTexts: string[] = sections.map(s => withHeadingBoost(s.heading, s.content).toLowerCase());
console.log(`⏳ Computing TF-IDF (vocab=${VOCAB}) ...`);
const tfidf = new TFIDFVectorizer(tfidfTexts, VOCAB);
const tfidfVectors: number[][] = tfidf.vectorizeAll().map((v: number[]) => l2(v));
console.log(`✅ TF-IDF ready. D=${tfidfVectors[0]?.length ?? 0}`);

/* --------------------------- multi-view base features -------------------------- */
console.log(`✅ Preparing base embeddings (word/sentence/paragraph).`);
const wordVectors: number[][] = sections.map(s => {
    const full = withHeadingBoost(s.heading, s.content);
    const toks = full.split(/\s+/).filter(Boolean).slice(0, 128);
    const tokenVecs = toks.length ? toks.map(t => enc(t)) : [enc(full)];
    return l2(avgVectors(tokenVecs));
});
const sentenceVectors: number[][] = sections.map(s => {
    const full = withHeadingBoost(s.heading, s.content);
    const sents = full.split(/[.?!]\s+/).filter(x => x.length > 2).slice(0, 40);
    const sentVecs = sents.length ? sents.map(t => enc(t)) : [enc(full)];
    return l2(avgVectors(sentVecs));
});
const paragraphVectors: number[][] = sections.map(s => enc(withHeadingBoost(s.heading, s.content)));

/* ----------------------------- per-view ELMs (X→X) ---------------------------- */
function trainOrLoadELM(name: string, inputDim: number, hiddenUnits: number, dropout: number) {
    const elm = new ELM({
        activation: "gelu",
        hiddenUnits,
        maxLen: inputDim,
        categories: [],
        dropout,
        log: { modelName: name, verbose: true, toFile: false },
        metrics: { accuracy: 0 },
    });
    ensureDir("./elm_weights");
    const path = `./elm_weights/${name}_in${inputDim}_h${hiddenUnits}_do${dropout}.json`;
    if (fs.existsSync(path)) {
        elm.loadModelFromJSON(fs.readFileSync(path, "utf8"));
        console.log(`✅ Loaded ${name} → ${path}`);
    } else {
        console.log(`⚙️ Training ${name} (X→X) ...`);
        // train with proper data below
    }
    return { elm, path };
}

const { elm: wordELM, path: wordPath } = trainOrLoadELM("mv_word_elm", wordVectors[0].length, WORD_DIM, DROPOUT);
if (!fs.existsSync(wordPath)) { wordELM.trainFromData(wordVectors, wordVectors); fs.writeFileSync(wordPath, JSON.stringify(wordELM.model)); console.log(`💾 Saved mv_word_elm → ${wordPath}`); }
const { elm: sentELM, path: sentPath } = trainOrLoadELM("mv_sent_elm", sentenceVectors[0].length, SENT_DIM, DROPOUT);
if (!fs.existsSync(sentPath)) { sentELM.trainFromData(sentenceVectors, sentenceVectors); fs.writeFileSync(sentPath, JSON.stringify(sentELM.model)); console.log(`💾 Saved mv_sent_elm → ${sentPath}`); }
const { elm: paraELM, path: paraPath } = trainOrLoadELM("mv_para_elm", paragraphVectors[0].length, PARA_DIM, DROPOUT);
if (!fs.existsSync(paraPath)) { paraELM.trainFromData(paragraphVectors, paragraphVectors); fs.writeFileSync(paraPath, JSON.stringify(paraELM.model)); console.log(`💾 Saved mv_para_elm → ${paraPath}`); }

/* ------------------------------- fuse + indexer ------------------------------- */
const proc = (X: number[][]) => zeroCenter(X).map(l2);
const wordP = proc(wordELM.computeHiddenLayer(wordVectors));
const sentP = proc(sentELM.computeHiddenLayer(sentenceVectors));
const paraP = proc(paraELM.computeHiddenLayer(paragraphVectors));

const fused: number[][] = wordP.map((_, i) => l2([...wordP[i], ...sentP[i], ...paraP[i]]));
console.log(`✅ Fused multi-view embeddings (dim=${fused[0].length}).`);

let emb: number[][] = fused;
const indexerELMs = SEQ.map((h, i) => new ELM({
    activation: "gelu",
    hiddenUnits: h,
    maxLen: emb[0].length,
    categories: [],
    dropout: DROPOUT,
    log: { modelName: `mv_indexer_L${i + 1}_h${h}`, verbose: true, toFile: false },
    metrics: { accuracy: 0 },
}));
ensureDir("./elm_weights");
indexerELMs.forEach((elm, i) => {
    const p = `./elm_weights/mv_indexer_L${i + 1}_h${elm.hiddenUnits}_in${emb[0].length}_do${DROPOUT}.json`;
    if (fs.existsSync(p)) {
        elm.loadModelFromJSON(fs.readFileSync(p, "utf8"));
        console.log(`✅ Loaded mv_indexer_L${i + 1}_h${elm.hiddenUnits} → ${p}`);
    } else {
        console.log(`⚙️ Training mv_indexer_L${i + 1}_h${elm.hiddenUnits} (X→X) ...`);
        elm.trainFromData(emb, emb);
        fs.writeFileSync(p, JSON.stringify(elm.model));
        console.log(`💾 Saved mv_indexer_L${i + 1}_h${elm.hiddenUnits} → ${p}`);
    }
    emb = proc(elm.computeHiddenLayer(emb));
});
const indexer = new ELMChain(indexerELMs);
const finalEmbeddings: number[][] = emb.map(l2);
console.log(`✅ Indexer chain ready (seq=${SEQ.join("-")}, dropout=${DROPOUT}).`);

/* ------------------------------- retrieval bits ------------------------------- */
type Scored = { idx: number; dense: number; tf: number; total: number; };

function encodeQueryDense(q: string): number[] {
    // pseudo heading = first 5 words
    const qHead = q.split(/\s+/).slice(0, 5).join(" ");
    const qFull = withHeadingBoost(qHead, q);

    const tokens = qFull.split(/\s+/).filter(Boolean).slice(0, 128);
    const wordQ = tokens.length ? l2(avgVectors(tokens.map(t => enc(t)))) : enc(qFull);
    const sentQ = enc(qFull);
    const paraQ = sentQ;

    const wE = wordELM.computeHiddenLayer([wordQ])[0];
    const sE = sentELM.computeHiddenLayer([sentQ])[0];
    const pE = paraELM.computeHiddenLayer([paraQ])[0];

    const fusedQ = l2([...wE, ...sE, ...pE]);
    const finalQ = l2(indexer.getEmbedding([fusedQ])[0]);
    return finalQ;
}

function retrieve(query: string, topK = TOP_K): Array<{ heading: string; snippet: string; total: number; dense: number; tfidf: number; }> {
    // Dense path
    const qDense = encodeQueryDense(query);
    const denseScores = finalEmbeddings.map(v => cosine(qDense, v));

    // TF-IDF path — LOWERCASED and heading-boosted to match doc preproc
    const qHead = query.split(/\s+/).slice(0, 5).join(" ");
    const qFullTF = withHeadingBoost(qHead, query).toLowerCase();
    const qTF = l2(tfidf.vectorize(qFullTF));
    const tfScores = tfidfVectors.map(v => cosine(qTF, v));

    // Stage-1 shortlist by union(dense, tf-idf)
    const denseTop = denseScores.map((s, i) => ({ s, i })).sort((a, b) => b.s - a.s).slice(0, Math.min(STAGE1, denseScores.length)).map(o => o.i);
    const tfTop = tfScores.map((s, i) => ({ s, i })).sort((a, b) => b.s - a.s).slice(0, Math.min(TF_STAGE, tfScores.length)).map(o => o.i);

    const candSet = new Set<number>(); denseTop.forEach(i => candSet.add(i)); tfTop.forEach(i => candSet.add(i));
    const candidates = Array.from(candSet.values());

    // Hybrid rerank
    const out: Scored[] = candidates.map(idx => {
        const dn = denseScores[idx];
        const tn = tfScores[idx];
        const total = ALPHA * dn + (1 - ALPHA) * tn;
        return { idx, dense: dn, tf: tn, total };
    });

    out.sort((a, b) => b.total - a.total);
    return out.slice(0, topK).map(({ idx, total, dense, tf }) => ({
        heading: sections[idx].heading,
        snippet: sections[idx].content.slice(0, 140),
        total,
        dense,
        tfidf: tf,
    }));
}

/* -------------------------------- mini-eval ---------------------------------- */
function miniEval(): void {
    const tests: Array<{ q: string; must: RegExp[] }> = [
        { q: "How do you declare a map in Go?", must: [/map/i, /maps?/i] },
        { q: "What is a goroutine?", must: [/goroutine/i, /concurr/i] },
        { q: "How to handle errors in Go?", must: [/error/i] },
        { q: "How do I write tests in Go?", must: [/test/i] },
        { q: "How to read and write files?", must: [/file/i, /I\/O|IO/i] },
    ];
    let hit1 = 0, hit5 = 0;
    for (const t of tests) {
        const res = retrieve(t.q, 5);
        const texts = res.map(r => (r.heading + " " + r.snippet));
        const ok = (s: string) => t.must.some(rx => rx.test(s));
        if (texts.length > 0 && ok(texts[0])) hit1++;
        if (texts.some(ok)) hit5++;
    }
    const n = tests.length;
    console.log(`\n🧪 Mini-eval: Hit@1 ${(100 * hit1 / n).toFixed(1)}% (${hit1}/${n})  •  Hit@5 ${(100 * hit5 / n).toFixed(1)}% (${hit5}/${n})`);
}

/* --------------------------------- outputs ----------------------------------- */
ensureDir("./embeddings");
fs.writeFileSync("./embeddings/embeddings_multiview.json", JSON.stringify(
    sections.map((s, i) => ({
        embedding: finalEmbeddings[i],
        metadata: { heading: s.heading, text: s.content }
    })), null, 2));
console.log(`💾 Saved embeddings → embeddings_multiview.json`);

/* ----------------------------------- demo ------------------------------------ */
const demoQ = "How do you declare a map in Go?";
const results = retrieve(demoQ, TOP_K);

console.log(`\n🔎 Query: ${demoQ}`);
results.forEach((r, i) =>
    console.log(`${i + 1}. [total=${r.total.toFixed(4)} | dense=${r.dense.toFixed(4)} | tfidf=${r.tfidf.toFixed(4)}] ${r.heading} — ${r.snippet}…`)
);

if (RUN_EVAL) miniEval();
console.log("\n✅ Done.");
