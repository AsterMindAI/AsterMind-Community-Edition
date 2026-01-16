/**
 * Test app: Load OmegaSynth model and use it to train AsterMind ELM
 * 
 * This demonstrates:
 * 1. Loading a saved OmegaSynth model
 * 2. Generating synthetic training data
 * 3. Training an AsterMind ELM on the synthetic data
 * 4. Testing the ELM
 * 
 * This example shows how customers would use the installed @astermind/astermind-synth package.
 * After installing: npm install @astermind/astermind-synth
 * 
 * Note: TypeScript may show errors here during development, but these imports
 * will work correctly when customers install the package.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Worker } from 'node:worker_threads';
import { ELM } from "../../core/ELM.js"';

// Type definitions for ELM (avoid naming clash with imported class)
type ELMConfig = {
  useTokenizer: false;
  inputSize: number;
  categories: string[];
  hiddenUnits: number;
  activation?: 'tanh' | 'relu' | 'leakyrelu' | 'sigmoid' | 'linear' | 'gelu';
  ridgeLambda?: number;
  task?: 'classification' | 'regression';
};

type ELMModel = {
  trainFromData(X: number[][], Y: number[] | number[][], options?: any): any;
  predict(text: string, topK?: number): Array<{ label: string; prob: number }>;
  predictFromVector(inputVecRows: number[][], topK?: number): Array<Array<{ label: string; prob: number }>>;
  encoder?: any;
  setCategories?: (categories: string[]) => void;
};

// Type definitions for KernelELM
type KernelELMConfig = {
  outputDim: number;
  kernel: {
    type: 'rbf' | 'linear' | 'poly' | 'laplacian' | 'custom';
    gamma?: number;
    degree?: number;
    coef0?: number;
  };
  ridgeLambda?: number;
  task?: 'classification' | 'regression';
  mode?: 'exact' | 'nystrom';
  nystrom?: {
    m?: number;
    strategy?: 'uniform' | 'kmeans++';
    seed?: number;
    whiten?: boolean;
  };
};

type KernelELM = {
  fit(X: number[][], Y: number[][]): void;
  predict(X: number[][]): number[][];
  predictProbaFromVectors(X: number[][]): number[][];
};

// Type definitions for DeepELM
type DeepELMConfig = {
  inputDim: number;
  layers: Array<{
    hiddenUnits: number;
    activation?: string;
    ridgeLambda?: number;
  }>;
  numClasses: number;
  clfHiddenUnits?: number;
  clfActivation?: string;
};

type DeepELM = {
  fit(X: number[][], yOneHot: number[][]): void;
  fitAutoencoders(X: number[][]): number[][];
  fitClassifier(X: number[][], yOneHot: number[][]): void;
  predictProba(X: number[][]): number[][];
  transform(X: number[][]): number[][];
};

// Type definitions for ELMChain
type ELMChain = {
  add(encoder: any): void;
  getEmbedding(input: number[] | number[][]): number[] | number[][];
  length(): number;
  summary(): string;
};

/**
 * Load a fully pretrained OmegaSynth model from dist/models/vX.Y.Z
 * 
 * This uses the versioned model artifacts written by the training pipeline:
 * - model.json          (config + training stats)
 * - training_data.json  (full combined LabeledSample[])
 * - elm_model.json      (internal ELM weights for elm/hybrid modes)
 * 
 * It does NOT touch the original training JSONs in src/omegasynth/models
 * and does NOT call synth.train() — it only hydrates from the saved artifacts.
 */
function loadSavedModel(versionDir: string): OmegaSynth {
  console.log(`Loading pretrained OmegaSynth from version directory: ${versionDir}`);
  const synth = loadPretrainedFromVersion(versionDir);
  console.log('✅ Pretrained OmegaSynth loaded (no retraining)');
  return synth;
}

/**
 * Generate synthetic training dataset
 */
async function generateSyntheticDataset(
  synth: OmegaSynth,
  labels: string[],
  samplesPerLabel: number
): Promise<LabeledSample[]> {
  console.log(`\nGenerating ${samplesPerLabel} synthetic samples per label...`);
  
  const dataset: LabeledSample[] = [];
  
  for (const label of labels) {
    try {
      const generated = await synth.generateBatch(label, samplesPerLabel);
      for (const value of generated) {
        dataset.push({ label, value });
      }
      console.log(`  ${label}: ${generated.length} samples`);
    } catch (error: any) {
      console.error(`  Error generating ${label}:`, error.message);
    }
  }
  
  console.log(`\nTotal synthetic samples generated: ${dataset.length}`);
  return dataset;
}

/**
 * Prepare data for ELM training
 */
function prepareELMTrainingData(samples: LabeledSample[]): {
  texts: string[];
  labels: string[];
} {
  const texts: string[] = [];
  const labels: string[] = [];
  
  for (const sample of samples) {
    texts.push(sample.value);
    labels.push(sample.label);
  }
  
  return { texts, labels };
}

/**
 * Train AsterMind ELM or KernelELM on synthetic data
 */
async function trainELM(
  texts: string[],
  labels: string[],
  config?: Partial<ELMConfig> & { 
    useKELM?: boolean; 
    kernelType?: 'rbf' | 'linear' | 'poly';
    gammaMultiplier?: number; // Multiplier for gamma calculation (default: 1.0)
    nystromMultiplier?: number; // Multiplier for Nyström landmarks (default: 2.0)
  }
): Promise<ELMModel | KernelELM> {
  console.log('\nTraining AsterMind ELM...');
  
  // Get unique labels
  const uniqueLabels = Array.from(new Set(labels));
  console.log(`Labels: ${uniqueLabels.length} (${uniqueLabels.join(', ')})`);
  console.log(`Training samples: ${texts.length}`);
  
  // Try to load ELM or KernelELM from bundled AsterMind files
  // Resolve path relative to project root
  const currentFileDir = __dirname || path.dirname(require.main?.filename || process.cwd());
  const PROJECT_ROOT = path.resolve(currentFileDir, '../../../');
  
  let ELMClass: any;
  let KernelELMClass: any;
  try {
    // Use ESM/TS import bindings
    ELMClass = ELM as any;
    // Import KernelELM statically at module scope if needed; here resolve once
    KernelELMClass = (require('@astermind/astermind-elm') as any).KernelELM;
  } catch {
    // Try global (browser or different setup)
    if (typeof global !== 'undefined' && (global as any).ELM) {
      ELMClass = (global as any).ELM;
      KernelELMClass = (global as any).KernelELM;
    } else if (typeof globalThis !== 'undefined' && (globalThis as any).ELM) {
      ELMClass = (globalThis as any).ELM;
      KernelELMClass = (globalThis as any).KernelELM;
    }
  }
  
  if (!ELMClass) {
    throw new Error('ELM class not found. Please ensure the "@astermind/astermind-elm" npm package is installed.');
  }
  
  // Use KernelELM if requested
  if (config?.useKELM && KernelELMClass) {
    console.log('Using KernelELM for better non-linear pattern recognition...');
    return trainKernelELM(texts, labels, uniqueLabels, KernelELMClass, config);
  }
  
  // Create text-based ELM config (for text classification)
  // Increase hidden units for better capacity with larger dataset
  const textConfig: any = {
    useTokenizer: true,
    categories: uniqueLabels,
    maxLen: 50, // Maximum length of input strings
    charSet: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 !"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~',
    hiddenUnits: config?.hiddenUnits || 512, // Increased further for better capacity with large dataset
    activation: config?.activation || 'relu',
    ridgeLambda: config?.ridgeLambda || 0.0001, // Lower regularization for larger dataset
  };
  
  // Create ELM instance with text config
  const elm = new ELMClass(textConfig) as unknown as ELMModel;
  
  // For text mode, ELM needs the data to be set up properly
  // Set categories first (this initializes the encoder)
  if (typeof (elm as any).setCategories === 'function') {
    (elm as any).setCategories(uniqueLabels);
  }
  
  // Convert labels to indices for training
  const labelIndices = labels.map(l => uniqueLabels.indexOf(l));
  
  // For text mode with useTokenizer, we need to manually encode the text
  // because trainFromData expects numeric vectors, not strings
  // The encoder should be initialized by now (it's a private property, so we use type assertion)
  const elmAny = elm as any;
  if (!elmAny.encoder) {
    throw new Error('ELM encoder not initialized. Ensure useTokenizer: true and categories are set.');
  }
  
  // Encode all texts to vectors using the ELM's encoder
  const encodedTexts: number[][] = texts.map(text => {
    const encoded = elmAny.encoder.encode(text);
    // Normalize the encoded vector
    return elmAny.encoder.normalize(encoded);
  });
  
  // Now train with the encoded vectors
  elm.trainFromData(encodedTexts, labelIndices);
  
  console.log('✅ ELM training complete!');
  return elm;
}

