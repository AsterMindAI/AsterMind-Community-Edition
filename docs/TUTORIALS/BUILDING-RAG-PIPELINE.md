# Building a RAG Pipeline with AsterMind Community + LLM

**A step-by-step tutorial on building a production-ready RAG (Retrieval-Augmented Generation) pipeline using AsterMind Community for fast, efficient retrieval and LLMs for natural language generation.**

---

## Overview

This tutorial will guide you through building a complete RAG pipeline similar to Omega, using AsterMind Community's ML capabilities for retrieval and reranking, then integrating with an LLM for natural language answer generation.

### What You'll Build

A complete RAG system that:
1. **Indexes documents** using AsterMind's fast ML (AsterMind)
2. **Retrieves relevant chunks** using hybrid retrieval (AsterMind)
3. **Reranks results** using online learning (AsterMind)
4. **Formats evidence** for LLM consumption (AsterMind)
5. **Generates natural language answers** using an LLM (External)

### Key Philosophy

**AsterMind handles the ML-heavy lifting** (fast, efficient retrieval and reranking)
**LLMs handle natural language generation** (using AsterMind's evidence to produce human-readable answers)

---

## Prerequisites

### Required Knowledge

- Basic TypeScript/JavaScript
- Understanding of RAG (Retrieval-Augmented Generation)
- Familiarity with LLM APIs (OpenAI, Anthropic, etc.)

### Required Tools

- Node.js 18+ installed
- AsterMind Community installed: `npm install @astermind/astermind-community`
- LLM API access (OpenAI, Anthropic, or local LLM like Ollama)

### Optional

- Sample documents for testing (markdown files, text files, etc.)

---

## Part 1: Understanding the Components

### AsterMind Components You'll Use

#### 1. Document Processing & Indexing
- `parseMarkdownToSections`: Parse markdown into sections
- `buildVocabAndIdf`: Build vocabulary and IDF weights
- `buildTfidfDocs`: Create TF-IDF sparse vectors
- `buildRFF` / `mapRFF`: Create dense embeddings (Random Fourier Features)
- `buildLandmarks`: Select landmarks for Nyström approximation

#### 2. Hybrid Retrieval
- `hybridRetrieve`: Combine sparse + dense retrieval
- `toTfidf`: Convert query to TF-IDF vector
- `cosineSparse`: Sparse vector cosine similarity
- `kernelSim`: Dense kernel similarity

#### 3. Reranking
- `rerankAndFilter`: Rerank chunks using Online Ridge regression
- `filterMMR`: Maximal Marginal Relevance filtering

#### 4. Evidence Formatting
- Custom formatting functions to prepare evidence for LLM

### LLM Integration

- **OpenAI API**: GPT-4, GPT-3.5, GPT-4o-mini
- **Anthropic Claude**: Claude Opus, Claude Sonnet, Claude Haiku
- **Local LLMs**: Ollama, LM Studio, etc.

---

## Part 2: Step-by-Step Pipeline Construction

### Step 1: Document Processing

**Purpose**: Parse and chunk documents for indexing

```typescript
import { parseMarkdownToSections } from '@astermind/astermind-community';

// Parse markdown documents into sections
function processDocuments(documents: string[]): Array<{ heading: string; content: string }> {
  const chunks: Array<{ heading: string; content: string }> = [];
  
  for (const doc of documents) {
    // Parse markdown into sections
    const sections = parseMarkdownToSections(doc);
    
    // Create chunks with overlap for better context
    for (const section of sections) {
      chunks.push({
        heading: section.heading || 'Untitled',
        content: section.content
      });
    }
  }
  
  return chunks;
}

// Example usage
const documents = [
  '# AsterMind Introduction\n\nAsterMind is a fast ML library...',
  '# Installation\n\nTo install AsterMind, run npm install...'
];

const chunks = processDocuments(documents);
console.log(`Processed ${chunks.length} chunks`);
```

**What This Does**:
- Parses markdown documents into sections
- Creates chunks with headings and content
- Returns structured chunks for indexing

---

### Step 2: Build Vocabulary and Index

**Purpose**: Build searchable index from chunks

```typescript
import { 
  buildVocabAndIdf, 
  buildTfidfDocs, 
  buildLandmarks,
  buildRFF,
  type SparseVec 
} from '@astermind/astermind-community';

// Build searchable index
function buildIndex(chunks: Array<{ heading: string; content: string }>) {
  // Build vocabulary and IDF weights
  const { vocabMap, idf } = buildVocabAndIdf(chunks);
  
  // Build TF-IDF sparse vectors for all chunks
  const tfidfDocs = buildTfidfDocs(chunks, vocabMap, idf);
  
  // Build dense embeddings using Random Fourier Features (RFF)
  const rffProjection = buildRFF(vocabMap.size, { 
    dim: 64,      // Dimension of RFF projection
    sigma: 1.0    // RFF kernel parameter
  });
  
  // Build landmarks for Nyström approximation
  const landmarks = buildLandmarks(tfidfDocs, { 
    m: 256,       // Number of landmarks
    strategy: 'kmeans++'  // Landmark selection strategy
  });
  
  return {
    vocabMap,
    idf,
    tfidfDocs,
    rffProjection,
    landmarks,
    chunks
  };
}

// Example usage
const index = buildIndex(chunks);
console.log(`Index built with ${index.vocabMap.size} vocabulary terms`);
```

**What This Does**:
- Builds vocabulary from all chunks
- Calculates IDF weights for terms
- Creates TF-IDF sparse vectors
- Creates dense embeddings using RFF
- Selects landmarks for efficient similarity search

**Output**: Complete searchable index with both sparse and dense representations

---

### Step 3: Implement Hybrid Retrieval

**Purpose**: Find relevant chunks using hybrid sparse + dense retrieval

```typescript
import { hybridRetrieve } from '@astermind/astermind-community';

// Retrieve relevant chunks
function retrieve(
  query: string,
  index: ReturnType<typeof buildIndex>,
  options: { topK?: number; alpha?: number; beta?: number } = {}
) {
  const {
    topK = 20,
    alpha = 0.6,  // Sparse weight (TF-IDF)
    beta = 0.4    // Dense weight (RFF)
  } = options;
  
  // Perform hybrid retrieval
  const results = hybridRetrieve({
    query,
    chunks: index.chunks,
    vocabMap: index.vocabMap,
    idf: index.idf,
    tfidfDocs: index.tfidfDocs,
    denseDocs: [],  // Will be computed from tfidfDocs using RFF
    landmarksIdx: index.landmarks.indices,
    landmarkMat: index.landmarks.matrix,
    vocabSize: index.vocabMap.size,
    kernel: 'rbf',  // RBF kernel for dense similarity
    sigma: 1.0,
    alpha,          // Sparse weight
    beta,           // Dense weight
    ridge: 1e-2,
    headingW: 0.3,
    useStem: false,
    expandQuery: true,
    topK
  });
  
  return results.items;  // Retrieved chunks with scores
}

// Example usage
const query = "How do I install AsterMind?";
const retrieved = retrieve(query, index, { topK: 10 });
console.log(`Retrieved ${retrieved.length} relevant chunks`);
```

**What This Does**:
- Converts query to TF-IDF vector
- Computes sparse similarity (TF-IDF cosine)
- Computes dense similarity (RFF kernel)
- Combines both with weighted scoring: `score = alpha * sparse + beta * dense`
- Returns top K most relevant chunks

**Output**: Ranked list of relevant document chunks

---

### Step 4: Add Reranking

**Purpose**: Improve ranking using rich query-chunk features

```typescript
import { rerankAndFilter, type Chunk, type RerankOptions } from '@astermind/astermind-community';

// Rerank retrieved chunks
function rerank(
  query: string,
  retrieved: Array<{ heading: string; content: string; score?: number }>,
  options: RerankOptions = {}
) {
  const {
    lambdaRidge = 0.1,      // Ridge regularization
    useMMR = true,          // Enable MMR diversity filtering
    mmrLambda = 0.5,        // MMR tradeoff parameter
    probThresh = 0.3,       // Probability threshold
    budgetChars = 2000      // Character budget
  } = options;
  
  // Convert to Chunk format
  const chunks: Chunk[] = retrieved.map(chunk => ({
    heading: chunk.heading,
    content: chunk.content,
    score_base: chunk.score
  }));
  
  // Rerank and filter
  const reranked = rerankAndFilter(query, chunks, {
    lambdaRidge,
    useMMR,
    mmrLambda,
    probThresh,
    epsilonTop: 0.1,
    budgetChars
  });
  
  return reranked;
}

// Example usage
const reranked = rerank(query, retrieved, {
  useMMR: true,
  budgetChars: 2000
});
console.log(`Reranked to ${reranked.length} high-quality chunks`);
```

**What This Does**:
- Engineers rich features from query-chunk pairs
- Trains small Online Ridge model per query
- Scores chunks for relevance (score_rr, p_relevant)
- Filters using MMR to ensure diversity
- Applies character budget constraints

**Output**: Reranked and filtered chunks with relevance scores

---

### Step 5: Format Evidence for LLM

**Purpose**: Format retrieved chunks as evidence for LLM consumption

**Key Point**: This is where AsterMind's work ends. We format evidence for the LLM, which will generate the final answer.

```typescript
// Format retrieved chunks as evidence for LLM
function formatEvidenceForLLM(
  query: string,
  chunks: Array<{ heading: string; content: string; score_rr?: number }>
): string {
  // Format chunks with numbered citations
  const context = chunks
    .map((chunk, i) => {
      const citation = `[${i + 1}]`;
      const heading = chunk.heading ? `${citation} ${chunk.heading}` : `${citation} Source ${i + 1}`;
      return `${heading}\n${chunk.content}`;
    })
    .join('\n\n');
  
  // Create evidence prompt
  const evidence = `Context:\n${context}\n\nQuestion: ${query}\n\nAnswer the question using only the context provided above. Include citations like [1], [2], etc. when referencing the context.`;
  
  return evidence;
}

// Example usage
const evidence = formatEvidenceForLLM(query, reranked);
console.log('Evidence formatted for LLM:');
console.log(evidence.slice(0, 200) + '...');
```

**What This Does**:
- Formats chunks with numbered citations [1], [2], etc.
- Includes headings and content
- Creates clear prompt structure
- Prepares evidence for LLM consumption

**Output**: Formatted evidence string ready for LLM prompt

---

### Step 6: Generate Answer with LLM

**Purpose**: Generate natural language answer using evidence

**This is where LLMs come in**: AsterMind provided the evidence, LLM provides the natural language generation.

#### Option 1: OpenAI API

```typescript
import { OpenAI } from 'openai';

async function generateAnswerWithOpenAI(evidence: string): Promise<string> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  
  const systemPrompt = `You are a helpful assistant that answers questions using only the provided context. 
Always cite sources using [1], [2], etc. when referencing information from the context.
If the context doesn't contain enough information to answer, say so.`;
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',  // Use smaller model with good evidence
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: evidence
      }
    ],
    temperature: 0.7,
    max_tokens: 500
  });
  
  return completion.choices[0].message.content || 'No answer generated';
}

