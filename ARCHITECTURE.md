# Architecture

A guided tour of the AsterMind-Community codebase. Read this after the [README](./README.md) and before opening a PR.

## High-level shape

AsterMind is a TypeScript library that bundles to ESM and UMD. There are no runtime dependencies — the published package is self-contained.

- **Entry point:** [`src/index.ts`](./src/index.ts) — every public class, function, and type is re-exported from here.
- **Build:** rollup produces `dist/astermind.esm.js` and `dist/astermind.umd.js`; `tsc` produces declarations in `dist/index.d.ts`.
- **Tests:** vitest, with a `jsdom` environment for tests that touch the DOM.
- **Demos:** vite serves any directory under `examples/` via `DEMO=<path> vite`.

## Repository layout

```
.
├── src/                       # Library source — only this ships in the npm package
│   ├── index.ts               # Public API surface
│   ├── core/                  # Core models + utilities (14 files)
│   ├── tasks/                 # Task wrappers (intent, autocomplete, language, etc., 9 files)
│   ├── pro/                   # RAG, reranking, summarization, transfer entropy (25 files)
│   ├── synth/                 # OmegaSynth label-conditioned data generation (23 files)
│   ├── preprocessing/         # Tokenizer, TextEncoder, UniversalEncoder
│   ├── ml/                    # TFIDF, KNN
│   ├── utils/                 # Augment, IO
│   ├── ui/                    # BindUI (browser DOM helper)
│   └── config/                # Presets
├── tests/                     # vitest suite (TypeScript)
├── examples/
│   ├── lessons/               # Lesson curriculum (L00 primer + template + curriculum index)
│   └── practical-examples/    # 5 working application demos
├── node_examples/             # Node.js TF-IDF + retrieval experiments (sub-package)
├── docs/                      # User-facing documentation
├── claude-markdown-documents/ # ADRs and implementation plans
├── public/                    # Static assets (model files, the bundled UMD copy)
└── scripts/                   # Repo maintenance scripts
```

## src/core/ — the load-bearing layer

| File | Role |
|------|------|
| [`ELM.ts`](./src/core/ELM.ts) | Base Extreme Learning Machine. Hidden-layer projection + closed-form output solve. |
| [`KernelELM.ts`](./src/core/KernelELM.ts) | Kernel ELM — RBF / linear / polynomial / Laplacian, with optional Nyström + whitening. |
| [`OnlineELM.ts`](./src/core/OnlineELM.ts) | RLS streaming updates with optional forgetting factor. |
| [`DeepELM.ts`](./src/core/DeepELM.ts) | Stacked autoencoder layers + classifier head. |
| [`ELMChain.ts`](./src/core/ELMChain.ts) | Compose multiple encoders into a pipeline. |
| [`ELMAdapter.ts`](./src/core/ELMAdapter.ts) | Wraps an `ELM`/`OnlineELM` as an encoder for `ELMChain` (`wrapELM`, `wrapOnlineELM`). |
| [`EmbeddingStore.ts`](./src/core/EmbeddingStore.ts) | In-memory vector store with cosine/dot/euclidean KNN. |
| [`Matrix.ts`](./src/core/Matrix.ts) | Dense linear-algebra primitives (multiply, transpose, ridge solve). |
| [`Activations.ts`](./src/core/Activations.ts) | `relu`, `leakyrelu`, `sigmoid`, `tanh`, `linear`, `gelu`, `softmax` + derivatives. |
| [`ELMConfig.ts`](./src/core/ELMConfig.ts) | Type definitions for `ELM`/`KernelELM`/`OnlineELM` configuration. |
| [`Evaluation.ts`](./src/core/Evaluation.ts) | Confusion matrix, F1, precision, recall, ROC/AUC, R². |
| [`evaluateEnsembleRetrieval.ts`](./src/core/evaluateEnsembleRetrieval.ts) | Ranking metrics for retrieval ensembles. |
| [`ELMWorker.ts`](./src/core/ELMWorker.ts) | Web-Worker side of off-thread training. |
| [`ELMWorkerClient.ts`](./src/core/ELMWorkerClient.ts) | Main-thread RPC client for the worker. |

## How a typical training run flows

1. **Construct an `ELM`** with a config (categories, hidden units, activation, encoder).
2. **Random hidden weights** are allocated per the chosen initialiser (`xavier` / `he` / `uniform`).
3. **Call `train()` (text mode) or `trainFromData(X, Y)` (vector mode).**
4. **Hidden activations** are computed for every input, producing a hidden matrix `H`.
5. **Output weights solved in closed form** via ridge regression: `W = (HᵀH + λI)⁻¹ HᵀY`. This is the "no backprop" trick.
6. **`predict(input)`** re-applies the hidden projection and reads off the linear classifier. In text mode, the encoder normalises and tokenises first.

