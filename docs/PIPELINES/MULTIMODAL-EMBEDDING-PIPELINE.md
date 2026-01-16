# Multi-Modal Embedding Pipeline with AsterMind Community

**A complete ML pipeline for multi-modal embeddings combining text and numeric features, with optional LLM enhancement for semantic understanding.**

---

## Overview

This pipeline demonstrates multi-modal embedding using AsterMind's ELM variants for different data types, with optional LLM integration for semantic text understanding.

### Key Philosophy

- **AsterMind handles feature extraction**: Fast, efficient embeddings for text and numeric data
- **LLMs enhance text understanding**: Optional semantic text embeddings for better representations
- **Complementary approach**: Fast ML embeddings + semantic LLM embeddings

---

## Pipeline Architecture

```
Input: Multi-modal data (text + numeric features)
    ↓
[1] Feature Extraction (AsterMind ML)
    - Text: StringKernelELM embeddings
    - Numeric: Direct features or KernelELM embeddings
    ↓
[2] Feature Fusion (AsterMind ML)
    - Concatenation
    - Weighted combination
    - ELMChain for stacking
    ↓
[3] Optional: LLM Text Embeddings (External)
    - Generate semantic text embeddings
    - Combine with AsterMind embeddings
    ↓
[4] Dimensionality Reduction (AsterMind ML)
    - KernelELM with Nyström
    - Feature selection
    ↓
[5] Similarity Search (AsterMind ML)
    - EmbeddingStore for retrieval
    - Cosine similarity
    - Nearest neighbor search
    ↓
Output: Similar items with scores
```

---

## Use Cases

1. **Product Recommendation**: Multi-modal product embeddings (text + numeric features)
2. **Content Similarity Search**: Text + metadata similarity
3. **User Matching**: Profile text + numeric features matching
4. **Document Retrieval**: Text + metadata embeddings
5. **Feature Engineering**: Preparing multi-modal data for ML models

---

## Step-by-Step Implementation

### Step 1: Feature Extraction

```typescript
import { StringKernelELM, KernelELM, ELM } from '@astermind/astermind-community';

class MultiModalFeatureExtractor {
  private textEmbedder: StringKernelELM;
  private numericProcessor: ELM | KernelELM;
  
  constructor() {
    // Text embedding using StringKernelELM
    this.textEmbedder = new StringKernelELM({
      categories: ['dummy'],  // Not used for embedding
      hiddenUnits: 128,
      kernelType: 'string'
    });
    
    // Numeric feature processor
    this.numericProcessor = new ELM({
      categories: ['dummy'],
      hiddenUnits: 64
    });
  }
  
  // Extract text embeddings
  extractTextEmbeddings(texts: string[]): number[][] {
    // Train on texts (unsupervised for embeddings)
    const dummyLabels = texts.map(() => 0);
    this.textEmbedder.fit(texts, dummyLabels);
    
    // Get embeddings (hidden layer activations)
    const embeddings = texts.map(text => {
      // Extract embeddings from StringKernelELM
      return this.textEmbedder.getEmbedding(text);
    });
    
    return embeddings;
  }
  
  // Extract numeric features
  extractNumericFeatures(numericData: number[][]): number[][] {
    // Normalize numeric features
    const normalized = this.normalizeFeatures(numericData);
    
    // Optionally use KernelELM for non-linear embeddings
    return normalized;
  }
  
  private normalizeFeatures(features: number[][]): number[][] {
    const dim = features[0].length;
    const means = new Array(dim).fill(0);
    const stds = new Array(dim).fill(0);
    
    // Calculate means
    features.forEach(f => {
      f.forEach((val, i) => {
        means[i] += val;
      });
    });
    means.forEach((mean, i) => means[i] /= features.length);
    
    // Calculate stds
    features.forEach(f => {
      f.forEach((val, i) => {
        stds[i] += Math.pow(val - means[i], 2);
      });
    });
    stds.forEach((std, i) => stds[i] = Math.sqrt(stds[i] / features.length));
    
    // Normalize
    return features.map(f =>
      f.map((val, i) => (val - means[i]) / (stds[i] || 1))
    );
  }
}

// Example usage
const extractor = new MultiModalFeatureExtractor();
const textEmbeddings = extractor.extractTextEmbeddings(['Text 1', 'Text 2']);
const numericFeatures = extractor.extractNumericFeatures([[1, 2, 3], [4, 5, 6]]);
```