// Example usage
const answer = await generateAnswerWithOpenAI(evidence);
console.log('Answer:', answer);
```

#### Option 2: Anthropic Claude

```typescript
import Anthropic from '@anthropic-ai/sdk';

async function generateAnswerWithClaude(evidence: string): Promise<string> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
  
  const systemPrompt = `You are a helpful assistant. Answer questions using only the provided context.
Always cite sources using [1], [2], etc.`;
  
  const message = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',  // Fast, cost-effective model
    max_tokens: 500,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: evidence
      }
    ]
  });
  
  return message.content[0].type === 'text' 
    ? message.content[0].text 
    : 'No answer generated';
}

// Example usage
const answer = await generateAnswerWithClaude(evidence);
console.log('Answer:', answer);
```

#### Option 3: Local LLM (Ollama)

```typescript
async function generateAnswerWithOllama(evidence: string): Promise<string> {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama2',  // or 'mistral', 'codellama', etc.
      prompt: evidence,
      stream: false
    })
  });
  
  const data = await response.json();
  return data.response || 'No answer generated';
}

// Example usage
const answer = await generateAnswerWithOllama(evidence);
console.log('Answer:', answer);
```

**What This Does**:
- Sends formatted evidence to LLM
- LLM generates natural language answer
- LLM includes citations from evidence
- Returns human-readable answer

**Output**: Natural language answer with citations

---

### Step 7: (Optional) Add Information Flow Analysis

**Purpose**: Analyze information flow and causality in retrieved chunks

```typescript
import { TransferEntropy } from '@astermind/astermind-community';

