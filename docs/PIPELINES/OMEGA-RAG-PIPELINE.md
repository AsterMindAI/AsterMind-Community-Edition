# Omega RAG Pipeline: Complete ML Pipeline with AsterMind Community

**AsterMind Community provides fast, efficient ML-powered retrieval and reranking. LLMs handle natural language generation. Together, they create powerful RAG systems.**

---

## Overview

Omega RAG is a complete ML pipeline that demonstrates how **AsterMind Community enhances LLMs** rather than replacing them. The pipeline uses AsterMind's fast, on-device ML for retrieval and reranking, then passes high-quality evidence to an LLM for natural language answer generation.

### Key Philosophy

- **AsterMind handles ML-heavy tasks**: Fast, efficient retrieval, reranking, and evidence preparation
- **LLMs handle natural language generation**: Using AsterMind's evidence to produce human-readable answers
- **Complementary, not competitive**: AsterMind enhances LLM performance by providing high-quality, relevant evidence

### Why This Architecture?

1. **Performance**: AsterMind's on-device ML is fast and efficient for retrieval/reranking
2. **Cost**: Better retrieval means fewer LLM tokens needed
3. **Privacy**: On-device retrieval keeps data local
4. **Quality**: LLMs excel at natural language generation and reasoning
5. **Best of Both Worlds**: Fast ML + Powerful LLMs

---

## Pipeline Architecture

```
Input: Question/Query
    ↓
[1] Document Processing & Indexing (AsterMind ML)
    - Markdown parsing (parseMarkdownToSections)
    - Chunking with overlap
    - Vocabulary building (buildVocabAndIdf)
    - TF-IDF vectorization (toTfidf, buildTfidfDocs)
    - Dense embeddings (buildRFF, mapRFF - Random Fourier Features)
    - Landmark selection (buildLandmarks - Nyström approximation)
    ↓
[2] Hybrid Retrieval (AsterMind ML)
    - Sparse retrieval (TF-IDF cosine similarity)
    - Dense retrieval (RFF kernel similarity)
    - Hybrid scoring (alpha * sparse + beta * dense)
    - Keyword bonus (keywordBonus)
    ↓
[3] Reranking (AsterMind ML)
    - Feature engineering (query-chunk features)
    - Online Ridge regression (OnlineRidge)
    - Relevance scoring (score_rr, p_relevant)
    - MMR filtering (filterMMR - Maximal Marginal Relevance)
    - Character budget filtering
    ↓
[4] Optional: Evidence Preprocessing (AsterMind ML)
    - Deterministic summarization (summarizeDeterministic) - optional
    - Evidence formatting for LLM
    - Citation preparation
    ↓
[5] Optional: Information Flow Analysis (AsterMind ML)
    - Transfer Entropy calculation (TransferEntropy)
    - Causal inference
    - Evidence quality scoring
    ↓
[6] LLM/Transformer Integration (External)
    - Format evidence as context/prompt
    - Provide retrieved chunks as grounding
    - Include citations and source references
    - LLM generates natural language answer
    ↓
Output: LLM-generated answer with citations and evidence
```

---

## Stage-by-Stage Breakdown

### Stage 1: Document Processing & Indexing (AsterMind ML)

**Purpose**: Transform raw documents into searchable index

**AsterMind Components Used**:
- `parseMarkdownToSections` - Parse markdown documents into sections
- `buildVocabAndIdf` - Build vocabulary and IDF weights
- `buildTfidfDocs` - Create TF-IDF sparse vectors
- `buildRFF` / `mapRFF` - Create Random Fourier Features for dense embeddings
- `buildLandmarks` - Select landmark points for Nyström approximation

**What It Does**:
- Parses documents (markdown, plain text, etc.)
- Splits into chunks with overlap
- Builds vocabulary and calculates IDF weights
- Creates sparse TF-IDF vectors
- Creates dense embeddings using RFF (Random Fourier Features)
- Selects landmarks for efficient similarity search

**Output**: Searchable index with both sparse and dense representations

---

### Stage 2: Hybrid Retrieval (AsterMind ML)

**Purpose**: Find relevant chunks using hybrid sparse + dense retrieval

**AsterMind Components Used**:
- `toTfidf` - Convert query to TF-IDF vector
- `cosineSparse` - Sparse vector cosine similarity
- `kernelSim` - Dense kernel similarity (RFF)
- `hybridRetrieve` - Combine sparse + dense retrieval
- `keywordBonus` - Add keyword matching bonus

