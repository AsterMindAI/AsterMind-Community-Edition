# Synthetic Data Generation Pipeline with AsterMind Community

**A complete ML pipeline for synthetic data generation using OmegaSynth, with optional LLM enhancement for data validation and quality assurance.**

---

## Overview

This pipeline demonstrates synthetic data generation using AsterMind's OmegaSynth for label-conditioned data generation, with optional LLM integration for data validation and quality assessment.

### Key Philosophy

- **AsterMind handles data generation**: Fast, efficient synthetic data generation with OmegaSynth
- **LLMs enhance with validation**: Optional natural language validation and quality assessment
- **Complementary approach**: Fast ML generation + intelligent validation

---

## Pipeline Architecture

```
Input: Labeled dataset
    ↓
[1] Data Analysis (AsterMind ML)
    - Pattern extraction
    - Label distribution analysis
    - Feature analysis
    ↓
[2] Model Training (AsterMind ML - OmegaSynth)
    - OmegaSynth training
    - Pattern learning
    - Character embeddings
    ↓
[3] Synthetic Data Generation (AsterMind ML)
    - Label-conditioned generation
    - Quality validation
    - Pattern correction
    ↓
[4] Optional: LLM Validation (External)
    - Format synthetic data for LLM
    - Validate data quality
    - Assess realism
    ↓
[5] Data Augmentation (AsterMind ML)
    - Combine real + synthetic
    - Balance dataset
    - Quality filtering
    ↓
[6] Downstream Model Training (AsterMind ML)
    - Train ELM on augmented data
    - Evaluate performance
    ↓
Output: Trained model on augmented dataset
```

---

## Use Cases

1. **Data Augmentation**: Increase dataset size for small datasets
2. **Balancing Imbalanced Datasets**: Generate samples for minority classes
3. **Privacy-Preserving Data Generation**: Generate synthetic data without privacy concerns
4. **A/B Testing**: Generate synthetic data for testing
5. **Model Training**: Augment training data for better model performance

---

## Step-by-Step Implementation

### Step 1: Data Analysis

```typescript
import { OmegaSynth } from '@astermind/astermind-community';

class DataAnalyzer {
  analyzeDataset(dataset: Array<{ text: string; label: string }>) {
    // Analyze label distribution
    const labelCounts = new Map<string, number>();
    dataset.forEach(item => {
      labelCounts.set(item.label, (labelCounts.get(item.label) || 0) + 1);
    });
    
    // Analyze text patterns
    const avgLength = dataset.reduce((sum, item) => sum + item.text.length, 0) / dataset.length;
    const patterns = this.extractPatterns(dataset);
    
    return {
      labelCounts: Object.fromEntries(labelCounts),
      avgLength,
      patterns,
      totalSamples: dataset.length
    };
  }
  
  private extractPatterns(dataset: Array<{ text: string }>) {
    // Extract common patterns (simplified)
    const patterns = {
      avgWords: dataset.reduce((sum, item) => sum + item.text.split(' ').length, 0) / dataset.length,
      commonChars: this.findCommonChars(dataset)
    };
    return patterns;
  }
  
  private findCommonChars(dataset: Array<{ text: string }>): string[] {
    const charCounts = new Map<string, number>();
    dataset.forEach(item => {
      item.text.split('').forEach(char => {
        charCounts.set(char, (charCounts.get(char) || 0) + 1);
      });
    });
    
    return Array.from(charCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([char]) => char);
  }
}

// Example usage
const analyzer = new DataAnalyzer();
const analysis = analyzer.analyzeDataset(dataset);
console.log('Label distribution:', analysis.labelCounts);
```

---

### Step 2: Train Synthetic Data Generator

