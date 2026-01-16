/**
 * loadPretrained - Load pretrained synthetic data generator
 * Instantiates OmegaSynth with pretrained data for common labels
 */

import { OmegaSynth } from '../OmegaSynth';
import { LabeledSample } from '../types';
import * as fs from 'fs';
import * as path from 'path';
export interface PretrainedModel {
  version: string;
  labels: Record<string, string[]>;
}

/**
 * Versioned model manifest shape (matches saveVersionedModel)
 */
interface VersionedModelManifest {
  version: string;
  timestamp: string;
  config: {
    mode: string;
    maxLength?: number;
    seed?: number;
  };
  trainingStats: {
    totalSamples: number;
    labels: string[];
    samplesPerLabel: Record<string, number>;
  };
  artifacts: {
    model: string;
    elmModel?: string;
    testMetrics: string;
    testReport: string;
    validationMetrics: string;
    validationReport: string;
    manifest: string;
  };
}

/**
 * Load pretrained OmegaSynth instance
 * @param mode Generation mode ('retrieval', 'elm', or 'hybrid')
 * @param config Optional configuration overrides
 */
export function loadPretrained(
  mode: 'retrieval' | 'elm' | 'hybrid' = 'retrieval',
  config?: { maxLength?: number; seed?: number }
): OmegaSynth {
  // Initialize license before creating instance
    const synth = new OmegaSynth({
    mode,
    maxLength: config?.maxLength || 32,
    seed: config?.seed,
  });

  // Load default data
  // Try multiple possible locations for the model file
  let modelPath: string | null = null;
  
  // Helper to find package root by looking for package.json
  function findPackageRoot(startDir: string): string | null {
    let current = startDir;
    while (current !== path.dirname(current)) {
      const pkgPath = path.join(current, 'package.json');
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
          if (pkg.name === '@astermind/astermind-synth') {
            return current;
          }
        } catch {
          // Continue searching
        }
      }
      current = path.dirname(current);
    }
    return null;
  }
  
  // Find package root first - this is more reliable than using __dirname
  // since we're looking for files relative to package root, not the current file
  const packageRoot = findPackageRoot(process.cwd());
  
  const possiblePaths: string[] = [];
  
  // Add paths relative to package root if found
  if (packageRoot) {
    possiblePaths.push(
      path.join(packageRoot, 'dist/omegasynth/models/default_synth.json'), // Bundled location (npm package)
      path.join(packageRoot, 'src/omegasynth/models/default_synth.json') // Source location (development)
    );
  }
  
  // Also try common npm package locations (when installed as dependency)
  possiblePaths.push(
    path.join(process.cwd(), 'node_modules/@astermind/astermind-synth/dist/omegasynth/models/default_synth.json')
  );
  
  // Try relative to current working directory (for development)
  possiblePaths.push(
    path.join(process.cwd(), 'dist/omegasynth/models/default_synth.json'),
    path.join(process.cwd(), 'src/omegasynth/models/default_synth.json')
  );
  
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      modelPath = possiblePath;
      break;
    }
  }
  
  if (!modelPath) {
    throw new Error(
      'default_synth.json not found. Tried paths: ' + possiblePaths.join(', ')
    );
  }
  
  const modelData: PretrainedModel = JSON.parse(
    fs.readFileSync(modelPath, 'utf-8')
  );

  // Convert pretrained data to LabeledSample format
  const samples: LabeledSample[] = [];

  for (const [label, values] of Object.entries(modelData.labels)) {
    for (const value of values) {
      samples.push({ label, value });
    }
  }

  // Train the generator synchronously for immediate use
  // Note: This is a simplified approach - in production you might want async
  (async () => {
    try {
      await synth.train(samples);
    } catch (err) {
      console.error('Error training pretrained model:', err);
    }
  })();

  return synth;
}

/**
 * Load a fully versioned OmegaSynth model from dist/models/vX.Y.Z
 *
 * This function:
 * - Reads model.json, training_data.json, and elm_model.json from the version directory
 * - Rebuilds the retrieval store from training_data.json
 * - Hydrates the internal ELM from elm_model.json (for elm/hybrid modes) if possible
 *
 * NOTE:
 * - We avoid calling synth.train() here to prevent re-training; instead we:
 *   - Directly ingest training samples into the retrieval generator
 *   - Attempt to load ELM weights via loadModelFromJSON if available
 */
