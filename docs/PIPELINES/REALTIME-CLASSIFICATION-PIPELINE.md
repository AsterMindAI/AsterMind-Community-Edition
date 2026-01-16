# Real-Time Classification Pipeline with AsterMind Community

**A complete ML pipeline for real-time classification using AsterMind's fast on-device ML with optional LLM enhancement for explanations.**

---

## Overview

This pipeline demonstrates real-time classification using AsterMind's fast, on-device ML for instant predictions, with optional LLM integration for generating natural language explanations.

### Key Philosophy

- **AsterMind handles fast classification**: On-device, millisecond-latency predictions
- **LLMs enhance with explanations**: Optional natural language explanations of classifications
- **Complementary approach**: Fast ML predictions + natural language explanations

---

## Pipeline Architecture

```
Input: Streaming data (text, features, etc.)
    ↓
[1] Feature Extraction (AsterMind ML)
    - Text: Tokenizer, TFIDFVectorizer
    - Numeric: Normalization
    - Feature engineering
    ↓
[2] Real-Time Classification (AsterMind ML)
    - OnlineELM for streaming updates
    - AdaptiveOnlineELM for dynamic adjustment
    - Fast predictions (milliseconds)
    ↓
[3] Prediction & Confidence (AsterMind ML)
    - Real-time predictions
    - Confidence scores
    - Uncertainty quantification
    ↓
[4] Optional: LLM Explanation (External)
    - Format prediction for LLM
    - Generate natural language explanation
    - Provide reasoning for classification
    ↓
[5] Feedback Loop (AsterMind ML)
    - User feedback collection
    - Incremental updates
    - Online learning
    ↓
Output: Classification + Confidence + Optional Explanation
```

---

## Use Cases

1. **Real-time Content Moderation**: Classify content as spam/ham/toxic in real-time
2. **Streaming Intent Classification**: Classify user intents in chat systems
3. **Live Fraud Detection**: Detect fraudulent transactions as they happen
4. **Sentiment Analysis**: Real-time sentiment classification of social media posts
5. **Topic Classification**: Classify documents/tweets in real-time

---

## Step-by-Step Implementation

### Step 1: Feature Extraction

```typescript
import { Tokenizer, TFIDFVectorizer } from '@astermind/astermind-community';

class FeatureExtractor {
  private tokenizer: Tokenizer;
  private vectorizer: TFIDFVectorizer;
  
  constructor() {
    this.tokenizer = new Tokenizer();
    this.vectorizer = new TFIDFVectorizer({ maxFeatures: 1000 });
  }
  
  // Extract features from text
  extractFeatures(text: string): number[] {
    // Tokenize
    const tokens = this.tokenizer.tokenize(text);
    
    // Vectorize (TF-IDF)
    const vector = this.vectorizer.transform([text]);
    
    return Array.from(vector[0]);
  }
  
  // Extract features from numeric data
  extractNumericFeatures(data: number[]): number[] {
    // Normalize
    const mean = data.reduce((a, b) => a + b) / data.length;
    const std = Math.sqrt(data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / data.length);
    return data.map(x => (x - mean) / (std || 1));
  }
  
  // Fit vectorizer on training data
  fit(texts: string[]) {
    this.vectorizer.fit(texts);
  }
}

// Example usage
const extractor = new FeatureExtractor();
extractor.fit(trainingTexts);
const features = extractor.extractFeatures('This is a test message');
```

---

### Step 2: Real-Time Classification

```typescript
import { AdaptiveOnlineELM, OnlineELM } from '@astermind/astermind-community';

class RealTimeClassifier {
  private classifier: AdaptiveOnlineELM;
  private featureExtractor: FeatureExtractor;
  
  constructor(categories: string[]) {
    this.classifier = new AdaptiveOnlineELM({
      categories,
      initialHiddenUnits: 128,
      minHiddenUnits: 64,
      maxHiddenUnits: 512
    });
    this.featureExtractor = new FeatureExtractor();
  }
  
  // Train on initial data
  fit(features: number[][], labels: number[]) {
    this.classifier.fit(features, labels);
  }
  
  // Predict in real-time
  predict(features: number[], topK: number = 1): Array<{ label: string; confidence: number }> {
    const predictions = this.classifier.predict(features, topK);
    return predictions.map(p => ({
      label: p.label,
      confidence: p.confidence
    }));
  }
  
  // Update with new data (online learning)
  update(features: number[], label: number) {
    this.classifier.update(features, label);
  }
  
  // Classify text directly
  classifyText(text: string, topK: number = 1) {
    const features = this.featureExtractor.extractFeatures(text);
    return this.predict(features, topK);
  }
}

// Example usage
const classifier = new RealTimeClassifier(['spam', 'ham', 'toxic']);
classifier.fit(trainingFeatures, trainingLabels);

// Real-time prediction
const result = classifier.classifyText('This is a spam message', 1);
console.log(`Prediction: ${result[0].label}, Confidence: ${result[0].confidence}`);
```

