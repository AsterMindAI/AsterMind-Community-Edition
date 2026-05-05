// © 2026 AsterMind AI Co. – All Rights Reserved.
// Patent Pending US 63/897,713
/**
 * AsterMind-ELM — Public API Surface
 */

/* ------------------------- Core / Models ------------------------- */
export { ELM } from "./core/ELM";
export { KernelELM } from "./core/KernelELM";
export { OnlineELM } from "./core/OnlineELM";
export { DeepELM } from "./core/DeepELM";
export { ELMChain } from "./core/ELMChain";
export { ELMAdapter, wrapELM } from "./core/ELMAdapter";

/* -------------------------- Config / Math ------------------------ */
export * from "./core/Activations";
export * from "./core/ELMConfig";
export * from "./core/Matrix";

/* --------------------- Retrieval / Evaluation -------------------- */
export { EmbeddingStore } from "./core/EmbeddingStore";
export * from "./core/Evaluation";
export { evaluateEnsembleRetrieval } from "./core/evaluateEnsembleRetrieval";
export type {
    EmbeddingRecord,
    EnsembleEvalOptions,
    EnsembleEvalResult,
    PerLabelStats,
    QueryRanking,
    ScoreAgg,
} from "./core/evaluateEnsembleRetrieval";

/* ----------------------- Workers (browser) ----------------------- */
export * from "./core/ELMWorkerClient";

/* ----------------------------- ML -------------------------------- */
// Choose ONE style. I recommend explicit named exports:
export { TFIDF, TFIDFVectorizer } from "./ml/TFIDF";
export { KNN } from "./ml/KNN";
// (Remove the wildcard re-exports for TFIDF/KNN to avoid duplication)

/* ------------------------ Preprocessing -------------------------- */
export * from "./preprocessing/Tokenizer";
export * from "./preprocessing/TextEncoder";
export { UniversalEncoder } from "./preprocessing/UniversalEncoder";

/* ----------------------------- Tasks ----------------------------- */
export * from "./tasks/AutoComplete";
export * from "./tasks/CharacterLangEncoderELM";
export * from "./tasks/ConfidenceClassifierELM";
export * from "./tasks/EncoderELM";
export * from "./tasks/FeatureCombinerELM";
export * from "./tasks/IntentClassifier";
export * from "./tasks/LanguageClassifier";
export * from "./tasks/RefinerELM";
export * from "./tasks/VotingClassifierELM";

/* --------------------------- Utilities --------------------------- */
export * from "./utils/IO";
export * from "./utils/Augment";

/* ------------------------------ UI ------------------------------- */
export * from "./ui/components/BindUI";

/* ------------------------- Pro Features ------------------------- */
// RAG, Reranking, Summarization, Information Flow Analysis (previously Pro features, now free!)
export * from "./pro/index";

/* ------------------------- Synthetic Data Generation ------------------------- */
// OmegaSynth - Label-conditioned synthetic data generator (previously Synth features, now free!)
export * from "./synth/index";
