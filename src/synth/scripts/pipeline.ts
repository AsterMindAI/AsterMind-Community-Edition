/**
 * Main training, testing, and validation pipeline
 */

import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'node:url';
import { trainModel, saveModel, TrainingConfig } from './trainModel';
import { testModel, saveTestResults } from './testModel';
import { validateModel, saveValidationResults } from './validateModel';
import { saveVersionedModel } from './saveVersionedModel';
// Resolve paths relative to project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = process.cwd();
const MODELS_DIR = path.join(PROJECT_ROOT, 'src/omegasynth/models');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'dist/models');

/**
 * Main pipeline execution
 */
async function main() {
  // Initialize license runtime
    console.log('='.repeat(60));
  console.log('OmegaSynth Training, Testing, and Validation Pipeline');
  console.log('='.repeat(60));
  console.log();

  // Step 1: Identify training files
  console.log('Step 1: Loading training data files...');
  const trainingFiles: string[] = [];
  const entries = fs.readdirSync(MODELS_DIR);
  
  for (const entry of entries) {
    if (
      entry.endsWith('.json') &&
      !entry.includes('test') &&
      !entry.includes('val') &&
      entry !== 'default_synth.json'
    ) {
      trainingFiles.push(path.join(MODELS_DIR, entry));
    }
  }

  if (trainingFiles.length === 0) {
    throw new Error('No training data files found!');
  }

  console.log(`Found ${trainingFiles.length} training files:`);
  trainingFiles.forEach(file => console.log(`  - ${path.basename(file)}`));
  console.log();

  // Step 2: Train model
  console.log('Step 2: Training model...');
  // Use hybrid mode which combines retrieval + ELM for best results
  const trainingConfig: TrainingConfig = {
    mode: 'hybrid', // Using hybrid mode (retrieval + ELM)
    maxLength: 50,
    seed: 42,
    trainingFiles,
  };

  const trainedModel = await trainModel(trainingConfig);
  console.log('✅ Training complete!\n');

  // Step 3: Test model
  console.log('Step 3: Testing model...');
  const testFile = path.join(MODELS_DIR, 'omegaSynth_training_data_huge_test.json');
  
  if (!fs.existsSync(testFile)) {
    throw new Error(`Test file not found: ${testFile}`);
  }

  const testResult = await testModel({
    model: trainedModel.synth,
    testFile,
    samplesPerLabel: 10,
  });

  // Save test results to temp directory
  const testOutputDir = path.join(OUTPUT_DIR, 'temp_test');
  await saveTestResults(testResult, testOutputDir);

  if (!testResult.passed) {
    console.log('\n❌ Test failed! Stopping pipeline.');
    console.log('   Model will not be saved.');
    process.exit(1);
  }

  console.log('✅ Test passed!\n');

  // Step 4: Validate model
  console.log('Step 4: Validating model...');
  const validationFile = path.join(
    MODELS_DIR,
    'omegaSynth_training_data_huge_val.json'
  );

  if (!fs.existsSync(validationFile)) {
    throw new Error(`Validation file not found: ${validationFile}`);
  }

  const validationResult = await validateModel({
    model: trainedModel.synth,
    validationFile,
    samplesPerLabel: 20,
  });

  // Save validation results to temp directory
  const validationOutputDir = path.join(OUTPUT_DIR, 'temp_validation');
  await saveValidationResults(validationResult, validationOutputDir);

  if (!validationResult.passed) {
    console.log('\n❌ Validation failed! Stopping pipeline.');
    console.log('   Model will not be saved.');
    process.exit(1);
  }

  console.log('✅ Validation passed!\n');

  // Step 5: Save versioned model
  console.log('Step 5: Saving versioned model...');
  const version = '2.0.0';
  const versionedDir = await saveVersionedModel(
    trainedModel,
    testResult,
    validationResult,
    OUTPUT_DIR,
    version
  );

  // Copy test and validation results to versioned directory
  const testMetricsSrc = path.join(testOutputDir, 'test_metrics.json');
  const testReportSrc = path.join(testOutputDir, 'test_report.md');
  const validationMetricsSrc = path.join(validationOutputDir, 'validation_metrics.json');
  const validationReportSrc = path.join(validationOutputDir, 'validation_report.md');

  fs.copyFileSync(testMetricsSrc, path.join(versionedDir, 'test_metrics.json'));
  fs.copyFileSync(testReportSrc, path.join(versionedDir, 'test_report.md'));
  fs.copyFileSync(validationMetricsSrc, path.join(versionedDir, 'validation_metrics.json'));
  fs.copyFileSync(validationReportSrc, path.join(versionedDir, 'validation_report.md'));

  // Clean up temp directories
  fs.rmSync(testOutputDir, { recursive: true, force: true });
  fs.rmSync(validationOutputDir, { recursive: true, force: true });

  console.log('\n' + '='.repeat(60));
  console.log('Pipeline Complete!');
  console.log('='.repeat(60));
  console.log(`Model saved to: ${versionedDir}`);
  console.log(`Version: ${version}`);
  console.log(`Test: ${testResult.passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Validation: ${validationResult.passed ? '✅ PASSED' : '❌ FAILED'}`);
}

// Run pipeline unconditionally in bundled entry
main().catch(error => {
  console.error('Pipeline failed:', error);
  process.exit(1);
});

export { main as runPipeline };