---

### Step 3: Optional LLM Explanation

```typescript
import { OpenAI } from 'openai';

class ExplanationGenerator {
  private llm: OpenAI;
  
  constructor(apiKey?: string) {
    this.llm = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });
  }
  
  // Generate explanation for classification
  async explain(
    text: string,
    prediction: { label: string; confidence: number },
    topFeatures?: string[]
  ): Promise<string> {
    const prompt = `Text: "${text}"
Classification: ${prediction.label} (confidence: ${prediction.confidence.toFixed(2)})

${topFeatures ? `Key features: ${topFeatures.join(', ')}\n` : ''}
Explain why this text was classified as ${prediction.label} in 1-2 sentences.`;

    const completion = await this.llm.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that explains ML classification decisions in simple terms.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 100
    });
    
    return completion.choices[0].message.content || 'No explanation generated';
  }
}

// Example usage
const explainer = new ExplanationGenerator();
const explanation = await explainer.explain(
  'This is a spam message',
  { label: 'spam', confidence: 0.95 }
);
console.log('Explanation:', explanation);
```

---

### Step 4: Complete Real-Time Pipeline

```typescript
class RealTimeClassificationPipeline {
  private classifier: RealTimeClassifier;
  private explainer?: ExplanationGenerator;
  private useExplanations: boolean;
  
  constructor(
    categories: string[],
    options: { useLLM?: boolean; llmApiKey?: string } = {}
  ) {
    this.classifier = new RealTimeClassifier(categories);
    this.useExplanations = options.useLLM || false;
    
    if (this.useExplanations) {
      this.explainer = new ExplanationGenerator(options.llmApiKey);
    }
  }
  
  // Train on initial data
  async train(texts: string[], labels: number[]) {
    const extractor = this.classifier.featureExtractor;
    extractor.fit(texts);
    
    const features = texts.map(text => extractor.extractFeatures(text));
    this.classifier.fit(features, labels);
  }
  
  // Process streaming data
  async processStreaming(text: string, generateExplanation: boolean = false) {
    const startTime = Date.now();
    
    // Classify
    const predictions = this.classifier.classifyText(text, 1);
    const prediction = predictions[0];
    const classificationTime = Date.now() - startTime;
    
    const result: any = {
      text,
      prediction: prediction.label,
      confidence: prediction.confidence,
      latency: classificationTime
    };
    
    // Optional: Generate explanation
    if (generateExplanation && this.useExplanations && this.explainer) {
      const explanationStart = Date.now();
      result.explanation = await this.explainer.explain(text, prediction);
      result.explanationLatency = Date.now() - explanationStart;
    }
    
    return result;
  }
  
  // Update with feedback (online learning)
  updateWithFeedback(text: string, correctLabel: number) {
    const features = this.classifier.featureExtractor.extractFeatures(text);
    this.classifier.update(features, correctLabel);
  }
}

// Example usage
async function main() {
  const pipeline = new RealTimeClassificationPipeline(
    ['spam', 'ham', 'toxic'],
    { useLLM: true }  // Enable LLM explanations
  );
  
  // Train on initial data
  await pipeline.train(trainingTexts, trainingLabels);
  
  // Process streaming messages
  const messages = [
    'This is a legitimate message',
    'Click here to win money!!!',
    'Great product, highly recommend'
  ];
  
  for (const message of messages) {
    const result = await pipeline.processStreaming(message, true);
    console.log(`Text: ${result.text}`);
    console.log(`Prediction: ${result.prediction} (${result.confidence.toFixed(2)})`);
    console.log(`Explanation: ${result.explanation}`);
    console.log(`Latency: ${result.latency}ms`);
    console.log('---');
  }
  
  // Update with feedback
  pipeline.updateWithFeedback('This is actually spam', 0);  // 0 = spam
}
```

