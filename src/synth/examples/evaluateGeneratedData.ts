/**
 * Evaluate OmegaSynth Generated Data Quality
 * 
 * This script:
 * 1. Loads OmegaSynth model
 * 2. Generates 200 examples per label type
 * 3. Saves generated examples to JSON
 * 4. Evaluates examples for:
 *    - Quality: format validation, length checks, character validation
 *    - Realism: comparison with training data patterns
 *    - Uniqueness: duplicate detection, diversity metrics
 * 
 * This example shows how customers would use the installed @astermind/astermind-synth package.
 * After installing: npm install @astermind/astermind-synth
 * 
 * Note: TypeScript may show errors here during development, but these imports
 * will work correctly when customers install the package.
 */

import * as fs from 'fs';
import * as path from 'path';
// Note: loadTrainingDataFile and combineTrainingData are internal utilities
// In a real customer scenario, you would load your own training data
import { loadTrainingDataFile, combineTrainingData } from '../scripts/loadTrainingData';

interface QualityMetrics {
  validFormat: number;
  validFormatRate: number;
  averageLength: number;
  minLength: number;
  maxLength: number;
  lengthVariance: number;
  hasInvalidChars: number;
  hasInvalidCharsRate: number;
  emptyCount: number;
  emptyRate: number;
}

interface RealismMetrics {
  charDistributionSimilarity: number; // 0-1, how similar char distribution is to training data
  patternMatchRate: number; // 0-1, how many patterns from training data appear in generated
  averagePatternSimilarity: number; // 0-1, average similarity of patterns
  lengthDistributionSimilarity: number; // 0-1, how similar length distribution is
}

interface UniquenessMetrics {
  totalSamples: number;
  uniqueSamples: number;
  duplicateCount: number;
  uniquenessRate: number; // unique / total
  diversityScore: number; // 0-1, based on unique patterns
}

interface LabelEvaluation {
  label: string;
  quality: QualityMetrics;
  realism: RealismMetrics;
  uniqueness: UniquenessMetrics;
  generatedSamples: string[];
  sampleCount: number;
}

interface OverallEvaluation {
  timestamp: string;
  modelVersion: string;
  mode: string;
  totalLabels: number;
  totalSamples: number;
  overallQuality: {
    averageValidFormatRate: number;
    averageUniquenessRate: number;
    averageRealismScore: number;
  };
  perLabel: LabelEvaluation[];
}

/**
 * Calculate character distribution for a set of strings
 */
function calculateCharDistribution(samples: string[]): Map<string, number> {
  const distribution = new Map<string, number>();
  let totalChars = 0;

  for (const sample of samples) {
    for (const char of sample) {
      distribution.set(char, (distribution.get(char) || 0) + 1);
      totalChars++;
    }
  }

  // Normalize to frequencies
  if (totalChars > 0) {
    for (const [char, count] of distribution.entries()) {
      distribution.set(char, count / totalChars);
    }
  }

  return distribution;
}

/**
 * Calculate similarity between two character distributions (cosine similarity)
 */
function distributionSimilarity(
  dist1: Map<string, number>,
  dist2: Map<string, number>
): number {
  const allChars = new Set([...dist1.keys(), ...dist2.keys()]);
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (const char of allChars) {
    const val1 = dist1.get(char) || 0;
    const val2 = dist2.get(char) || 0;
    dotProduct += val1 * val2;
    norm1 += val1 * val1;
    norm2 += val2 * val2;
  }

  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
  return denominator > 0 ? dotProduct / denominator : 0;
}

/**
 * Extract common patterns from samples (n-grams)
 */
function extractPatterns(samples: string[], n: number = 2): Set<string> {
  const patterns = new Set<string>();
  for (const sample of samples) {
    for (let i = 0; i <= sample.length - n; i++) {
      patterns.add(sample.substring(i, i + n));
    }
  }
  return patterns;
}

/**
 * Calculate pattern match rate (how many training patterns appear in generated)
 */