```typescript
import { OmegaSynth } from '@astermind/astermind-community';

class SyntheticDataGenerator {
  private synth: OmegaSynth;
  
  constructor() {
    this.synth = new OmegaSynth({
      mode: 'hybrid',  // or 'elm', 'exact', 'retrieval', 'perfect'
      maxLength: 32,
      usePatternCorrection: true
    });
  }
  
  // Train on dataset
  async train(dataset: Array<{ text: string; label: string }>) {
    await this.synth.train(dataset);
  }
  
  // Generate synthetic data for a label
  async generate(label: string, count: number): Promise<string[]> {
    const generated = await this.synth.generate(label, count);
    return generated;
  }
  
  // Generate for multiple labels
  async generateForLabels(
    labelCounts: Record<string, number>
  ): Promise<Array<{ text: string; label: string }>> {
    const synthetic: Array<{ text: string; label: string }> = [];
    
    for (const [label, count] of Object.entries(labelCounts)) {
      const generated = await this.generate(label, count);
      generated.forEach(text => {
        synthetic.push({ text, label });
      });
    }
    
    return synthetic;
  }
}

// Example usage
const generator = new SyntheticDataGenerator();
await generator.train(dataset);

// Generate 100 synthetic samples for 'label1'
const synthetic = await generator.generate('label1', 100);
```

---

### Step 3: Optional LLM Validation

```typescript
import { OpenAI } from 'openai';

class SyntheticDataValidator {
  private llm: OpenAI;
  
  constructor(apiKey?: string) {
    this.llm = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });
  }
  
  // Validate synthetic data quality
  async validate(
    syntheticText: string,
    label: string,
    realExamples: string[]
  ): Promise<{ valid: boolean; score: number; feedback?: string }> {
    const prompt = `Synthetic data sample: "${syntheticText}"
Expected label: ${label}

Real examples for this label:
${realExamples.slice(0, 5).map(ex => `- "${ex}"`).join('\n')}

Rate the synthetic data sample on a scale of 0-10 for:
1. Realism (how realistic does it look?)
2. Label consistency (does it match the label?)
3. Pattern adherence (does it follow patterns from real examples?)

Return a JSON object with: { "realism": number, "label_consistency": number, "pattern_adherence": number, "overall": number, "feedback": string }`;

    const completion = await this.llm.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a data quality assessor. Evaluate synthetic data samples objectively.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });
    
    const result = JSON.parse(completion.choices[0].message.content || '{}');
    
    return {
      valid: result.overall >= 7,
      score: result.overall,
      feedback: result.feedback
    };
  }
  
  // Batch validation
  async validateBatch(
    synthetic: Array<{ text: string; label: string }>,
    realExamples: Record<string, string[]>
  ): Promise<Array<{ text: string; label: string; score: number; valid: boolean }>> {
    const validated = await Promise.all(
      synthetic.map(async item => {
        const validation = await this.validate(
          item.text,
          item.label,
          realExamples[item.label] || []
        );
        return {
          ...item,
          score: validation.score,
          valid: validation.valid
        };
      })
    );
    
    return validated;
  }
}

// Example usage
const validator = new SyntheticDataValidator();
const validation = await validator.validate(synthetic[0], 'label1', realExamples['label1']);
console.log(`Validation score: ${validation.score}, Valid: ${validation.valid}`);
```

---

### Step 4: Complete Synthetic Data Pipeline