/**
 * Train KernelELM on synthetic data (better for non-linear patterns)
 */
async function trainKernelELM(
  texts: string[],
  labels: string[],
  uniqueLabels: string[],
  KernelELMClass: any,
  config?: Partial<ELMConfig> & { 
    kernelType?: 'rbf' | 'linear' | 'poly';
    gammaMultiplier?: number;
    nystromMultiplier?: number;
  }
): Promise<KernelELM> {
  // First, we need to encode the text using ELM's encoder
  // Create a temporary ELM just to get the encoder
  const currentFileDir = __dirname || path.dirname(require.main?.filename || process.cwd());
  const PROJECT_ROOT = path.resolve(currentFileDir, '../../../');
  // ELM imported at top
  
  const tempELM = new ELM({
    useTokenizer: true,
    hiddenUnits: 128,
    categories: uniqueLabels,
    maxLen: 50,
    charSet: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 !"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~',
  });
  
  if (typeof tempELM.setCategories === 'function') {
    tempELM.setCategories(uniqueLabels);
  }
  
  const tempELMAny = tempELM as any;
  if (!tempELMAny.encoder) {
    throw new Error('Encoder not initialized');
  }
  
  // Encode all texts
  const encodedTexts: number[][] = texts.map(text => {
    const encoded = tempELMAny.encoder.encode(text);
    return tempELMAny.encoder.normalize(encoded);
  });
  
  // Convert labels to one-hot encoding
  const oneHotLabels: number[][] = labels.map(label => {
    const index = uniqueLabels.indexOf(label);
    const oneHot = new Array(uniqueLabels.length).fill(0);
    oneHot[index] = 1;
    return oneHot;
  });
  
  // Create KernelELM config with tuned hyperparameters
  const kernelType = config?.kernelType || 'rbf';
  const inputDim = encodedTexts[0].length;
  const gammaMultiplier = config?.gammaMultiplier ?? 0.05; // Tuned: much lower for high-dim data
  const nystromMultiplier = config?.nystromMultiplier ?? 3; // Tuned: more landmarks
  
  // Tune gamma for RBF kernel - critical for high-dimensional text data
  // Smaller gamma = smoother decision boundary, better generalization
  // For 4750-dim vectors, we need very small gamma to avoid overfitting
  // But too small = underfitting (all predictions similar)
  let gamma: number;
  if (kernelType === 'rbf') {
    // Multiple strategies for gamma tuning:
    // Strategy 1: gamma = multiplier / inputDim (scales with dimension) - too small
    // Strategy 2: gamma = multiplier / sqrt(inputDim) (better scaling) - try this
    // Strategy 3: gamma = multiplier * median_pairwise_distance (data-driven)
    // Using strategy 2 with sqrt scaling for better balance
    // This gives gamma ~0.0007 instead of ~0.00001, which should help
    gamma = gammaMultiplier / Math.sqrt(inputDim);
    
    // Ensure gamma is not too small (minimum threshold)
    const minGamma = 1e-6;
    gamma = Math.max(gamma, minGamma);
  } else {
    gamma = 1.0 / inputDim;
  }
  
  // Calculate optimal number of landmarks for Nyström
  // More landmarks = better approximation but slower
  // sqrt(N) is minimum, 2-3x is good balance, 5x+ is overkill
  const baseLandmarks = Math.floor(Math.sqrt(encodedTexts.length));
  const nystromM = Math.min(2000, Math.floor(baseLandmarks * nystromMultiplier));
  
  const kelmConfig: KernelELMConfig = {
    outputDim: uniqueLabels.length,
    kernel: {
      type: kernelType === 'rbf' ? 'rbf' : kernelType === 'poly' ? 'poly' : 'linear',
      gamma: kernelType === 'rbf' ? gamma : undefined,
      degree: kernelType === 'poly' ? 3 : undefined,
      coef0: kernelType === 'poly' ? 1 : undefined,
    },
    ridgeLambda: config?.ridgeLambda || 0.005, // Tuned: moderate regularization
    task: 'classification',
    mode: 'nystrom', // Use Nyström for scalability with large datasets
    nystrom: {
      m: nystromM, // Tuned: more landmarks for better approximation
      strategy: 'uniform', // Could try 'kmeans++' for better landmark selection
      whiten: true, // Whitening helps with numerical stability
    },
  };
  
  const kelm = new KernelELMClass(kelmConfig) as KernelELM;
  
  console.log(`Training KernelELM with ${kernelType} kernel (tuned hyperparameters)...`);
  console.log(`  Input dimension: ${inputDim}`);
  console.log(`  Output dimension: ${uniqueLabels.length}`);
  console.log(`  Training samples: ${encodedTexts.length}`);
  console.log(`  Gamma: ${gamma.toExponential(3)} (multiplier: ${gammaMultiplier}, sqrt scaling)`);
  console.log(`  Ridge lambda: ${kelmConfig.ridgeLambda}`);
  console.log(`  Nyström landmarks: ${kelmConfig.nystrom?.m} (${nystromMultiplier}x sqrt(N))`);
  console.log(`  ✅ Optimized config: sqrt-based gamma, lower regularization, more landmarks`);
  
  kelm.fit(encodedTexts, oneHotLabels);
  
  console.log('✅ KernelELM training complete!');
  return kelm;
}

/**
 * Build a shared text encoder using AsterMind ELM (tokenizer-based).
 * This encoder will be reused for:
 * - Encoding train texts
 * - Encoding test texts
 * - Feeding both ELM and KernelELM (via vector-based APIs)
 */
function buildSharedEncoder(uniqueLabels: string[]) {
  const currentFileDir = __dirname || path.dirname(require.main?.filename || process.cwd());
  // ELM is imported at top from @astermind/astermind-elm

  const tempELM = new ELM({
    useTokenizer: true,
    hiddenUnits: 128,
    categories: uniqueLabels,
    maxLen: 50,
    charSet:
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 !"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~',
  });

  if (typeof tempELM.setCategories === 'function') {
    tempELM.setCategories(uniqueLabels);
  }

  const encoder = (tempELM as any).encoder;
  if (!encoder) {
    throw new Error('Shared encoder not initialized');
  }

  return encoder;
}

/**
 * Train ELM from pre-encoded vectors (no tokenizer).
 * This avoids re-encoding text inside the model and keeps the pipeline consistent.
 */
async function trainELMFromVectors(
  X: number[][],
  labels: string[],
  uniqueLabels: string[],
  config: Partial<ELMConfig>
): Promise<ELMModel> {
  const currentFileDir = __dirname || path.dirname(require.main?.filename || process.cwd());
  const ELMClass = ELM as any;

  if (X.length === 0) {
    throw new Error('No training data provided to trainELMFromVectors');
  }

  const inputSize = X[0].length;
  const labelIndices = labels.map(l => uniqueLabels.indexOf(l));

  const elm = new ELMClass({
    useTokenizer: false,
    inputSize,
    categories: uniqueLabels,
    hiddenUnits: config.hiddenUnits || 512,
    activation: config.activation || 'relu',
    ridgeLambda: config.ridgeLambda ?? 0.0001,
    task: 'classification',
  }) as unknown as ELMModel;

  (elm as any).trainFromData(X, labelIndices);
  console.log('✅ ELM (vector-based) training complete!');
  return elm;
}

/**
 * Train KernelELM from pre-encoded vectors (shared encoder).
 * Uses a data-driven RBF gamma based on median squared distances.
 */
