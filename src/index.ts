/**
 * AsterMind-ELM — Public API Surface
 *
 * This barrel file is the single entrypoint exported by the package.
 * It must compile to `dist/index.d.ts` so consumers (and your own demos)
 * can import types and classes from "@astermind/astermind-elm".
 *
 * Notes:
 * - Keep explicit named exports for the primary classes (ELM, KernelELM, etc.).
 * - Use star exports for secondary/helper modules where the surface is broad.
 * - If any module below has only a `default` export, mirror it as a named one:
 *     export { default as Something } from "./path/Something";
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
export * from "./core/evaluateEnsembleRetrieval";

/* ----------------------- Workers (browser) ----------------------- */
/* These are safe to export; consumers can tree-shake for Node. */
export * from "./core/ELMWorkerClient";

/* ----------------------------- ML -------------------------------- */
export * from "./ml/TFIDF";
export * from "./ml/KNN";

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