For Kernel ELM, step 4 uses a kernel matrix `K(x, xᵢ)` instead of explicit hidden activations. Nyström mode subsamples landmarks to keep `K` small.

For Online ELM, step 5 is replaced with an RLS update so new data folds in incrementally without re-solving.

## src/tasks/ — task-specific wrappers

Each takes an `ELM` (or `KernelELM`) under the hood and gives you a higher-level API:

- `AutoComplete` — text completion bound to a DOM input
- `IntentClassifier` — short-text intent classification
- `LanguageClassifier` — language detection
- `EncoderELM`, `FeatureCombinerELM`, `RefinerELM`, `VotingClassifierELM`, `ConfidenceClassifierELM`, `CharacterLangEncoderELM` — composable building blocks for retrieval pipelines

If you're building a UI demo, start in `src/tasks/`. If you're doing custom ML, start in `src/core/`.

## src/pro/ — retrieval-augmented features

| Subdir | What it owns |
|--------|--------------|
| `omega/` | Omega RAG context assembler |
| `retrieval/` | TF-IDF + dense hybrid retrieval, vocabulary builder, landmark selection |
| `reranking/` | `OmegaRR` deterministic reranker with MMR filtering |
| `summarization/` | `OmegaSumDet` deterministic summariser |
| `infoflow/` | Transfer Entropy + permutation-significance variant |
| `math/` | Kernel ridge regression, online ridge, Random Fourier Features |
| `workers/` | Web Worker plumbing for pro features |
| `utils/` | Markdown parsing, autotuning, model serialization, scorers |

## src/synth/ — OmegaSynth

| File or subdir | What it owns |
|----------------|--------------|
| `OmegaSynth.ts` | Main factory |
| `generators/` | Five generation modes: `retrieval`, `elm`, `hybrid`, `exact`, `perfect` |
| `encoders/` | String / one-hot / fixed-length / char-vocab encoding |
| `core/`, `loaders/`, `models/`, `store/`, `utils/` | Supporting infra |
| `examples/`, `scripts/` | Runnable scripts (excluded from the build) |

## Build pipeline

[`rollup.config.cjs`](./rollup.config.cjs) defines two outputs:

1. **Main bundle** (`dist/astermind.{esm,umd}.js`): everything from `src/index.ts`, with `rollup-plugin-typescript2` doing the TS compile.
2. **Worker bundle** (`dist/workers/elm-worker.js`): standalone build of `src/core/ELMWorker.ts` so it can be loaded as a Web Worker.

[`tsconfig.types.json`](./tsconfig.types.json) emits `.d.ts` files into `dist/`.

`postbuild` copies the UMD bundle to `public/astermind.umd.js` so the demo HTML pages can `<script src="...">` it without a build step.

The compile **excludes** `src/**/examples/**` and `src/**/scripts/**` — those directories hold runnable scripts that would pollute the published package.

## Test setup

Tests live in [`tests/`](./tests/) as `.test.ts` files (vitest). One special test ([`tests/lessons-schema.test.ts`](./tests/lessons-schema.test.ts)) auto-discovers every lesson under `examples/lessons/` and validates its `slides.json` against [`examples/lessons/_shared/lessons-schema.json`](./examples/lessons/_shared/lessons-schema.json).

[`vite.config.ts`](./vite.config.ts) switches the test environment to `jsdom` only when running under vitest, so DOM-touching tests work.

## Where lessons and decisions live

- **Lessons:** [`examples/lessons/`](./examples/lessons/). Format documented in [`examples/lessons/_template/README.md`](./examples/lessons/_template/README.md); pedagogy in [ADR-0002](./claude-markdown-documents/ADRs/ADR-0002-elm-explination-as-canonical-lesson-model.md).
- **Architecture decisions:** [`claude-markdown-documents/ADRs/`](./claude-markdown-documents/ADRs/).
- **Implementation plans:** [`claude-markdown-documents/implementation-plans/`](./claude-markdown-documents/implementation-plans/).
- **Project history (what was retired and why):** [`docs/HISTORY.md`](./docs/HISTORY.md).

## What does NOT ship

These directories are excluded from the npm package:

- `tests/`, `examples/`, `node_examples/`
- `claude-markdown-documents/` (planning artefacts)
- `src/**/examples/`, `src/**/scripts/` (build-time exclusion)

The `files` entry in [`package.json`](./package.json) lists what does ship: `dist/`, `README.md`, `LICENSE`, `docs/`.
