# AsterMind-ELM Code Walkthrough Guide

**Purpose:** This document provides a structured walkthrough of the AsterMind-ELM codebase with specific line numbers and code references for presentation purposes.

**How to Use This Document:**
- Use the line numbers to jump directly to code sections during your Zoom call
- Code snippets are included with line references for easy navigation
- Each section builds on the previous one for a logical flow
- Use Ctrl/Cmd+F to quickly find specific topics or line numbers

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Entry Point & Exports](#entry-point--exports)
3. [Core Architecture](#core-architecture)
4. [Configuration System](#configuration-system)
5. [Main ELM Class](#main-elm-class)
6. [Preprocessing & Encoding](#preprocessing--encoding)
7. [Task Modules](#task-modules)
8. [Advanced Features](#advanced-features)
9. [Build & Distribution](#build--distribution)

---

## Project Overview

**What is AsterMind-ELM?**
- A modular Extreme Learning Machine (ELM) library for JavaScript/TypeScript
- Runs in browser and Node.js
- Enables instant, on-device ML without servers or GPUs
- Version: 2.1.1 (see `package.json` line 3)

**Key Files:**
- `README.md` - Main documentation
- `package.json` - Project configuration and dependencies
- `src/index.ts` - Public API exports
- `src/core/ELM.ts` - Core ELM implementation

---

## Entry Point & Exports

### File: `src/index.ts` (Lines 1-64)

**Purpose:** This is the public API surface - everything users can import.

**Key Exports:**

**Lines 8-13: Core Models**
```typescript
export { ELM } from "./core/ELM";
export { KernelELM } from "./core/KernelELM";
export { OnlineELM } from "./core/OnlineELM";
export { DeepELM } from "./core/DeepELM";
export { ELMChain } from "./core/ELMChain";
export { ELMAdapter, wrapELM } from "./core/ELMAdapter";
```

**Lines 15-18: Config & Math**
```typescript
export * from "./core/Activations";
export * from "./core/ELMConfig";
export * from "./core/Matrix";
```

**Lines 21-31: Retrieval & Evaluation**
```typescript
export { EmbeddingStore } from "./core/EmbeddingStore";
export * from "./core/Evaluation";
export { evaluateEnsembleRetrieval } from "./core/evaluateEnsembleRetrieval";
```

**Lines 37-39: ML Utilities**
```typescript
export { TFIDF, TFIDFVectorizer } from "./ml/TFIDF";
export { KNN } from "./ml/KNN";
```

**Lines 42-45: Preprocessing**
```typescript
export * from "./preprocessing/Tokenizer";
export * from "./preprocessing/TextEncoder";
export { UniversalEncoder } from "./preprocessing/UniversalEncoder";
```

**Lines 47-56: Task Modules**
```typescript
export * from "./tasks/AutoComplete";
export * from "./tasks/CharacterLangEncoderELM";
export * from "./tasks/ConfidenceClassifierELM";
export * from "./tasks/EncoderELM";
export * from "./tasks/FeatureCombinerELM";
export * from "./tasks/IntentClassifier";
export * from "./tasks/LanguageClassifier";
export * from "./tasks/RefinerELM";
export * from "./tasks/VotingClassifierELM";
```

---

## Core Architecture

### File: `src/core/ELMConfig.ts` (Lines 1-226)

**Purpose:** Defines configuration types and defaults for ELM models.

**Key Types:**

**Lines 7-13: Activation Types**
```typescript
export type Activation =
    | 'tanh'
    | 'relu'
    | 'leakyrelu'
    | 'sigmoid'
    | 'linear'
    | 'gelu';
```

**Lines 17-61: Base Configuration Interface**
```typescript
export interface BaseConfig {
    hiddenUnits: number;
    activation?: Activation;
    ridgeLambda?: number;
    seed?: number;
    log?: { ... };
    dropout?: number;
    weightInit?: WeightInit;
    exportFileName?: string;
    metrics?: { ... };
    task?: 'classification' | 'regression';
}
```

**Lines 64-71: Numeric Config (for vector inputs)**
```typescript
export interface NumericConfig extends BaseConfig {
    inputSize: number;
    useTokenizer?: false;
    categories: string[];
}
```

**Lines 74-87: Text Config (for text inputs)**
```typescript
export interface TextConfig extends BaseConfig {
    useTokenizer: true;
    categories: string[];
    maxLen: number;
    charSet?: string;
    tokenizerDelimiter?: RegExp;
    encoder?: any;
}
```

**Lines 89-90: Union Type**
```typescript
export type ELMConfig = NumericConfig | TextConfig;
```

**Lines 129-139: Default Configuration**
```typescript
const defaultBase: Required<Pick<BaseConfig,
    'hiddenUnits' | 'activation' | 'ridgeLambda' | 'weightInit'
>> & Partial<BaseConfig> = {
    hiddenUnits: 50,
    activation: 'relu',
    ridgeLambda: 1e-2,
    weightInit: 'xavier',
    seed: 1337,
    dropout: 0,
    log: { verbose: true, toFile: false, modelName: 'Unnamed ELM Model', level: 'info' },
};
```

**Lines 172-188: Config Normalization**
```typescript
export function normalizeConfig<T extends ELMConfig>(cfg: T): T {
    if (isTextConfig(cfg)) {
        const merged: TextConfig = {
            ...(defaultTextConfig as TextConfig),
            ...cfg,
            log: { ...(defaultBase.log ?? {}), ...(cfg.log ?? {}) },
        };
        return merged as T;
    } else {
        const merged: NumericConfig = {
            ...(defaultNumericConfig as NumericConfig),
            ...cfg,
            log: { ...(defaultBase.log ?? {}), ...(cfg.log ?? {}) },
        };
        return merged as T;
    }
}
```

---

## Main ELM Class

### File: `src/core/ELM.ts` (Lines 1-741)

**Purpose:** Core implementation of the Extreme Learning Machine.

**Key Structures:**

**Lines 22-26: Model Structure**
```typescript
export interface ELMModel {
    W: number[][];    // hiddenUnits x inputDim
    b: number[][];    // hiddenUnits x 1
    beta: number[][]; // hiddenUnits x outDim
}
```

**Lines 28-37: Prediction Results**
```typescript
export interface PredictResult {
    label: string;
    prob: number;
}

export interface TopKResult {
    index: number;
    label: string;
    prob: number;
}
```

**Lines 45-52: Seeded PRNG for Deterministic Initialization**
```typescript
function makePRNG(seed = 123456789) {
    let s = seed | 0 || 1;
    return () => {
        s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
        return ((s >>> 0) / 0xffffffff);
    };
}
```

**Lines 85-91: Ridge Regression Solver (Core Training Math)**
```typescript
/** (HᵀH + λI)B = HᵀY solved via Cholesky */
function ridgeSolve(H: number[][], Y: number[][], lambda: number): number[][] {
    const Ht = Matrix.transpose(H);
    const A = Matrix.addRegularization(Matrix.multiply(Ht, H), lambda + 1e-10);
    const R = Matrix.multiply(Ht, Y);
    return Matrix.solveCholesky(A, R, 1e-10);
}
```

**Lines 97-100: ELM Class Declaration**
```typescript
export class ELM {
    public categories: string[];
    public hiddenUnits: number;
    public activation: string;
    // ... more properties
```

**Key Methods to Highlight:**

1. **Constructor** (Lines 130-167)
   ```typescript
   constructor(config: ELMConfig) {
       const cfg = normalizeConfig(config);
       this.config = cfg;
       this.categories = cfg.categories;
       this.hiddenUnits = cfg.hiddenUnits;
       this.activation = cfg.activation ?? 'relu';
       // ... initialization code
       if (this.useTokenizer) {
           this.encoder = new UniversalEncoder({ ... });
       }
       this.model = null; // Weights allocated on first training
   }
   ```
   - Initializes the ELM with configuration
   - Sets up encoder for text mode (lines 155-163)
   - Uses seeded PRNG for reproducibility (lines 151-152)

2. **Weight Initialization** (Lines 184-198)
   ```typescript
   private randomMatrix(rows: number, cols: number): number[][] {
       const weightInit = this.config.weightInit ?? 'uniform';
       if (weightInit === 'xavier') {
           const limit = this.xavierLimit(cols, rows);
           return Array.from({ length: rows }, () =>
               Array.from({ length: cols }, () => (this.rng() * 2 - 1) * limit)
           );
       } else {
           return Array.from({ length: rows }, () =>
               Array.from({ length: cols }, () => (this.rng() * 2 - 1))
           );
       }
   }
   ```
   - Supports 'uniform', 'xavier', 'he' initialization schemes
   - Uses seeded PRNG for reproducibility

3. **Hidden Layer Building** (Lines 200-218)
   ```typescript
   private buildHidden(X: number[][], W: number[][], b: number[][]): number[][] {
       const tempH = Matrix.multiply(X, Matrix.transpose(W)); // N x hidden
       const activationFn = Activations.get(this.activation);
       let H = Activations.apply(
           tempH.map(row => row.map((val, j) => val + b[j][0])),
           activationFn
       );
       // Dropout application (lines 208-216)
       return H;
   }
   ```

4. **Training Methods:**
   - `trainFromData()` (Lines 311-400) - Train from pre-encoded vectors
     - Coerces input/output (lines 322-305)
     - Initializes or reuses weights (lines 327-336)
     - Builds hidden layer (line 339)
     - Solves for beta using ridge regression (line 350)
   - `train()` (Lines 403-487) - Main training method with augmentation support
     - Generates variants using Augment (line 420)
     - Encodes text inputs (line 422)
     - Trains model (lines 428-443)
     - Evaluates metrics if configured (lines 447-484)

5. **Prediction Methods:**
   - `predict()` (Line 492+) - Predict from text input
   - `predictFromVector()` - Predict from encoded vector
   - `predictLogitsFromVectors()` - Get raw logits
   - `getEmbedding()` - Extract hidden layer activations

6. **Serialization:**
   - `loadModelFromJSON()` (Lines 230-264) - Load model from JSON
   - `toJSON()` - Export model to JSON

---

## Preprocessing & Encoding

### File: `src/preprocessing/UniversalEncoder.ts`

**Purpose:** Handles text encoding (character-level or token-level).

**Key Features:**
- Character-level encoding (maps each char to a vector)
- Token-level encoding (splits text into tokens)
- Normalization support
- Configurable character sets and token delimiters

**Usage Pattern:**
```typescript
// In ELM.ts, encoder is initialized in constructor
// Text mode: creates UniversalEncoder with charSet, maxLen, tokenizerDelimiter
// Numeric mode: encoder is optional
```

---

## Task Modules

### File: `src/tasks/LanguageClassifier.ts` (Lines 1-229)

**Purpose:** Pre-built module for language classification.

**Key Structure:**

**Lines 12-19: Class Properties**
```typescript
export class LanguageClassifier {
    private elm: ELM;
    private config: ELMConfig;
    
    // Online (incremental) state
    private onlineMdl?: OnlineELM;
    private onlineCats?: string[];
    private onlineInputDim?: number;
```

**Lines 21-36: Constructor**
```typescript
constructor(config: ELMConfig) {
    this.config = {
        ...config,
        log: {
            modelName: 'LanguageClassifier',
            verbose: config.log?.verbose ?? false,
            toFile: config.log?.toFile ?? false,
            level: config.log?.level ?? 'info',
        },
    };
    
    this.elm = new ELM(this.config);
    
    if ((config as any).metrics) this.elm.metrics = (config as any).metrics;
    if (config.exportFileName) this.elm.config.exportFileName = config.exportFileName;
}
```

**Lines 38-51: Encoder Guard**
```typescript
private requireEncoder(): { encode: (s: string) => number[]; normalize: (v: number[]) => number[] } {
    const enc = (this.elm as any).encoder as
        | { encode: (s: string) => number[]; normalize: (v: number[]) => number[] }
        | undefined;
    
    if (!enc) {
        throw new Error(
            'LanguageClassifier: encoder unavailable. Use text mode (useTokenizer=true with maxLen/charSet) ' +
            'or pass a UniversalEncoder in the ELM config.'
        );
    }
    return enc;
}
```

**Lines 67-80: Training Method**
```typescript
train(data: LabeledExample[]): void {
    if (!data?.length) throw new Error('LanguageClassifier.train: empty dataset');
    
    const enc = this.requireEncoder();
    const categories = Array.from(new Set(data.map(d => d.label)));
    this.elm.setCategories(categories);
    
    const X: number[][] = [];
    const Y: number[][] = [];
    
    for (const { text, label } of data) {
        const x = enc.normalize(enc.encode(text));
        const yi = categories.indexOf(label);
        if (yi < 0) continue;
        // ... build X and Y matrices
```

**Other Task Modules:**
- `AutoComplete.ts` - Text completion
- `IntentClassifier.ts` - Intent recognition
- `ConfidenceClassifierELM.ts` - Classification with confidence scores
- `VotingClassifierELM.ts` - Ensemble classification
- `EncoderELM.ts` - Feature extraction
- `RefinerELM.ts` - Model refinement
- `FeatureCombinerELM.ts` - Multi-source feature fusion

---

## Advanced Features

### Kernel ELM (`src/core/KernelELM.ts`)

**Key Features:**
- Supports RBF, Linear, Polynomial, Laplacian, and custom kernels
- Exact and Nyström approximation modes
- Whitened Nyström for improved generalization

### Online ELM (`src/core/OnlineELM.ts`)

**Key Features:**
- Recursive Least Squares (RLS) updates
- Forgetting factor for adaptive learning
- Streaming updates without full retraining

### DeepELM (`src/core/DeepELM.ts`)

**Key Features:**
- Multi-layer stacked ELM
- Autoencoder pre-training
- Supervised classifier head

### Web Workers (`src/core/ELMWorker.ts`, `ELMWorkerClient.ts`)

**Purpose:** Offload training/prediction to background threads.

**Key Methods:**
- `initELM(config)` - Initialize ELM in worker
- `train()` - Train model in worker
- `predict()` - Predict in worker
- Progress callbacks for training updates

---

## Build & Distribution

### File: `package.json` (Lines 1-90)

**Key Sections:**

**Lines 1-24: Package Metadata**
```json
{
  "name": "@astermind/astermind-elm",
  "version": "2.1.1",
  "description": "JavaScript Extreme Learning Machine (ELM) library for browser and Node.js.",
  "license": "MIT",
  "type": "module",
  "main": "dist/astermind.umd.js",
  "module": "dist/astermind.esm.js",
  "sideEffects": false,
```

**Lines 10-18: Exports Configuration**
```json
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "import": "./dist/astermind.esm.js",
    "require": "./dist/astermind.umd.js",
    "default": "./dist/astermind.esm.js"
  },
  "./workers/elm-worker.js": "./dist/workers/elm-worker.js"
},
```

**Lines 25-38: Build Scripts**
```json
"scripts": {
  "build": "rollup -c && npm run build:types",
  "build:types": "tsc -p tsconfig.types.json",
  "postbuild": "cp dist/astermind.umd.js public/astermind.umd.js || true",
  "watch": "rollup -c -w",
  "clean": "rm -rf dist",
  "dev": "vite",
  "dev:news": "DEMO=ag-news-demo vite",
  "dev:autocomplete": "DEMO=autocomplete-chain vite",
  "dev:chain": "DEMO=chain-with-save vite",
  "dev:music": "DEMO=elm-drum-demo-mainthread vite",
  "dev:elm": "DEMO=elm-explination vite",
  "dev:lang": "DEMO=language-awareness-demo vite",
  "test": "vitest"
},
```

**Build Output:**
- `dist/astermind.esm.js` - ES Module format
- `dist/astermind.umd.js` - UMD format (for browsers via CDN)
- `dist/index.d.ts` - TypeScript definitions
- `public/astermind.umd.js` - Copy for local demos

### File: `rollup.config.cjs`

**Purpose:** Bundles the library using Rollup.

**Key Features:**
- Creates both ESM and UMD builds
- TypeScript compilation
- Tree-shaking support
- External dependencies handling

---

## Key Code Flow: Training a Model

### Step-by-Step Process:

1. **User creates ELM instance** (`ELM.ts` constructor, Lines 130-167)
   ```typescript
   const elm = new ELM({ categories: ['A', 'B'], hiddenUnits: 128 });
   ```

2. **Configuration normalized** (`ELMConfig.ts` line 172, called from `ELM.ts` line 132)
   - Fills in defaults
   - Validates required fields

3. **Encoder initialized** (if text mode, `ELM.ts` lines 155-163)
   ```typescript
   if (this.useTokenizer) {
       this.encoder = new UniversalEncoder({
           charSet: this.charSet,
           maxLen: this.maxLen,
           useTokenizer: this.useTokenizer,
           tokenizerDelimiter: this.tokenizerDelimiter,
           mode: this.useTokenizer ? 'token' : 'char'
       });
   }
   ```

4. **User calls `train()` or `trainFromData()`**
   - **For `trainFromData()`** (Lines 311-400):
     - Coerces input/output matrices (lines 322-305)
     - Initializes weights W and biases b (lines 327-336) using `randomMatrix()` (lines 184-198)
     - Builds hidden layer H (line 339) using `buildHidden()` (lines 200-218)
     - Solves for output weights beta using ridge regression (line 350)
   - **For `train()`** (Lines 403-487):
     - Generates augmented variants (line 420)
     - Encodes text inputs (line 422)
     - Initializes weights (lines 428-430)
     - Builds hidden layer (line 432)
     - Solves for beta (line 442)

5. **Ridge Solve** (`ELM.ts` lines 85-91, called from line 350 or 442)
   ```typescript
   // (HᵀH + λI)B = HᵀY
   const Ht = Matrix.transpose(H);
   const A = Matrix.addRegularization(Matrix.multiply(Ht, H), lambda + 1e-10);
   const R = Matrix.multiply(Ht, Y);
   return Matrix.solveCholesky(A, R, 1e-10);
   ```

6. **Model ready for prediction**
   - `predict()` (Line 492+) - Text input → prediction
   - `predictFromVector()` - Vector input → prediction
   - `getEmbedding()` - Extract hidden activations

---

## Key Code Flow: Making a Prediction

### Text Prediction Flow (`predict()` method, Lines 492-506)

1. **Input validation and encoding** (Lines 493-498)
   ```typescript
   if (!this.model) throw new Error('Model not trained.');
   if (!this.useTokenizer) {
       throw new Error('predict(text) requires useTokenizer:true');
   }
   const enc = this.assertEncoder();
   const vec = enc.normalize(enc.encode(text));
   ```

2. **Get logits** (Line 500, calls `predictLogitsFromVector()`)
   ```typescript
   const logits = this.predictLogitsFromVector(vec);
   ```

3. **Hidden layer computation** (`predictLogitsFromVector()`, Lines 522-536)
   ```typescript
   // Lines 527-532: Compute hidden layer
   const tempH = Matrix.multiply([vec], Matrix.transpose(W)); // 1 x hidden
   const activationFn = Activations.get(this.activation);
   const H = Activations.apply(
       tempH.map(row => row.map((val, j) => val + b[j][0])),
       activationFn
   ); // 1 x hidden
   
   // Line 535: Compute output logits
   return Matrix.multiply(H, beta)[0]; // 1 x outDim → vec
   ```

4. **Softmax and ranking** (Lines 501-505)
   ```typescript
   const probs = Activations.softmax(logits);
   return probs
       .map((p, i) => ({ label: this.categories[i], prob: p }))
       .sort((a, b) => b.prob - a.prob)
       .slice(0, topK);
   ```

### Vector Prediction Methods

- **`predictFromVector()`** (Lines 509-519) - Batch prediction from vectors
- **`predictLogitsFromVector()`** (Lines 522-536) - Raw logits for single vector
- **`predictLogitsFromVectors()`** (Lines 539-549) - Raw logits for batch
- **`predictProbaFromVector()`** (Lines 552-554) - Probabilities for single vector
- **`predictTopKFromVector()`** (Lines 562-568) - Top-K results for single vector

---

## Important Utilities

### Matrix Operations (`src/core/Matrix.ts`)

**Key Functions:**
- `multiply()` - Matrix multiplication
- `transpose()` - Matrix transpose
- `solveCholesky()` - Cholesky decomposition solver
- `addRegularization()` - Add λI for ridge regression
- `invSqrtSym()` - Symmetric matrix inverse square root (for whitening)

### Activations (`src/core/Activations.ts`)

**Supported Activations:**
- `relu`, `leakyrelu`, `sigmoid`, `tanh`, `linear`, `gelu`
- `softmax` for output layer
- Derivatives for backpropagation (if needed)

### EmbeddingStore (`src/core/EmbeddingStore.ts`)

**Purpose:** Vector database for similarity search.

**Key Features:**
- Unit-norm vector storage
- Ring buffer capacity management
- KNN search (cosine, dot, euclidean)
- Metadata filtering

---

## Testing

### Test Files (`tests/` directory)

- `Activations.test.ts` - Activation function tests
- `Matrix.test.ts` - Matrix operation tests
- `TextEncoder.test.ts` - Encoding tests
- `Tokenizer.test.ts` - Tokenization tests
- `UniversalEncoder.test.ts` - Universal encoder tests
- `IO.test.ts` - I/O utility tests
- `BindUI.test.ts` - UI binding tests
- `Augment.test.ts` - Data augmentation tests

**Run tests:**
```bash
npm test
```

---

## Examples & Demos

### Example Directories:

1. **`examples/ag-news-demo/`** - News classification demo
2. **`examples/autocomplete-chain/`** - Autocomplete with chaining
3. **`examples/chain-with-save/`** - Model saving/loading demo
4. **`examples/elm-drum-demo-mainthread/`** - Music generation demo
5. **`examples/elm-explination/`** - Educational presentation
6. **`examples/language-awareness-demo/`** - Language detection demo

### Node Examples (`node_examples/`)

- `agnews-two-stage-retrieval.ts` - Two-stage retrieval system
- `book-index-elm-tfidf.ts` - Book indexing with TF-IDF
- `deepelm-kelm-retrieval.ts` - DeepELM + KernelELM retrieval
- `tfidf-elm-dense-retrieval.ts` - TF-IDF + ELM hybrid

---

## Quick Reference: Important Line Numbers

### Core Files:
- **`src/index.ts`** - Lines 8-13 (core exports), 37-39 (ML utilities), 47-56 (task modules)
- **`src/core/ELMConfig.ts`** - Lines 17-61 (BaseConfig), 64-71 (NumericConfig), 74-87 (TextConfig), 172-188 (normalizeConfig)
- **`src/core/ELM.ts`**:
  - Lines 22-26: ELMModel interface
  - Lines 45-52: Seeded PRNG
  - Lines 85-91: ridgeSolve function (core math)
  - Lines 97-128: ELM class properties
  - Lines 130-167: Constructor
  - Lines 184-198: randomMatrix (weight initialization)
  - Lines 200-218: buildHidden (hidden layer computation)
  - Lines 230-264: loadModelFromJSON
  - Lines 311-400: trainFromData method
  - Lines 403-487: train method (text mode)
  - Line 492+: predict method

### Task Modules:
- **`src/tasks/LanguageClassifier.ts`**:
  - Lines 12-19: Class structure
  - Lines 21-36: Constructor
  - Lines 38-51: requireEncoder guard
  - Lines 67-80: train method

### Configuration:
- **`package.json`** - Lines 1-24 (package metadata), 25-38 (scripts), 10-18 (exports)

---

## Presentation Tips

### Recommended Presentation Flow:

1. **Start with `src/index.ts`** (5 min)
   - Show what users can import (Lines 8-13, 37-39, 47-56)
   - Explain the modular architecture

2. **Explain `ELMConfig.ts`** (5 min)
   - Show how configuration works (Numeric vs Text)
   - Lines 17-61 (BaseConfig), 64-71 (NumericConfig), 74-87 (TextConfig)
   - Lines 172-188 (normalizeConfig function)

3. **Walk through `ELM.ts` Constructor** (5 min)
   - Lines 130-167: How ELM initializes
   - Lines 155-163: Encoder setup for text mode
   - Lines 151-152: Seeded PRNG initialization

4. **Core Training Logic** (10 min)
   - Lines 184-198: Weight initialization (`randomMatrix`)
   - Lines 200-218: Hidden layer building (`buildHidden`)
   - Lines 85-91: **Ridge solve - the core math** ⭐
   - Lines 311-400: `trainFromData()` method
   - Lines 403-487: `train()` method (text mode)

5. **Prediction Flow** (5 min)
   - Lines 492-506: `predict()` method
   - Lines 522-536: `predictLogitsFromVector()` - the computation
   - Show the forward pass: input → hidden → output

6. **Show a Task Module** (5 min)
   - `LanguageClassifier.ts` as example
   - Lines 21-36: Constructor
   - Lines 67-80: Training method
   - Show how it wraps ELM

7. **Build & Distribution** (3 min)
   - `package.json` scripts (Lines 25-38)
   - Exports configuration (Lines 10-18)
   - Build outputs

8. **Q&A and Examples** (remaining time)
   - Point to example directories
   - Show real usage patterns

---

## Questions to Address During Walkthrough

1. **How does training work?**
   - Random weight initialization → Hidden activations → Ridge solve for output weights

2. **What's the difference between Numeric and Text configs?**
   - Numeric: Direct vector input, requires inputSize
   - Text: Uses UniversalEncoder, requires maxLen, charSet, tokenizerDelimiter

3. **How does the closed-form solution work?**
   - Ridge regression: (HᵀH + λI)B = HᵀY solved via Cholesky decomposition

4. **What makes this fast?**
   - No iterative optimization (SGD), just matrix operations
   - Single hidden layer with closed-form solution

5. **How do Web Workers help?**
   - Offloads heavy matrix operations to background thread
   - Keeps UI responsive during training

---

## 🎯 Quick Reference Cheat Sheet

### Most Important Line Numbers for Presentation

| Topic | File | Lines | What to Show |
|-------|------|-------|--------------|
| **Public API** | `src/index.ts` | 8-13 | Core model exports |
| **Config Types** | `src/core/ELMConfig.ts` | 17-61, 64-71, 74-87 | BaseConfig, NumericConfig, TextConfig |
| **Core Math** | `src/core/ELM.ts` | 85-91 | `ridgeSolve()` - the training equation |
| **Constructor** | `src/core/ELM.ts` | 130-167 | ELM initialization |
| **Weight Init** | `src/core/ELM.ts` | 184-198 | `randomMatrix()` - Xavier/Uniform |
| **Hidden Layer** | `src/core/ELM.ts` | 200-218 | `buildHidden()` - activation computation |
| **Training (Vectors)** | `src/core/ELM.ts` | 311-400 | `trainFromData()` method |
| **Training (Text)** | `src/core/ELM.ts` | 403-487 | `train()` method |
| **Prediction** | `src/core/ELM.ts` | 492-506 | `predict()` method |
| **Logits Computation** | `src/core/ELM.ts` | 522-536 | `predictLogitsFromVector()` |
| **Task Module** | `src/tasks/LanguageClassifier.ts` | 21-36, 67-80 | Constructor and training |
| **Build Config** | `package.json` | 10-18, 25-38 | Exports and scripts |

### Key Code Snippets to Highlight

1. **Ridge Solve** (`ELM.ts` lines 85-91)
   ```typescript
   function ridgeSolve(H: number[][], Y: number[][], lambda: number): number[][] {
       const Ht = Matrix.transpose(H);
       const A = Matrix.addRegularization(Matrix.multiply(Ht, H), lambda + 1e-10);
       const R = Matrix.multiply(Ht, Y);
       return Matrix.solveCholesky(A, R, 1e-10);
   }
   ```

2. **Hidden Layer** (`ELM.ts` lines 200-218)
   ```typescript
   private buildHidden(X: number[][], W: number[][], b: number[][]): number[][] {
       const tempH = Matrix.multiply(X, Matrix.transpose(W));
       const activationFn = Activations.get(this.activation);
       let H = Activations.apply(
           tempH.map(row => row.map((val, j) => val + b[j][0])),
           activationFn
       );
       // Dropout application
       return H;
   }
   ```

3. **Prediction Flow** (`ELM.ts` lines 492-536)
   ```typescript
   // Text → Vector → Hidden → Logits → Probabilities → Top-K
   const vec = enc.normalize(enc.encode(text));
   const logits = this.predictLogitsFromVector(vec);
   const probs = Activations.softmax(logits);
   return probs.map(...).sort(...).slice(0, topK);
   ```

### Common Questions & Where to Find Answers

| Question | File | Lines |
|----------|------|-------|
| How does training work? | `ELM.ts` | 311-400, 403-487 |
| What's the math behind ELM? | `ELM.ts` | 85-91 (ridgeSolve) |
| How are weights initialized? | `ELM.ts` | 184-198 |
| How does text encoding work? | `ELM.ts` | 155-163 (encoder setup) |
| What's the difference between Numeric and Text configs? | `ELMConfig.ts` | 64-71 vs 74-87 |
| How do predictions work? | `ELM.ts` | 492-536 |
| How to use a pre-built module? | `tasks/LanguageClassifier.ts` | 21-80 |

---

**End of Walkthrough Document**