---

### Step 2: Optional LLM Text Embeddings

```typescript
import { OpenAI } from 'openai';

class LLMTextEmbedder {
  private openai: OpenAI;
  
  constructor(apiKey?: string) {
    this.openai = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });
  }
  
  // Generate semantic text embeddings
  async embed(texts: string[]): Promise<number[][]> {
    const embeddings = await Promise.all(
      texts.map(async text => {
        const response = await this.openai.embeddings.create({
          model: 'text-embedding-3-small',  // or text-embedding-ada-002
          input: text
        });
        return response.data[0].embedding;
      })
    );
    
    return embeddings;
  }
  
  // Combine with AsterMind embeddings
  combineEmbeddings(
    astermindEmbeddings: number[][],
    llmEmbeddings: number[][],
    weight: number = 0.5  // Weight for LLM embeddings (0-1)
  ): number[][] {
    return astermindEmbeddings.map((astermind, i) => {
      const llm = llmEmbeddings[i];
      const combined = new Array(Math.max(astermind.length, llm.length));
      
      for (let j = 0; j < combined.length; j++) {
        const astermindVal = j < astermind.length ? astermind[j] : 0;
        const llmVal = j < llm.length ? llm[j] : 0;
        combined[j] = (1 - weight) * astermindVal + weight * llmVal;
      }
      
      return combined;
    });
  }
}

// Example usage
const llmEmbedder = new LLMTextEmbedder();
const llmEmbeddings = await llmEmbedder.embed(['Text 1', 'Text 2']);

// Combine with AsterMind embeddings
const combined = llmEmbedder.combineEmbeddings(textEmbeddings, llmEmbeddings, 0.5);
```

---

### Step 3: Feature Fusion

```typescript
import { ELMChain } from '@astermind/astermind-community';

class FeatureFusion {
  // Concatenate features
  concatenate(textEmbeddings: number[][], numericFeatures: number[][]): number[][] {
    return textEmbeddings.map((textEmb, i) => {
      return [...textEmb, ...numericFeatures[i]];
    });
  }
  
  // Weighted combination
  weightedCombine(
    textEmbeddings: number[][],
    numericFeatures: number[][],
    textWeight: number = 0.7,
    numericWeight: number = 0.3
  ): number[][] {
    // Normalize to same dimension (simplified - real implementation would pad/truncate)
    const maxDim = Math.max(
      textEmbeddings[0].length,
      numericFeatures[0].length
    );
    
    return textEmbeddings.map((textEmb, i) => {
      const numFeat = numericFeatures[i];
      const combined = new Array(maxDim);
      
      for (let j = 0; j < maxDim; j++) {
        const textVal = j < textEmb.length ? textEmb[j] : 0;
        const numVal = j < numFeat.length ? numFeat[j] : 0;
        combined[j] = textWeight * textVal + numericWeight * numVal;
      }
      
      return combined;
    });
  }
  
  // Use ELMChain for stacking
  stackWithELMChain(
    textEmbeddings: number[][],
    numericFeatures: number[][],
    labels: number[]
  ): number[][] {
    // Create ELMChain for feature stacking
    const chain = new ELMChain([
      { model: textProcessor, outputDim: textEmbeddings[0].length },
      { model: numericProcessor, outputDim: numericFeatures[0].length }
    ]);
    
    // Stack features through chain
    const stacked = textEmbeddings.map((textEmb, i) => {
      return chain.transform(textEmb, numericFeatures[i]);
    });
    
    return stacked;
  }
}

// Example usage
const fusion = new FeatureFusion();
const fused = fusion.concatenate(textEmbeddings, numericFeatures);
```

---