```typescript
class SyntheticDataPipeline {
  private generator: SyntheticDataGenerator;
  private validator?: SyntheticDataValidator;
  private useValidation: boolean;
  
  constructor(options: { useLLM?: boolean; llmApiKey?: string } = {}) {
    this.generator = new SyntheticDataGenerator();
    this.useValidation = options.useLLM || false;
    
    if (this.useValidation) {
      this.validator = new SyntheticDataValidator(options.llmApiKey);
    }
  }
  
  // Generate and augment dataset
  async augmentDataset(
    dataset: Array<{ text: string; label: string }>,
    targetCounts: Record<string, number>
  ): Promise<Array<{ text: string; label: string }>> {
    // Train generator
    await this.generator.train(dataset);
    
    // Calculate generation needs
    const labelCounts = new Map<string, number>();
    dataset.forEach(item => {
      labelCounts.set(item.label, (labelCounts.get(item.label) || 0) + 1);
    });
    
    const toGenerate: Record<string, number> = {};
    for (const [label, targetCount] of Object.entries(targetCounts)) {
      const currentCount = labelCounts.get(label) || 0;
      if (currentCount < targetCount) {
        toGenerate[label] = targetCount - currentCount;
      }
    }
    
    // Generate synthetic data
    const synthetic = await this.generator.generateForLabels(toGenerate);
    
    // Optional: Validate synthetic data
    let validated = synthetic;
    if (this.useValidation && this.validator) {
      const realExamples = this.groupByLabel(dataset);
      const validationResults = await this.validator.validateBatch(synthetic, realExamples);
      
      // Filter by validation score
      validated = validationResults
        .filter(item => item.valid)
        .map(item => ({ text: item.text, label: item.label }));
    }
    
    // Combine real + synthetic
    const augmented = [...dataset, ...validated];
    
    return augmented;
  }
  
  private groupByLabel(dataset: Array<{ text: string; label: string }>): Record<string, string[]> {
    const grouped: Record<string, string[]> = {};
    dataset.forEach(item => {
      if (!grouped[item.label]) {
        grouped[item.label] = [];
      }
      grouped[item.label].push(item.text);
    });
    return grouped;
  }
}

// Example usage
async function main() {
  const pipeline = new SyntheticDataPipeline({ useLLM: true });
  
  // Original dataset (imbalanced)
  const dataset = [
    { text: 'Positive review', label: 'positive' },
    { text: 'Great product', label: 'positive' },
    { text: 'Bad experience', label: 'negative' },
    // ... more data, but mostly positive
  ];
  
  // Target balanced dataset
  const targetCounts = {
    positive: 1000,
    negative: 1000
  };
  
  // Augment dataset
  const augmented = await pipeline.augmentDataset(dataset, targetCounts);
  console.log(`Augmented from ${dataset.length} to ${augmented.length} samples`);
}
```

---

### Step 5: Train Downstream Model

```typescript
import { ELM, TFIDFVectorizer } from '@astermind/astermind-community';

class AugmentedModelTrainer {
  private vectorizer: TFIDFVectorizer;
  private model: ELM;
  
  constructor(categories: string[]) {
    this.vectorizer = new TFIDFVectorizer({ maxFeatures: 1000 });
    this.model = new ELM({
      categories,
      hiddenUnits: 128
    });
  }
  
  // Train on augmented dataset
  async train(augmentedDataset: Array<{ text: string; label: string }>) {
    // Extract features
    const texts = augmentedDataset.map(item => item.text);
    this.vectorizer.fit(texts);
    const features = texts.map(text => this.vectorizer.transform([text])[0]);
    
    // Encode labels
    const labelMap = new Map<string, number>();
    augmentedDataset.forEach((item, i) => {
      if (!labelMap.has(item.label)) {
        labelMap.set(item.label, labelMap.size);
      }
    });
    
    const labels = augmentedDataset.map(item => labelMap.get(item.label)!);
    
    // Train model
    this.model.fit(features, labels);
    
    return {
      model: this.model,
      vectorizer: this.vectorizer,
      labelMap: Object.fromEntries(labelMap)
    };
  }
  
  // Evaluate performance
  evaluate(testDataset: Array<{ text: string; label: string }>, labelMap: Record<string, number>) {
    const features = testDataset.map(item => this.vectorizer.transform([item.text])[0]);
    const trueLabels = testDataset.map(item => labelMap[item.label]);
    
    let correct = 0;
    features.forEach((features, i) => {
      const prediction = this.model.predict(features, 1)[0];
      if (prediction.label === trueLabels[i].toString()) {
        correct++;
      }
    });
    
    return {
      accuracy: correct / testDataset.length,
      correct,
      total: testDataset.length
    };
  }
}

// Example usage
async function trainAndEvaluate() {
  const pipeline = new SyntheticDataPipeline({ useLLM: false });
  const trainer = new AugmentedModelTrainer(['positive', 'negative']);
  
  // Augment dataset
  const augmented = await pipeline.augmentDataset(dataset, { positive: 1000, negative: 1000 });
  
  // Train on augmented data
  const { model, vectorizer, labelMap } = await trainer.train(augmented);
  
  // Evaluate
  const evaluation = trainer.evaluate(testDataset, labelMap);
  console.log(`Accuracy: ${evaluation.accuracy.toFixed(2)}`);
}
```

