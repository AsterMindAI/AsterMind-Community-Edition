# AsterMind-Community

[![npm version](https://img.shields.io/npm/v/%40astermind/astermind-community.svg)](https://www.npmjs.com/package/@astermind/astermind-community)
[![npm downloads](https://img.shields.io/npm/dm/%40astermind/astermind-community.svg)](https://www.npmjs.com/package/@astermind/astermind-community)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](#license)

**Complete ELM library with 21+ advanced variants, Pro features (RAG, reranking, summarization), and OmegaSynth synthetic data generation. Free and open-source.**

AsterMind Community combines all features from AsterMind-ELM, AsterMind-Pro, AsterMind-Premium, and AsterMind-Synth into one unified, free, and open-source package under the MIT license.

---

# 🚀 What you can build — and why this is groundbreaking

AsterMind brings **instant, tiny, on-device ML** to the web. It lets you ship models that **train in milliseconds**, **predict with microsecond latency**, and **run entirely in the browser** — no GPU, no server, no tracking. With **Kernel ELMs**, **Online ELM**, **DeepELM**, and **Web Worker offloading**, you can create:

- **Private, on-device classifiers** (language, intent, toxicity, spam) that retrain on user feedback  
- **Real-time retrieval & reranking** with compact embeddings (ELM, KernelELM, Nyström whitening) for search and RAG  
- **Interactive creative tools** (music/drum generators, autocompletes) that respond instantly  
- **Edge analytics**: regressors/classifiers from data that never leaves the page  
- **Deep ELM chains**: stack encoders → embedders → classifiers for powerful pipelines, still tiny and transparent  

**Why it matters:** ELMs give you **closed-form training** (no heavy SGD), **interpretable structure**, and **tiny memory footprints**.  
AsterMind modernizes ELM with kernels, online learning, workerized training, robust preprocessing, and deep chaining — making **seriously fast ML** practical for every web app.

---

## 🆕 New in v3.0.0 - Unified Community Edition

**Major Release:** All features from Elm, Pro, Premium, and Synth are now free and open-source!

- **Pro Features** — RAG, Reranking, Summarization, Information Flow Analysis (now free!)

- **OmegaSynth** — Label-conditioned synthetic data generation (now free!)

- **All Core Features** — Kernel ELMs, Online ELM, DeepELM, Web Workers, and more

- **MIT License** — Fully open-source, no license required!

See [Releases](#releases) for full changelog.

---

## 📑 Table of Contents

1. [Introduction](#introduction)  
2. [Features](#features)  
3. [Kernel ELMs (KELM)](#kernel-elms-kelm)  
4. [Online ELM (OS-ELM)](#online-elm-os-elm)  
5. [DeepELM](#deepelm)  
6. [Web Worker Adapter](#web-worker-adapter)  
7. [Installation](#installation)  
8. [Usage Examples](#usage-examples)  
9. [Suggested Experiments](#suggested-experiments)  
10. [Why Use AsterMind](#why-use-astermind)  
11. [Core API Documentation](#core-api-documentation)  
12. [Method Options Reference](#method-options-reference)  
13. [ELMConfig Options](#elmconfig-options-reference)  
14. [Prebuilt Modules](#prebuilt-modules-and-custom-modules)  
15. [Text Encoding Modules](#text-encoding-modules)  
16. [UI Binding Utility](#ui-binding-utility)  
17. [Data Augmentation Utilities](#data-augmentation-utilities)  
18. [IO Utilities (Experimental)](#io-utilities-experimental)  
19. [Embedding Store](#embedding-store)  
20. [Utilities: Matrix & Activations](#utilities-matrix--activations)  
21. [Adapters & Chains](#adapters--chains)  
22. [Workers: ELMWorker & ELMWorkerClient](#workers-elmworker--elmworkerclient)  
23. [Example Demos and Scripts](#example-demos-and-scripts)  
24. [Experiments and Results](#experiments-and-results)  
25. [Documentation](#documentation)  
26. [Releases](#releases)  
27. [License](#license)

---

<a id="introduction"></a>
# 🌟 AsterMind: Decentralized ELM Framework Inspired by Nature

Welcome to **AsterMind**, a modular, decentralized ML framework built around cooperating Extreme Learning Machines (ELMs) that self-train, self-evaluate, and self-repair — like the nervous system of a starfish.

**How This ELM Library Differs from a Traditional ELM**

This library preserves the core Extreme Learning Machine idea — random hidden layer, nonlinear activation, closed-form output solve — but extends it with:

- Multiple activations (ReLU, LeakyReLU, Sigmoid, **Linear, GELU**)  
- Xavier/Uniform/**He** initialization  
- Dropout on hidden activations  
- Sample weighting  
- Metrics gate (RMSE, MAE, Accuracy, F1, Cross-Entropy, R²)  
- JSON export/import  
- Model lifecycle management  
- UniversalEncoder for text (char/token)  
- Data augmentation utilities  
- Chaining (ELMChain) for stacked embeddings  
- Weight reuse (simulated fine-tuning)  
- Logging utilities

AsterMind is designed for:

* Lightweight, in-browser ML pipelines  
* Transparent, interpretable predictions  
* Continuous, incremental learning  
* Resilient systems with no single point of failure  

---

<a id="features"></a>
## ✨ Features

### Core Features
- ✅ Modular Architecture  
- ✅ Closed-form training (ridge / pseudoinverse)  
- ✅ Activations: relu, leakyrelu, sigmoid, tanh, linear, gelu  
- ✅ Initializers: uniform, xavier, he  
- ✅ Numeric + Text configs  
- ✅ Kernel ELM with Nyström + whitening  
- ✅ Online ELM (RLS) with forgetting factor  
- ✅ DeepELM (stacked layers)  
- ✅ Web Worker adapter  
- ✅ Embeddings & Chains for retrieval and deep pipelines  
- ✅ JSON import/export  
- ✅ Self-governing training  
- ✅ Flexible preprocessing  
- ✅ Lightweight deployment (ESM + UMD)  
- ✅ Retrieval and classification utilities  
- ✅ Zero server/GPU — private, on-device ML

### Pro Features (now free!)
- ✅ RAG Pipeline (Retrieval-Augmented Generation)
- ✅ Reranking
- ✅ Summarization
- ✅ Information Flow Analysis
- ✅ Transfer Entropy

### Synthetic Data Generation (now free!)
- ✅ OmegaSynth - Label-conditioned synthetic data generation
- ✅ Multiple generation modes (retrieval, ELM, hybrid, exact, perfect)
- ✅ Pattern correction and sequence context
- ✅ Character embeddings  

---

<a id="kernel-elms-kelm"></a>
## 🧠 Kernel ELMs (KELM)

Supports **Exact** and **Nyström** modes with RBF/Linear/Poly/Laplacian/Custom kernels.  
Includes **whitened Nyström** (persisted whitener for inference parity).

```ts
import { KernelELM, KernelRegistry } from '@astermind/astermind-elm';

const kelm = new KernelELM({
  outputDim: Y[0].length,
  kernel: { type: 'rbf', gamma: 1 / X[0].length },
  mode: 'nystrom',
  nystrom: { m: 256, strategy: 'kmeans++', whiten: true },
  ridgeLambda: 1e-2,
});
kelm.fit(X, Y);
```

---

<a id="online-elm-os-elm"></a>
## 🔁 Online ELM (OS-ELM)

Stream updates via **Recursive Least Squares (RLS)** with optional forgetting factor. Supports He/Xavier/Uniform initializers.

```ts
import { OnlineELM } from '@astermind/astermind-elm';
const ol = new OnlineELM({ inputDim: D, outputDim: K, hiddenUnits: 256 });
ol.init(X0, Y0);
ol.update(Xt, Yt);
ol.predictProbaFromVectors(Xq);
```

**Notes**  
- `forgettingFactor` controls how fast older observations decay (default 1.0).  
- Two natural embedding modes: **hidden** (activations) or **logits** (pre-softmax). Use with `ELMAdapter` (see below).

---

<a id="deepelm"></a>
## 🌊 DeepELM

Stack multiple ELM layers for deep nonlinear embeddings and an optional top ELM classifier.

```ts
import { DeepELM } from '@astermind/astermind-elm';
const deep = new DeepELM({
  inputDim: D,
  layers: [{ hiddenUnits: 128 }, { hiddenUnits: 64 }],
  numClasses: K
});
// 1) Unsupervised layer-wise training (autoencoders Y=X)
const X_L = deep.fitAutoencoders(X);
// 2) Supervised head (ELM) on last layer features
deep.fitClassifier(X_L, Y);
// 3) Predict
const probs = deep.predictProbaFromVectors(Xq);
```

**JSON I/O**  
`toJSON()` and `fromJSON()` persist the full stack (AEs + classifier).

---

<a id="web-worker-adapter"></a>
## 🧵 Web Worker Adapter

Move heavy ops off the main thread. Provides `ELMWorker` + `ELMWorkerClient` for RPC-style training/prediction with progress events.

- Initialize with `initELM(config)` or `initOnlineELM(config)`  
- Train via `train` / `trainFromData` / `fit` / `update`  
- Predict via `predict`, `predictFromVector`, or `predictLogits`  
- Subscribe to progress callbacks per call

See [Workers](#workers-elmworker--elmworkerclient) for full API.

---

<a id="installation"></a>
## 🚀 Installation

**NPM (scoped package):**
```bash
npm install @astermind/astermind-community
# or
pnpm add @astermind/astermind-community
# or
yarn add @astermind/astermind-community
```

**CDN / `<script>` (UMD global `astermind`):**
```html
<!-- jsDelivr -->
<script src="https://cdn.jsdelivr.net/npm/@astermind/astermind-community/dist/astermind.umd.js"></script>

<!-- or unpkg -->
<script src="https://unpkg.com/@astermind/astermind-community/dist/astermind.umd.js"></script>

<script>
  const { ELM, KernelELM, OmegaSynth } = window.astermind;
</script>
```

**Repository:**
- GitHub: https://github.com/infiniteCrank/AsterMind-Community  
- NPM: https://www.npmjs.com/package/@astermind/astermind-community

**Migration from old packages:**
- See [Migration Guide](./docs/MIGRATION-FROM-ELM.md) for details
- All old packages (`@astermind/astermind-elm`, `@astermind/astermind-pro`, `@astermind/astermind-premium`, `@astermind/astermind-synthetic-data`) are deprecated
- Simply install `@astermind/astermind-community` and update your imports - no license required!  

---

<a id="usage-examples"></a>
## 🛠️ Usage Examples

**Basic ELM Classifier**

```ts
import { ELM } from "@astermind/astermind-community";

const config = { categories: ['English', 'French'], hiddenUnits: 128 };
const elm = new ELM(config);

// Load or train logic here
const results = elm.predict("bonjour");
console.log(results);
```

**Synthetic Data Generation (Now Free!):**

```ts
import { OmegaSynth } from "@astermind/astermind-community";

const synth = new OmegaSynth({
  mode: 'hybrid', // or 'elm', 'exact', 'retrieval', 'perfect'
  maxLength: 32
});

await synth.train(dataset);
const generated = await synth.generate('label', 10);
```

**CommonJS / Node:**
```js
const { ELM, OmegaSynth } = require("@astermind/astermind-community");
```

**Kernel ELM / DeepELM:** see above examples.

---

<a id="suggested-experiments"></a>
## 🧪 Suggested Experiments

* Compare retrieval performance with Sentence-BERT and TFIDF.  
* Experiment with activations and token vs char encoding.  
* Deploy in-browser retraining workflows.  

---

<a id="why-use-astermind"></a>
## 🌿 Why Use AsterMind?

Because you can build AI systems that:

* Are decentralized.  
* Self-heal and retrain independently.  
* Run in the browser.  
* Are transparent and interpretable.  

---

<a id="core-api-documentation"></a>
## 📚 Core API Documentation

### ELM  
- `train`, `trainFromData`, `predict`, `predictFromVector`, `getEmbedding`, **`predictLogitsFromVectors`**, JSON I/O, metrics  
- `loadModelFromJSON`, `saveModelAsJSONFile`  
- Evaluation: RMSE, MAE, Accuracy, F1, Cross-Entropy, R²  
- Config highlights: `ridgeLambda`, `weightInit` (`uniform` | `xavier` | `he`), `seed`

### OnlineELM  
- `init`, `update`, `fit`, `predictLogitsFromVectors`, `predictProbaFromVectors`, embeddings (hidden/logits), JSON I/O  
- Config highlights: `inputDim`, `outputDim`, `hiddenUnits`, `activation`, `ridgeLambda`, `forgettingFactor`

### KernelELM  
- `fit`, `predictProbaFromVectors`, `getEmbedding`, JSON I/O  
- `mode: 'exact' | 'nystrom'`, kernels: `rbf | linear | poly | laplacian | custom`

### DeepELM  
- `fitAutoencoders(X)`, `transform(X)`, `fitClassifier(X_L, Y)`, `predictProbaFromVectors(X)`  
- `toJSON()`, `fromJSON()` for full-pipeline persistence

### ELMChain  
- sequential embeddings through multiple encoders

### TFIDFVectorizer  
- `vectorize`, `vectorizeAll`

### KNN  
- `find(queryVec, dataset, k, topX, metric)`

---

<a id="method-options-reference"></a>
## 📘 Method Options Reference

### `train(augmentationOptions?, weights?)`
- `augmentationOptions`: `{ suffixes, prefixes, includeNoise }`  
- `weights`: sample weights

### `trainFromData(X, Y, options?)`
- `X`: Input matrix  
- `Y`: Label matrix or one-hot  
- `options`: `{ reuseWeights, weights }`  

### `predict(text, topK)`  
- `text`: string  
- `topK`: number of predictions  

### `predictFromVector(vector, topK)`  
- `vector`: numeric  
- `topK`: number of predictions  

### `saveModelAsJSONFile(filename?)`  
- `filename`: optional file name  

---

<a id="elmconfig-options-reference"></a>
## ⚙️ ELMConfig Options Reference

| Option               | Type       | Description                                                   |
| -------------------- | ---------- | ------------------------------------------------------------- |
| `categories`         | `string[]` | List of labels the model should classify. *(Required)*        |
| `hiddenUnits`        | `number`   | Number of hidden layer units (default: 50).                   |
| `maxLen`             | `number`   | Max length of input sequences (default: 30).                  |
| `activation`         | `string`   | Activation function (`relu`, `tanh`, etc.).                   |
| `encoder`            | `any`      | Custom UniversalEncoder instance (optional).                  |
| `charSet`            | `string`   | Character set used for encoding.                              |
| `useTokenizer`       | `boolean`  | Use token-level encoding.                                     |
| `tokenizerDelimiter` | `RegExp`   | Tokenizer regex.                                              |
| `exportFileName`     | `string`   | Filename to export JSON.                                      |
| `metrics`            | `object`   | Thresholds (`rmse`, `mae`, `accuracy`, etc.).                 |
| `log`                | `object`   | Logging config.                                               |
| `dropout`            | `number`   | Dropout rate.                                                 |
| `weightInit`         | `string`   | Initializer. (`uniform` | `xavier` | `he`)                    |
| `ridgeLambda`        | `number`   | Ridge penalty for closed-form solve.                          |
| `seed`               | `number`   | PRNG seed for reproducibility.                                |

---

<a id="prebuilt-modules-and-custom-modules"></a>
## 🧩 Prebuilt Modules and Custom Modules

Includes: AutoComplete, EncoderELM, CharacterLangEncoderELM, FeatureCombinerELM, ConfidenceClassifierELM, IntentClassifier, LanguageClassifier, VotingClassifierELM, RefinerELM.  

Each exposes `.train()`, `.predict()`, `.loadModelFromJSON()`, `.saveModelAsJSONFile()`, `.encode()`.

Custom modules can be built on top.

---

<a id="text-encoding-modules"></a>
## ✨ Text Encoding Modules

Includes `TextEncoder`, `Tokenizer`, `UniversalEncoder`.  
Supports char-level & token-level, normalization, n-grams.

---

<a id="ui-binding-utility"></a>
## 🖥️ UI Binding Utility

`bindAutocompleteUI(model, inputElement, outputElement, topK)` helper.  
Binds model predictions to live HTML input.

---

<a id="data-augmentation-utilities"></a>
## ✨ Data Augmentation Utilities

Augment with prefixes, suffixes, noise.  
Example: `Augment.generateVariants("hello", "abc", { suffixes:["world"], includeNoise:true })`.

---

<a id="io-utilities-experimental"></a>
## ⚠️ IO Utilities (Experimental)

JSON/CSV/TSV import/export, schema inference.  
Experimental and may be unstable.

---

<a id="embedding-store"></a>
## 🧰 Embedding Store

Lightweight vector store with cosine/dot/euclidean KNN, unit-norm storage, ring buffer capacity.

**Usage**
```ts
import { EmbeddingStore } from '@astermind/astermind-elm';

const store = new EmbeddingStore({ capacity: 5000, normalize: true });
store.add({ id: 'doc1', vector: [/* ... */], meta: { title: 'Hello' } });
const hits = store.query({ vector: q, k: 10, metric: 'cosine' });
```

---

<a id="utilities-matrix--activations"></a>
## 🔧 Utilities: Matrix & Activations

**Matrix** – internal linear algebra utilities (multiply, transpose, addRegularization, solveCholesky, etc.).  
**Activations** – `relu`, `leakyrelu`, `sigmoid`, `tanh`, `linear`, `gelu`, plus `softmax`, derivatives, and helpers (`get`, `getDerivative`, `getPair`).

---

<a id="adapters--chains"></a>
## 🔗 Adapters & Chains

**ELMAdapter** wraps an `ELM` or `OnlineELM` to behave like an encoder for `ELMChain`:

```ts
import { ELMAdapter, wrapELM, wrapOnlineELM } from '@astermind/astermind-elm';

const enc1 = wrapELM(elm);                          // uses elm.getEmbedding(X)
const enc2 = wrapOnlineELM(online, { mode: 'logits' }); // 'hidden' or 'logits'
const chain = new ELMChain([enc1, enc2], { normalizeFinal: true });

const Z = chain.getEmbedding(X); // stacked embeddings
```

---

<a id="workers-elmworker--elmworkerclient"></a>
## 🧱 Workers: ELMWorker & ELMWorkerClient

**ELMWorker** (inside a Web Worker) exposes a tolerant RPC surface:  
- lifecycle: `initELM`, `initOnlineELM`, `dispose`, `getKind`, `setVerbose`  
- training: `train`, `fit`, `update`, `trainFromData` (all routed appropriately)  
- prediction: `predict`, `predictFromVector`, `predictLogits`  
- progress events: `{ type:'progress', phase, pct }` during training

**ELMWorkerClient** (on the main thread) is a thin promise-based RPC client:

```ts
import { ELMWorkerClient } from '@astermind/astermind-elm/worker';

const client = new ELMWorkerClient(new Worker(new URL('./ELMWorker.js', import.meta.url)));
await client.initELM({ categories:['A','B'], hiddenUnits:128 });

await client.elmTrain({}, (p) => console.log(p.phase, p.pct));
const preds = await client.elmPredict('bonjour', 5);
```

---

<a id="example-demos-and-scripts"></a>
## 🧪 Example Demos and Scripts

Run with `npm run dev:*` (autocomplete, lang, chain, news).  
Fully in-browser.

---

<a id="experiments-and-results"></a>
## 🧪 Experiments and Results

Includes dropout tuning, hybrid retrieval, ensemble distillation, multi-level pipelines.  
Results reported (Recall@1, Recall@5, MRR).

---

<a id="documentation"></a>
## 📚 Documentation

AsterMind ELM includes comprehensive documentation to help you get started and master the library:

### Getting Started

- **[Quick Start Tutorial](./QUICK-START-TUTORIAL.md)** — Complete step-by-step guide covering all major features with practical examples
  - Basic ELM, Kernel ELM, Online ELM, DeepELM
  - Embeddings, ELM Chains, Web Workers
  - Pre-built modules, model persistence
  - Advanced features and troubleshooting

- **[AsterMind ELM Overview](./docs/ASTERMIND-ELM-OVERVIEW.md)** — High-level overview of what AsterMind ELM is and why tiny neural networks matter
  - Core capabilities (classification, regression, embeddings, online learning)
  - The AsterMind ecosystem
  - Technical architecture overview

### Implementation & Integration

- **[Implementation Models](./docs/IMPLEMENTATION-MODELS.md)** — Guide to different ways of implementing AsterMind
  - **SDK/Library Implementation**: Integrating AsterMind into your applications
  - **Standalone Applications**: Using pre-built example applications
  - **Service Engagement**: Professional services for custom implementation
  - How to choose the right approach for your needs

- **[Technical Requirements](./docs/TECHNICAL-REQUIREMENTS.md)** — System requirements for different platforms
  - Windows, Linux, and macOS requirements
  - Browser compatibility
  - Development and runtime requirements
  - Troubleshooting common issues

### Developer Resources

- **[Code Walkthrough](./docs/CODE-WALKTHROUGH.md)** — Detailed code walkthrough for presentations and deep dives
  - Entry points and exports
  - Core architecture and configuration system
  - Main ELM class implementation
  - Training and prediction flows
  - Key code snippets with line numbers

- **[Data Requirements](./DATA-REQUIREMENTS.md)** — Guide to data requirements for training models
  - Minimum viable data sizes
  - Recommendations for better generalization
  - Data collection strategies
  - ELM-specific considerations

### Additional Resources

- **[Examples Directory](./examples/)** — Working demo applications
  - Language classification
  - Autocomplete chains
  - News classification
  - Music genre detection
  - And more...

- **[Node Examples](./node_examples/)** — Advanced Node.js examples
  - Two-stage retrieval systems
  - TF-IDF integration
  - DeepELM + KernelELM retrieval
  - Experimental architectures

- **[Legal Information](./LEGAL.md)** — Licensing, patents, and legal notices

### Documentation Quick Links

| Document | Purpose | Audience |
|----------|---------|----------|
| [Quick Start Tutorial](./QUICK-START-TUTORIAL.md) | Learn how to use all features | Beginners |
| [Overview](./docs/ASTERMIND-ELM-OVERVIEW.md) | Understand what AsterMind is | Everyone |
| [Implementation Models](./docs/IMPLEMENTATION-MODELS.md) | Choose integration approach | Decision makers, developers |
| [Technical Requirements](./docs/TECHNICAL-REQUIREMENTS.md) | System setup and requirements | DevOps, developers |
| [Code Walkthrough](./docs/CODE-WALKTHROUGH.md) | Deep dive into code structure | Developers, presenters |
| [Data Requirements](./DATA-REQUIREMENTS.md) | Training data guidelines | ML practitioners |

---

<a id="releases"></a>
## 📦 Releases

### v2.1.0 — 2026-09-19
**New features:** Kernel ELM, Nyström whitening, OnlineELM, DeepELM, Worker adapter, EmbeddingStore 2.0, activations linear/gelu, config split.  
**Fixes:** Xavier init, encoder guards, dropout scaling.  
**Breaking:** Config now `NumericConfig|TextConfig`.

---

<a id="license"></a>
## 📄 License

MIT License

**All features are now free and open-source!** This package combines all features from the previous AsterMind packages (ELM, Pro, Premium, Synth) into one unified community edition under the MIT license. No license tokens or subscriptions required.

---

> **“AsterMind doesn’t just mimic a brain—it functions more like a starfish: fully decentralized, self-evaluating, and self-repairing.”**