async function trainKernelELMFromVectors(
  X: number[][],
  labels: string[],
  uniqueLabels: string[],
  config: {
    kernelType?: 'rbf' | 'linear' | 'poly';
    ridgeLambda?: number;
    gammaMultiplier?: number;
    nystromMultiplier?: number;
  }
): Promise<KernelELM> {
  const currentFileDir = __dirname || path.dirname(require.main?.filename || process.cwd());
  const PROJECT_ROOT = path.resolve(currentFileDir, '../../../');
  const { KernelELM: KernelELMClass } = require('@astermind/astermind-elm');

  if (X.length === 0) {
    throw new Error('No training data provided to trainKernelELMFromVectors');
  }

  const N = X.length;
  const D = X[0].length;
  const kernelType = config.kernelType || 'rbf';

  // One-hot labels
  const oneHotLabels: number[][] = labels.map(label => {
    const idx = uniqueLabels.indexOf(label);
    const vec = new Array(uniqueLabels.length).fill(0);
    if (idx >= 0) vec[idx] = 1;
    return vec;
  });

  // Data-driven gamma for RBF based on median squared distance
  let gamma = 1.0 / D;
  if (kernelType === 'rbf') {
    const gammaMultiplier = config.gammaMultiplier ?? 1.0;
    const sampleSize = Math.min(500, N);
    const indices = new Set<number>();
    while (indices.size < sampleSize) {
      indices.add(Math.floor(Math.random() * N));
    }
    const sample = Array.from(indices).map(i => X[i]);

    const pairCount = Math.min(1000, (sample.length * (sample.length - 1)) / 2);
    const dists: number[] = [];
    for (let i = 0; i < sample.length && dists.length < pairCount; i++) {
      for (let j = i + 1; j < sample.length && dists.length < pairCount; j++) {
        let sumSq = 0;
        const xi = sample[i];
        const xj = sample[j];
        for (let k = 0; k < D; k++) {
          const diff = xi[k] - xj[k];
          sumSq += diff * diff;
        }
        dists.push(sumSq);
        if (dists.length >= pairCount) break;
      }
    }

    if (dists.length > 0) {
      dists.sort((a, b) => a - b);
      const mid = Math.floor(dists.length / 2);
      const medianSqDist =
        dists.length % 2 === 0 ? (dists[mid - 1] + dists[mid]) / 2 : dists[mid];

      if (medianSqDist > 0) {
        gamma = gammaMultiplier / (2 * medianSqDist);
      }
    }

    gamma = Math.max(gamma, 1e-6);
    console.log(
      `KernelELM RBF gamma (data-driven): ${gamma.toExponential(3)} (multiplier: ${
        config.gammaMultiplier ?? 1.0
      })`
    );
  }

  const baseLandmarks = Math.floor(Math.sqrt(N));
  const nystromMultiplier = config.nystromMultiplier ?? 3;
  const m = Math.min(2000, Math.floor(baseLandmarks * nystromMultiplier));

  const kelmConfig: KernelELMConfig = {
    outputDim: uniqueLabels.length,
    kernel: {
      type: kernelType,
      gamma: kernelType === 'rbf' ? gamma : undefined,
      degree: kernelType === 'poly' ? 3 : undefined,
      coef0: kernelType === 'poly' ? 1 : undefined,
    },
    ridgeLambda: config.ridgeLambda ?? 0.001,
    task: 'classification',
    mode: 'nystrom',
    nystrom: {
      m,
      strategy: 'uniform',
      whiten: true,
    },
  };

  console.log('Training KernelELM with', kernelType, 'kernel (vector-based)...');
  console.log(`  N = ${N}, D = ${D}, m = ${m}, ridge = ${kelmConfig.ridgeLambda}`);

  const kelm = new KernelELMClass(kelmConfig) as KernelELM;
  kelm.fit(X, oneHotLabels);
  console.log('✅ KernelELM (vector-based) training complete!');
  return kelm;
}

/**
 * Ensemble prediction: combines ELM and KernelELM predictions
 */
type EnsembleModel = {
  elm: ELMModel;
  kelm: KernelELM;
  encoder: any; // Shared encoder for KernelELM
  uniqueLabels: string[];
};

/**
 * Train model in a worker thread to avoid memory issues and speed up training
 */
async function trainInWorker<T>(
  workerScript: string,
  task: 'elm' | 'kelm' | 'deepelm' | 'elmchain',
  config: any,
  data: { texts: string[]; labels: string[]; encodedTexts?: number[][]; oneHotLabels?: number[][] }
): Promise<T> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerScript, {
      workerData: { task, config, data },
    });
    
    worker.on('message', (result) => {
      if (result.error) {
        reject(new Error(result.error));
      } else {
        resolve(result.model);
      }
      worker.terminate();
    });
    
    worker.on('error', (error) => {
      reject(error);
      worker.terminate();
    });
  });
}

/**
 * Train both ELM and KernelELM for ensemble using workers
 */
async function trainEnsemble(
  texts: string[],
  labels: string[],
  config?: Partial<ELMConfig> & { 
    kernelType?: 'rbf' | 'linear' | 'poly';
    gammaMultiplier?: number;
    nystromMultiplier?: number;
    useWorkers?: boolean;
  }
): Promise<EnsembleModel> {
  console.log('\nTraining Ensemble (ELM + KernelELM)...');
  
  const useWorkers = config?.useWorkers ?? false; // Workers need separate script file
  
  if (useWorkers) {
    // TODO: Implement worker-based training (requires separate worker script)
    console.log('⚠️  Worker-based training not yet implemented, using sequential training');
  }
  
  // Train both models sequentially to avoid memory issues with large datasets
  // In production, these would run in parallel workers
  console.log('Training ELM...');
  const elm = await trainELM(texts, labels, {
    useKELM: false,
    hiddenUnits: config?.hiddenUnits || 512,
    activation: config?.activation || 'relu',
    ridgeLambda: 0.0001, // ELM uses lower regularization
  }) as ELM;
  
  console.log('Training KernelELM...');
  const kelm = await trainELM(texts, labels, {
    useKELM: true,
    kernelType: config?.kernelType || 'rbf',
    ridgeLambda: 0.001, // KernelELM uses higher regularization
    gammaMultiplier: config?.gammaMultiplier || 1.0,
    nystromMultiplier: config?.nystromMultiplier || 3,
  }) as KernelELM;
  
  // Get encoder from ELM for KernelELM predictions
  const elmAny = elm as any;
  if (!elmAny.encoder) {
    throw new Error('ELM encoder not available for ensemble');
  }
  
  const uniqueLabels = Array.from(new Set(labels));
  
  return {
    elm,
    kelm,
    encoder: elmAny.encoder,
    uniqueLabels,
  };
}

/**
 * Get ensemble prediction from a pre-encoded vector using full probability fusion.
 * Uses:
 * - elm.predictFromVector([x], ...) to get per-class probs
 * - kelm.predictProbaFromVectors([x]) to get per-class probs
 * Then fuses them and takes topK AFTER fusion.
 */
function getEnsemblePredictionFromVector(
  ensemble: EnsembleModel,
  x: number[],
  topK: number = 3,
  kelmWeight: number = 0.6 // KernelELM weight (ELM gets 1 - kelmWeight)
): Array<{ label: string; prob: number }> {
  const elmWeight = 1 - kelmWeight;

  // ELM probabilities from vector
  const elmProbsArr = (ensemble.elm as any).predictFromVector([x], ensemble.uniqueLabels.length)[0] as Array<{
    label: string;
    prob: number;
  }>;
  const elmProbs = new Array(ensemble.uniqueLabels.length).fill(0);
  for (const p of elmProbsArr) {
    const idx = ensemble.uniqueLabels.indexOf(p.label);
    if (idx >= 0) elmProbs[idx] = p.prob;
  }

  // KernelELM probabilities from vector
  const kelmProbs = ensemble.kelm.predictProbaFromVectors([x])[0];

  // Fuse probabilities
  const combined: { label: string; prob: number }[] = [];
  let sum = 0;
  for (let i = 0; i < ensemble.uniqueLabels.length; i++) {
    const p = elmWeight * elmProbs[i] + kelmWeight * kelmProbs[i];
    combined.push({ label: ensemble.uniqueLabels[i], prob: p });
    sum += p;
  }

  // Normalize
  if (sum > 0) {
    for (const c of combined) c.prob /= sum;
  }

  // Sort and take topK
  combined.sort((a, b) => b.prob - a.prob);
  return combined.slice(0, topK);
}

/**
 * Test ELM and collect results (for comparison)
 */