**What It Does**:
- Converts query to TF-IDF sparse vector
- Computes sparse similarity (TF-IDF cosine)
- Computes dense similarity (RFF kernel)
- Combines both with weighted scoring: `score = alpha * sparse + beta * dense`
- Adds keyword matching bonus
- Returns top K most relevant chunks

**Output**: Ranked list of relevant document chunks

---

### Stage 3: Reranking (AsterMind ML)

**Purpose**: Improve ranking using rich query-chunk features

**AsterMind Components Used**:
- `rerankAndFilter` - Rerank chunks using Online Ridge regression
- `filterMMR` - Maximal Marginal Relevance filtering
- `OnlineRidge` - Per-query online learning for reranking

**What It Does**:
- Engineers rich features from query-chunk pairs
- Trains small Online Ridge model per query
- Scores chunks for relevance (score_rr, p_relevant)
- Filters using MMR to ensure diversity
- Applies character budget constraints

**Output**: Reranked and filtered chunks with relevance scores

---

### Stage 4: Optional Evidence Preprocessing (AsterMind ML)

**Purpose**: Format and prepare evidence for LLM consumption

**AsterMind Components Used**:
- `summarizeDeterministic` - Optional preprocessing/summarization
- Evidence formatting utilities

**What It Does**:
- (Optional) Further processes chunks if needed
- Formats chunks with citations
- Prepares evidence in LLM-friendly format
- Adds source references

**Output**: Formatted evidence ready for LLM

**Note**: This step is optional. You can pass reranked chunks directly to LLM.

---

### Stage 5: Optional Information Flow Analysis (AsterMind ML)

**Purpose**: Analyze information flow and causality in retrieved chunks

**AsterMind Components Used**:
- `TransferEntropy` - Calculate transfer entropy
- `TEController` - Control information flow analysis

**What It Does**:
- Analyzes information flow between chunks
- Calculates transfer entropy for causal inference
- Provides additional evidence quality metrics

**Output**: Information flow metrics (optional)

---

### Stage 6: LLM/Transformer Integration (External)

**Purpose**: Generate natural language answer using evidence

**Key Point**: **This is where the final answer is generated, not in AsterMind stages.**

**What Happens**:
1. **Format Evidence**: Convert retrieved chunks to LLM prompt format
   ```typescript
   const evidence = formatEvidenceForLLM(query, rerankedChunks);
   // Format: "Context:\n[1] Heading\nContent\n\n[2] Heading\nContent..."
   ```

2. **Create Prompt**: Build prompt with system instructions and evidence
   ```typescript
   const prompt = {
     system: "You are a helpful assistant that answers using only provided context...",
     user: evidence + "\n\nQuestion: " + query
   };
   ```

3. **LLM Generation**: Send to LLM (OpenAI, Anthropic, Local LLM, etc.)
   ```typescript
   const answer = await llm.generate(prompt);
   ```

4. **Output**: Natural language answer with citations

**LLM Options**:
- OpenAI (GPT-4, GPT-3.5, etc.)
- Anthropic (Claude)
- Local LLMs (Ollama, LM Studio, etc.)
- Open-source models (Llama, Mistral, etc.)

**Output**: Human-readable answer with citations

---

## Component Details

### Document Processing & Indexing

**Components**:
- `parseMarkdownToSections`: Parses markdown into hierarchical sections
- `buildVocabAndIdf`: Builds vocabulary map and IDF weights
- `buildTfidfDocs`: Creates TF-IDF sparse vectors for all chunks
- `buildRFF` / `mapRFF`: Creates dense embeddings using Random Fourier Features
- `buildLandmarks`: Selects landmark points for Nyström approximation

**Configuration**:
- Chunk size and overlap
- Vocabulary size
- RFF dimensions
- Number of landmarks

**Performance**: Fast, on-device indexing

---

### Hybrid Retrieval

**Components**:
- `hybridRetrieve`: Main retrieval function combining sparse + dense
- `toTfidf`: Query vectorization
- `cosineSparse`: Sparse similarity computation
- `kernelSim`: Dense similarity computation
- `keywordBonus`: Keyword matching bonus

**Configuration**:
- `alpha`: Sparse weight (0-1)
- `beta`: Dense weight (0-1)
- `topK`: Number of results to return
- `prefilter`: Optional pre-filtering threshold

**Performance**: Fast retrieval with hybrid approach

---

### Reranking

**Components**:
- `rerankAndFilter`: Main reranking function
- `OnlineRidge`: Per-query online learning
- `filterMMR`: Maximal Marginal Relevance filtering

