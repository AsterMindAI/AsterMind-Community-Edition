/**
 * Quickstart example for OmegaSynth
 * Demonstrates how to use the pretrained model
 * 
 * This example shows how customers would use the installed @astermind/astermind-synth package.
 * After installing: npm install @astermind/astermind-synth
 * 
 * Note: TypeScript may show errors here during development, but these imports
 * will work correctly when customers install the package.
 */

import { 
  OmegaSynth, 
  loadPretrained, 
  getPretrainedLabels, 
  setLicenseTokenFromString,
  type LabeledSample 
} from '../synth/index.js';

// Set your license token once before using OmegaSynth
// Option 1: Set via environment variable (recommended)
//   export ASTERMIND_LICENSE_TOKEN="your-license-token-here"
// Option 2: Set programmatically once at application startup (example below)
async function setupLicense() {
  // Replace with your actual license token
  // Note: This only needs to be called once per application - the license runtime is a singleton
  const licenseToken = process.env.ASTERMIND_LICENSE_TOKEN || 'your-license-token-here';
  if (licenseToken && licenseToken !== 'your-license-token-here') {
    await   }
}

/**
 * Example 1: Using pretrained model in retrieval mode
 */
export async function examplePretrainedRetrieval() {
  console.log('=== Example 1: Pretrained Retrieval Mode ===');
  
  const synth = loadPretrained('retrieval');
  
  // Wait a bit for training to complete (in real usage, use await)
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const firstName = await synth.generate('first_name');
  const lastName = await synth.generate('last_name');
  const email = await synth.generate('email');
  
  console.log(`Generated: ${firstName} ${lastName} - ${email}`);
  console.log(`Available labels: ${getPretrainedLabels().join(', ')}`);
}

/**
 * Example 2: Using pretrained model in hybrid mode
 */
export async function examplePretrainedHybrid() {
  console.log('=== Example 2: Pretrained Hybrid Mode ===');
  
  const synth = loadPretrained('hybrid', { maxLength: 50, seed: 42 });
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const batch = await synth.generateBatch('phone_number', 5);
  console.log('Generated phone numbers:', batch);
}

/**
 * Example 3: Training custom model
 */
export async function exampleCustomTraining() {
  console.log('=== Example 3: Custom Training ===');
  
  const customData: LabeledSample[] = [
    { label: 'product', value: 'Widget A' },
    { label: 'product', value: 'Widget B' },
    { label: 'product', value: 'Widget C' },
    { label: 'category', value: 'Electronics' },
    { label: 'category', value: 'Clothing' },
  ];
  
  const synth = new OmegaSynth({
    mode: 'retrieval',
    maxLength: 20,
  });
  
  await synth.train(customData);
  
  const product = await synth.generate('product');
  const category = await synth.generate('category');
  
  console.log(`Generated: ${product} in ${category}`);
}

/**
 * Example 4: Deterministic generation with seed
 */
export async function exampleDeterministic() {
  console.log('=== Example 4: Deterministic Generation ===');
  
  const synth = loadPretrained('retrieval', { seed: 123 });
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Same seed should produce same results (in retrieval mode)
  const result1 = await synth.generate('first_name');
  const result2 = await synth.generate('first_name');
  
  console.log(`Result 1: ${result1}`);
  console.log(`Result 2: ${result2}`);
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  // Set license token once at the start (license runtime is a singleton)
  // If using environment variable, this step is optional
  await setupLicense();
  
  try {
    await examplePretrainedRetrieval();
    console.log('\n');
    
    await examplePretrainedHybrid();
    console.log('\n');
    
    await exampleCustomTraining();
    console.log('\n');
    
    await exampleDeterministic();
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// If running directly
if (require.main === module) {
  runAllExamples();
}


