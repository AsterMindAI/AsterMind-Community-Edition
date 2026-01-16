# AsterMind Community: Complete ML Pipeline Library

**Fast, efficient, on-device ML that enhances LLMs and powers production-ready pipelines. All features free and open-source under MIT license.**

---

## What is AsterMind Community?

AsterMind Community is a unified, open-source ML library combining **AsterMind-ELM**, **AsterMind-Pro**, **AsterMind-Premium**, and **AsterMind-Synth** into one powerful package. It provides fast, on-device ML that **enhances LLMs** rather than replaces them, creating cost-effective, privacy-preserving solutions.

**Core Philosophy**: AsterMind handles fast ML (retrieval, classification, feature extraction) → LLMs handle natural language (generation, reasoning) = Best of both worlds

**Key Components**: Core ELM models (ELM, OnlineELM, KernelELM, DeepELM), 22+ Advanced ELM Variants, Pro Features (Omega RAG, Hybrid Retrieval, Reranking, Summarization), OmegaSynth (synthetic data), ML & Preprocessing (TFIDF, KNN, Tokenizer), 9 Task Models

---

## 🎯 Complete ML Pipeline Examples (Highlight)

AsterMind Community includes **5 production-ready ML pipeline examples** with complete code, demonstrating end-to-end ML systems:

### 1. **Omega RAG Pipeline** - Document Q&A with LLM Integration
**AsterMind**: Document indexing (TF-IDF + RFF), hybrid retrieval, reranking | **LLM**: Natural language answer generation | **Result**: Fast, accurate Q&A with citations (90% cost reduction) | **Use Cases**: Enterprise knowledge bases, technical docs, customer support | **Docs**: `docs/PIPELINES/OMEGA-RAG-PIPELINE.md`

### 2. **Real-Time Classification Pipeline** - Instant Classification with Explanations
**AsterMind**: Feature extraction, OnlineELM/AdaptiveOnlineELM classification | **LLM**: Optional natural language explanations | **Result**: < 10ms predictions with optional transparency | **Use Cases**: Content moderation, intent classification, fraud detection, sentiment analysis | **Docs**: `docs/PIPELINES/REALTIME-CLASSIFICATION-PIPELINE.md`

### 3. **Synthetic Data Generation Pipeline** - Data Augmentation with Quality Assurance
**AsterMind**: OmegaSynth training, label-conditioned generation | **LLM**: Optional quality validation and realism assessment | **Result**: < 100ms per sample generation with optional quality checks | **Use Cases**: Data augmentation, balancing imbalanced datasets, privacy-preserving data | **Docs**: `docs/PIPELINES/SYNTHETIC-DATA-PIPELINE.md`

### 4. **Multi-Modal Embedding Pipeline** - Text + Numeric Feature Fusion
**AsterMind**: StringKernelELM text embeddings, numeric feature processing, fusion | **LLM**: Optional semantic text embeddings (OpenAI, etc.) | **Result**: Fast multi-modal embeddings with optional semantic understanding | **Use Cases**: Product recommendation, content similarity, user matching | **Docs**: `docs/PIPELINES/MULTIMODAL-EMBEDDING-PIPELINE.md`

### 5. **Time-Series Forecasting Pipeline** - Predictions with Uncertainty
**AsterMind**: TimeSeriesELM/RecurrentELM sequence modeling, VariationalELM uncertainty | **LLM**: Optional natural language explanations of trends and forecasts | **Result**: < 50ms forecasts with uncertainty quantification and optional explanations | **Use Cases**: Sales forecasting, demand prediction, anomaly detection, trend analysis | **Docs**: `docs/PIPELINES/TIMESERIES-FORECASTING-PIPELINE.md`

---

## Why AsterMind + LLM?

**Performance & Cost**: 90% cost reduction (better retrieval = fewer LLM tokens), 3-5x faster (fast ML + efficient LLM calls), privacy-preserving (on-device retrieval), scalable (handles large collections)

**Technical Advantages**: Fast ML (milliseconds for retrieval/classification), natural language (LLMs excel at generation/reasoning), complementary (each does what it does best), flexible (use alone or combine)

---

## Quick Start

```bash
npm install @astermind/astermind-community
```

```typescript
import { parseMarkdownToSections, buildVocabAndIdf, hybridRetrieve, rerankAndFilter } from '@astermind/astermind-community';

// 1. Index (AsterMind - fast) → 2. Retrieve (AsterMind - fast) → 3. Rerank (AsterMind - fast)
const chunks = parseMarkdownToSections(documents);
const index = buildVocabAndIdf(chunks);
const retrieved = hybridRetrieve({ query, chunks, ...index });
const reranked = rerankAndFilter(query, retrieved);

// 4. Format evidence → 5. Generate answer (LLM - natural language)
const evidence = formatEvidenceForLLM(query, reranked);
const answer = await llm.generate(evidence);
```

---

## Documentation

**Pipeline Examples**: `docs/PIPELINES/` - 5 complete pipeline examples with code | **Tutorial**: `docs/TUTORIALS/BUILDING-RAG-PIPELINE.md` - Step-by-step RAG guide | **Philosophy**: `docs/PIPELINES/ASTERMIND-LLM-PHILOSOPHY.md` - Why AsterMind + LLM works | **API Reference**: See main `README.md`

**Package Contents**: Core (14 files: ELM, KernelELM, OnlineELM, DeepELM, etc.) | Advanced ELM Variants (22 files: TimeSeriesELM, RecurrentELM, GraphELM, etc.) | Pro Features (31 files: Omega RAG, Hybrid Retrieval, Reranking, etc.) | Synthetic Data (31 files: OmegaSynth, ELMGenerator, etc.) | ML & Preprocessing (5 files: TFIDF, KNN, Tokenizer, etc.) | Tasks (9 files: AutoComplete, LanguageClassifier, etc.)

---

## Performance Summary

| Task | AsterMind | LLM (Optional) | Cost |
|------|-----------|----------------|------|
| RAG Retrieval | 10-50ms | 1000-2000ms | $0.01-0.02 |
| Classification | < 10ms | 500-1000ms | Free or $0.001 |
| Synthetic Data | < 100ms | 500-1000ms | Free or $0.001 |
| Embeddings | < 10ms | 50-200ms | Free or $0.0001 |
| Forecasting | < 50ms | 500-1500ms | Free or $0.002 |

**Note**: LLM stages are optional. AsterMind stages are always fast and free.

## Get Started

1. **Install**: `npm install @astermind/astermind-community` | 2. **Choose Pipeline**: `docs/PIPELINES/README.md` | 3. **Follow Tutorial**: `docs/TUTORIALS/BUILDING-RAG-PIPELINE.md` | 4. **Build**: Create your own ML pipeline

**License**: MIT - All features free and open-source. No license server, no restrictions, no EULA.

**The complete ML pipeline library that enhances LLMs. Fast, efficient, and free.**