**Configuration**:
- `lambdaRidge`: Ridge regularization strength
- `useMMR`: Enable MMR diversity filtering
- `mmrLambda`: MMR tradeoff parameter
- `probThresh`: Probability threshold for filtering
- `budgetChars`: Character budget for final chunks

**Performance**: Fast per-query reranking using online learning

---

### Evidence Formatting for LLM

**Format Example**:
```
Context:
[1] Introduction to AsterMind
AsterMind is a fast, efficient ML library...

[2] Installation
To install AsterMind, run: npm install @astermind/astermind-community

[3] Quick Start
Here's how to get started with AsterMind...

Question: How do I install AsterMind?

Answer the question using only the context provided above. Include citations like [1], [2], etc.
```

**Key Features**:
- Numbered citations
- Source headings
- Content chunks
- Clear question
- Citation instructions

---

### LLM Integration

**Integration Patterns**:

1. **OpenAI API**:
   ```typescript
   const completion = await openai.chat.completions.create({
     model: 'gpt-4o-mini',
     messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: evidencePrompt }]
   });
   ```

2. **Anthropic Claude**:
   ```typescript
   const message = await anthropic.messages.create({
     model: 'claude-3-haiku-20240307',
     messages: [{ role: 'user', content: evidencePrompt }]
   });
   ```

3. **Local LLM (Ollama)**:
   ```typescript
   const response = await fetch('http://localhost:11434/api/generate', {
     method: 'POST',
     body: JSON.stringify({ model: 'llama2', prompt: evidencePrompt })
   });
   ```

**Best Practices**:
- Include system prompt for citation instructions
- Format evidence clearly with numbered citations
- Limit context size to manage token costs
- Use appropriate model for task complexity

---

## Performance & Scalability

### AsterMind Performance

- **Indexing**: Fast, on-device processing
- **Retrieval**: Sub-millisecond for hybrid search
- **Reranking**: Fast per-query online learning
- **Memory**: Efficient sparse + dense representations

### LLM Performance & Cost

- **Token Efficiency**: Better retrieval = fewer tokens needed
- **Response Quality**: Grounded in accurate evidence
- **Cost Optimization**: Use smaller models with good evidence
- **Privacy**: On-device retrieval keeps data local

### Combined Advantages

- **Speed**: Fast retrieval + efficient LLM calls
- **Cost**: Reduced LLM token usage through better retrieval
- **Quality**: High-quality evidence leads to better answers
- **Privacy**: On-device retrieval, optional local LLMs

---

## Use Cases

1. **Enterprise Knowledge Bases**: Fast document search with conversational answers
2. **Technical Documentation**: Efficient code/docs retrieval with natural language answers
3. **Customer Support**: Quick retrieval with helpful responses
4. **Research Assistants**: Accurate evidence gathering with well-formatted answers
5. **Educational Tools**: Fast retrieval with educational explanations

---

## Advanced Features

### Auto-Tuning

Use `autoTune` to optimize retrieval parameters:
```typescript
import { autoTune } from '@astermind/astermind-community';

const optimized = await autoTune({
  queries: sampleQueries,
  corpus: documents,
  budget: 100 // number of trials
});
```

### Model Serialization

Save and load index for reuse:
```typescript
import { exportModel, importModel } from '@astermind/astermind-community';

// Export
const serialized = exportModel(indexState);

// Import
const loaded = importModel(serialized);
```

### Worker-Based Processing

Use workers for parallel processing:
```typescript
import { DevWorker, ProdWorker } from '@astermind/astermind-community';

const worker = new DevWorker();
await worker.init({ settings });
const results = await worker.ask(query);
```

---

## Best Practices

1. **Index Management**: Build indexes offline, reuse in production
2. **Evidence Quality**: Use reranking to ensure high-quality evidence
3. **LLM Selection**: Choose appropriate model for complexity
4. **Citation Tracking**: Always include source citations in prompts
5. **Cost Optimization**: Use character budgets and evidence limits
6. **Privacy**: Keep retrieval on-device, use local LLMs when possible

---

## Next Steps

- See [Building RAG Pipeline Tutorial](../TUTORIALS/BUILDING-RAG-PIPELINE.md) for step-by-step guide
- See [AsterMind + LLM Philosophy](./ASTERMIND-LLM-PHILOSOPHY.md) for deeper dive
- See [Additional Pipeline Examples](./README.md) for more pipeline patterns

---

**Key Takeaway**: AsterMind provides fast, efficient ML for retrieval and reranking. LLMs provide natural language generation. Together, they create powerful, cost-effective RAG systems.