### Step 4: Dimensionality Reduction

```typescript
import { KernelELM } from '@astermind/astermind-community';

class EmbeddingReducer {
  private reducer: KernelELM;
  
  constructor(targetDim: number) {
    this.reducer = new KernelELM({
      outputDim: targetDim,
      kernel: { type: 'rbf', gamma: 0.1 },
      mode: 'nystrom',
      nystrom: { m: 128, strategy: 'kmeans++', whiten: true }
    });
  }
  
  // Reduce dimensionality
  reduce(fusedEmbeddings: number[][], labels: number[]): number[][] {
    // Train reducer (unsupervised - use labels as reconstruction target)
    this.reducer.fit(fusedEmbeddings, fusedEmbeddings);  // Autoencoder style
    
    // Get reduced embeddings
    const reduced = fusedEmbeddings.map(emb => {
      return this.reducer.getEmbedding(emb);
    });
    
    return reduced;
  }
}

// Example usage
const reducer = new EmbeddingReducer(64);  // Reduce to 64 dimensions
const reduced = reducer.reduce(fused, labels);
```

---

### Step 5: Similarity Search

```typescript
import { EmbeddingStore } from '@astermind/astermind-community';

class SimilaritySearch {
  private store: EmbeddingStore;
  
  constructor(dim: number) {
    this.store = new EmbeddingStore({ dim, capacity: 10000 });
  }
  
  // Add items to store
  add(embeddings: number[][], metadata: Array<{ id: string; [key: string]: any }>) {
    embeddings.forEach((emb, i) => {
      this.store.add(emb, metadata[i]);
    });
  }
  
  // Query for similar items
  query(queryEmbedding: number[], topK: number = 10): Array<{ item: any; score: number }> {
    const results = this.store.query(queryEmbedding, { topK });
    return results;
  }
}

// Example usage
const search = new SimilaritySearch(64);
search.add(reduced, metadata);

const queryEmbedding = extractor.extractTextEmbeddings(['query text'])[0];
const similar = search.query(queryEmbedding, 10);
console.log('Similar items:', similar);
```

---

### Step 6: Complete Multi-Modal Pipeline

```typescript
class MultiModalEmbeddingPipeline {
  private extractor: MultiModalFeatureExtractor;
  private llmEmbedder?: LLMTextEmbedder;
  private fusion: FeatureFusion;
  private reducer?: EmbeddingReducer;
  private search: SimilaritySearch;
  private useLLM: boolean;
  
  constructor(options: { useLLM?: boolean; llmApiKey?: string; reduceDim?: number } = {}) {
    this.extractor = new MultiModalFeatureExtractor();
    this.fusion = new FeatureFusion();
    this.useLLM = options.useLLM || false;
    
    if (this.useLLM) {
      this.llmEmbedder = new LLMTextEmbedder(options.llmApiKey);
    }
    
    if (options.reduceDim) {
      this.reducer = new EmbeddingReducer(options.reduceDim);
    }
    
    this.search = new SimilaritySearch(128);  // Default dimension
  }
  
  // Process multi-modal data
  async process(
    texts: string[],
    numericFeatures: number[][],
    metadata: Array<{ id: string; [key: string]: any }>
  ) {
    // Extract text embeddings
    let textEmbeddings = this.extractor.extractTextEmbeddings(texts);
    
    // Optional: Enhance with LLM embeddings
    if (this.useLLM && this.llmEmbedder) {
      const llmEmbeddings = await this.llmEmbedder.embed(texts);
      textEmbeddings = this.llmEmbedder.combineEmbeddings(
        textEmbeddings,
        llmEmbeddings,
        0.5  // 50% AsterMind, 50% LLM
      );
    }
    
    // Extract numeric features
    const numeric = this.extractor.extractNumericFeatures(numericFeatures);
    
    // Fuse features
    let fused = this.fusion.concatenate(textEmbeddings, numeric);
    
    // Optional: Reduce dimensionality
    if (this.reducer) {
      fused = this.reducer.reduce(fused, new Array(fused.length).fill(0));
    }
    
    // Add to search store
    this.search = new SimilaritySearch(fused[0].length);
    this.search.add(fused, metadata);
    
    return { embeddings: fused, search: this.search };
  }
  
  // Query for similar items
  query(queryText: string, queryNumeric: number[], topK: number = 10) {
    // Extract query embeddings
    let textEmb = this.extractor.extractTextEmbeddings([queryText])[0];
    
    // Optional: Enhance with LLM
    if (this.useLLM && this.llmEmbedder) {
      // Get LLM embedding for query
      // (Implementation similar to process method)
    }
    
    const numFeat = this.extractor.extractNumericFeatures([queryNumeric])[0];
    const queryEmb = this.fusion.concatenate([textEmb], [numFeat])[0];
    
    // Search
    const results = this.search.query(queryEmb, topK);
    return results;
  }
}

// Example usage
async function main() {
  const pipeline = new MultiModalEmbeddingPipeline({ useLLM: true, reduceDim: 64 });
  
  const texts = ['Product A description', 'Product B description'];
  const numeric = [[10, 20, 30], [40, 50, 60]];
  const metadata = [{ id: '1', name: 'Product A' }, { id: '2', name: 'Product B' }];
  
  await pipeline.process(texts, numeric, metadata);
  
  // Query
  const results = pipeline.query('Similar product', [15, 25, 35], 5);
  console.log('Similar products:', results);
}
```

