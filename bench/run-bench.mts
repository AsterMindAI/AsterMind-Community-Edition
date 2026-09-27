// Benchmark harness: measures the reranker against the labeled eval set.
// Usage: tsx bench/run-bench.mts [legacy|fusion]
import { EVAL } from "./eval-set.mts";
import { ndcg, reciprocalRank, recallAtK, mean } from "./metrics.mts";
import { rerank, type RerankOptions } from "../src/pro/reranking/OmegaRR.ts";

const mode = (process.argv[2] || "legacy") as "legacy" | "fusion";

// Map a reranked result back to its original label by matching content.
function labelFor(evalCase: (typeof EVAL)[number], content: string): number {
  const idx = evalCase.chunks.findIndex((c) => c.content === content);
  return idx >= 0 ? evalCase.labels[idx] : 0;
}

const K = 10;
const perCase: { id: string; domain: string; ndcg: number; mrr: number; recall5: number }[] = [];

for (const ec of EVAL) {
  const opts: RerankOptions = { exposeFeatures: false } as RerankOptions;
  // scoringMode is only honored by the improved reranker; harmless on legacy.
  (opts as any).scoringMode = mode;
  const scored = rerank(ec.query, ec.chunks, opts);
  const rankedRels = scored.map((s) => labelFor(ec, s.content));
  perCase.push({
    id: ec.id,
    domain: ec.domain,
    ndcg: ndcg(rankedRels, K),
    mrr: reciprocalRank(rankedRels),
    recall5: recallAtK(rankedRels, ec.labels, 5),
  });
}

// Aggregate overall and by domain.
const domains = Array.from(new Set(perCase.map((p) => p.domain)));
console.log(`\n=== Reranker benchmark — mode: ${mode} ===`);
console.log(`cases: ${perCase.length}\n`);
console.log("per-case:");
for (const p of perCase) {
  console.log(
    `  ${p.id.padEnd(8)} ${p.domain.padEnd(12)} nDCG@10=${p.ndcg.toFixed(3)}  MRR=${p.mrr.toFixed(3)}  R@5=${p.recall5.toFixed(3)}`
  );
}
console.log("\nby domain:");
for (const d of domains) {
  const rows = perCase.filter((p) => p.domain === d);
  console.log(
    `  ${d.padEnd(12)} nDCG@10=${mean(rows.map((r) => r.ndcg)).toFixed(3)}  MRR=${mean(rows.map((r) => r.mrr)).toFixed(3)}  R@5=${mean(rows.map((r) => r.recall5)).toFixed(3)}`
  );
}
console.log("\nOVERALL:");
console.log(
  `  nDCG@10=${mean(perCase.map((p) => p.ndcg)).toFixed(4)}  MRR=${mean(perCase.map((p) => p.mrr)).toFixed(4)}  R@5=${mean(perCase.map((p) => p.recall5)).toFixed(4)}`
);
console.log(JSON.stringify({ mode, overall: {
  ndcg: mean(perCase.map((p) => p.ndcg)),
  mrr: mean(perCase.map((p) => p.mrr)),
  recall5: mean(perCase.map((p) => p.recall5)),
}}));