export function loadPretrainedFromVersion(versionDir: string): OmegaSynth {
  // Initialize license before creating instance
    const manifestPath = path.join(versionDir, 'manifest.json');
  const modelPath = path.join(versionDir, 'model.json');
  const trainingDataPath = path.join(versionDir, 'training_data.json');
  const elmModelPath = path.join(versionDir, 'elm_model.json');

  let manifest: VersionedModelManifest | null = null;
  if (fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  }

  const modelData = JSON.parse(fs.readFileSync(modelPath, 'utf-8'));
  const configFromModel = manifest?.config ?? modelData.config;

  // Load training samples
  if (!fs.existsSync(trainingDataPath)) {
    throw new Error(`training_data.json not found in version directory: ${trainingDataPath}`);
  }
  const trainingSamples: LabeledSample[] = JSON.parse(
    fs.readFileSync(trainingDataPath, 'utf-8')
  );

  // Create OmegaSynth.
  // IMPORTANT: For pretrained loading we prefer 'retrieval' mode here:
  // - We only need high-quality samples for downstream ELM/KELM training.
  // - Retrieval over the saved training_data.json gives 100% realistic data
  //   without requiring vocab building or ELM retraining.
  //
  // If you ever need to use the original mode (e.g. 'hybrid' or 'elm'),
  // you can swap this back to configFromModel.mode.
  const mode: 'retrieval' | 'elm' | 'hybrid' = 'retrieval';
  const synth = new OmegaSynth({
    mode,
    maxLength: configFromModel.maxLength || 50,
    seed: configFromModel.seed,
  });

  // Ingest training samples directly into the retrieval generator
  // For hybrid/elm modes, this ensures retrieval works without retraining
  try {
    const generator: any = (synth as any).generator;
    if (generator) {
      if (generator.ingest) {
        // RetrievalGenerator
        generator.ingest(trainingSamples);
      } else if (generator.retrieval && typeof generator.retrieval.ingest === 'function') {
        // HybridGenerator (has .retrieval)
        generator.retrieval.ingest(trainingSamples);
      }
    }
  } catch (err) {
    console.warn('Could not ingest training samples into OmegaSynth generator:', err);
  }

  // Hydrate ELM weights if available and applicable (elm/hybrid modes).
  // NOTE: Since we currently force mode = 'retrieval' above for stability,
  // this block will not run. It is left here for future use if you decide
  // to re-enable elm/hybrid loading via configFromModel.mode.
  if (fs.existsSync(elmModelPath) && (configFromModel.mode === 'elm' || configFromModel.mode === 'hybrid')) {
    try {
      const elmModelJSON = fs.readFileSync(elmModelPath, 'utf-8');
      const generator: any = (synth as any).generator;
      if (generator) {
        let elmInstance: any = null;
        if (configFromModel.mode === 'hybrid' && generator.elm && generator.elm.elm) {
          // HybridGenerator -> ELMGenerator -> elm
          elmInstance = generator.elm.elm;
        } else if (configFromModel.mode === 'elm' && generator.elm) {
          // ELMGenerator -> elm
          elmInstance = generator.elm;
        }

        if (elmInstance && typeof elmInstance.loadModelFromJSON === 'function') {
          elmInstance.loadModelFromJSON(elmModelJSON);
          console.log('✅ ELM weights loaded from elm_model.json into OmegaSynth');
        } else {
          console.warn(
            'Could not load ELM weights: loadModelFromJSON not available on ELM instance'
          );
        }
      }
    } catch (err) {
      console.warn('Could not hydrate ELM from elm_model.json:', err);
    }
  }

  return synth;
}

/**
 * Load pretrained model from custom JSON data
 * @param modelData Custom model data
 * @param mode Generation mode
 * @param config Optional configuration
 */
export function loadPretrainedFromData(
  modelData: PretrainedModel,
  mode: 'retrieval' | 'elm' | 'hybrid' = 'retrieval',
  config?: { maxLength?: number; seed?: number }
): OmegaSynth {
  // Initialize license before creating instance
    const synth = new OmegaSynth({
    mode,
    maxLength: config?.maxLength || 32,
    seed: config?.seed,
  });

  const samples: LabeledSample[] = [];
  for (const [label, values] of Object.entries(modelData.labels)) {
    for (const value of values) {
      samples.push({ label, value });
    }
  }

  (async () => {
    try {
      await synth.train(samples);
    } catch (err) {
      console.error('Error training custom model:', err);
    }
  })();

  return synth;
}

/**
 * Get available pretrained labels
 */
export function getPretrainedLabels(): string[] {
  try {
    // Helper to find package root
    function findPackageRoot(startDir: string): string | null {
      let current = startDir;
      while (current !== path.dirname(current)) {
        const pkgPath = path.join(current, 'package.json');
        if (fs.existsSync(pkgPath)) {
          try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
            if (pkg.name === '@astermind/astermind-synth') {
              return current;
            }
          } catch {
            // Continue searching
          }
        }
        current = path.dirname(current);
      }
      return null;
    }
    
    // Try multiple possible locations for the model file
    const packageRoot = findPackageRoot(process.cwd());
    const possiblePaths: string[] = [];
    
    if (packageRoot) {
      possiblePaths.push(
        path.join(packageRoot, 'dist/omegasynth/models/default_synth.json'),
        path.join(packageRoot, 'src/omegasynth/models/default_synth.json')
      );
    }
    
    possiblePaths.push(
      path.join(process.cwd(), 'node_modules/@astermind/astermind-synth/dist/omegasynth/models/default_synth.json'),
      path.join(process.cwd(), 'dist/omegasynth/models/default_synth.json'),
      path.join(process.cwd(), 'src/omegasynth/models/default_synth.json')
    );
    
    let modelPath: string | null = null;
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        modelPath = possiblePath;
        break;
      }
    }
    
    if (!modelPath) {
      throw new Error('Model file not found');
    }
    
    const modelData: PretrainedModel = JSON.parse(
      fs.readFileSync(modelPath, 'utf-8')
    );
    return Object.keys(modelData.labels);
  } catch {
    // Fallback if file not found
    return [
      'first_name', 'last_name', 'phone_number', 'email', 'street_address',
      'city', 'state', 'country', 'company_name', 'job_title', 'product_name',
      'color', 'uuid', 'date', 'credit_card_type', 'device_type'
    ];
  }
}