// Analyze information flow in retrieved chunks
async function analyzeInformationFlow(chunks: Array<{ content: string }>) {
  const te = new TransferEntropy({
    window: 256,        // Analysis window
    condLags: 1         // Conditional lag
  });
  
  // Extract time-series data from chunks
  const timeSeries = chunks.map(chunk => {
    // Convert chunk content to numeric features
    // (This is simplified - real implementation would use proper feature extraction)
    const features = chunk.content.split(' ').length;
    return features;
  });
  
  // Compute transfer entropy
  const flowAnalysis = te.compute(timeSeries);
  
  return flowAnalysis;
}

// Example usage (optional)
const flowAnalysis = await analyzeInformationFlow(reranked);
console.log('Information flow analysis:', flowAnalysis);
```

**What This Does**:
- Analyzes information flow between chunks
- Calculates transfer entropy for causal inference
- Provides additional evidence quality metrics

**Output**: Information flow metrics (optional)

---

## Part 3: Putting It All Together

### Complete Pipeline Code

Here's the complete pipeline combining all steps:

```typescript
import {
  parseMarkdownToSections,
  buildVocabAndIdf,
  buildTfidfDocs,
  buildLandmarks,
  buildRFF,
  hybridRetrieve,
  rerankAndFilter,
  type Chunk,
  type RerankOptions
} from '@astermind/astermind-community';
import { OpenAI } from 'openai';