---

## Performance Characteristics

### AsterMind Embeddings

- **Latency**: < 10ms per embedding
- **Throughput**: 100+ embeddings/second
- **Quality**: Fast, efficient feature extraction

### LLM Embeddings (Optional)

- **Latency**: 50-200ms per embedding
- **Cost**: ~$0.0001 per embedding (text-embedding-3-small)
- **Quality**: Semantic understanding

### Combined

- **Fast Extraction**: Always fast (< 10ms with AsterMind)
- **Optional Enhancement**: LLM embeddings for semantic understanding
- **Best of Both**: Fast ML embeddings + semantic LLM embeddings

---

## Use Case Examples

### Example 1: Product Recommendation

```typescript
// Product embeddings: description (text) + price/rating (numeric)
const pipeline = new MultiModalEmbeddingPipeline({ useLLM: true });

const products = [
  { id: '1', description: 'Great product', price: 29.99, rating: 4.5 },
  { id: '2', description: 'Amazing quality', price: 49.99, rating: 4.8 }
];

const texts = products.map(p => p.description);
const numeric = products.map(p => [p.price, p.rating]);
const metadata = products;

await pipeline.process(texts, numeric, metadata);

// Find similar products
const results = pipeline.query('Excellent product', [39.99, 4.6], 5);
```

### Example 2: Content Similarity Search

```typescript
// Content embeddings: text + metadata (views, likes, etc.)
const contentPipeline = new MultiModalEmbeddingPipeline({ useLLM: true });

const contents = loadContents();  // Array of { text, views, likes, shares }
const texts = contents.map(c => c.text);
const numeric = contents.map(c => [c.views, c.likes, c.shares]);

await contentPipeline.process(texts, numeric, contents);

// Find similar content
const results = contentPipeline.query('Search query', [1000, 50, 10], 10);
```

---

## Summary

This pipeline demonstrates:

- ✅ **Fast, efficient multi-modal embeddings** using AsterMind
- ✅ **Optional LLM enhancement** for semantic text understanding
- ✅ **Feature fusion** combining text and numeric features
- ✅ **Dimensionality reduction** for efficiency
- ✅ **Similarity search** for retrieval

**Key Benefit**: Fast multi-modal embeddings with optional semantic enhancement.

---

## Next Steps

- See [Additional Pipeline Examples](./README.md) for more patterns
- See [AsterMind + LLM Philosophy](./ASTERMIND-LLM-PHILOSOPHY.md) for deeper dive
- See [Building RAG Pipeline Tutorial](../TUTORIALS/BUILDING-RAG-PIPELINE.md) for step-by-step guide