---

## Performance Characteristics

### AsterMind Classification

- **Latency**: < 10ms for classification
- **Throughput**: 1000+ classifications/second
- **Memory**: Low memory footprint
- **Privacy**: Runs entirely on-device

### LLM Explanation (Optional)

- **Latency**: 500-2000ms for explanation generation
- **Cost**: ~$0.001 per explanation (GPT-4o-mini)
- **Use**: Only when explanations are needed

### Combined

- **Fast Classification**: Always fast (< 10ms)
- **Optional Explanations**: Only when requested
- **Best of Both**: Fast predictions + natural language explanations

---

## Advanced Features

### Adaptive Learning

```typescript
// Use AdaptiveOnlineELM for dynamic model adjustment
const classifier = new AdaptiveOnlineELM({
  categories: ['class1', 'class2'],
  initialHiddenUnits: 128,
  minHiddenUnits: 64,
  maxHiddenUnits: 512
});

// Model automatically adjusts hidden units based on data complexity
```

### Confidence Thresholds

```typescript
function processWithThreshold(pipeline: RealTimeClassificationPipeline, text: string) {
  const predictions = pipeline.classifier.classifyText(text);
  const prediction = predictions[0];
  
  if (prediction.confidence < 0.7) {
    // Low confidence - flag for review or request explanation
    return {
      prediction: 'uncertain',
      confidence: prediction.confidence,
      needsReview: true
    };
  }
  
  return {
    prediction: prediction.label,
    confidence: prediction.confidence,
    needsReview: false
  };
}
```

### Batch Processing

```typescript
async function processBatch(pipeline: RealTimeClassificationPipeline, texts: string[]) {
  const results = await Promise.all(
    texts.map(text => pipeline.processStreaming(text, false))
  );
  
  return results;
}
```

---

## Production Deployment

### Caching Predictions

```typescript
const predictionCache = new Map<string, any>();

function getCachedPrediction(text: string) {
  const key = hash(text);
  if (predictionCache.has(key)) {
    return predictionCache.get(key);
  }
  return null;
}
```

### Error Handling

```typescript
async function safeClassify(pipeline: RealTimeClassificationPipeline, text: string) {
  try {
    return await pipeline.processStreaming(text);
  } catch (error) {
    console.error('Classification error:', error);
    return {
      prediction: 'error',
      confidence: 0,
      error: error.message
    };
  }
}
```

---

## Use Case Examples

### Example 1: Real-Time Content Moderation

```typescript
const moderationPipeline = new RealTimeClassificationPipeline(
  ['spam', 'ham', 'toxic', 'hate'],
  { useLLM: true }
);

// Process user messages in real-time
app.post('/api/moderate', async (req, res) => {
  const { message } = req.body;
  
  const result = await moderationPipeline.processStreaming(message, false);
  
  if (result.prediction === 'toxic' || result.prediction === 'hate') {
    // Block message
    res.json({ allowed: false, reason: result.prediction });
  } else {
    // Allow message
    res.json({ allowed: true, classification: result.prediction });
  }
});
```

### Example 2: Streaming Intent Classification

```typescript
const intentPipeline = new RealTimeClassificationPipeline(
  ['question', 'command', 'greeting', 'complaint', 'compliment'],
  { useLLM: true }
);

// Classify user intents in chat
function handleChatMessage(message: string) {
  const result = intentPipeline.classifyText(message);
  
  switch (result[0].label) {
    case 'question':
      return handleQuestion(message);
    case 'command':
      return handleCommand(message);
    // ... etc
  }
}
```

---

## Summary

This pipeline demonstrates:

- ✅ **Fast, on-device classification** using AsterMind (milliseconds)
- ✅ **Optional LLM explanations** for transparency (seconds)
- ✅ **Online learning** for continuous improvement
- ✅ **Real-time processing** for streaming data
- ✅ **Complementary approach**: Fast ML + natural language explanations

**Key Benefit**: Fast predictions with optional human-readable explanations when needed.

---

## Next Steps

- See [Additional Pipeline Examples](./README.md) for more patterns
- See [AsterMind + LLM Philosophy](./ASTERMIND-LLM-PHILOSOPHY.md) for deeper dive
- See [Building RAG Pipeline Tutorial](../TUTORIALS/BUILDING-RAG-PIPELINE.md) for step-by-step guide