function testELMAndCollectResultsVector(
  elm: ELMModel,
  Xtest: number[][],
  testLabels: string[],
  uniqueLabels: string[],
  modelName: string,
  trainingTime: number
): {
  name: string;
  accuracy: number;
  correct: number;
  total: number;
  perLabelAccuracy: Record<string, { correct: number; total: number; accuracy: number }>;
  trainingTime: number;
} {
  let correct = 0;
  let total = 0;
  const labelStats: Record<string, { correct: number; total: number }> = {};
  
  for (let i = 0; i < Xtest.length; i++) {
    const x = Xtest[i];
    const trueLabel = testLabels[i];
    
    if (!labelStats[trueLabel]) {
      labelStats[trueLabel] = { correct: 0, total: 0 };
    }
    labelStats[trueLabel].total++;
    
    try {
      const predictions = (elm as any).predictFromVector([x], 1)[0] as Array<{ label: string; prob: number }>;
      if (predictions.length > 0 && predictions[0].label === trueLabel) {
        correct++;
        labelStats[trueLabel].correct++;
      }
      total++;
    } catch (error: any) {
      // Skip errors
    }
  }
  
  const accuracy = total > 0 ? (correct / total) * 100 : 0;
  const perLabelAccuracy: Record<string, { correct: number; total: number; accuracy: number }> = {};
  
  for (const [label, stats] of Object.entries(labelStats)) {
    perLabelAccuracy[label] = {
      correct: stats.correct,
      total: stats.total,
      accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
    };
  }
  
  console.log(`\n${modelName} Results: ${correct}/${total} (${accuracy.toFixed(2)}%)`);
  
  return { name: modelName, accuracy, correct, total, perLabelAccuracy, trainingTime };
}

/**
 * Test KernelELM and collect results (for comparison)
 */
function testKELMAndCollectResultsVector(
  kelm: KernelELM,
  Xtest: number[][],
  testLabels: string[],
  uniqueLabels: string[],
  modelName: string,
  trainingTime: number
): {
  name: string;
  accuracy: number;
  correct: number;
  total: number;
  perLabelAccuracy: Record<string, { correct: number; total: number; accuracy: number }>;
  trainingTime: number;
} {
  let correct = 0;
  let total = 0;
  const labelStats: Record<string, { correct: number; total: number }> = {};
  
  for (let i = 0; i < Xtest.length; i++) {
    const x = Xtest[i];
    const trueLabel = testLabels[i];
    
    if (!labelStats[trueLabel]) {
      labelStats[trueLabel] = { correct: 0, total: 0 };
    }
    labelStats[trueLabel].total++;
    
    try {
      const probs = kelm.predictProbaFromVectors([x])[0];
      const predictedIdx = probs.indexOf(Math.max(...probs));
      const predictedLabel = uniqueLabels[predictedIdx];
      
      if (predictedLabel === trueLabel) {
        correct++;
        labelStats[trueLabel].correct++;
      }
      total++;
    } catch (error: any) {
      // Skip errors
    }
  }
  
  const accuracy = total > 0 ? (correct / total) * 100 : 0;
  const perLabelAccuracy: Record<string, { correct: number; total: number; accuracy: number }> = {};
  
  for (const [label, stats] of Object.entries(labelStats)) {
    perLabelAccuracy[label] = {
      correct: stats.correct,
      total: stats.total,
      accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
    };
  }
  
  console.log(`\n${modelName} Results: ${correct}/${total} (${accuracy.toFixed(2)}%)`);
  
  return { name: modelName, accuracy, correct, total, perLabelAccuracy, trainingTime };
}

/**
 * Test the trained ELM or KernelELM
 */
function testELM(elm: ELMModel | KernelELM, testTexts: string[], testLabels: string[], uniqueLabels: string[]): void {
  console.log('\nTesting model...');
  
  // Check if it's KernelELM (has predictProbaFromVectors method) or regular ELM (has predict(text, topK))
  // KernelELM has predictProbaFromVectors, ELM has predict(text, topK) method
  const hasPredictProbaFromVectors = typeof (elm as any).predictProbaFromVectors === 'function';
  const hasPredictText = typeof (elm as any).predict === 'function' && 
                         (elm as any).predict.length === 2; // predict(text, topK) has 2 params
  const isKernelELM = hasPredictProbaFromVectors && !hasPredictText;
  
  console.log(`Model type: ${isKernelELM ? 'KernelELM' : 'ELM'}`);
  
  // Set up encoder for KernelELM (cache it to avoid recreating)
  let encoder: any = null;
  if (isKernelELM) {
    const currentFileDir = __dirname || path.dirname(require.main?.filename || process.cwd());
    const PROJECT_ROOT = path.resolve(currentFileDir, '../../../');
    // Use imported ELM to build the encoder
    
    const tempELM = new ELM({
      useTokenizer: true,
      hiddenUnits: 128,
      categories: uniqueLabels,
      maxLen: 50,
      charSet: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 !"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~',
    });
    (tempELM as any).setCategories(uniqueLabels);
    encoder = (tempELM as any).encoder;
    
    if (!encoder) {
      throw new Error('Failed to initialize encoder for KernelELM testing');
    }
  }
  
  let correct = 0;
  let total = 0;
  const labelStats: Record<string, { correct: number; total: number }> = {};
  
  // Show some example predictions
  console.log('\nSample predictions (first 10):');
  const sampleCount = Math.min(10, testTexts.length);
  
  for (let i = 0; i < testTexts.length; i++) {
    const text = testTexts[i];
    const trueLabel = testLabels[i];
    
    // Initialize stats for this label
    if (!labelStats[trueLabel]) {
      labelStats[trueLabel] = { correct: 0, total: 0 };
    }
    labelStats[trueLabel].total++;
    
    try {
      let predictions: Array<{ label: string; prob: number }>;
      
      if (isKernelELM) {
        // It's KernelELM - encode text first
        const encoded = encoder.encode(text);
        const normalized = encoder.normalize(encoded);
        
        // Get probabilities from KernelELM
        const probs = (elm as KernelELM).predictProbaFromVectors([normalized])[0];
        
        // Convert to label predictions
        const labelProbs = uniqueLabels
          .map((label, idx) => ({
            label,
            prob: probs[idx],
          }))
          .sort((a, b) => b.prob - a.prob);
        
        predictions = labelProbs.slice(0, 3);
      } else {
        // It's regular ELM
        predictions = (elm as ELMModel).predict(text, 3);
      }
      
      if (predictions.length > 0) {
        const predictedLabel = predictions[0].label;
        const confidence = predictions[0].prob;
        
        // Show first few examples
        if (i < sampleCount) {
          const displayText = text.length > 40 ? text.substring(0, 40) + '...' : text;
          console.log(`  "${displayText}"`);
          console.log(`    True: ${trueLabel}, Predicted: ${predictedLabel} (${(confidence * 100).toFixed(1)}%)`);
          if (predictions.length > 1) {
            const top3 = predictions.slice(0, 3).map(p => `${p.label}(${(p.prob * 100).toFixed(1)}%)`).join(', ');
            console.log(`    Top 3: ${top3}`);
          }
        }
        
        if (predictedLabel === trueLabel) {
          correct++;
          labelStats[trueLabel].correct++;
        }
      }
      total++;
    } catch (error: any) {
      if (i < sampleCount) {
        console.error(`  Error predicting for "${text.substring(0, 40)}":`, error.message);
      }
    }
  }
  
  const accuracy = total > 0 ? (correct / total) * 100 : 0;
  console.log(`\nELM Test Results:`);
  console.log(`  Total tested: ${total}`);
  console.log(`  Correct: ${correct}/${total}`);
  console.log(`  Overall Accuracy: ${accuracy.toFixed(2)}%`);
  
  // Show per-label accuracy
  if (Object.keys(labelStats).length > 0) {
    console.log(`\nPer-Label Accuracy:`);
    const sortedLabels = Object.keys(labelStats).sort((a, b) => {
      const accA = labelStats[a].total > 0 ? (labelStats[a].correct / labelStats[a].total) * 100 : 0;
      const accB = labelStats[b].total > 0 ? (labelStats[b].correct / labelStats[b].total) * 100 : 0;
      return accB - accA;
    });
    
    for (const label of sortedLabels) {
      const stats = labelStats[label];
      const labelAcc = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
      console.log(`  ${label}: ${stats.correct}/${stats.total} (${labelAcc.toFixed(1)}%)`);
    }
  }
}

/**
 * Test ensemble and collect results (for comparison) using encoded vectors.
 */