function calculatePatternMatchRate(
  generated: string[],
  trainingPatterns: Set<string>
): number {
  if (trainingPatterns.size === 0) return 0;

  const generatedPatterns = extractPatterns(generated);
  let matches = 0;
  for (const pattern of generatedPatterns) {
    if (trainingPatterns.has(pattern)) {
      matches++;
    }
  }

  return generatedPatterns.size > 0 ? matches / generatedPatterns.size : 0;
}

/**
 * Calculate length distribution similarity
 */
function lengthDistributionSimilarity(
  generated: number[],
  training: number[]
): number {
  if (training.length === 0 || generated.length === 0) return 0;

  // Create histograms
  const maxLen = Math.max(...generated, ...training);
  const genHist = new Array(maxLen + 1).fill(0);
  const trainHist = new Array(maxLen + 1).fill(0);

  for (const len of generated) {
    if (len <= maxLen) genHist[len]++;
  }
  for (const len of training) {
    if (len <= maxLen) trainHist[len]++;
  }

  // Normalize
  const genSum = genHist.reduce((a, b) => a + b, 0);
  const trainSum = trainHist.reduce((a, b) => a + b, 0);

  if (genSum === 0 || trainSum === 0) return 0;

  for (let i = 0; i <= maxLen; i++) {
    genHist[i] /= genSum;
    trainHist[i] /= trainSum;
  }

  // Calculate cosine similarity
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i <= maxLen; i++) {
    dotProduct += genHist[i] * trainHist[i];
    norm1 += genHist[i] * genHist[i];
    norm2 += trainHist[i] * trainHist[i];
  }

  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
  return denominator > 0 ? dotProduct / denominator : 0;
}

/**
 * Evaluate quality of generated samples
 */
function evaluateQuality(samples: string[]): QualityMetrics {
  const totalSamples = samples.length;
  const lengths = samples.map(s => s.length);
  const validFormat = samples.filter(
    s => s.length > 0 && s.length <= 200 && s.trim().length > 0
  ).length;

  const averageLength =
    lengths.length > 0 ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0;
  const minLength = lengths.length > 0 ? Math.min(...lengths) : 0;
  const maxLength = lengths.length > 0 ? Math.max(...lengths) : 0;

  // Calculate variance
  const variance =
    lengths.length > 0
      ? lengths.reduce((sum, len) => sum + Math.pow(len - averageLength, 2), 0) /
        lengths.length
      : 0;

  // Check for invalid characters (control characters, but allow common whitespace)
  const hasInvalidChars = samples.filter(s => {
    for (const char of s) {
      const code = char.charCodeAt(0);
      // Allow printable ASCII and common Unicode (basic multilingual plane)
      if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
        return true;
      }
      if (code > 0xffff) {
        return true; // Beyond basic multilingual plane
      }
    }
    return false;
  }).length;

  const emptyCount = samples.filter(s => s.length === 0 || s.trim().length === 0)
    .length;

  return {
    validFormat,
    validFormatRate: totalSamples > 0 ? validFormat / totalSamples : 0,
    averageLength,
    minLength,
    maxLength,
    lengthVariance: variance,
    hasInvalidChars,
    hasInvalidCharsRate: totalSamples > 0 ? hasInvalidChars / totalSamples : 0,
    emptyCount,
    emptyRate: totalSamples > 0 ? emptyCount / totalSamples : 0,
  };
}

/**
 * Evaluate realism of generated samples compared to training data
 */
