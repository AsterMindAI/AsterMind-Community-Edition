/**
 * Utilities for saving trained OmegaSynth models
 */

import { OmegaSynth } from '../OmegaSynth';
import { LabeledSample } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export interface SavedModelData {
  config: {
    mode: string;
    maxLength?: number;
    seed?: number;
    exactMode?: boolean;
    useOneHot?: boolean;
    useClassification?: boolean;
    usePatternCorrection?: boolean;
  };
  trainingStats: {
    totalSamples: number;
    labels: string[];
    samplesPerLabel: Record<string, number>;
  };
  timestamp: string;
}

/**
 * Save a trained OmegaSynth model to disk
 * 
 * @param synth The trained OmegaSynth instance
 * @param trainingData The training data used to train the model (required for saving)
 * @param outputDir Directory where the model will be saved
 * @param version Optional version string (default: '1.0.0')
 * @returns Path to the saved model directory
 */
export async function saveTrainedModel(
  synth: OmegaSynth,
  trainingData: LabeledSample[],
  outputDir: string,
  version: string = '1.0.0'
): Promise<string> {
  if (!synth.isTrained()) {
    throw new Error('Model must be trained before saving. Call train() first.');
  }

  if (trainingData.length === 0) {
    throw new Error('Training data is required to save the model.');
  }

  // Create version directory
  const versionDir = path.join(outputDir, `v${version}`);
  if (!fs.existsSync(versionDir)) {
    fs.mkdirSync(versionDir, { recursive: true });
  }

  // Calculate training stats
  const labels = Array.from(new Set(trainingData.map(s => s.label)));
  const samplesPerLabel: Record<string, number> = {};
  for (const label of labels) {
    samplesPerLabel[label] = trainingData.filter(s => s.label === label).length;
  }

  // Get config from synth (we need to access private config)
  const config = (synth as any).config || {};
  
  // Save model metadata
  const modelData: SavedModelData = {
    config: {
      mode: config.mode || 'retrieval',
      maxLength: config.maxLength,
      seed: config.seed,
      exactMode: config.exactMode,
      useOneHot: config.useOneHot,
      useClassification: config.useClassification,
      usePatternCorrection: config.usePatternCorrection,
    },
    trainingStats: {
      totalSamples: trainingData.length,
      labels,
      samplesPerLabel,
    },
    timestamp: new Date().toISOString(),
  };

  const modelPath = path.join(versionDir, 'model.json');
  fs.writeFileSync(modelPath, JSON.stringify(modelData, null, 2));

  // Save training data (required for loading later)
  const trainingDataPath = path.join(versionDir, 'training_data.json');
  fs.writeFileSync(trainingDataPath, JSON.stringify(trainingData, null, 2));

  // Try to save ELM model weights if available (for elm/hybrid modes)
  try {
    const generator = (synth as any).generator;
    if (generator) {
      let elmInstance: any = null;
      
      // Get ELM instance based on mode
      if (config.mode === 'hybrid' && generator.elm) {
        elmInstance = generator.elm.elm; // HybridGenerator -> ELMGenerator -> elm
      } else if (config.mode === 'elm' && generator.elm) {
        elmInstance = generator.elm; // ELMGenerator -> elm
      }
      
      if (elmInstance) {
        let elmModelJSON: string | undefined;
        
        // Try to get serialized model
        if (elmInstance.savedModelJSON) {
          elmModelJSON = elmInstance.savedModelJSON;
        } else if (elmInstance.model) {
          // Manually serialize
          const serialized = {
            config: elmInstance.config,
            W: elmInstance.model.W,
            b: elmInstance.model.b,
            B: elmInstance.model.beta,
            categories: elmInstance.categories || [],
          };
          elmModelJSON = JSON.stringify(serialized);
        }
        
        if (elmModelJSON) {
          const elmModelPath = path.join(versionDir, 'elm_model.json');
          fs.writeFileSync(elmModelPath, elmModelJSON);
          console.log(`✅ ELM model weights saved to: ${elmModelPath}`);
        }
      }
    }
  } catch (error) {
    console.warn('⚠️  Could not save ELM model weights:', error);
    // Continue - ELM weights are optional
  }

  console.log(`\n✅ Model saved to: ${versionDir}`);
  console.log(`   Version: ${version}`);
  console.log(`   Training samples: ${trainingData.length}`);
  console.log(`   Labels: ${labels.length} (${labels.join(', ')})`);
  console.log(`\n   To load this model later, use:`);
  console.log(`   loadPretrainedFromVersion('${versionDir}')`);

  return versionDir;
}

