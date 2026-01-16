/**
 * AsterMind Pro Features
 * RAG, Reranking, Summarization, Information Flow Analysis
 * All features are now free and open-source!
 */

// Math & Numerical Methods
export * from './math/index.js';

// Omega RAG System
export * from './omega/Omega.js';

// Retrieval
export {
  // Vectorization
  toTfidf,
  cosineSparse,
  sparseToDense,
  dotProd,
  baseKernel,
  kernelSim,
  projectToDense,
  type SparseVec,
  // Index building
  buildVocabAndIdf,
  buildTfidfDocs,
  buildLandmarks,
  buildDenseDocs,
  buildIndex,
  type IndexState,
  type BuildIndexOptions,
  // Hybrid retrieval
  hybridRetrieve,
  keywordBonus,
  type RetrievedChunk as HybridRetrievedChunk,
  type HybridRetrievalOptions,
  type HybridRetrievalResult,
} from './retrieval/index.js';

// Reranking
export { rerank, rerankAndFilter, filterMMR, explainFeatures, type Chunk, type RerankOptions } from './reranking/OmegaRR.js';
export type { ScoredChunk as RerankedChunk } from './reranking/OmegaRR.js';

// Summarization
export { summarizeDeterministic } from './summarization/OmegaSumDet.js';
export type { ScoredChunk as SummarizedChunk, SumOptions } from './summarization/OmegaSumDet.js';

// Information Flow Analysis
export * from './infoflow/index.js';

// Utilities
export { tokenize, expandQuery, normalizeWord } from './utils/tokenization.js';
export { parseMarkdownToSections, backfillEmptyParents, flattenSections } from './utils/markdown.js';
export { autoTune, sampleQueriesFromCorpus, penalty, jaccard } from './utils/autotune.js';
export { exportModel, importModel, quickHash } from './utils/model-serialization.js';
export { topKIndices } from './retrieval/hybrid-retriever.js';
export * from './utils/elm-scorer.js';

// Pro ELM Variants (5 variants)
export * from './elm/index.js';

// Types (excluding ELMConfig which is already exported from core)
export type * from './types.js';