// Complete RAG Pipeline
class RAGPipeline {
  private index: any;
  private openai: OpenAI;
  
  constructor(apiKey?: string) {
    this.openai = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });
  }
  
  // Step 1-2: Build index from documents
  async buildIndex(documents: string[]) {
    // Process documents
    const chunks = this.processDocuments(documents);
    
    // Build index
    this.index = this.buildSearchIndex(chunks);
    
    return this.index;
  }
  
  // Step 3-6: Query pipeline
  async query(query: string, options: { topK?: number; useLLM?: boolean } = {}) {
    const { topK = 10, useLLM = true } = options;
    
    // Retrieve relevant chunks
    const retrieved = this.retrieve(query, this.index, { topK });
    
    // Rerank chunks
    const reranked = this.rerank(query, retrieved);
    
    // If not using LLM, return reranked chunks
    if (!useLLM) {
      return {
        chunks: reranked,
        evidence: this.formatEvidence(query, reranked)
      };
    }
    
    // Format evidence for LLM
    const evidence = this.formatEvidence(query, reranked);
    
    // Generate answer with LLM
    const answer = await this.generateAnswer(evidence);
    
    return {
      answer,
      chunks: reranked,
      evidence
    };
  }
  
  // Helper methods (implementations from above steps)
  private processDocuments(documents: string[]) {
    // Implementation from Step 1
    const chunks: Array<{ heading: string; content: string }> = [];
    for (const doc of documents) {
      const sections = parseMarkdownToSections(doc);
      for (const section of sections) {
        chunks.push({
          heading: section.heading || 'Untitled',
          content: section.content
        });
      }
    }
    return chunks;
  }
  
  private buildSearchIndex(chunks: Array<{ heading: string; content: string }>) {
    // Implementation from Step 2
    const { vocabMap, idf } = buildVocabAndIdf(chunks);
    const tfidfDocs = buildTfidfDocs(chunks, vocabMap, idf);
    const rffProjection = buildRFF(vocabMap.size, { dim: 64, sigma: 1.0 });
    const landmarks = buildLandmarks(tfidfDocs, { m: 256, strategy: 'kmeans++' });
    
    return { vocabMap, idf, tfidfDocs, rffProjection, landmarks, chunks };
  }
  
  private retrieve(query: string, index: any, options: { topK: number }) {
    // Implementation from Step 3
    const results = hybridRetrieve({
      query,
      chunks: index.chunks,
      vocabMap: index.vocabMap,
      idf: index.idf,
      tfidfDocs: index.tfidfDocs,
      denseDocs: [],
      landmarksIdx: index.landmarks.indices,
      landmarkMat: index.landmarks.matrix,
      vocabSize: index.vocabMap.size,
      kernel: 'rbf',
      sigma: 1.0,
      alpha: 0.6,
      beta: 0.4,
      ridge: 1e-2,
      headingW: 0.3,
      useStem: false,
      expandQuery: true,
      topK: options.topK
    });
    
    return results.items;
  }
  
  private rerank(query: string, retrieved: any[]) {
    // Implementation from Step 4
    const chunks: Chunk[] = retrieved.map(chunk => ({
      heading: chunk.heading,
      content: chunk.content,
      score_base: chunk.score
    }));
    
    const reranked = rerankAndFilter(query, chunks, {
      lambdaRidge: 0.1,
      useMMR: true,
      mmrLambda: 0.5,
      probThresh: 0.3,
      budgetChars: 2000
    });
    
    return reranked;
  }
  
  private formatEvidence(query: string, chunks: any[]) {
    // Implementation from Step 5
    const context = chunks
      .map((chunk, i) => `[${i + 1}] ${chunk.heading}\n${chunk.content}`)
      .join('\n\n');
    
    return `Context:\n${context}\n\nQuestion: ${query}\n\nAnswer the question using only the context provided above. Include citations like [1], [2], etc.`;
  }
  
  private async generateAnswer(evidence: string) {
    // Implementation from Step 6
    const systemPrompt = `You are a helpful assistant that answers questions using only the provided context.
Always cite sources using [1], [2], etc.`;
    
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: evidence }
      ],
      temperature: 0.7,
      max_tokens: 500
    });
    
    return completion.choices[0].message.content || 'No answer generated';
  }
}