---

## Performance Characteristics

### AsterMind Generation (OmegaSynth)

- **Latency**: < 100ms per sample generation
- **Throughput**: 10+ samples/second
- **Quality**: Pattern-aware, label-conditioned generation
- **Privacy**: Generates synthetic data without privacy concerns

### LLM Validation (Optional)

- **Latency**: 500-1000ms per validation
- **Cost**: ~$0.001 per validation (GPT-4o-mini)
- **Use**: Only when high-quality validation is needed

### Combined

- **Fast Generation**: Always fast (< 100ms)
- **Optional Validation**: Only when quality is critical
- **Best of Both**: Fast generation + intelligent validation

---

## Advanced Features

### Pattern Correction

```typescript
// OmegaSynth automatically corrects patterns
const synth = new OmegaSynth({
  mode: 'hybrid',
  usePatternCorrection: true,  // Enable pattern correction
  maxLength: 32
});
```

### Label Balancing

```typescript
function balanceDataset(dataset: Array<{ text: string; label: string }>) {
  // Calculate target counts (balance to max class)
  const labelCounts = new Map<string, number>();
  dataset.forEach(item => {
    labelCounts.set(item.label, (labelCounts.get(item.label) || 0) + 1);
  });
  
  const maxCount = Math.max(...Array.from(labelCounts.values()));
  
  const targetCounts: Record<string, number> = {};
  labelCounts.forEach((count, label) => {
    targetCounts[label] = maxCount;
  });
  
  return targetCounts;
}
```

---

## Use Case Examples

### Example 1: Data Augmentation for Small Datasets

```typescript
// Small dataset (100 samples)
const smallDataset = loadSmallDataset();

// Augment to 1000 samples per label
const pipeline = new SyntheticDataPipeline({ useLLM: false });
const augmented = await pipeline.augmentDataset(smallDataset, {
  label1: 1000,
  label2: 1000,
  label3: 1000
});

// Train on augmented data
const trainer = new AugmentedModelTrainer(['label1', 'label2', 'label3']);
await trainer.train(augmented);
```

### Example 2: Privacy-Preserving Data Generation

```typescript
// Generate synthetic data without privacy concerns
const generator = new SyntheticDataGenerator();
await generator.train(sensitiveDataset);

// Generate synthetic version
const synthetic = await generator.generate('label', 1000);

// Use synthetic data instead of real data
const model = trainModel(synthetic);
```

---

## Summary

This pipeline demonstrates:

- ✅ **Fast, efficient synthetic data generation** using OmegaSynth
- ✅ **Optional LLM validation** for quality assurance
- ✅ **Data augmentation** for small or imbalanced datasets
- ✅ **Privacy-preserving generation** without privacy concerns
- ✅ **Downstream model training** on augmented data

**Key Benefit**: Fast generation with optional intelligent validation for high-quality synthetic data.

---

## Next Steps

- See [Additional Pipeline Examples](./README.md) for more patterns
- See [AsterMind + LLM Philosophy](./ASTERMIND-LLM-PHILOSOPHY.md) for deeper dive
- See [Building RAG Pipeline Tutorial](../TUTORIALS/BUILDING-RAG-PIPELINE.md) for step-by-step guide