function evaluateRealism(
  generated: string[],
  training: string[]
): RealismMetrics {
  if (training.length === 0) {
    return {
      charDistributionSimilarity: 0,
      patternMatchRate: 0,
      averagePatternSimilarity: 0,
      lengthDistributionSimilarity: 0,
    };
  }

  // Character distribution similarity
  const genCharDist = calculateCharDistribution(generated);
  const trainCharDist = calculateCharDistribution(training);
  const charSimilarity = distributionSimilarity(genCharDist, trainCharDist);

  // Pattern matching (2-grams and 3-grams)
  const trainPatterns2 = extractPatterns(training, 2);
  const trainPatterns3 = extractPatterns(training, 3);
  const patternMatch2 = calculatePatternMatchRate(generated, trainPatterns2);
  const patternMatch3 = calculatePatternMatchRate(generated, trainPatterns3);
  const patternMatchRate = (patternMatch2 + patternMatch3) / 2;

  // Average pattern similarity (how similar are the patterns overall)
  const genPatterns2 = extractPatterns(generated, 2);
  const genPatterns3 = extractPatterns(generated, 3);
  const patternOverlap2 =
    trainPatterns2.size > 0
      ? Array.from(genPatterns2).filter(p => trainPatterns2.has(p)).length /
        Math.max(genPatterns2.size, trainPatterns2.size)
      : 0;
  const patternOverlap3 =
    trainPatterns3.size > 0
      ? Array.from(genPatterns3).filter(p => trainPatterns3.has(p)).length /
        Math.max(genPatterns3.size, trainPatterns3.size)
      : 0;
  const averagePatternSimilarity = (patternOverlap2 + patternOverlap3) / 2;

  // Length distribution similarity
  const genLengths = generated.map(s => s.length);
  const trainLengths = training.map(s => s.length);
  const lengthSimilarity = lengthDistributionSimilarity(genLengths, trainLengths);

  return {
    charDistributionSimilarity: charSimilarity,
    patternMatchRate,
    averagePatternSimilarity,
    lengthDistributionSimilarity: lengthSimilarity,
  };
}

/**
 * Evaluate uniqueness of generated samples
 */
function evaluateUniqueness(samples: string[]): UniquenessMetrics {
  const totalSamples = samples.length;
  const uniqueSet = new Set(samples);
  const uniqueSamples = uniqueSet.size;
  const duplicateCount = totalSamples - uniqueSamples;
  const uniquenessRate = totalSamples > 0 ? uniqueSamples / totalSamples : 0;

  // Diversity score: based on unique patterns and variation
  const uniquePatterns = extractPatterns(Array.from(uniqueSet), 2);
  const patternDiversity = uniquePatterns.size / Math.max(totalSamples, 1);

  // Normalize diversity score (0-1)
  const diversityScore = Math.min(1.0, patternDiversity * 0.1); // Scale factor

  return {
    totalSamples,
    uniqueSamples,
    duplicateCount,
    uniquenessRate,
    diversityScore,
  };
}

/**
 * Evaluate a single label
 */
function evaluateLabel(
  label: string,
  generated: string[],
  training: string[]
): LabelEvaluation {
  const quality = evaluateQuality(generated);
  const realism = evaluateRealism(generated, training);
  const uniqueness = evaluateUniqueness(generated);

  return {
    label,
    quality,
    realism,
    uniqueness,
    generatedSamples: generated,
    sampleCount: generated.length,
  };
}

/**
 * Generate comprehensive evaluation report
 */
