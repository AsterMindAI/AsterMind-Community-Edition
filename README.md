# AsterMind-ELM

[![npm version](https://img.shields.io/npm/v/%40astermind/astermind-elm.svg)](https://www.npmjs.com/package/@astermind/astermind-elm)
[![npm downloads](https://img.shields.io/npm/dm/%40astermind/astermind-elm.svg)](https://www.npmjs.com/package/@astermind/astermind-elm)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](#license)

A modular Extreme Learning Machine (ELM) library for JS/TS (browser + Node).

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

## 🆕 New in this release

- **Kernel ELMs (KELMs)** — exact and Nyström kernels (RBF/Linear/Poly/Laplacian/Custom) with ridge solve  
- **Whitened Nyström** — optional \(K_{mm}^{-1/2}\) whitening via symmetric eigendecomposition  
- **Online ELM (OS-ELM)** — streaming RLS updates with forgetting factor (no full retrain)  
- **DeepELM** — multi-layer stacked ELM with non-linear projections  
- **Web Worker adapter** — off-main-thread training/prediction for ELM and KELM  
- **Matrix upgrades** — Jacobi eigendecomp, invSqrtSym, improved Cholesky  
- **EmbeddingStore 2.0** — unit-norm vectors, ring buffer capacity, metadata filters  
- **ELMChain+Embeddings** — safer chaining with dimension checks, JSON I/O  
- **Activations** — added **linear** and **gelu**; centralized registry  
- **Configs** — split into **Numeric** and **Text** configs; stronger typing  
- **UMD exports** — `window.astermind` exposes `ELM`, `OnlineELM`, `KernelELM`, `DeepELM`, `KernelRegistry`, `EmbeddingStore`, `ELMChain`, etc.  
- **Robust preprocessing** — safer encoder path, improved error handling

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
9. [AsterMind in Practice](#astermind-in-practice)  
10. [Core API Documentation](#core-api-documentation)  
11. [Method Options Reference](#method-options-reference)  
12. [ELMConfig Options](#elmconfig-options-reference)  
13. [Prebuilt Modules](#prebuilt-modules-and-custom-modules)  
14. [Text Encoding Modules](#text-encoding-modules)  
15. [UI Binding Utility](#ui-binding-utility)  
16. [Data Augmentation Utilities](#data-augmentation-utilities)  
17. [IO Utilities (Experimental)](#io-utilities-experimental)  
18. [Embedding Store](#embedding-store)  
19. [Example Demos and Scripts](#example-demos-and-scripts)  
20. [Experiments and Results](#experiments-and-results)  
21. [Releases](#releases)  
22. [License](#license)

---

<a id="introduction"></a>
# 🌟 AsterMind: Decentralized ELM Framework Inspired by Nature

Welcome to **AsterMind**, a modular, decentralized ML framework built around cooperating Extreme Learning Machines (ELMs) that self-train, self-evaluate, and self-repair — like the nervous system of a starfish.

This library preserves the core ELM idea — random hidden layer, nonlinear activation, closed-form output solve — and modernizes it with multiple activations (ReLU/LeakyReLU/Sigmoid/Tanh/Linear/GELU), initializer choices, dropout, sample weighting, metrics gating, JSON I/O, chaining, **kernel methods**, **online updates**, and **deep ELM stacking**.

---

<a id="features"></a>
## ✨ Features

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
- ✅ Zero server/GPU — private, on-device ML  

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

---

<a id="deepelm"></a>
## 🌊 DeepELM

Stack multiple ELM layers for deep nonlinear embeddings.

```ts
import { DeepELM } from '@astermind/astermind-elm';
const deep = new DeepELM([{ hiddenUnits: 128 }, { hiddenUnits: 64 }]);
deep.fit(X, Y);
deep.predictProbaFromVectors(Xq);
```

---

<a id="web-worker-adapter"></a>
## 🧵 Web Worker Adapter

Move heavy ops off the main thread. Provides `ELMWorker` + `ELMWorkerClient`.

---

<a id="installation"></a>
## 🚀 Installation

```bash
npm install @astermind/astermind-elm
```

CDN:

```html
<script src="https://cdn.jsdelivr.net/npm/@astermind/astermind-elm/dist/astermind.umd.js"></script>
<script>
  const { ELM, KernelELM } = window.astermind;
</script>
```

---

<a id="usage-examples"></a>
## 🛠️ Usage Examples

**Text classifier (ELM):**

```ts
const elm = new ELM({ categories: ['English','French'], hiddenUnits:128 });
elm.train();
console.log(elm.predict("bonjour",3));
```

**Kernel ELM:** see above.  
**DeepELM:** see above.  

---

<a id="core-api-documentation"></a>
## 📚 Core API Documentation

### ELM  
- `train`, `trainFromData`, `predict`, `predictFromVector`, `getEmbedding`, JSON I/O, metrics

### OnlineELM  
- `init`, `update`, `fit`, predictions, embeddings, JSON I/O

### KernelELM  
- `fit`, `predictProbaFromVectors`, `getEmbedding`, JSON I/O

### DeepELM  
- `fit`, `predict`, `getEmbedding`, JSON I/O

### ELMChain  
- sequential embeddings through multiple encoders

---

<a id="elmconfig-options-reference"></a>
## ⚙️ ELMConfig Options Reference

See `ELMConfig.ts` for full types. Split into `NumericConfig` and `TextConfig`.

---

<a id="prebuilt-modules-and-custom-modules"></a>
## 🧩 Prebuilt Modules

Includes: AutoComplete, EncoderELM, CharacterLangEncoderELM, FeatureCombinerELM, ConfidenceClassifierELM, IntentClassifier, LanguageClassifier, VotingClassifierELM, RefinerELM.

---

<a id="embedding-store"></a>
## 🧰 Embedding Store

Lightweight vector store with cosine/dot/euclidean KNN, unit-norm storage, ring buffer capacity.

---

<a id="releases"></a>
## 📦 Releases

### v2.1.0 — 2025-09-19
**New features:** Kernel ELM, Nyström whitening, OnlineELM, DeepELM, Worker adapter, EmbeddingStore 2.0, activations linear/gelu, config split.  
**Fixes:** Xavier init, encoder guards, dropout scaling.  
**Breaking:** Config now `NumericConfig|TextConfig`.

---

<a id="license"></a>
## 📄 License

MIT License

---

> **“AsterMind doesn’t just mimic a brain—it functions more like a starfish: fully decentralized, self-evaluating, and self-repairing.”**