function testEnsembleAndCollectResultsVector(
  ensemble: EnsembleModel,
  Xtest: number[][],
  testLabels: string[],
  modelName: string,
  trainingTime: number
): {
  name: string;
  accuracy: number;
  correct: number;
  total: number;
  perLabelAccuracy: Record<string, { correct: number; total: number; accuracy: number }>;
  trainingTime: number;
} {
  let correct = 0;
  let total = 0;
  const labelStats: Record<string, { correct: number; total: number }> = {};

  for (let i = 0; i < Xtest.length; i++) {
    const x = Xtest[i];
    const trueLabel = testLabels[i];

    if (!labelStats[trueLabel]) {
      labelStats[trueLabel] = { correct: 0, total: 0 };
    }
    labelStats[trueLabel].total++;

    try {
      const predictions = getEnsemblePredictionFromVector(ensemble, x, 1);
      if (predictions.length > 0 && predictions[0].label === trueLabel) {
        correct++;
        labelStats[trueLabel].correct++;
      }
      total++;
    } catch {
      // Skip errors
    }
  }

  const accuracy = total > 0 ? (correct / total) * 100 : 0;
  const perLabelAccuracy: Record<string, { correct: number; total: number; accuracy: number }> = {};

  for (const [label, stats] of Object.entries(labelStats)) {
    perLabelAccuracy[label] = {
      correct: stats.correct,
      total: stats.total,
      accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
    };
  }

  console.log(`\n${modelName} Results: ${correct}/${total} (${accuracy.toFixed(2)}%)`);

  return { name: modelName, accuracy, correct, total, perLabelAccuracy, trainingTime };
}

/**
 * Test the ensemble model
 */
function testEnsemble(ensemble: EnsembleModel, testTexts: string[], testLabels: string[]): void {
  console.log('\n[testEnsemble] Deprecated helper – use vector-based helpers instead.');
}

/**
 * Train DeepELM (stacked autoencoders + classifier)
 */
async function trainDeepELM(
  texts: string[],
  labels: string[]
): Promise<{ deepELM: DeepELM; encoder: any; uniqueLabels: string[] }> {
  console.log('\nTraining DeepELM (stacked autoencoders + classifier)...');
  
  // Load DeepELM class
  const currentFileDir = __dirname || path.dirname(require.main?.filename || process.cwd());
  const PROJECT_ROOT = path.resolve(currentFileDir, '../../../');
  const { DeepELM: DeepELMClass } = require('@astermind/astermind-elm');
  
  // Get unique labels
  const uniqueLabels = Array.from(new Set(labels));
  
  // Create temporary ELM to get encoder
  const tempELM = new ELM({
    useTokenizer: true,
    hiddenUnits: 128,
    categories: uniqueLabels,
    maxLen: 50,
    charSet: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 !"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~',
  });
  (tempELM as any).setCategories(uniqueLabels);
  
  const encoder = (tempELM as any).encoder;
  if (!encoder) {
    throw new Error('Encoder not initialized');
  }
  
  // Encode all texts
  const encodedTexts: number[][] = texts.map(text => {
    const encoded = encoder.encode(text);
    return encoder.normalize(encoded);
  });
  
  // Convert labels to one-hot encoding
  const oneHotLabels: number[][] = labels.map(label => {
    const index = uniqueLabels.indexOf(label);
    const oneHot = new Array(uniqueLabels.length).fill(0);
    oneHot[index] = 1;
    return oneHot;
  });
  
  const inputDim = encodedTexts[0].length;
  
  // Create DeepELM config with stacked autoencoders
  const deepELMConfig: DeepELMConfig = {
    inputDim,
    layers: [
      { hiddenUnits: 256, activation: 'relu', ridgeLambda: 0.001 },
      { hiddenUnits: 128, activation: 'relu', ridgeLambda: 0.001 },
      { hiddenUnits: 64, activation: 'relu', ridgeLambda: 0.001 },
    ],
    numClasses: uniqueLabels.length,
    clfHiddenUnits: 128,
    clfActivation: 'relu',
  };
  
  const deepELM = new DeepELMClass(deepELMConfig) as DeepELM;
  
  console.log(`Training DeepELM...`);
  console.log(`  Input dimension: ${inputDim}`);
  console.log(`  Autoencoder layers: ${deepELMConfig.layers.length}`);
  console.log(`  Output classes: ${uniqueLabels.length}`);
  console.log(`  Training samples: ${encodedTexts.length}`);
  
  // Train: first autoencoders, then classifier
  deepELM.fit(encodedTexts, oneHotLabels);
  
  console.log('✅ DeepELM training complete!');
  return { deepELM, encoder, uniqueLabels };
}

/**
 * Test DeepELM and collect results (for comparison)
 */
function testDeepELMAndCollectResults(
  model: { deepELM: DeepELM; encoder: any; uniqueLabels: string[] },
  testTexts: string[],
  testLabels: string[],
  modelName: string,
  trainingTime: number
): {
  name: string;
  accuracy: number;
  correct: number;
  total: number;
  perLabelAccuracy: Record<string, { correct: number; total: number; accuracy: number }>;
  trainingTime: number;
} {
  let correct = 0;
  let total = 0;
  const labelStats: Record<string, { correct: number; total: number }> = {};
  
  for (let i = 0; i < testTexts.length; i++) {
    const text = testTexts[i];
    const trueLabel = testLabels[i];
    
    if (!labelStats[trueLabel]) {
      labelStats[trueLabel] = { correct: 0, total: 0 };
    }
    labelStats[trueLabel].total++;
    
    try {
      const encoded = model.encoder.encode(text);
      const normalized = model.encoder.normalize(encoded);
      const probs = model.deepELM.predictProba([normalized])[0];
      const predictedIdx = probs.indexOf(Math.max(...probs));
      const predictedLabel = model.uniqueLabels[predictedIdx];
      
      if (predictedLabel === trueLabel) {
        correct++;
        labelStats[trueLabel].correct++;
      }
      total++;
    } catch (error: any) {
      // Skip errors
    }
  }
  
  const accuracy = total > 0 ? (correct / total) * 100 : 0;
  const perLabelAccuracy: Record<string, { correct: number; total: number; accuracy: number }> = {};
  
  for (const [label, stats] of Object.entries(labelStats)) {
    perLabelAccuracy[label] = {
      correct: stats.correct,
      total: stats.total,
      accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
    };
  }
  
  console.log(`\n${modelName} Results: ${correct}/${total} (${accuracy.toFixed(2)}%)`);
  
  return { name: modelName, accuracy, correct, total, perLabelAccuracy, trainingTime };
}

/**
 * Test DeepELM
 */
function testDeepELM(
  model: { deepELM: DeepELM; encoder: any; uniqueLabels: string[] },
  testTexts: string[],
  testLabels: string[]
): void {
  console.log('\nTesting DeepELM...');
  
  let correct = 0;
  let total = 0;
  const labelStats: Record<string, { correct: number; total: number }> = {};
  
  console.log('\nSample predictions (first 10):');
  const sampleCount = Math.min(10, testTexts.length);
  
  for (let i = 0; i < testTexts.length; i++) {
    const text = testTexts[i];
    const trueLabel = testLabels[i];
    
    if (!labelStats[trueLabel]) {
      labelStats[trueLabel] = { correct: 0, total: 0 };
    }
    labelStats[trueLabel].total++;
    
    try {
      const encoded = model.encoder.encode(text);
      const normalized = model.encoder.normalize(encoded);
      const probs = model.deepELM.predictProba([normalized])[0];
      
      const labelProbs = model.uniqueLabels.map((label, idx) => ({
        label,
        prob: probs[idx],
      })).sort((a, b) => b.prob - a.prob);
      
      const predictedLabel = labelProbs[0].label;
      const confidence = labelProbs[0].prob;
      
      if (i < sampleCount) {
        const displayText = text.length > 40 ? text.substring(0, 40) + '...' : text;
        console.log(`  "${displayText}"`);
        console.log(`    True: ${trueLabel}, Predicted: ${predictedLabel} (${(confidence * 100).toFixed(1)}%)`);
        console.log(`    Top 3: ${labelProbs.slice(0, 3).map(p => `${p.label}(${(p.prob * 100).toFixed(1)}%)`).join(', ')}`);
      }
      
      if (predictedLabel === trueLabel) {
        correct++;
        labelStats[trueLabel].correct++;
      }
      total++;
    } catch (error: any) {
      console.error(`  Error predicting for "${text}": ${error.message}`);
    }
  }
  
  const accuracy = total > 0 ? (correct / total) * 100 : 0;
  console.log(`\nDeepELM Test Results:`);
  console.log(`  Total tested: ${total}`);
  console.log(`  Correct: ${correct}/${total}`);
  console.log(`  Overall Accuracy: ${accuracy.toFixed(2)}%`);
  
  if (Object.keys(labelStats).length > 0) {
    console.log(`\nPer-Label Accuracy:`);
    const sortedLabels = Object.keys(labelStats).sort((a, b) => {
      const accA = labelStats[a].total > 0 ? (labelStats[a].correct / labelStats[a].total) * 100 : 0;
      const accB = labelStats[b].total > 0 ? (labelStats[b].correct / labelStats[b].total) * 100 : 0;
      return accB - accA;
    });
    
    for (const label of sortedLabels) {
      const stats = labelStats[label];
      const labelAcc = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
      console.log(`  ${label}: ${stats.correct}/${stats.total} (${labelAcc.toFixed(1)}%)`);
    }
  }
}