function generateReport(evaluation: OverallEvaluation): string {
  let report = `# OmegaSynth Generated Data Evaluation Report\n\n`;
  report += `**Timestamp:** ${evaluation.timestamp}\n`;
  report += `**Model Version:** ${evaluation.modelVersion}\n`;
  report += `**Mode:** ${evaluation.mode}\n`;
  report += `**Total Labels:** ${evaluation.totalLabels}\n`;
  report += `**Total Samples:** ${evaluation.totalSamples}\n\n`;

  report += `## Overall Metrics\n\n`;
  report += `- **Average Valid Format Rate:** ${(
    evaluation.overallQuality.averageValidFormatRate * 100
  ).toFixed(2)}%\n`;
  report += `- **Average Uniqueness Rate:** ${(
    evaluation.overallQuality.averageUniquenessRate * 100
  ).toFixed(2)}%\n`;
  report += `- **Average Realism Score:** ${(
    evaluation.overallQuality.averageRealismScore * 100
  ).toFixed(2)}%\n\n`;

  report += `## Per-Label Evaluation\n\n`;
  report += `| Label | Quality | Realism | Uniqueness | Samples |\n`;
  report += `|-------|---------|---------|------------|----------|\n`;

  for (const labelEval of evaluation.perLabel) {
    const qualityScore =
      labelEval.quality.validFormatRate * 100;
    const realismScore =
      ((labelEval.realism.charDistributionSimilarity +
        labelEval.realism.patternMatchRate +
        labelEval.realism.lengthDistributionSimilarity) /
        3) *
      100;
    const uniquenessScore = labelEval.uniqueness.uniquenessRate * 100;

    report += `| ${labelEval.label} | ${qualityScore.toFixed(1)}% | ${realismScore.toFixed(1)}% | ${uniquenessScore.toFixed(1)}% | ${labelEval.sampleCount} |\n`;
  }

  report += `\n## Detailed Per-Label Metrics\n\n`;

  for (const labelEval of evaluation.perLabel) {
    report += `### ${labelEval.label}\n\n`;
    report += `**Quality Metrics:**\n`;
    report += `- Valid Format Rate: ${(
      labelEval.quality.validFormatRate * 100
    ).toFixed(2)}%\n`;
    report += `- Average Length: ${labelEval.quality.averageLength.toFixed(1)}\n`;
    report += `- Length Range: ${labelEval.quality.minLength}-${labelEval.quality.maxLength}\n`;
    report += `- Invalid Characters: ${(
      labelEval.quality.hasInvalidCharsRate * 100
    ).toFixed(2)}%\n`;
    report += `- Empty Samples: ${(labelEval.quality.emptyRate * 100).toFixed(2)}%\n\n`;

    report += `**Realism Metrics:**\n`;
    report += `- Character Distribution Similarity: ${(
      labelEval.realism.charDistributionSimilarity * 100
    ).toFixed(2)}%\n`;
    report += `- Pattern Match Rate: ${(
      labelEval.realism.patternMatchRate * 100
    ).toFixed(2)}%\n`;
    report += `- Length Distribution Similarity: ${(
      labelEval.realism.lengthDistributionSimilarity * 100
    ).toFixed(2)}%\n\n`;

    report += `**Uniqueness Metrics:**\n`;
    report += `- Unique Samples: ${labelEval.uniqueness.uniqueSamples}/${labelEval.uniqueness.totalSamples}\n`;
    report += `- Uniqueness Rate: ${(
      labelEval.uniqueness.uniquenessRate * 100
    ).toFixed(2)}%\n`;
    report += `- Duplicate Count: ${labelEval.uniqueness.duplicateCount}\n`;
    report += `- Diversity Score: ${(
      labelEval.uniqueness.diversityScore * 100
    ).toFixed(2)}%\n\n`;

    // Show sample examples
    report += `**Sample Generated Examples (first 10):**\n`;
    const samples = labelEval.generatedSamples.slice(0, 10);
    for (const sample of samples) {
      report += `- "${sample}"\n`;
    }
    report += `\n`;
  }

  return report;
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('OmegaSynth Generated Data Quality Evaluation');
  console.log('='.repeat(60));

  // Step 1: Load saved OmegaSynth model
  const currentFileDir = __dirname || path.dirname(require.main?.filename || process.cwd());
  const PROJECT_ROOT = path.resolve(currentFileDir, '../../../');
  const modelDir = path.join(PROJECT_ROOT, 'dist/models/v2.0.0');

  console.log(`\nStep 1: Loading saved OmegaSynth model from: ${modelDir}`);

  if (!fs.existsSync(modelDir)) {
    throw new Error(`Model directory not found: ${modelDir}`);
  }

  const modelPath = path.join(modelDir, 'model.json');
  if (!fs.existsSync(modelPath)) {
    throw new Error(`Model file not found: ${modelPath}`);
  }

  const modelData = JSON.parse(fs.readFileSync(modelPath, 'utf-8'));
  console.log(`Mode: ${modelData.config.mode}`);
  console.log(`Training samples: ${modelData.trainingStats.totalSamples}`);

  // Create OmegaSynth with optimized perfect mode
  // Perfect mode is now memory-optimized (useImprovedELM: false by default, reduced hidden units)
  const synth = new OmegaSynth({
    mode: 'perfect',
    maxLength: modelData.config.maxLength || 50,
    seed: modelData.config.seed,
    useOneHot: false, // Disabled for memory efficiency
    usePatternCorrection: true, // Enable pattern correction (tuned for better matching)
    // useImprovedELM defaults to false (no duplicate ELM)
    // elmHiddenUnits defaults to 128 (reduced from 256)
  });

  // Step 2: Load training data for comparison
  console.log('\nStep 2: Loading training data for comparison...');
  const modelsDir = path.join(PROJECT_ROOT, 'src/omegasynth/models');
  const trainingFiles: string[] = [];

  const entries = fs.readdirSync(modelsDir);
  for (const entry of entries) {
    if (
      entry.endsWith('.json') &&
      !entry.includes('test') &&
      !entry.includes('val') &&
      entry !== 'default_synth.json'
    ) {
      trainingFiles.push(path.join(modelsDir, entry));
    }
  }
  
  // Add the new enhanced training data file with more samples for job_title, country, state
  const enhancedFile = path.join(modelsDir, 'omegaSynth_training_data_enhanced.json');
  if (fs.existsSync(enhancedFile)) {
    trainingFiles.push(enhancedFile);
    console.log('Added enhanced training data file for job_title, country, and state');
  }

  const trainingDataFiles = trainingFiles.map(file => loadTrainingDataFile(file));
  const trainingSamples = combineTrainingData(trainingDataFiles);

  // Group training data by label
  const trainingByLabel: Record<string, string[]> = {};
  for (const sample of trainingSamples) {
    if (!trainingByLabel[sample.label]) {
      trainingByLabel[sample.label] = [];
    }
    trainingByLabel[sample.label].push(sample.value);
  }

  // Step 3: Retrain OmegaSynth
  console.log('\nStep 3: Retraining OmegaSynth with original data...');
  await synth.train(trainingSamples);
  console.log('✅ OmegaSynth retrained!');

  // Step 4: Generate 200 examples per label
  console.log('\nStep 4: Generating 200 examples per label...');
  const labels = synth.getLabels();
  console.log(`Labels to generate: ${labels.length} (${labels.join(', ')})`);

  const SAMPLES_PER_LABEL = 200;
  const generatedByLabel: Record<string, string[]> = {};

  for (const label of labels) {
    try {
      console.log(`  Generating ${SAMPLES_PER_LABEL} samples for "${label}"...`);
      const generated = await synth.generateBatch(label, SAMPLES_PER_LABEL);
      generatedByLabel[label] = generated;
      console.log(`  ✅ Generated ${generated.length} samples for "${label}"`);
    } catch (error: any) {
      console.error(`  ❌ Error generating ${label}:`, error.message);
      generatedByLabel[label] = [];
    }
  }

  // Step 5: Save generated data to JSON
  console.log('\nStep 5: Saving generated data to JSON...');
  const outputDir = path.join(PROJECT_ROOT, 'dist/evaluations');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const generatedDataPath = path.join(
    outputDir,
    `generated_data_${timestamp}.json`
  );

  const generatedData = {
    timestamp: new Date().toISOString(),
    modelVersion: modelData.config.version || '2.0.0',
    mode: modelData.config.mode,
    samplesPerLabel: SAMPLES_PER_LABEL,
    generatedByLabel,
  };

  fs.writeFileSync(
    generatedDataPath,
    JSON.stringify(generatedData, null, 2)
  );
  console.log(`✅ Saved generated data to: ${generatedDataPath}`);

  // Step 6: Evaluate generated data
  console.log('\nStep 6: Evaluating generated data...');
  const perLabelEvaluations: LabelEvaluation[] = [];

  for (const label of labels) {
    const generated = generatedByLabel[label] || [];
    const training = trainingByLabel[label] || [];

    if (generated.length === 0) {
      console.log(`  ⚠️  Skipping ${label}: no generated samples`);
      continue;
    }

    console.log(`  Evaluating "${label}" (${generated.length} samples)...`);
    const evaluation = evaluateLabel(label, generated, training);
    perLabelEvaluations.push(evaluation);
  }

  // Calculate overall metrics
  const totalSamples = perLabelEvaluations.reduce(
    (sum, evaluation) => sum + evaluation.sampleCount,
    0
  );
  const avgValidFormatRate =
    perLabelEvaluations.reduce(
      (sum, evaluation) => sum + evaluation.quality.validFormatRate,
      0
    ) / perLabelEvaluations.length;
  const avgUniquenessRate =
    perLabelEvaluations.reduce(
      (sum, evaluation) => sum + evaluation.uniqueness.uniquenessRate,
      0
    ) / perLabelEvaluations.length;
  const avgRealismScore =
    perLabelEvaluations.reduce(
      (sum, evaluation) => {
        const realism =
          (evaluation.realism.charDistributionSimilarity +
            evaluation.realism.patternMatchRate +
            evaluation.realism.lengthDistributionSimilarity) /
          3;
        return sum + realism;
      },
      0
    ) / perLabelEvaluations.length;

  const overallEvaluation: OverallEvaluation = {
    timestamp: new Date().toISOString(),
    modelVersion: modelData.config.version || '2.0.0',
    mode: modelData.config.mode,
    totalLabels: labels.length,
    totalSamples,
    overallQuality: {
      averageValidFormatRate: avgValidFormatRate,
      averageUniquenessRate: avgUniquenessRate,
      averageRealismScore: avgRealismScore,
    },
    perLabel: perLabelEvaluations,
  };

  // Step 7: Save evaluation results
  console.log('\nStep 7: Saving evaluation results...');
  const evaluationJsonPath = path.join(
    outputDir,
    `evaluation_${timestamp}.json`
  );
  fs.writeFileSync(
    evaluationJsonPath,
    JSON.stringify(overallEvaluation, null, 2)
  );
  console.log(`✅ Saved evaluation JSON to: ${evaluationJsonPath}`);

  const reportPath = path.join(outputDir, `evaluation_report_${timestamp}.md`);
  const report = generateReport(overallEvaluation);
  fs.writeFileSync(reportPath, report);
  console.log(`✅ Saved evaluation report to: ${reportPath}`);

  // Step 8: Print summary
  console.log('\n' + '='.repeat(60));
  console.log('EVALUATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Labels Evaluated: ${perLabelEvaluations.length}`);
  console.log(`Total Samples Generated: ${totalSamples}`);
  console.log(
    `\nOverall Quality Score: ${(avgValidFormatRate * 100).toFixed(2)}%`
  );
  console.log(
    `Overall Uniqueness Score: ${(avgUniquenessRate * 100).toFixed(2)}%`
  );
  console.log(`Overall Realism Score: ${(avgRealismScore * 100).toFixed(2)}%`);

  console.log('\nPer-Label Summary:');
  for (const evaluation of perLabelEvaluations) {
    const qualityScore = evaluation.quality.validFormatRate * 100;
    const realismScore =
      ((evaluation.realism.charDistributionSimilarity +
        evaluation.realism.patternMatchRate +
        evaluation.realism.lengthDistributionSimilarity) /
        3) *
      100;
    const uniquenessScore = evaluation.uniqueness.uniquenessRate * 100;

    console.log(
      `  ${evaluation.label.padEnd(20)} | Quality: ${qualityScore.toFixed(1)}% | Realism: ${realismScore.toFixed(1)}% | Uniqueness: ${uniquenessScore.toFixed(1)}%`
    );
  }

  console.log('\n' + '='.repeat(60));
  console.log('Evaluation Complete!');
  console.log('='.repeat(60));
  console.log(`\nFiles saved:`);
  console.log(`  - Generated Data: ${generatedDataPath}`);
  console.log(`  - Evaluation JSON: ${evaluationJsonPath}`);
  console.log(`  - Evaluation Report: ${reportPath}`);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Evaluation failed:', error);
    process.exit(1);
  });
}

export { main as runEvaluation };