// Example usage
async function main() {
  const pipeline = new RAGPipeline();
  
  // Build index
  const documents = [
    '# AsterMind Introduction\n\nAsterMind is a fast ML library...',
    '# Installation\n\nTo install AsterMind, run: npm install @astermind/astermind-community'
  ];
  await pipeline.buildIndex(documents);
  
  // Query
  const result = await pipeline.query('How do I install AsterMind?');
  console.log('Answer:', result.answer);
  console.log('Evidence chunks:', result.chunks.length);
}

main().catch(console.error);
```

---

## Part 4: LLM Integration Deep Dive

### Why Use LLMs for Final Answer Generation?

1. **Natural Language**: LLMs excel at generating human-readable text
2. **Context Understanding**: LLMs understand conversational context
3. **Citation Formatting**: LLMs naturally format citations
4. **Reasoning**: LLMs can reason about evidence relationships

### Prompt Engineering for RAG Systems

**Best Practices**:

1. **Clear System Prompt**: Define the assistant's role and citation format
   ```typescript
   const systemPrompt = `You are a helpful assistant that answers questions using only the provided context.
Always cite sources using [1], [2], etc. when referencing information.
If the context doesn't contain enough information, say so.`;
   ```

2. **Structured Evidence**: Format evidence clearly with citations
   ```typescript
   const evidence = `Context:
   [1] Heading 1
   Content 1
   
   [2] Heading 2
   Content 2
   
   Question: ${query}`;
   ```

3. **Citation Instructions**: Explicitly instruct on citation format
   ```typescript
   const instructions = `Answer the question using only the context provided above.
Include citations like [1], [2], etc. when referencing the context.`;
   ```

### Different LLM Providers and Options

#### OpenAI
- **GPT-4o-mini**: Fast, cost-effective, good quality
- **GPT-4**: Higher quality, more expensive
- **GPT-3.5-turbo**: Fast, very cost-effective

#### Anthropic
- **Claude Haiku**: Fast, cost-effective
- **Claude Sonnet**: Balanced quality/price
- **Claude Opus**: Highest quality

#### Local LLMs (Ollama)
- **Llama 2**: Good quality, completely local
- **Mistral**: Fast, efficient
- **CodeLlama**: Good for technical queries

### Token Optimization and Cost Management

**Strategies**:

1. **Limit Evidence Size**: Use character budgets in reranking
   ```typescript
   const reranked = rerankAndFilter(query, chunks, {
     budgetChars: 2000  // Limit to ~2000 characters
   });
   ```

2. **Use Appropriate Models**: Use smaller models with good evidence
   ```typescript
   // Good evidence from AsterMind → smaller model is sufficient
   model: 'gpt-4o-mini'  // Instead of GPT-4
   ```

3. **Cache Responses**: Cache LLM responses for repeated queries
   ```typescript
   const cache = new Map<string, string>();
   
   async function generateAnswer(evidence: string) {
     const cacheKey = hash(evidence);
     if (cache.has(cacheKey)) {
       return cache.get(cacheKey)!;
     }
     
     const answer = await llm.generate(evidence);
     cache.set(cacheKey, answer);
     return answer;
   }
   ```

---

## Part 5: Optimization & Tuning

### Auto-Tuning with `autoTune`

Use AsterMind's auto-tuning to optimize retrieval parameters:

```typescript
import { autoTune } from '@astermind/astermind-community';