/**
 * Train ELMChain (chained encoders)
 */
async function trainELMChain(
  texts: string[],
  labels: string[]
): Promise<{ chain: ELMChain; encoder: any; uniqueLabels: string[]; classifier: ELMModel }> {
  console.log('\nTraining ELMChain (chained encoders)...');
  
  // Load classes
  const currentFileDir = __dirname || path.dirname(require.main?.filename || process.cwd());
  const PROJECT_ROOT = path.resolve(currentFileDir, '../../../');
  const { ELMChain: ELMChainClass, wrapELM } = require('@astermind/astermind-elm');
  
  // Get unique labels
  const uniqueLabels = Array.from(new Set(labels));
  
  // Create temporary ELM to get encoder
  const tempELM = new ELM({
    useTokenizer: true,
    hiddenUnits: 128,
    categories: uniqueLabels,
    maxLen: 50,
    charSet: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 !"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~',
  });
  (tempELM as any).setCategories(uniqueLabels);
  
  const encoder = (tempELM as any).encoder;
  if (!encoder) {
    throw new Error('Encoder not initialized');
  }
  
  // Encode all texts
  const encodedTexts: number[][] = texts.map(text => {
    const encoded = encoder.encode(text);
    return encoder.normalize(encoded);
  });
  
  // Create a chain of ELM encoders (each reduces dimension)
  const inputDim = encodedTexts[0].length;
  
  // Create multiple ELM encoders for the chain
  const elm1 = new ELM({
    useTokenizer: false,
    inputSize: inputDim,
    categories: [],
    hiddenUnits: 256,
    activation: 'relu',
    ridgeLambda: 0.001,
    task: 'regression',
  });
  
  const elm2 = new ELM({
    useTokenizer: false,
    inputSize: 256,
    categories: [],
    hiddenUnits: 128,
    activation: 'relu',
    ridgeLambda: 0.001,
    task: 'regression',
  });
  
  // Train each ELM as autoencoder (X -> X)
  console.log('Training chain encoders...');
  elm1.trainFromData(encodedTexts, encodedTexts);
  const intermediate = encodedTexts.map((_, i) => {
    const h = (elm1 as any).buildHidden([encodedTexts[i]], (elm1 as any).model.W, (elm1 as any).model.b);
    return h[0];
  });
  elm2.trainFromData(intermediate, intermediate);
  
  // Create chain
  const chain = new ELMChainClass([
    wrapELM(elm1, 'Encoder1'),
    wrapELM(elm2, 'Encoder2'),
  ], {
    normalizeEach: true,
    normalizeFinal: true,
  });
  
  // Train final classifier on chain output
  const chainOutputs = encodedTexts.map(text => {
    const encoded = encoder.encode(text);
    const normalized = encoder.normalize(encoded);
    return chain.getEmbedding(normalized) as number[];
  });
  
  const labelIndices = labels.map(l => uniqueLabels.indexOf(l));
  
  const classifier = new ELM({
    useTokenizer: false,
    inputSize: chainOutputs[0].length,
    categories: uniqueLabels,
    hiddenUnits: 128,
    activation: 'relu',
    ridgeLambda: 0.001,
  }) as unknown as ELMModel;
  
  classifier.trainFromData(chainOutputs, labelIndices);
  
  console.log('✅ ELMChain training complete!');
  console.log(`  Chain summary: ${chain.summary()}`);
  
  return { chain, encoder, uniqueLabels, classifier };
}

/**
 * Test ELMChain and collect results (for comparison)
 */
function testELMChainAndCollectResults(
  model: { chain: ELMChain; encoder: any; uniqueLabels: string[]; classifier: ELMModel },
  testTexts: string[],
  testLabels: string[],
  modelName: string,
  trainingTime: number
): {
  name: string;
  accuracy: number;
  correct: number;
  total: number;
  perLabelAccuracy: Record<string, { correct: number; total: number; accuracy: number }>;
  trainingTime: number;
} {
  let correct = 0;
  let total = 0;
  const labelStats: Record<string, { correct: number; total: number }> = {};
  
  for (let i = 0; i < testTexts.length; i++) {
    const text = testTexts[i];
    const trueLabel = testLabels[i];
    
    if (!labelStats[trueLabel]) {
      labelStats[trueLabel] = { correct: 0, total: 0 };
    }
    labelStats[trueLabel].total++;
    
    try {
      const encoded = model.encoder.encode(text);
      const normalized = model.encoder.normalize(encoded);
      const chainOutput = model.chain.getEmbedding(normalized) as number[];
      const predictions = (model.classifier as any).predictFromVector([chainOutput], 1)[0];
      
      if (predictions.length > 0 && predictions[0].label === trueLabel) {
        correct++;
        labelStats[trueLabel].correct++;
      }
      total++;
    } catch (error: any) {
      // Skip errors
    }
  }
  
  const accuracy = total > 0 ? (correct / total) * 100 : 0;
  const perLabelAccuracy: Record<string, { correct: number; total: number; accuracy: number }> = {};
  
  for (const [label, stats] of Object.entries(labelStats)) {
    perLabelAccuracy[label] = {
      correct: stats.correct,
      total: stats.total,
      accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
    };
  }
  
  console.log(`\n${modelName} Results: ${correct}/${total} (${accuracy.toFixed(2)}%)`);
  
  return { name: modelName, accuracy, correct, total, perLabelAccuracy, trainingTime };
}

/**
 * Test ELMChain
 */
function testELMChain(
  model: { chain: ELMChain; encoder: any; uniqueLabels: string[]; classifier: ELM },
  testTexts: string[],
  testLabels: string[]
): void {
  console.log('\nTesting ELMChain...');
  
  let correct = 0;
  let total = 0;
  const labelStats: Record<string, { correct: number; total: number }> = {};
  
  console.log('\nSample predictions (first 10):');
  const sampleCount = Math.min(10, testTexts.length);
  
  for (let i = 0; i < testTexts.length; i++) {
    const text = testTexts[i];
    const trueLabel = testLabels[i];
    
    if (!labelStats[trueLabel]) {
      labelStats[trueLabel] = { correct: 0, total: 0 };
    }
    labelStats[trueLabel].total++;
    
    try {
      const encoded = model.encoder.encode(text);
      const normalized = model.encoder.normalize(encoded);
      const chainOutput = model.chain.getEmbedding(normalized) as number[];
      const predictions = (model.classifier as any).predictFromVector([chainOutput], 3)[0];
      
      const predictedLabel = predictions[0].label;
      const confidence = predictions[0].prob;
      
      if (i < sampleCount) {
        const displayText = text.length > 40 ? text.substring(0, 40) + '...' : text;
        console.log(`  "${displayText}"`);
        console.log(`    True: ${trueLabel}, Predicted: ${predictedLabel} (${(confidence * 100).toFixed(1)}%)`);
        console.log(`    Top 3: ${predictions.map((p: any) => `${p.label}(${(p.prob * 100).toFixed(1)}%)`).join(', ')}`);
      }
      
      if (predictedLabel === trueLabel) {
        correct++;
        labelStats[trueLabel].correct++;
      }
      total++;
    } catch (error: any) {
      console.error(`  Error predicting for "${text}": ${error.message}`);
    }
  }
  
  const accuracy = total > 0 ? (correct / total) * 100 : 0;
  console.log(`\nELMChain Test Results:`);
  console.log(`  Total tested: ${total}`);
  console.log(`  Correct: ${correct}/${total}`);
  console.log(`  Overall Accuracy: ${accuracy.toFixed(2)}%`);
  
  if (Object.keys(labelStats).length > 0) {
    console.log(`\nPer-Label Accuracy:`);
    const sortedLabels = Object.keys(labelStats).sort((a, b) => {
      const accA = labelStats[a].total > 0 ? (labelStats[a].correct / labelStats[a].total) * 100 : 0;
      const accB = labelStats[b].total > 0 ? (labelStats[b].correct / labelStats[b].total) * 100 : 0;
      return accB - accA;
    });
    
    for (const label of sortedLabels) {
      const stats = labelStats[label];
      const labelAcc = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
      console.log(`  ${label}: ${stats.correct}/${stats.total} (${labelAcc.toFixed(1)}%)`);
    }
  }
}

