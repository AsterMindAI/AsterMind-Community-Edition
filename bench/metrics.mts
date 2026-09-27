// Standard IR metrics.

export function dcg(rels: number[], k: number): number {
  let s = 0;
  for (let i = 0; i < Math.min(k, rels.length); i++) {
    s += (Math.pow(2, rels[i]) - 1) / Math.log2(i + 2);
  }
  return s;
}

// nDCG@k given the graded relevance of the RANKED list and the ideal ordering.
export function ndcg(rankedRels: number[], k: number): number {
  const ideal = [...rankedRels].sort((a, b) => b - a);
  const idcg = dcg(ideal, k);
  if (idcg === 0) return 0;
  return dcg(rankedRels, k) / idcg;
}

// Mean reciprocal rank: 1/rank of first relevant (label >= 1) item.
export function reciprocalRank(rankedRels: number[]): number {
  for (let i = 0; i < rankedRels.length; i++) {
    if (rankedRels[i] >= 1) return 1 / (i + 1);
  }
  return 0;
}

// Recall@k: fraction of all relevant (label>=1) items present in top k.
export function recallAtK(rankedRels: number[], allRels: number[], k: number): number {
  const totalRel = allRels.filter((r) => r >= 1).length;
  if (totalRel === 0) return 0;
  const found = rankedRels.slice(0, k).filter((r) => r >= 1).length;
  return found / totalRel;
}

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
