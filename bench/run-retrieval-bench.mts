// Retrieval benchmark: builds a real index per eval case and compares the
// legacy "damped" fusion against the new "normalized" fusion.
// Usage: tsx bench/run-retrieval-bench.mts [damped|normalized]
import { EVAL } from "./eval-set.mts";
import { ndcg, reciprocalRank, recallAtK, mean } from "./metrics.mts";
import { buildIndex } from "../src/pro/retrieval/index-builder.ts";
import { hybridRetrieve } from "../src/pro/retrieval/hybrid-retriever.ts";

const fusion = (process.argv[2] || "normalized") as "damped" | "normalized";
const K = 10;

function labelFor(ec: (typeof EVAL)[number], content: string): number {
  // retriever may return trimmed content; match by prefix
  const idx = ec.chunks.findIndex(
    (c) => c.content === content || content.startsWith(c.content.slice(0, 40))
  );
  return idx >= 0 ? ec.labels[idx] : 0;
}

const perCase: { id: string; domain: string; ndcg: number; mrr: number; recall5: number }[] = [];

for (const ec of EVAL) {
  const idx = buildIndex({
    chunks: ec.chunks,
    vocab: 5000,
    landmarks: 32,
    headingW: 2.0,
    useStem: false,
    kernel: "cosine",
    sigma: 1.0,
  });
  const res = hybridRetrieve({
    query: ec.query,
    chunks: ec.chunks,
    vocabMap: idx.vocabMap,
    idf: idx.idf,
    tfidfDocs: idx.tfidfDocs,
    denseDocs: idx.denseDocs,
    landmarksIdx: idx.landmarksIdx,
    landmarkMat: idx.landmarkMat,
    vocabSize: idx.vocabMap.size,
    kernel: "cosine",
    sigma: 1.0,
    alpha: 0.5,
    beta: 0.3,
    ridge: 0.08,
    headingW: 2.0,
    useStem: false,
    expandQuery: false,
    topK: ec.chunks.length,
    fusion,
  });
  const rankedRels = res.items.map((it) => labelFor(ec, it.content));
  perCase.push({
    id: ec.id,
    domain: ec.domain,
    ndcg: ndcg(rankedRels, K),
    mrr: reciprocalRank(rankedRels),
    recall5: recallAtK(rankedRels, ec.labels, 5),
  });
}

console.log(`\n=== Retrieval benchmark — fusion: ${fusion} ===`);
for (const p of perCase) {
  console.log(
    `  ${p.id.padEnd(8)} ${p.domain.padEnd(12)} nDCG@10=${p.ndcg.toFixed(3)}  MRR=${p.mrr.toFixed(3)}  R@5=${p.recall5.toFixed(3)}`
  );
}
console.log("\nOVERALL:");
console.log(
  `  nDCG@10=${mean(perCase.map((p) => p.ndcg)).toFixed(4)}  MRR=${mean(perCase.map((p) => p.mrr)).toFixed(4)}  R@5=${mean(perCase.map((p) => p.recall5)).toFixed(4)}`
);
console.log(JSON.stringify({ fusion, overall: {
  ndcg: mean(perCase.map((p) => p.ndcg)),
  mrr: mean(perCase.map((p) => p.mrr)),
  recall5: mean(perCase.map((p) => p.recall5)),
}}));