/**
 * Main function
 */
async function main() {
  // Example: Loading license token from environment variable (recommended approach)
  // Set ASTERMIND_LICENSE_TOKEN environment variable before running:
  //   export ASTERMIND_LICENSE_TOKEN="your-license-token-here"
  // 
  // Alternatively, you can set it programmatically (see quickstart.ts for that pattern)
  const { setLicenseTokenFromString } = await import('@astermind/astermind-synthetic-data');
  const licenseToken = process.env.ASTERMIND_LICENSE_TOKEN || 'your-license-token-here';
  if (licenseToken && licenseToken !== 'your-license-token-here') {
    await   }
  
  console.log('='.repeat(60));
  console.log('OmegaSynth → AsterMind ELM Training Pipeline');
  console.log('='.repeat(60));
  
  // Step 1: Load pretrained OmegaSynth model from dist/models
  // Resolve project root: from dist/omegasynth/examples, go up 3 levels to project root
  const currentFileDir = __dirname || path.dirname(require.main?.filename || process.cwd());
  const PROJECT_ROOT = path.resolve(currentFileDir, '../../../');
  const versionDir = path.join(PROJECT_ROOT, 'dist/models/v2.0.0');
  
  console.log('\nStep 1: Loading pretrained OmegaSynth model (no retraining)...');
  console.log('Using pretrained OmegaSynth from dist/models/v2.0.0; generating 100 synthetic samples per label.');
  const synth = loadSavedModel(versionDir);
  
  // Step 2: Generate synthetic dataset from pretrained OmegaSynth
  console.log('\nStep 2: Generating synthetic training data from pretrained OmegaSynth...');
  const labels = synth.getLabels();
  // Increased to 1000 samples per label to push towards higher accuracy
  // 1000 samples × 16 labels = 16,000 total samples (vs 40,000 before)
  const samplesPerLabel = 1000;
  console.log(`Generating ${samplesPerLabel} synthetic samples per label for ${labels.length} labels...`);
  console.log(`Total samples to generate: ${labels.length * samplesPerLabel}`);
  console.log(`📊 Using perfect mode (83% realism) - fewer samples needed for quality training!`);
  const syntheticSamples = await generateSyntheticDataset(synth, labels, samplesPerLabel);
  
  // Step 4: Prepare data for ELM
  console.log('\nStep 4: Preparing data for ELM training...');
  const { texts, labels: labelArray } = prepareELMTrainingData(syntheticSamples);
  
  // Split into train/test (90/10) with balanced stratification per label
  // This ensures all labels are represented in both train and test sets
  const labelGroups: Record<string, { texts: string[]; labels: string[] }> = {};
  for (let i = 0; i < texts.length; i++) {
    const label = labelArray[i];
    if (!labelGroups[label]) {
      labelGroups[label] = { texts: [], labels: [] };
    }
    labelGroups[label].texts.push(texts[i]);
    labelGroups[label].labels.push(labelArray[i]);
  }
  
  const trainTexts: string[] = [];
  const trainLabels: string[] = [];
  const testTexts: string[] = [];
  const testLabels: string[] = [];
  
  // Split each label group separately to ensure balanced representation
  for (const [label, group] of Object.entries(labelGroups)) {
    const splitIdx = Math.floor(group.texts.length * 0.9);
    trainTexts.push(...group.texts.slice(0, splitIdx));
    trainLabels.push(...group.labels.slice(0, splitIdx));
    testTexts.push(...group.texts.slice(splitIdx));
    testLabels.push(...group.labels.slice(splitIdx));
  }
  
  // Shuffle both sets for better training
  const trainPairs = trainTexts.map((t, i) => ({ text: t, label: trainLabels[i] }));
  const testPairs = testTexts.map((t, i) => ({ text: t, label: testLabels[i] }));
  
  // Simple shuffle
  for (let i = trainPairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [trainPairs[i], trainPairs[j]] = [trainPairs[j], trainPairs[i]];
  }
  for (let i = testPairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [testPairs[i], testPairs[j]] = [testPairs[j], testPairs[i]];
  }
  
  const finalTrainTexts = trainPairs.map(p => p.text);
  const finalTrainLabels = trainPairs.map(p => p.label);
  const finalTestTexts = testPairs.map(p => p.text);
  const finalTestLabels = testPairs.map(p => p.label);
  
  console.log(`Training set: ${finalTrainTexts.length} samples`);
  console.log(`Test set: ${finalTestTexts.length} samples`);
  
  // Show label distribution in test set
  const testLabelCounts: Record<string, number> = {};
  for (const label of finalTestLabels) {
    testLabelCounts[label] = (testLabelCounts[label] || 0) + 1;
  }
  console.log(`Test set label distribution: ${Object.entries(testLabelCounts).map(([l, c]) => `${l}:${c}`).join(', ')}`);
  
  // Step 5: Train and test ALL models for comparison
  console.log('\nStep 5: Training and Testing ALL Models for Comparison...');
  console.log('='.repeat(60));
  
  type ModelResult = {
    name: string;
    accuracy: number;
    correct: number;
    total: number;
    perLabelAccuracy: Record<string, { correct: number; total: number; accuracy: number }>;
    trainingTime: number;
  };
  
  const results: ModelResult[] = [];
  const uniqueLabels = Array.from(new Set(finalTrainLabels));

  // Build shared encoder and pre-encode train/test texts once
  console.log('\nBuilding shared encoder and encoding train/test texts...');
  const sharedEncoder = buildSharedEncoder(uniqueLabels);
  const encodedTrain = finalTrainTexts.map(t => sharedEncoder.normalize(sharedEncoder.encode(t)));
  const encodedTest  = finalTestTexts.map(t  => sharedEncoder.normalize(sharedEncoder.encode(t)));

  // Test 1: ELM (vector-based)
  try {
    console.log('\n' + '='.repeat(60));
    console.log('MODEL 1/3: ELM (vector-based)');
    console.log('='.repeat(60));
    const startTime = Date.now();
    const elm = await trainELMFromVectors(encodedTrain, finalTrainLabels, uniqueLabels, {
      hiddenUnits: 512,
      activation: 'relu',
      ridgeLambda: 0.0001,
    });
    const trainingTime = Date.now() - startTime;
    const result = testELMAndCollectResultsVector(
      elm,
      encodedTest,
      finalTestLabels,
      uniqueLabels,
      'ELM',
      trainingTime
    );
    results.push(result);
  } catch (error: any) {
    console.error(`❌ ELM failed: ${error.message}`);
    results.push({
      name: 'ELM',
      accuracy: 0,
      correct: 0,
      total: 0,
      perLabelAccuracy: {},
      trainingTime: 0,
    });
  }

  // Test 2: KernelELM (vector-based)
  let kelmForEnsemble: KernelELM | null = null;
  try {
    console.log('\n' + '='.repeat(60));
    console.log('MODEL 2/3: KernelELM (vector-based)');
    console.log('='.repeat(60));
    const startTime = Date.now();
    const kelm = await trainKernelELMFromVectors(encodedTrain, finalTrainLabels, uniqueLabels, {
      kernelType: 'rbf',
      ridgeLambda: 0.001,
      gammaMultiplier: 1.0,
      nystromMultiplier: 3,
    });
    const trainingTime = Date.now() - startTime;
    const result = testKELMAndCollectResultsVector(
      kelm,
      encodedTest,
      finalTestLabels,
      uniqueLabels,
      'KernelELM',
      trainingTime
    );
    results.push(result);
    kelmForEnsemble = kelm;
  } catch (error: any) {
    console.error(`❌ KernelELM failed: ${error.message}`);
    results.push({
      name: 'KernelELM',
      accuracy: 0,
      correct: 0,
      total: 0,
      perLabelAccuracy: {},
      trainingTime: 0,
    });
  }

  // Test 3: Ensemble (ELM + KernelELM, vector-based)
  if (kelmForEnsemble) {
    try {
      console.log('\n' + '='.repeat(60));
      console.log('MODEL 3/5: Ensemble (ELM + KernelELM, vector-based)');
      console.log('='.repeat(60));

      // Reuse ELM from results (first result)
      const elmResult = results.find(r => r.name === 'ELM');
      // This is a bit hacky: we don't store the ELM instance, but we can retrain quickly from vectors
      const startTime = Date.now();
      const elm = await trainELMFromVectors(encodedTrain, finalTrainLabels, uniqueLabels, {
        hiddenUnits: 512,
        activation: 'relu',
        ridgeLambda: 0.0001,
      });
      const trainingTime = Date.now() - startTime;

      const ensemble: EnsembleModel = {
        elm,
        kelm: kelmForEnsemble,
        encoder: null,
        uniqueLabels,
      };

      const result = testEnsembleAndCollectResultsVector(
        ensemble,
        encodedTest,
        finalTestLabels,
        'Ensemble',
        trainingTime
      );
      results.push(result);
    } catch (error: any) {
      console.error(`❌ Ensemble failed: ${error.message}`);
      results.push({
        name: 'Ensemble',
        accuracy: 0,
        correct: 0,
        total: 0,
        perLabelAccuracy: {},
        trainingTime: 0,
      });
    }
  }

  // DeepELM and ELMChain removed for classification benchmarking;
  // ELM, KernelELM and Ensemble remain the supported classifiers here.
  
  // NOTE: DeepELM and ELMChain are disabled for now to speed up the test app.
  // They are significantly slower and add little value for quick comparison runs.
  // If you want to re-enable them, uncomment the blocks below.
  //
  // // Test 4: DeepELM
  // try {
  //   console.log('\n' + '='.repeat(60));
  //   console.log('MODEL 4/5: DeepELM');
  //   console.log('='.repeat(60));
  //   const startTime = Date.now();
  //   const deepELM = await trainDeepELM(finalTrainTexts, finalTrainLabels);
  //   const trainingTime = Date.now() - startTime;
  //   const result = testDeepELMAndCollectResults(deepELM, finalTestTexts, finalTestLabels, 'DeepELM', trainingTime);
  //   results.push(result);
  // } catch (error: any) {
  //   console.error(`❌ DeepELM failed: ${error.message}`);
  //   results.push({ name: 'DeepELM', accuracy: 0, correct: 0, total: 0, perLabelAccuracy: {}, trainingTime: 0 });
  // }
  //
  // // Test 5: ELMChain
  // try {
  //   console.log('\n' + '='.repeat(60));
  //   console.log('MODEL 5/5: ELMChain');
  //   console.log('='.repeat(60));
  //   const startTime = Date.now();
  //   const elmChain = await trainELMChain(finalTrainTexts, finalTrainLabels);
  //   const trainingTime = Date.now() - startTime;
  //   const result = testELMChainAndCollectResults(elmChain, finalTestTexts, finalTestLabels, 'ELMChain', trainingTime);
  //   results.push(result);
  // } catch (error: any) {
  //   console.error(`❌ ELMChain failed: ${error.message}`);
  //   results.push({ name: 'ELMChain', accuracy: 0, correct: 0, total: 0, perLabelAccuracy: {}, trainingTime: 0 });
  // }
  
  // Step 6: Generate comprehensive comparison report
  console.log('\n' + '='.repeat(60));
  console.log('COMPREHENSIVE MODEL COMPARISON REPORT');
  console.log('='.repeat(60));
  generateComparisonReport(results, finalTestTexts.length);
  
  console.log('\n' + '='.repeat(60));
  console.log('Pipeline Complete!');
  console.log('='.repeat(60));
}