async function optimizePipeline(documents: string[], queries: string[]) {
  const optimized = await autoTune({
    queries,
    corpus: documents,
    budget: 100  // Number of trials
  });
  
  return optimized;
}

// Example usage
const optimized = await optimizePipeline(documents, sampleQueries);
console.log('Optimized parameters:', optimized);
```

### Hyperparameter Optimization

**Key Parameters**:

- **Retrieval**: `alpha` (sparse weight), `beta` (dense weight), `topK`
- **Reranking**: `lambdaRidge`, `mmrLambda`, `probThresh`, `budgetChars`
- **Indexing**: `rffDim`, `numLandmarks`, `vocabSize`

### Performance Profiling

Measure performance of each stage:

```typescript
async function profilePipeline(pipeline: RAGPipeline, query: string) {
  const timings: Record<string, number> = {};
  
  // Profile retrieval
  const startRetrieve = Date.now();
  const retrieved = pipeline.retrieve(query, pipeline.index);
  timings.retrieval = Date.now() - startRetrieve;
  
  // Profile reranking
  const startRerank = Date.now();
  const reranked = pipeline.rerank(query, retrieved);
  timings.reranking = Date.now() - startRerank;
  
  // Profile LLM
  const startLLM = Date.now();
  const evidence = pipeline.formatEvidence(query, reranked);
  const answer = await pipeline.generateAnswer(evidence);
  timings.llm = Date.now() - startLLM;
  
  console.log('Performance:', timings);
  // Typical: retrieval: 10ms, reranking: 5ms, LLM: 1000-2000ms
}
```

---

## Part 6: Production Deployment

### Model Serialization

Save and load index for reuse:

```typescript
import { exportModel, importModel } from '@astermind/astermind-community';

// Save index
const serialized = exportModel(indexState);
await fs.writeFile('index.json', JSON.stringify(serialized));

// Load index
const loaded = await fs.readFile('index.json', 'utf-8');
const indexState = importModel(JSON.parse(loaded));
```

### Worker-Based Processing

Use workers for parallel processing:

```typescript
import { DevWorker } from '@astermind/astermind-community';

const worker = new DevWorker();
await worker.init({ settings });

const results = await worker.ask(query);
```

### Caching Strategies

**Cache Evidence**: Cache formatted evidence for repeated queries

```typescript
const evidenceCache = new Map<string, string>();

function getCachedEvidence(query: string, chunks: any[]) {
  const key = query + chunks.map(c => c.content).join('|');
  if (evidenceCache.has(key)) {
    return evidenceCache.get(key)!;
  }
  
  const evidence = formatEvidence(query, chunks);
  evidenceCache.set(key, evidence);
  return evidence;
}
```

**Cache LLM Responses**: Cache LLM responses for repeated evidence

```typescript
const llmCache = new Map<string, string>();

