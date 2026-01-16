# AsterMind-ELM Quick Start Tutorial

**Complete guide to using all AsterMind features with practical examples**

## What You'll Learn

This tutorial covers all major features of AsterMind-ELM:

- ✅ **Basic ELM** - Text and numeric classification
- ✅ **Kernel ELM** - Non-linear classification with kernels
- ✅ **Online ELM** - Incremental/streaming learning
- ✅ **DeepELM** - Multi-layer stacked architectures
- ✅ **Embeddings** - Creating and searching vector embeddings
- ✅ **ELM Chains** - Sequential feature processing
- ✅ **Web Workers** - Offloading computation to background threads
- ✅ **Pre-built Modules** - Language classification, autocomplete, intent detection
- ✅ **Model Persistence** - Saving and loading models
- ✅ **Advanced Features** - Custom activations, augmentation, evaluation

**Time to Complete:** ~2-3 hours (depending on experimentation)

**Prerequisites:** Basic JavaScript/TypeScript knowledge

---

## Table of Contents

1. [Installation](#installation)
2. [Basic ELM - Text Classification](#1-basic-elm---text-classification)
3. [Basic ELM - Numeric Classification](#2-basic-elm---numeric-classification)
4. [Kernel ELM (KELM)](#3-kernel-elm-kelm)
5. [Online ELM (OS-ELM)](#4-online-elm-os-elm)
6. [DeepELM](#5-deepelm)
7. [Embeddings & EmbeddingStore](#6-embeddings--embeddingstore)
8. [ELM Chains](#7-elm-chains)
9. [Web Workers](#8-web-workers)
10. [Pre-built Task Modules](#9-pre-built-task-modules)
11. [Model Saving & Loading](#10-model-saving--loading)
12. [Advanced Features](#11-advanced-features)

---

## Installation

### NPM Installation

```bash
npm install @astermind/astermind-elm
```

> **💡 Want to run these examples?** See [RUNNING-EXAMPLES.md](../RUNNING-EXAMPLES.md) for a complete guide on setting up and running practical examples with Vite!

### Browser (CDN)

```html
<script src="https://cdn.jsdelivr.net/npm/@astermind/astermind-elm/dist/astermind.umd.js"></script>
<script>
  const { ELM, KernelELM, OnlineELM } = window.astermind;
</script>
```

### TypeScript/ES Modules

```typescript
import { ELM, KernelELM, OnlineELM, DeepELM, EmbeddingStore } from '@astermind/astermind-elm';
```

---

## 1. Basic ELM - Text Classification

### Simple Language Detection

```typescript
import { ELM } from '@astermind/astermind-elm';

// Create ELM for language classification
const elm = new ELM({
  categories: ['English', 'French', 'Spanish', 'German'],
  hiddenUnits: 128,
  maxLen: 30,
  useTokenizer: true,  // Enable text mode
  activation: 'relu',
  ridgeLambda: 1e-2,
  weightInit: 'xavier',
  seed: 42
});

// Train from category names (auto-generates variants)
elm.train({
  suffixes: ['!', '?'],
  prefixes: ['Hello ', 'Hi '],
  includeNoise: true
});

// Predict
const result = elm.predict('bonjour');
console.log(result);
// Output: [{ label: 'French', prob: 0.95 }, ...]

// Get top 3 predictions
const top3 = elm.predict('hola', 3);
```

### Training from Labeled Data

```typescript
import { ELM } from '@astermind/astermind-elm';

const elm = new ELM({
  categories: ['positive', 'negative', 'neutral'],
  hiddenUnits: 256,
  maxLen: 100,
  useTokenizer: true,
  charSet: 'abcdefghijklmnopqrstuvwxyz0123456789 .,!?',
  tokenizerDelimiter: /\s+/
});

// Prepare training data
const trainingData = [
  { text: 'I love this product!', label: 'positive' },
  { text: 'This is terrible', label: 'negative' },
  { text: 'It is okay', label: 'neutral' },
  // ... more examples
];

// Encode and train
const X: number[][] = [];
const Y: number[][] = [];

for (const { text, label } of trainingData) {
  const encoder = elm['encoder']; // Access internal encoder
  const vec = encoder.normalize(encoder.encode(text));
  X.push(vec);
  
  const labelIndex = elm.categories.indexOf(label);
  Y.push(elm.oneHot(elm.categories.length, labelIndex));
}

// Train from vectors
elm.trainFromData(X, Y);

// Predict
const prediction = elm.predict('This is amazing!');
console.log(prediction[0].label); // 'positive'
```

---

## 2. Basic ELM - Numeric Classification

### Classification from Feature Vectors

```typescript
import { ELM } from '@astermind/astermind-elm';

// Create ELM for numeric input
const elm = new ELM({
  categories: ['classA', 'classB', 'classC'],
  inputSize: 10,  // Input feature dimension
  hiddenUnits: 64,
  useTokenizer: false,  // Numeric mode
  activation: 'relu',
  ridgeLambda: 1e-2
});

// Training data: X is feature vectors, y is class indices
const X: number[][] = [
  [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0],
  [2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0],
  // ... more samples
];

const y: number[] = [0, 1, 0, 2, 1, ...]; // Class indices

// Train
elm.trainFromData(X, y);

// Predict from vector
const testVector = [1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 9.5, 10.5];
const result = elm.predictFromVector([testVector]);
console.log(result[0]); // [{ label: 'classA', prob: 0.87 }, ...]

// Get raw logits
const logits = elm.predictLogitsFromVector(testVector);
console.log(logits); // [2.3, -0.5, 1.1]

// Get probabilities
const probs = elm.predictProbaFromVector(testVector);
console.log(probs); // [0.87, 0.05, 0.08]
```

### Regression (Continuous Output)

```typescript
import { ELM } from '@astermind/astermind-elm';

const elm = new ELM({
  categories: ['output'],  // Placeholder for regression
  inputSize: 5,
  hiddenUnits: 32,
  useTokenizer: false,
  activation: 'relu'
});

// Regression: Y is continuous values (not one-hot)
const X: number[][] = [
  [1.0, 2.0, 3.0, 4.0, 5.0],
  [2.0, 3.0, 4.0, 5.0, 6.0],
  // ...
];

// Y is continuous values (each row is a single output value)
const Y: number[][] = [
  [10.5],  // Target value for first sample
  [12.3],  // Target value for second sample
  // ...
];

elm.trainFromData(X, Y);

// Predict continuous value
const prediction = elm.predictLogitsFromVector([1.5, 2.5, 3.5, 4.5, 5.5]);
console.log(prediction[0]); // Predicted continuous value
```

---

## 3. Kernel ELM (KELM)

### Exact Kernel ELM

```typescript
import { KernelELM, KernelRegistry } from '@astermind/astermind-elm';

// Create Kernel ELM with RBF kernel
const kelm = new KernelELM({
  outputDim: 3,  // Number of classes
  kernel: {
    type: 'rbf',
    gamma: 0.1  // RBF parameter (1/feature_dim is common)
  },
  mode: 'exact',
  ridgeLambda: 1e-2,
  task: 'classification'
});

// Training data
const X: number[][] = [
  [1.0, 2.0, 3.0],
  [2.0, 3.0, 4.0],
  // ... more samples
];

const Y: number[][] = [
  [1, 0, 0],  // One-hot encoding
  [0, 1, 0],
  [0, 0, 1],
  // ...
];

// Train
kelm.fit(X, Y);

// Predict
const testVec = [1.5, 2.5, 3.5];
const probs = kelm.predictProbaFromVectors([testVec]);
console.log(probs[0]); // [0.8, 0.15, 0.05]

// Get embeddings (kernel features)
const embedding = kelm.getEmbedding([testVec]);
console.log(embedding[0]);
```

### Nyström Approximation (Faster for Large Datasets)

```typescript
import { KernelELM } from '@astermind/astermind-elm';

const kelm = new KernelELM({
  outputDim: 5,
  kernel: {
    type: 'rbf',
    gamma: 0.01
  },
  mode: 'nystrom',
  nystrom: {
    m: 256,  // Number of landmarks
    strategy: 'kmeans++',  // Landmark selection
    whiten: true,  // Apply whitening for better generalization
    seed: 42
  },
  ridgeLambda: 1e-2
});

kelm.fit(X, Y);
const probs = kelm.predictProbaFromVectors(X_test);
```

### Different Kernel Types

```typescript
// Linear kernel
const linearKELM = new KernelELM({
  outputDim: 3,
  kernel: { type: 'linear' },
  mode: 'exact'
});

// Polynomial kernel
const polyKELM = new KernelELM({
  outputDim: 3,
  kernel: {
    type: 'poly',
    degree: 3,
    gamma: 0.1,
    coef0: 1.0
  },
  mode: 'exact'
});

// Laplacian kernel
const laplacianKELM = new KernelELM({
  outputDim: 3,
  kernel: {
    type: 'laplacian',
    gamma: 0.1
  },
  mode: 'exact'
});

// Custom kernel
KernelRegistry.register('myKernel', (x: number[], z: number[]) => {
  // Custom kernel function
  return Math.exp(-0.5 * x.reduce((sum, xi, i) => sum + Math.pow(xi - z[i], 2), 0));
});

const customKELM = new KernelELM({
  outputDim: 3,
  kernel: {
    type: 'custom',
    name: 'myKernel'
  },
  mode: 'exact'
});
```

---

## 4. Online ELM (OS-ELM)

### Incremental Learning with Streaming Updates

```typescript
import { OnlineELM } from '@astermind/astermind-elm';

// Create Online ELM
const onlineELM = new OnlineELM({
  inputDim: 10,
  outputDim: 3,
  hiddenUnits: 128,
  activation: 'relu',
  ridgeLambda: 1e-2,
  forgettingFactor: 0.95,  // 0.95 means older data decays (0.95^t)
  weightInit: 'xavier',
  seed: 42
});

// Initial batch training
const X0: number[][] = [
  [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0],
  // ... initial samples
];

const Y0: number[][] = [
  [1, 0, 0],
  // ... initial labels
];

// Initialize with first batch
onlineELM.init(X0, Y0);

// Stream updates (no full retrain needed!)
const Xt: number[][] = [[2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0]];
const Yt: number[][] = [[0, 1, 0]];

onlineELM.update(Xt, Yt);

// Predict
const probs = onlineELM.predictProbaFromVectors([[1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 9.5, 10.5]]);
console.log(probs[0]);

// Get embeddings (hidden activations or logits)
const embedding = onlineELM.getEmbedding([[1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0]], 'hidden');
// or
const logitsEmbedding = onlineELM.getEmbedding([[1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0]], 'logits');
```

### Forgetting Factor Explained

```typescript
// Forgetting factor controls how fast old data decays:
// - 1.0 = no forgetting (all data weighted equally)
// - 0.95 = recent data weighted more (good for non-stationary data)
// - 0.9 = faster adaptation to new patterns

const adaptiveELM = new OnlineELM({
  inputDim: 10,
  outputDim: 3,
  hiddenUnits: 64,
  forgettingFactor: 0.9  // Adapt quickly to new patterns
});
```

---

## 5. DeepELM

### Multi-Layer Stacked ELM

```typescript
import { DeepELM } from '@astermind/astermind-elm';

// Create DeepELM with stacked autoencoders
const deepELM = new DeepELM({
  inputDim: 100,  // Input feature dimension
  layers: [
    { hiddenUnits: 128, activation: 'relu', name: 'Layer1' },
    { hiddenUnits: 64, activation: 'relu', name: 'Layer2' },
    { hiddenUnits: 32, activation: 'relu', name: 'Layer3' }
  ],
  numClasses: 5,
  clfHiddenUnits: 16,  // Classifier hidden units (0 = linear readout)
  clfActivation: 'linear',
  normalizeEach: false,  // L2 normalize after each layer
  normalizeFinal: true   // L2 normalize final features
});

// Training data
const X: number[][] = [
  // ... 100-dimensional feature vectors
];

const Y: number[][] = [
  // ... one-hot encoded labels
];

// Step 1: Unsupervised layer-wise training (autoencoders)
const X_transformed = deepELM.fitAutoencoders(X);
// Each layer learns to reconstruct its input (Y=X)

// Step 2: Supervised classifier on transformed features
deepELM.fitClassifier(X_transformed, Y);

// Predict
const testVec = [/* 100-dim vector */];
const probs = deepELM.predictProbaFromVectors([testVec]);
console.log(probs[0]);

// Transform data through all layers
const transformed = deepELM.transform([testVec]);
console.log(transformed[0]); // Final layer features
```

### DeepELM with Custom Configuration

```typescript
const deepELM = new DeepELM({
  inputDim: 50,
  layers: [
    {
      hiddenUnits: 256,
      activation: 'relu',
      weightInit: 'he',
      dropout: 0.1,
      ridgeLambda: 1e-3,
      name: 'Encoder1'
    },
    {
      hiddenUnits: 128,
      activation: 'gelu',
      weightInit: 'xavier',
      name: 'Encoder2'
    }
  ],
  numClasses: 10,
  clfHiddenUnits: 32,
  clfActivation: 'relu',
  normalizeEach: true,  // Normalize after each layer
  normalizeFinal: true
});
```

---

## 6. Embeddings & EmbeddingStore

### Creating Embeddings

```typescript
import { ELM, EmbeddingStore } from '@astermind/astermind-elm';

const elm = new ELM({
  categories: ['A', 'B', 'C'],
  inputSize: 10,
  hiddenUnits: 128,
  useTokenizer: false
});

elm.trainFromData(X, y);

// Get embeddings (hidden layer activations)
const embeddings = elm.getEmbedding(X);
console.log(embeddings); // N x 128 matrix
```

### Using EmbeddingStore for Similarity Search

```typescript
import { EmbeddingStore } from '@astermind/astermind-elm';

// Create embedding store
const store = new EmbeddingStore({
  capacity: 10000,  // Ring buffer capacity
  normalize: true  // Store unit-norm vectors
});

// Add documents with embeddings
store.add({
  id: 'doc1',
  vector: [0.1, 0.2, 0.3, 0.4, 0.5],
  meta: { title: 'Introduction to ML', category: 'tutorial' }
});

store.add({
  id: 'doc2',
  vector: [0.2, 0.3, 0.4, 0.5, 0.6],
  meta: { title: 'Advanced ML', category: 'advanced' }
});

// Query for similar items
const queryVec = [0.15, 0.25, 0.35, 0.45, 0.55];
const results = store.query({
  vector: queryVec,
  k: 5,  // Top 5 results
  metric: 'cosine',  // 'cosine' | 'dot' | 'euclidean' | 'manhattan'
  minScore: 0.7,  // Minimum similarity threshold
  filter: (meta, id) => meta?.category === 'tutorial'  // Optional filter
});

console.log(results);
// [
//   { id: 'doc1', score: 0.98, index: 0, meta: {...} },
//   { id: 'doc2', score: 0.95, index: 1, meta: {...} },
//   ...
// ]

// Query with different metrics
const euclideanResults = store.query({
  vector: queryVec,
  k: 5,
  metric: 'euclidean',
  maxDistance: 0.5  // Maximum distance threshold
});

// Get all items
const allItems = store.getAll();
console.log(allItems.length);

// Remove item
store.remove('doc1');

// Clear store
store.clear();
```

### Building a Search System

```typescript
import { ELM, EmbeddingStore } from '@astermind/astermind-elm';

// Step 1: Train ELM to generate embeddings
const encoder = new ELM({
  categories: ['dummy'],
  inputSize: 100,
  hiddenUnits: 64,
  useTokenizer: false
});

encoder.trainFromData(X_train, Y_train);

// Step 2: Create embedding store
const searchStore = new EmbeddingStore({ capacity: 5000, normalize: true });

// Step 3: Index documents
const documents = [
  { id: '1', text: 'Machine learning is...', meta: { author: 'Alice' } },
  { id: '2', text: 'Deep learning models...', meta: { author: 'Bob' } },
  // ...
];

for (const doc of documents) {
  // Encode document (you'd use your text encoder here)
  const embedding = encoder.getEmbedding([encodeText(doc.text)])[0];
  
  searchStore.add({
    id: doc.id,
    vector: embedding,
    meta: doc.meta
  });
}

// Step 4: Search
const queryEmbedding = encoder.getEmbedding([encodeText('neural networks')])[0];
const results = searchStore.query({
  vector: queryEmbedding,
  k: 10,
  metric: 'cosine'
});
```

---

## 7. ELM Chains

### Sequential Feature Processing

```typescript
import { ELM, ELMChain, wrapELM } from '@astermind/astermind-elm';

// Create multiple ELMs for chaining
const encoder1 = new ELM({
  categories: ['dummy'],
  inputSize: 50,
  hiddenUnits: 128,
  useTokenizer: false
});

const encoder2 = new ELM({
  categories: ['dummy'],
  inputSize: 128,  // Must match encoder1 output
  hiddenUnits: 64,
  useTokenizer: false
});

// Train each encoder
encoder1.trainFromData(X1, Y1);
encoder2.trainFromData(encoder1.getEmbedding(X1), Y2);

// Create chain
const chain = new ELMChain([
  wrapELM(encoder1, 'Encoder1'),
  wrapELM(encoder2, 'Encoder2')
], {
  normalizeEach: false,
  normalizeFinal: true,
  name: 'MyChain'
});

// Process data through chain
const X: number[][] = [
  // ... 50-dimensional vectors
];

const finalEmbeddings = chain.getEmbedding(X);
console.log(finalEmbeddings); // 64-dimensional vectors

// Get intermediate embeddings
const intermediate = chain.getEmbedding(X, { returnIntermediate: true });
console.log(intermediate); // Array of embeddings at each stage
```

### Chain with Online ELM

```typescript
import { OnlineELM, ELMChain, wrapOnlineELM } from '@astermind/astermind-elm';

const onlineELM = new OnlineELM({
  inputDim: 100,
  outputDim: 3,
  hiddenUnits: 64
});

onlineELM.init(X0, Y0);

// Wrap OnlineELM for chain (can use 'hidden' or 'logits' mode)
const adapter = wrapOnlineELM(onlineELM, { mode: 'hidden' });

const chain = new ELMChain([adapter], {
  normalizeFinal: true
});
```

---

## 8. Web Workers

### Offloading Training to Background Thread

```typescript
// main.ts (main thread)
import { ELMWorkerClient } from '@astermind/astermind-elm';

// Create worker - use the exported worker path from package.json
const worker = new Worker(
  new URL('@astermind/astermind-elm/workers/elm-worker.js', import.meta.url),
  { type: 'module' }
);
const client = new ELMWorkerClient(worker);

// Initialize ELM in worker
await client.initELM({
  categories: ['A', 'B', 'C'],
  hiddenUnits: 128,
  maxLen: 30,
  useTokenizer: true
});

// Train with progress callbacks
await client.elmTrain(
  {},
  (progress) => {
    console.log(`Training: ${progress.phase} - ${(progress.pct * 100).toFixed(1)}%`);
  }
);

// Predict
const results = await client.elmPredict('test input', 5);
console.log(results);

// Predict from vector
const vectorResults = await client.elmPredictFromVector([[0.1, 0.2, 0.3]], 3);

// Get logits
const logits = await client.elmPredictLogits([[0.1, 0.2, 0.3]]);

// Cleanup
worker.terminate();
```

**Note:** The worker file (`elm-worker.js`) is automatically provided by the package and handles all ELM operations in the background thread. You don't need to create it yourself - just import it from the package.

### Online ELM in Worker

```typescript
// Initialize Online ELM in worker
await client.initOnlineELM({
  inputDim: 10,
  outputDim: 3,
  hiddenUnits: 64,
  forgettingFactor: 0.95
});

// Initial batch
await client.onlineInit(X0, Y0);

// Stream updates
await client.onlineUpdate(Xt, Yt);

// Predict probabilities
const probs = await client.onlinePredictProba(X_test);

// Get embeddings
const embeddings = await client.onlineGetEmbedding(X_test, 'hidden');
// or 'logits' mode
const logitsEmbeddings = await client.onlineGetEmbedding(X_test, 'logits');
```

---

## 9. Pre-built Task Modules

### Language Classifier

```typescript
import { LanguageClassifier } from '@astermind/astermind-elm';

const langClassifier = new LanguageClassifier({
  categories: ['English', 'French', 'Spanish'],
  hiddenUnits: 128,
  maxLen: 50,
  useTokenizer: true,
  charSet: 'abcdefghijklmnopqrstuvwxyz'
});

// Load training data
const data = langClassifier.loadTrainingData(csvString, 'csv');
// or
const data = langClassifier.loadTrainingData(jsonString, 'json');

// Train
langClassifier.train(data);

// Predict
const result = langClassifier.predict('bonjour');
console.log(result); // { label: 'French', prob: 0.95 }

// Save model
langClassifier.saveModelAsJSONFile('language-model.json');

// Load model
langClassifier.loadModelFromJSON(jsonString);
```

### AutoComplete

```typescript
import { AutoComplete } from '@astermind/astermind-elm';

const autocomplete = new AutoComplete({
  hiddenUnits: 64,
  maxLen: 20,
  useTokenizer: true
});

// Train from word list
const words = ['hello', 'world', 'javascript', 'typescript', ...];
autocomplete.train(words);

// Get completions
const completions = autocomplete.predict('jav', 5);
console.log(completions); // ['javascript', 'java', ...]
```

### Intent Classifier

```typescript
import { IntentClassifier } from '@astermind/astermind-elm';

const intentClassifier = new IntentClassifier({
  categories: ['greeting', 'question', 'command', 'goodbye'],
  hiddenUnits: 128,
  maxLen: 100,
  useTokenizer: true
});

// Train from labeled examples
const examples = [
  { text: 'Hello there', label: 'greeting' },
  { text: 'What is this?', label: 'question' },
  { text: 'Open the door', label: 'command' },
  // ...
];

intentClassifier.train(examples);

// Classify intent
const intent = intentClassifier.predict('Hi, how are you?');
console.log(intent.label); // 'greeting'
```

### Voting Classifier (Ensemble)

```typescript
import { VotingClassifierELM } from '@astermind/astermind-elm';

// Create multiple ELMs
const elm1 = new ELM({ categories: ['A', 'B'], hiddenUnits: 64, ... });
const elm2 = new ELM({ categories: ['A', 'B'], hiddenUnits: 128, ... });
const elm3 = new ELM({ categories: ['A', 'B'], hiddenUnits: 256, ... });

// Train each
elm1.trainFromData(X, y);
elm2.trainFromData(X, y);
elm3.trainFromData(X, y);

// Create voting classifier
const votingClassifier = new VotingClassifierELM([elm1, elm2, elm3], {
  strategy: 'majority'  // or 'weighted', 'average'
});

// Predict (combines predictions from all models)
const result = votingClassifier.predict(testVec);
```

---

## 10. Model Saving & Loading

### Save and Load ELM Models

```typescript
import { ELM } from '@astermind/astermind-elm';

const elm = new ELM({
  categories: ['A', 'B', 'C'],
  hiddenUnits: 128,
  maxLen: 30,
  useTokenizer: true
});

elm.train();

// Save to JSON string
const jsonString = elm.toJSON();
console.log(jsonString);

// Save to file (browser)
elm.saveModelAsJSONFile('my-model.json');

// Load from JSON
elm.loadModelFromJSON(jsonString);

// Load from file (browser)
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.onchange = (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const json = event.target?.result as string;
      elm.loadModelFromJSON(json);
    };
    reader.readAsText(file);
  }
};
```

### Save and Load Kernel ELM

```typescript
import { KernelELM } from '@astermind/astermind-elm';

const kelm = new KernelELM({
  outputDim: 3,
  kernel: { type: 'rbf', gamma: 0.1 },
  mode: 'exact'
});

kelm.fit(X, Y);

// Save
const json = kelm.toJSON();

// Load
kelm.fromJSON(json);
```

### Save and Load Online ELM

```typescript
import { OnlineELM } from '@astermind/astermind-elm';

const onlineELM = new OnlineELM({
  inputDim: 10,
  outputDim: 3,
  hiddenUnits: 64
});

onlineELM.init(X0, Y0);

// Save
const json = onlineELM.toJSON();

// Load
onlineELM.fromJSON(json);
```

### Save and Load DeepELM

```typescript
import { DeepELM } from '@astermind/astermind-elm';

const deepELM = new DeepELM({
  inputDim: 100,
  layers: [{ hiddenUnits: 64 }, { hiddenUnits: 32 }],
  numClasses: 5
});

deepELM.fitAutoencoders(X);
deepELM.fitClassifier(X_transformed, Y);

// Save entire pipeline
const json = deepELM.toJSON();

// Load
deepELM.fromJSON(json);
```

### Save and Load EmbeddingStore

```typescript
import { EmbeddingStore } from '@astermind/astermind-elm';

const store = new EmbeddingStore({ capacity: 1000, normalize: true });
// ... add items ...

// Save
const json = store.toJSON();

// Load
const newStore = EmbeddingStore.fromJSON(json);
```

---

## 11. Advanced Features

### Custom Activation Functions

```typescript
import { Activations } from '@astermind/astermind-elm';

// Register custom activation
Activations.register('myActivation', {
  fn: (x: number) => Math.tanh(x * 2),
  derivative: (x: number) => 2 * (1 - Math.pow(Math.tanh(x * 2), 2))
});

// Use in ELM
const elm = new ELM({
  categories: ['A', 'B'],
  hiddenUnits: 64,
  activation: 'myActivation',  // Use custom activation
  useTokenizer: false
});
```

### Data Augmentation

```typescript
import { Augment } from '@astermind/astermind-elm';

const variants = Augment.generateVariants('hello', 'abcdefghijklmnopqrstuvwxyz', {
  suffixes: ['!', '?', '.'],
  prefixes: ['Hi ', 'Hello '],
  includeNoise: true
});

console.log(variants);
// ['hello!', 'hello?', 'hello.', 'Hi hello', 'Hello hello', 'h3llo', ...]
```

### Evaluation Metrics

```typescript
import { ELM, Evaluation } from '@astermind/astermind-elm';

const elm = new ELM({ /* ... */ });
elm.trainFromData(X_train, y_train);

// Predict on test set
const predictions = X_test.map(x => elm.predictFromVector([x])[0][0].label);
const trueLabels = y_test.map(y => elm.categories[y]);

// Calculate metrics
const accuracy = Evaluation.accuracy(predictions, trueLabels);
const f1 = Evaluation.f1Score(predictions, trueLabels, elm.categories);
const confusionMatrix = Evaluation.confusionMatrix(predictions, trueLabels, elm.categories);

console.log('Accuracy:', accuracy);
console.log('F1 Score:', f1);
console.log('Confusion Matrix:', confusionMatrix);
```

### TF-IDF Vectorization

```typescript
import { TFIDFVectorizer } from '@astermind/astermind-elm';

const vectorizer = new TFIDFVectorizer();

// Fit on documents
const documents = [
  'machine learning is great',
  'deep learning is powerful',
  'neural networks are complex'
];

vectorizer.fit(documents);

// Transform documents to vectors
const vectors = vectorizer.vectorizeAll(documents);
console.log(vectors); // TF-IDF vectors

// Transform single document
const vec = vectorizer.vectorize('machine learning');
console.log(vec);
```

### K-Nearest Neighbors

```typescript
import { KNN } from '@astermind/astermind-elm';

// Find nearest neighbors
const queryVec = [0.1, 0.2, 0.3, 0.4, 0.5];
const dataset = [
  [0.11, 0.21, 0.31, 0.41, 0.51],
  [0.2, 0.3, 0.4, 0.5, 0.6],
  [0.5, 0.6, 0.7, 0.8, 0.9],
  // ...
];

const neighbors = KNN.find(queryVec, dataset, {
  k: 5,
  metric: 'cosine',  // 'cosine' | 'euclidean' | 'manhattan'
  topX: 3  // Return top 3
});

console.log(neighbors);
// [{ index: 0, distance: 0.01, vector: [...] }, ...]
```

### Weight Reuse (Fine-tuning)

```typescript
import { ELM } from '@astermind/astermind-elm';

const elm = new ELM({
  categories: ['A', 'B', 'C'],
  hiddenUnits: 128,
  useTokenizer: false
});

// Initial training
elm.trainFromData(X1, y1);

// Fine-tune with new data (reuses existing weights)
elm.trainFromData(X2, y2, {
  reuseWeights: true  // Keep W and b, only update beta
});
```

### Sample Weighting

```typescript
import { ELM } from '@astermind/astermind-elm';

const elm = new ELM({ /* ... */ });

// Train with sample weights (emphasize certain samples)
const sampleWeights = [1.0, 2.0, 0.5, 1.5, ...]; // Higher = more important

elm.trainFromData(X, y, {
  weights: sampleWeights
});
```

### Metrics Thresholds

```typescript
import { ELM } from '@astermind/astermind-elm';

const elm = new ELM({
  categories: ['A', 'B', 'C'],
  hiddenUnits: 128,
  metrics: {
    accuracy: 0.9,  // Model only saved if accuracy >= 0.9
    f1: 0.85,       // AND f1 >= 0.85
    rmse: 0.1       // AND rmse <= 0.1
  }
});

// Model automatically saved only if all thresholds are met
elm.trainFromData(X, y);
```

### Dropout Regularization

```typescript
import { ELM } from '@astermind/astermind-elm';

const elm = new ELM({
  categories: ['A', 'B', 'C'],
  hiddenUnits: 128,
  dropout: 0.2  // 20% dropout during training
});

elm.trainFromData(X, y);
```

---

## Complete Example: Building a Search System

```typescript
import { ELM, EmbeddingStore, UniversalEncoder } from '@astermind/astermind-elm';

// Step 1: Create encoder for text
const encoder = new UniversalEncoder({
  charSet: 'abcdefghijklmnopqrstuvwxyz0123456789 .,!?',
  maxLen: 100,
  useTokenizer: true,
  tokenizerDelimiter: /\s+/
});

// Step 2: Train ELM for embeddings
const embeddingELM = new ELM({
  categories: ['dummy'],
  inputSize: encoder.encode('dummy').length,
  hiddenUnits: 128,
  useTokenizer: false
});

// Prepare training data (you'd use your actual data)
const X_train: number[][] = [];
const Y_train: number[][] = [];

// ... prepare training data ...

embeddingELM.trainFromData(X_train, Y_train);

// Step 3: Create embedding store
const store = new EmbeddingStore({ capacity: 10000, normalize: true });

// Step 4: Index documents
const documents = [
  { id: '1', text: 'Machine learning tutorial', category: 'tutorial' },
  { id: '2', text: 'Deep learning guide', category: 'guide' },
  // ... more documents
];

for (const doc of documents) {
  const vec = encoder.normalize(encoder.encode(doc.text));
  const embedding = embeddingELM.getEmbedding([vec])[0];
  
  store.add({
    id: doc.id,
    vector: embedding,
    meta: { text: doc.text, category: doc.category }
  });
}

// Step 5: Search
function search(query: string, k: number = 10) {
  const queryVec = encoder.normalize(encoder.encode(query));
  const queryEmbedding = embeddingELM.getEmbedding([queryVec])[0];
  
  return store.query({
    vector: queryEmbedding,
    k: k,
    metric: 'cosine',
    minScore: 0.5
  });
}

// Use search
const results = search('neural networks');
console.log(results);
```

---

## Tips & Best Practices

1. **Text vs Numeric Mode**: Use `useTokenizer: true` for text, `useTokenizer: false` for numeric features
2. **Hidden Units**: Start with 64-128, increase for complex problems
3. **Ridge Lambda**: Default 1e-2 works well, increase for overfitting, decrease for underfitting
4. **Activation**: `relu` is default and works well, try `gelu` or `tanh` for different behaviors
5. **Weight Init**: `xavier` is default, `he` works well with ReLU
6. **Normalization**: Always normalize embeddings for cosine similarity
7. **Batch Size**: For large datasets, process in batches
8. **Model Persistence**: Save models after training for reuse
9. **Memory Management**: Use `EmbeddingStore` capacity limits for large datasets
10. **Worker Usage**: Use Web Workers for heavy training to keep UI responsive

---

## Troubleshooting

### Common Issues

**Issue: "Model not trained" error**
- **Solution**: Make sure to call `train()` or `trainFromData()` before predicting

**Issue: Dimension mismatch errors**
- **Solution**: Ensure input dimensions match what the model expects. Check `inputSize` for numeric mode or `maxLen` for text mode

**Issue: Poor prediction accuracy**
- **Solutions**:
  - Increase `hiddenUnits` (try 128, 256, or 512)
  - Adjust `ridgeLambda` (try 1e-3 to 1e-1)
  - Try different activations (`gelu`, `tanh`)
  - Add more training data
  - Use data augmentation

**Issue: Worker not working**
- **Solution**: Ensure you're using the correct worker path from package.json exports: `@astermind/astermind-elm/workers/elm-worker.js`

**Issue: Text encoding errors**
- **Solution**: Make sure `charSet` includes all characters in your text, or use tokenizer mode

**Issue: Out of memory**
- **Solutions**:
  - Reduce `hiddenUnits`
  - Process data in smaller batches
  - Use Nyström approximation for Kernel ELM
  - Set `EmbeddingStore` capacity limits

**Issue: Model not saving**
- **Solution**: Check if metrics thresholds are set and being met. Remove thresholds or adjust them if needed

---

## Next Steps

1. **Explore Examples**: Check out the `examples/` directory for working demos
2. **Advanced Use Cases**: See `node_examples/` for complex scenarios
3. **Full Documentation**: Read `README.md` for complete API reference
4. **Experiment**: Try different configurations and architectures
5. **Build Something**: Create your own ML application using AsterMind!

---

## Additional Resources

- **GitHub Repository**: https://github.com/infiniteCrank/AsterMind-ELM
- **NPM Package**: https://www.npmjs.com/package/@astermind/astermind-elm
- **Code Walkthrough**: See `CODE-WALKTHROUGH.md` for detailed code explanations

---

**Happy Learning! 🚀**