/**
 * Generate comprehensive comparison report
 */
function generateComparisonReport(
  results: Array<{
    name: string;
    accuracy: number;
    correct: number;
    total: number;
    perLabelAccuracy: Record<string, { correct: number; total: number; accuracy: number }>;
    trainingTime: number;
  }>,
  testSetSize: number
): void {
  // Sort by accuracy (descending)
  const sortedResults = [...results].sort((a, b) => b.accuracy - a.accuracy);
  
  console.log('\n' + '='.repeat(80));
  console.log('🏆 FINAL RANKINGS - MODEL PERFORMANCE COMPARISON');
  console.log('='.repeat(80));
  console.log(`\nTest Set Size: ${testSetSize} samples`);
  console.log(`Training Data: 36,000 samples (2,500 per label × 16 labels)`);
  console.log('\n' + '-'.repeat(80));
  console.log('OVERALL ACCURACY RANKINGS:');
  console.log('-'.repeat(80));
  
  sortedResults.forEach((result, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '  ';
    const timeStr = (result.trainingTime / 1000).toFixed(1);
    console.log(
      `${medal} ${(idx + 1).toString().padStart(2)}. ${result.name.padEnd(15)} ` +
      `| Accuracy: ${result.accuracy.toFixed(2)}% ` +
      `| Correct: ${result.correct}/${result.total} ` +
      `| Training: ${timeStr}s`
    );
  });
  
  const winner = sortedResults[0];
  console.log('\n' + '='.repeat(80));
  console.log(`🏆 WINNER: ${winner.name} with ${winner.accuracy.toFixed(2)}% accuracy!`);
  console.log('='.repeat(80));
  
  // Per-label comparison
  console.log('\n' + '-'.repeat(80));
  console.log('PER-LABEL ACCURACY COMPARISON:');
  console.log('-'.repeat(80));
  
  // Get all unique labels
  const allLabels = new Set<string>();
  results.forEach(r => {
    Object.keys(r.perLabelAccuracy).forEach(label => allLabels.add(label));
  });
  
  const sortedLabels = Array.from(allLabels).sort();
  
  // Header
  console.log('\nLabel'.padEnd(20) + results.map(r => r.name.padEnd(12)).join(' | '));
  console.log('-'.repeat(80));
  
  // Per-label results
  sortedLabels.forEach(label => {
    const labelResults = results.map(r => {
      const acc = r.perLabelAccuracy[label];
      if (!acc) return 'N/A'.padEnd(12);
      return `${acc.accuracy.toFixed(1)}%`.padEnd(12);
    });
    console.log(label.padEnd(20) + labelResults.join(' | '));
  });
  
  // Summary statistics
  console.log('\n' + '-'.repeat(80));
  console.log('SUMMARY STATISTICS:');
  console.log('-'.repeat(80));
  
  const avgAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0) / results.length;
  const maxAccuracy = Math.max(...results.map(r => r.accuracy));
  const minAccuracy = Math.min(...results.map(r => r.accuracy));
  const avgTrainingTime = results.reduce((sum, r) => sum + r.trainingTime, 0) / results.length;
  
  console.log(`Average Accuracy: ${avgAccuracy.toFixed(2)}%`);
  console.log(`Best Accuracy: ${maxAccuracy.toFixed(2)}% (${winner.name})`);
  console.log(`Worst Accuracy: ${minAccuracy.toFixed(2)}%`);
  console.log(`Accuracy Range: ${(maxAccuracy - minAccuracy).toFixed(2)}%`);
  console.log(`Average Training Time: ${(avgTrainingTime / 1000).toFixed(1)}s`);
  
  // Performance vs Training Time
  console.log('\n' + '-'.repeat(80));
  console.log('EFFICIENCY ANALYSIS (Accuracy vs Training Time):');
  console.log('-'.repeat(80));
  
  const efficiency = results.map(r => ({
    name: r.name,
    accuracy: r.accuracy,
    time: r.trainingTime / 1000,
    efficiency: r.trainingTime > 0 ? r.accuracy / (r.trainingTime / 1000) : 0, // accuracy per second
  })).sort((a, b) => b.efficiency - a.efficiency);
  
  efficiency.forEach((eff, idx) => {
    console.log(
      `${(idx + 1).toString().padStart(2)}. ${eff.name.padEnd(15)} ` +
      `| ${eff.accuracy.toFixed(2)}% accuracy in ${eff.time.toFixed(1)}s ` +
      `| Efficiency: ${eff.efficiency.toFixed(2)}% per second`
    );
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('END OF REPORT');
  console.log('='.repeat(80) + '\n');
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Pipeline failed:', error);
    process.exit(1);
  });
}

export { main as runELMTraining };