async function getCachedAnswer(evidence: string) {
  const key = hash(evidence);
  if (llmCache.has(key)) {
    return llmCache.get(key)!;
  }
  
  const answer = await generateAnswer(evidence);
  llmCache.set(key, answer);
  return answer;
}
```

### Error Handling

```typescript
async function queryWithErrorHandling(pipeline: RAGPipeline, query: string) {
  try {
    // Build index if not built
    if (!pipeline.index) {
      throw new Error('Index not built. Call buildIndex() first.');
    }
    
    // Retrieve
    const retrieved = pipeline.retrieve(query, pipeline.index);
    if (retrieved.length === 0) {
      return {
        answer: "I couldn't find any relevant information to answer your question.",
        chunks: [],
        evidence: ''
      };
    }
    
    // Rerank
    const reranked = pipeline.rerank(query, retrieved);
    
    // Format evidence
    const evidence = pipeline.formatEvidence(query, reranked);
    
    // Generate answer with retry
    let answer: string;
    try {
      answer = await pipeline.generateAnswer(evidence);
    } catch (llmError) {
      console.error('LLM error:', llmError);
      // Fallback: return reranked chunks
      return {
        answer: 'I found relevant information but could not generate an answer. Here are the relevant chunks:',
        chunks: reranked,
        evidence
      };
    }
    
    return { answer, chunks: reranked, evidence };
    
  } catch (error) {
    console.error('Pipeline error:', error);
    throw error;
  }
}
```

---

## Part 7: Testing Strategies

### Unit Tests

Test each stage independently:

```typescript
import { describe, it, expect } from 'vitest';

describe('RAG Pipeline', () => {
  it('should process documents correctly', () => {
    const documents = ['# Test\n\nContent'];
    const chunks = processDocuments(documents);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].heading).toBe('Test');
  });
  
  it('should build index correctly', () => {
    const chunks = [{ heading: 'Test', content: 'Content' }];
    const index = buildIndex(chunks);
    expect(index.vocabMap.size).toBeGreaterThan(0);
  });
  
  it('should retrieve relevant chunks', () => {
    const query = 'test query';
    const retrieved = retrieve(query, index);
    expect(retrieved.length).toBeGreaterThan(0);
  });
});
```

### Integration Tests

Test complete pipeline:

```typescript
describe('Complete RAG Pipeline', () => {
  it('should answer question using documents', async () => {
    const pipeline = new RAGPipeline();
    await pipeline.buildIndex(['# Installation\n\nRun npm install']);
    
    const result = await pipeline.query('How do I install?');
    expect(result.answer).toContain('npm install');
    expect(result.chunks.length).toBeGreaterThan(0);
  });
});
```

---

## Summary

You've built a complete RAG pipeline that:

1. ✅ **Indexes documents** using AsterMind's fast ML
2. ✅ **Retrieves relevant chunks** using hybrid retrieval
3. ✅ **Reranks results** using online learning
4. ✅ **Formats evidence** for LLM consumption
5. ✅ **Generates natural language answers** using LLM

### Key Takeaways

- **AsterMind handles ML-heavy tasks**: Fast, efficient retrieval and reranking
- **LLMs handle natural language**: Using AsterMind's evidence to generate answers
- **Complementary, not competitive**: AsterMind enhances LLMs by providing high-quality evidence
- **Cost & Performance**: Better retrieval = fewer LLM tokens = lower costs + faster responses

### Next Steps

- Experiment with different LLM providers
- Optimize retrieval and reranking parameters
- Add more sophisticated evidence formatting
- Implement caching for production use
- Test with your own documents

---

## Additional Resources

- [Omega RAG Pipeline Documentation](../PIPELINES/OMEGA-RAG-PIPELINE.md)
- [AsterMind + LLM Philosophy](../PIPELINES/ASTERMIND-LLM-PHILOSOPHY.md)
- [Additional Pipeline Examples](../PIPELINES/README.md)
- [AsterMind Community API Reference](../../README.md)
