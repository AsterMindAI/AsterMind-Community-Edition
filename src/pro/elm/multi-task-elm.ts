// multi-task-elm.ts — Multi-Task ELM for joint learning across related tasks
// Shared hidden layer with task-specific output layers

import { ELM } from '../../core/ELM.js';
import { KernelELM } from '../../core/KernelELM.js';
import type { Vec } from '../math/index.js';
// License removed - all features are now free!

export interface MultiTaskELMOptions {
  tasks: Array<{
    name: string;
    categories: string[];
    weight?: number; // Task importance weight
  }>;
  sharedHiddenUnits?: number;
  taskSpecificHiddenUnits?: number[];
  activation?: 'relu' | 'tanh' | 'sigmoid' | 'linear';
  maxLen?: number;
  useTokenizer?: boolean;
}

export interface MultiTaskELMResult {
  task: string;
  label: string;
  prob: number;
}

/**
 * Multi-Task ELM for joint learning across related tasks
 * Features:
 * - Shared feature extraction layer
 * - Task-specific output layers
 * - Task weighting for importance
 * - Joint optimization
 */
export class MultiTaskELM {
  private sharedELM: ELM;
  private taskELMs: Map<string, ELM> = new Map();
  private tasks: Array<{ name: string; categories: string[]; weight: number }>;
  private options: {
    sharedHiddenUnits: number;
    taskSpecificHiddenUnits: number[];
    activation: 'relu' | 'tanh' | 'sigmoid' | 'linear';
    maxLen: number;
    useTokenizer: boolean;
  };
  private trained = false;

  constructor(options: MultiTaskELMOptions) {
    // License check removed // Premium feature - requires valid license
    this.tasks = options.tasks.map((task) => ({
      name: task.name,
      categories: task.categories,
      weight: task.weight ?? 1.0,
    }));

    this.options = {
      sharedHiddenUnits: options.sharedHiddenUnits ?? 256,
      taskSpecificHiddenUnits: options.taskSpecificHiddenUnits ?? options.tasks.map(() => 128),
      activation: options.activation ?? 'relu',
      maxLen: options.maxLen ?? 100,
      useTokenizer: options.useTokenizer ?? true,
    };

    // Initialize shared ELM
    this.sharedELM = new ELM({
      useTokenizer: this.options.useTokenizer ? true : undefined,
      hiddenUnits: this.options.sharedHiddenUnits,
      categories: [], // No categories for shared layer
      maxLen: this.options.maxLen,
      activation: this.options.activation,
    } as any);

    // Initialize task-specific ELMs
    for (let i = 0; i < this.tasks.length; i++) {
      const task = this.tasks[i];
      const taskELM = new ELM({
        hiddenUnits: this.options.taskSpecificHiddenUnits[i],
        categories: task.categories,
        maxLen: this.options.sharedHiddenUnits, // Input size is shared layer output
        activation: this.options.activation,
      } as any);
      this.taskELMs.set(task.name, taskELM);
    }
  }

  /**
   * Train multi-task ELM
   * @param X Input features
   * @param yTaskData Map of task name to labels
   */
  train(X: number[][], yTaskData: Map<string, number[] | string[]>): void {
    // Step 1: Train shared layer (use all tasks)
    const allFeatures = this._extractSharedFeatures(X);
    
    // Step 2: Train each task-specific layer
    for (const task of this.tasks) {
      const taskLabels = yTaskData.get(task.name);
      if (!taskLabels) continue;

      const taskELM = this.taskELMs.get(task.name)!;
      const labelIndices = taskLabels.map(label => 
        typeof label === 'number' 
          ? label 
          : task.categories.indexOf(label as string)
      );

      // Train task-specific ELM on shared features
      (taskELM as any).setCategories?.(task.categories);
      (taskELM as any).trainFromData?.(allFeatures, labelIndices);
    }

    this.trained = true;
  }

  /**
   * Predict for all tasks
   */
  predict(X: number[] | number[][], topK: number = 3): Map<string, MultiTaskELMResult[]> {
    if (!this.trained) {
      throw new Error('Model must be trained before prediction');
    }

    const XArray = Array.isArray(X[0]) ? (X as number[][]) : [X as number[]];
    const results = new Map<string, MultiTaskELMResult[]>();

    for (const x of XArray) {
      // Extract shared features
      const sharedFeatures = this._extractSharedFeatures([x])[0];

      // Predict for each task
      for (const task of this.tasks) {
        const taskELM = this.taskELMs.get(task.name)!;
        const taskPreds = (taskELM as any).predictFromVector?.([sharedFeatures], topK) || [];
        
        const taskResults = taskPreds.map((pred: any) => ({
          task: task.name,
          label: pred.label || task.categories[pred.index || 0],
          prob: pred.prob || 0,
        }));

        if (!results.has(task.name)) {
          results.set(task.name, []);
        }
        results.get(task.name)!.push(...taskResults);
      }
    }

    return results;
  }

  /**
   * Predict for a specific task
   */
  predictTask(x: number[] | number[][], taskName: string, topK: number = 3): MultiTaskELMResult[] {
    if (!this.trained) {
      throw new Error('Model must be trained before prediction');
    }

    const taskELM = this.taskELMs.get(taskName);
    if (!taskELM) {
      throw new Error(`Task ${taskName} not found`);
    }

    const XArray = Array.isArray(x[0]) ? (x as number[][]) : [x as number[]];
    const results: MultiTaskELMResult[] = [];

    for (const xi of XArray) {
      // Extract shared features
      const sharedFeatures = this._extractSharedFeatures([xi])[0];
      
      // Predict with task-specific ELM
      const taskPreds = (taskELM as any).predictFromVector?.([sharedFeatures], topK) || [];
      
      results.push(...taskPreds.map((pred: any) => ({
        task: taskName,
        label: pred.label || this.tasks.find(t => t.name === taskName)!.categories[pred.index || 0],
        prob: pred.prob || 0,
      })));
    }

    return results;
  }

  /**
   * Extract features from shared layer
   */
  private _extractSharedFeatures(X: number[][]): number[][] {
    // Encode inputs if using tokenizer
    const encoded = this.options.useTokenizer
      ? X.map(x => {
          const enc = (this.sharedELM as any).encoder?.encode?.(x) || x;
          return (this.sharedELM as any).encoder?.normalize?.(enc) || enc;
        })
      : X;

    // Extract hidden layer features
    return encoded.map(x => {
      const hidden = (this.sharedELM as any).buildHidden?.(
        [x],
        (this.sharedELM as any).model?.W,
        (this.sharedELM as any).model?.b
      );
      return hidden?.[0] ? Array.from(hidden[0]) : x;
    });
  }

  /**
   * Get task names
   */
  getTaskNames(): string[] {
    return this.tasks.map(t => t.name);
  }

  /**
   * Get task weights
   */
  getTaskWeights(): Map<string, number> {
    return new Map(this.tasks.map(t => [t.name, t.weight]));
  }
}

