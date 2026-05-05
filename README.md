# AsterMind-Community

[![npm version](https://img.shields.io/npm/v/%40astermind/astermind-community.svg)](https://www.npmjs.com/package/@astermind/astermind-community)
[![npm downloads](https://img.shields.io/npm/dm/%40astermind/astermind-community.svg)](https://www.npmjs.com/package/@astermind/astermind-community)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](#license)

> **Tiny, on-device machine learning for the web.** Train a classifier in the browser in milliseconds. No GPU. No server. No data leaves the page.

AsterMind is a TypeScript library built around **Extreme Learning Machines (ELMs)** — neural networks with a randomly-initialised hidden layer and a closed-form solve for the output layer. That trick makes them train *fast* (no backpropagation), stay *small* (kilobytes, not megabytes), and run *anywhere JavaScript runs*.

This package consolidates four previously-separate AsterMind packages (ELM, Pro, Premium, Synth) into one MIT-licensed release. No license tokens, no subscriptions.

---

## Three ways to land here

### 🎓 I'm new to ML and want to learn

Start with the **lesson curriculum** at [`examples/lessons/`](./examples/lessons/). Lesson L00 is a 16-slide visual walkthrough of what an ELM is and why the random-projection trick works. Built for engineers who haven't taken an ML class.

```bash
git clone https://github.com/AsterMindAI/AsterMind-Community-Edition.git
cd AsterMind-Community-Edition
npm install
npm run dev:elm    # opens the L00 primer in your browser
```

The lesson series follows a defined pedagogy (A-SMART outcomes, TSDR slide arc, Backward Design authoring) — see [ADR-0002](./claude-markdown-documents/ADRs/ADR-0002-elm-explination-as-canonical-lesson-model.md) for the why.

### 🛠️ I want to drop this into my app

Install and you have a working classifier in five lines:

```ts
import { ELM } from '@astermind/astermind-community';

const elm = new ELM({
  categories: ['English', 'French'],
  hiddenUnits: 128,
  useTokenizer: true,
});

elm.train();                          // trains on category-name variants
console.log(elm.predict('bonjour'));  // [{ label: 'French', prob: 0.81 }, ...]
```

That runs in the browser. The model is a few kilobytes. Training takes milliseconds. For real workflows with your own labelled data, use `trainFromData(X, Y)` and one of the encoders in [`src/preprocessing/`](./src/preprocessing/) — see [Quick Start Tutorial](./docs/QUICK-START-TUTORIAL.md) for the full pattern.

### 📦 I want to know what's actually in the box

The honest list, post-cleanup (v4.0 dropped the 21 unfinished variants and 5 duplicate Pro variants — see [`docs/HISTORY.md`](./docs/HISTORY.md)):

- **Core models** — `ELM`, `KernelELM` (RBF/linear/poly with Nyström approximation), `OnlineELM` (RLS streaming updates), `DeepELM` (stacked autoencoder layers), `ELMChain` (compose encoders).
- **Embeddings & retrieval** — `EmbeddingStore` (in-memory KNN index), `TFIDF`, `KNN`, hybrid retrieval pipeline.
- **Pro features** — RAG context assembly, deterministic reranking and summarization, transfer-entropy information-flow analysis.
- **Synthetic data** — `OmegaSynth` for label-conditioned generation across five modes (retrieval, ELM, hybrid, exact, perfect).
- **Web Worker** — `ELMWorkerClient` for off-main-thread training so the UI doesn't lock up.
- **Pre-built task wrappers** — `AutoComplete`, `IntentClassifier`, `LanguageClassifier`, `EncoderELM`, `FeatureCombinerELM`, `ConfidenceClassifierELM`, `RefinerELM`, `VotingClassifierELM`, `CharacterLangEncoderELM`.

For the architectural tour, see [`docs/CODE-WALKTHROUGH.md`](./docs/CODE-WALKTHROUGH.md).

---

## Install

```bash
npm install @astermind/astermind-community
# or
pnpm add @astermind/astermind-community
# or
yarn add @astermind/astermind-community
```

CDN (UMD global `astermind`):

```html
<script src="https://cdn.jsdelivr.net/npm/@astermind/astermind-community/dist/astermind.umd.js"></script>
<script>
  const { ELM, KernelELM, OmegaSynth } = window.astermind;
</script>
```

Node CommonJS:

```js
const { ELM, OmegaSynth } = require('@astermind/astermind-community');
```

---

## More patterns

**Kernel ELM with RBF + Nyström approximation:**

```ts
import { KernelELM } from '@astermind/astermind-community';

const kelm = new KernelELM({
  outputDim: Y[0].length,
  kernel: { type: 'rbf', gamma: 1 / X[0].length },
  mode: 'nystrom',
  nystrom: { m: 256, strategy: 'kmeans++', whiten: true },
  ridgeLambda: 1e-2,
});
kelm.fit(X, Y);
```

**Online (streaming) updates with forgetting:**

```ts
import { OnlineELM } from '@astermind/astermind-community';

const ol = new OnlineELM({ inputDim: D, outputDim: K, hiddenUnits: 256 });
ol.init(X0, Y0);
ol.update(Xt, Yt);                    // call as new data arrives
const probs = ol.predictProbaFromVectors(Xq);
```

**Synthetic data (OmegaSynth):**

```ts
import { OmegaSynth } from '@astermind/astermind-community';

const synth = new OmegaSynth({ mode: 'hybrid', maxLength: 32 });
await synth.train(dataset);
const generated = await synth.generate('product_name', 10);
```

---

## Documentation

| Document | What it covers |
|----------|----------------|
| [Quick Start Tutorial](./docs/QUICK-START-TUTORIAL.md) | Step-by-step walkthrough of all major features |
| [AsterMind Overview](./docs/ASTERMIND-ELM-OVERVIEW.md) | What AsterMind is, why ELMs |
| [Code Walkthrough](./docs/CODE-WALKTHROUGH.md) | Architecture tour for developers |
| [Implementation Models](./docs/IMPLEMENTATION-MODELS.md) | SDK vs standalone vs services |
| [Technical Requirements](./docs/TECHNICAL-REQUIREMENTS.md) | Browser, Node, OS support |
| [Data Requirements](./docs/DATA-REQUIREMENTS.md) | Training-data sizing guidance |
| [Project History](./docs/HISTORY.md) | What was retired and how to recover it |
| [Legal](./docs/LEGAL.md) | License + patent notices |

For project decisions and the intern curriculum plan, see [`claude-markdown-documents/`](./claude-markdown-documents/).

---

## Migration from old packages

The previous packages are deprecated and consolidated here:

- `@astermind/astermind-elm` → `@astermind/astermind-community`
- `@astermind/astermind-pro` → `@astermind/astermind-community`
- `@astermind/astermind-premium` → `@astermind/astermind-community`
- `@astermind/astermind-synthetic-data` → `@astermind/astermind-community`

Install `@astermind/astermind-community`, update your imports, no license token required.

> **Note:** v3.0.0 shipped 21 advanced ELM variants under `src/elm/` that were retired in v4.0.0 (zero tests, scaffolding-quality math; full reasoning in [`docs/HISTORY.md`](./docs/HISTORY.md)). They're recoverable from tag `v3.0-with-variants` and branch `archive/v3.0-with-21-variants` if you ever need one.

---

## Development

```bash
git clone https://github.com/AsterMindAI/AsterMind-Community-Edition.git
cd AsterMind-Community-Edition
npm install
npm test          # vitest suite
npm run build     # produces dist/{esm,umd}.js
```

Per-demo dev servers (browser, all run via vite):

```bash
npm run dev:elm                # the L00 lesson primer (ELM intuition)
npm run dev:news               # AG News classification
npm run dev:autocomplete       # autocomplete chain
npm run dev:lang               # language classifier
npm run dev:music              # drum-pattern generator
npm run dev:lesson:template    # the lesson-format scaffold
```

`examples/practical-examples/` ships five additional working demos (smart search, content moderation, smart-form autocomplete, intent classification, recommendations) — each has its own `npm run dev:*` script.

Contribution conventions live with the planning artefacts in [`claude-markdown-documents/`](./claude-markdown-documents/).

---

## License

MIT. All features, free and open-source. See [`docs/LEGAL.md`](./docs/LEGAL.md) for full text and the patent notice (US 63/897,713 filed by AsterMind AI Co.).

---

> _"AsterMind doesn't just mimic a brain — it functions more like a starfish: fully decentralized, self-evaluating, and self-repairing."_
