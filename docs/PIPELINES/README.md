# ML Pipeline Examples with AsterMind Community

**Complete ML pipeline examples demonstrating how AsterMind Community enhances LLMs and other ML systems.**

---

## Overview

This directory contains comprehensive examples of ML pipelines built with AsterMind Community. Each pipeline demonstrates how AsterMind's fast, efficient ML capabilities complement and enhance other technologies like LLMs.

### Key Philosophy

**AsterMind enhances, doesn't replace**: AsterMind handles fast, efficient ML tasks (retrieval, classification, feature extraction). LLMs and other systems handle what they do best (natural language generation, complex reasoning).

---

## Available Pipelines

### 1. [Omega RAG Pipeline](./OMEGA-RAG-PIPELINE.md)

**Complete RAG system** using AsterMind for retrieval/reranking and LLMs for answer generation.

**Key Features**:
- Document indexing with TF-IDF + RFF
- Hybrid retrieval (sparse + dense)
- Reranking with online learning
- LLM integration for natural language answers

**Use Cases**:
- Enterprise knowledge bases
- Technical documentation Q&A
- Customer support systems

---

### 2. [Real-Time Classification Pipeline](./REALTIME-CLASSIFICATION-PIPELINE.md)

**Real-time classification** with optional LLM explanations.

**Key Features**:
- Fast on-device classification (< 10ms)
- Online learning for continuous improvement
- Optional LLM explanations for transparency
- Streaming data processing

**Use Cases**:
- Content moderation
- Intent classification
- Fraud detection
- Sentiment analysis

---

### 3. [Synthetic Data Generation Pipeline](./SYNTHETIC-DATA-PIPELINE.md)

**Synthetic data generation** using OmegaSynth with optional LLM validation.

**Key Features**:
- Label-conditioned data generation
- Fast generation (< 100ms per sample)
- Optional LLM validation for quality assurance
- Data augmentation for small/imbalanced datasets

**Use Cases**:
- Data augmentation
- Balancing imbalanced datasets
- Privacy-preserving data generation
- A/B testing data

---

### 4. [Multi-Modal Embedding Pipeline](./MULTIMODAL-EMBEDDING-PIPELINE.md)

**Multi-modal embeddings** combining text and numeric features.

**Key Features**:
- Text embeddings (StringKernelELM)
- Numeric feature processing
- Feature fusion and stacking
- Optional LLM semantic embeddings
- Similarity search with EmbeddingStore

**Use Cases**:
- Product recommendation
- Content similarity search
- User matching
- Document retrieval

---

### 5. [Time-Series Forecasting Pipeline](./TIMESERIES-FORECASTING-PIPELINE.md)

**Time-series forecasting** with uncertainty quantification and optional explanations.

**Key Features**:
- Sequence modeling (TimeSeriesELM, RecurrentELM)
- Multi-step ahead prediction
- Uncertainty quantification (VariationalELM)
- Optional LLM explanations for trends
- Anomaly detection

**Use Cases**:
- Sales forecasting
- Demand prediction
- Anomaly detection
- Trend analysis

---

## Pipeline Selection Guide

### Choose Omega RAG Pipeline If:

- ✅ You need document Q&A or search
- ✅ You have large document collections
- ✅ You need citations and source tracking
- ✅ You want fast retrieval with natural language answers

### Choose Real-Time Classification Pipeline If:

- ✅ You need instant classifications (< 10ms)
- ✅ You're processing streaming data
- ✅ You need online learning capabilities
- ✅ You want optional explanations for transparency

### Choose Synthetic Data Generation Pipeline If:

- ✅ You have small or imbalanced datasets
- ✅ You need data augmentation
- ✅ You have privacy concerns with real data
- ✅ You want to generate label-conditioned data

### Choose Multi-Modal Embedding Pipeline If:

- ✅ You have text + numeric data
- ✅ You need similarity search
- ✅ You want product/content recommendations
- ✅ You need feature engineering for ML models

### Choose Time-Series Forecasting Pipeline If:

- ✅ You have time-series data
- ✅ You need future predictions
- ✅ You want uncertainty quantification
- ✅ You need anomaly detection

---

## Common Patterns

### Pattern 1: AsterMind + LLM Hybrid

**When**: You need fast ML processing + natural language generation

**Example**: RAG systems, classification with explanations, forecasting with trend analysis

**Flow**: AsterMind ML → Evidence/Results → LLM → Natural Language Output

---

### Pattern 2: AsterMind Only

**When**: You need fast, on-device ML without natural language

**Example**: Real-time classification, data augmentation, feature extraction

**Flow**: AsterMind ML → Results

---

### Pattern 3: AsterMind + Other ML Systems

**When**: You need feature engineering or preprocessing for other ML models

**Example**: Embedding generation for downstream models, data augmentation for training

**Flow**: AsterMind ML → Features/Data → Other ML System → Results

---

## Getting Started

1. **Read the Philosophy**: Start with [AsterMind + LLM Philosophy](./ASTERMIND-LLM-PHILOSOPHY.md)
2. **Choose a Pipeline**: Select the pipeline that matches your use case
3. **Follow the Tutorial**: See [Building RAG Pipeline Tutorial](../TUTORIALS/BUILDING-RAG-PIPELINE.md) for step-by-step guide
4. **Adapt to Your Needs**: Modify examples for your specific requirements

---

## Code Examples

All pipelines include complete, runnable code examples. See individual pipeline documentation for:

- ✅ Complete implementation code
- ✅ Step-by-step explanations
- ✅ Configuration options
- ✅ Performance optimization tips
- ✅ Production deployment guidance

---

## Best Practices

1. **Use AsterMind for ML-heavy tasks**: Retrieval, classification, feature extraction
2. **Use LLMs for natural language**: Generation, explanations, complex reasoning
3. **Combine when beneficial**: Fast ML + natural language for best results
4. **Optimize costs**: Better retrieval = fewer LLM tokens = lower costs
5. **Consider privacy**: Use on-device AsterMind for privacy-sensitive tasks

---

## Performance Comparison

| Pipeline | AsterMind Latency | LLM Latency | Total Latency | Cost per Query |
|----------|------------------|-------------|---------------|----------------|
| RAG | 10-50ms | 1000-2000ms | ~2s | $0.01-0.02 |
| Classification | < 10ms | 500-1000ms (optional) | < 10ms or ~1s | Free or $0.001 |
| Synthetic Data | < 100ms | 500-1000ms (optional) | < 100ms or ~1s | Free or $0.001 |
| Embeddings | < 10ms | 50-200ms (optional) | < 10ms or ~200ms | Free or $0.0001 |
| Forecasting | < 50ms | 500-1500ms (optional) | < 50ms or ~1.5s | Free or $0.002 |

**Note**: LLM latency and cost are optional. AsterMind stages are always fast and free.

---

## Next Steps

- See [AsterMind + LLM Philosophy](./ASTERMIND-LLM-PHILOSOPHY.md) for deeper dive
- See [Building RAG Pipeline Tutorial](../TUTORIALS/BUILDING-RAG-PIPELINE.md) for step-by-step guide
- See individual pipeline documentation for detailed examples
- See [AsterMind Community README](../../README.md) for API reference

---

**Remember**: AsterMind enhances LLMs and other ML systems. Use the right tool for the right job, and combine them for best results.
