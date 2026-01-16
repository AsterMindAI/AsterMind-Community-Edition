// hierarchical-elm.ts — Hierarchical ELM for tree-structured classification
// Coarse-to-fine classification with hierarchical decision making

import { ELM } from '../core/ELM.js';
export interface HierarchicalELMOptions {
  hierarchy: {
    [parent: string]: string[]; // Parent category -> child categories
  };
  rootCategories: string[]; // Top-level categories
  hiddenUnits?: number;
  activation?: 'relu' | 'tanh' | 'sigmoid' | 'linear';
  maxLen?: number;
  useTokenizer?: boolean;
}

export interface HierarchicalELMResult {
  path: string[]; // Path from root to leaf
  label: string; // Final label
  prob: number; // Probability
  levelProbs: number[]; // Probabilities at each level
}

/**
 * Hierarchical ELM for tree-structured classification
 * Features:
 * - Coarse-to-fine classification
 * - Tree-structured decision making
 * - Multi-level probability estimation
 * - Efficient hierarchical search
 */
export class HierarchicalELM {
  private elms: Map<string, ELM> = new Map();
  private hierarchy: Map<string, string[]>;
  private rootCategories: string[];
  private options: Required<Omit<HierarchicalELMOptions, 'hierarchy' | 'rootCategories'>>;
  private trained = false;

  constructor(options: HierarchicalELMOptions) {
        
    this.hierarchy = new Map(Object.entries(options.hierarchy));
    this.rootCategories = options.rootCategories;
    this.options = {
      hiddenUnits: options.hiddenUnits ?? 256,
      activation: options.activation ?? 'relu',
      maxLen: options.maxLen ?? 100,
      useTokenizer: options.useTokenizer ?? true,
    };

    // Initialize ELM for each level
    this._initializeELMs();
  }

  /**
   * Initialize ELMs for each level in hierarchy
   */
  private _initializeELMs(): void {
    // Root level ELM
    this.elms.set('root', new ELM({
      useTokenizer: this.options.useTokenizer ? true : undefined,
      hiddenUnits: this.options.hiddenUnits,
      categories: this.rootCategories,
      maxLen: this.options.maxLen,
      activation: this.options.activation,
    } as any));

    // Child level ELMs
    for (const [parent, children] of this.hierarchy.entries()) {
      this.elms.set(parent, new ELM({
        useTokenizer: this.options.useTokenizer ? true : undefined,
        hiddenUnits: this.options.hiddenUnits,
        categories: children,
        maxLen: this.options.maxLen,
        activation: this.options.activation,
      } as any));
    }
  }

  /**
   * Train hierarchical ELM
   * @param X Input features
   * @param yLabels Full hierarchical paths (e.g., ['root', 'parent', 'child'])
   */
  train(X: number[][], yLabels: string[][]): void {
    // Group samples by level
    const levelData = new Map<string, { X: number[][]; y: number[] }>();

    // Root level
    const rootX: number[][] = [];
    const rootY: number[] = [];
    for (let i = 0; i < X.length; i++) {
      if (yLabels[i].length > 0) {
        rootX.push(X[i]);
        rootY.push(this.rootCategories.indexOf(yLabels[i][0]));
      }
    }
    levelData.set('root', { X: rootX, y: rootY });

    // Child levels
    for (const [parent, children] of this.hierarchy.entries()) {
      const parentX: number[][] = [];
      const parentY: number[] = [];
      
      for (let i = 0; i < X.length; i++) {
        const path = yLabels[i];
        const parentIdx = path.indexOf(parent);
        if (parentIdx >= 0 && parentIdx < path.length - 1) {
          const child = path[parentIdx + 1];
          if (children.includes(child)) {
            parentX.push(X[i]);
            parentY.push(children.indexOf(child));
          }
        }
      }
      
      if (parentX.length > 0) {
        levelData.set(parent, { X: parentX, y: parentY });
      }
    }

    // Train each ELM
    for (const [level, data] of levelData.entries()) {
      const elm = this.elms.get(level);
      if (elm && data.X.length > 0) {
        (elm as any).setCategories?.(level === 'root' ? this.rootCategories : this.hierarchy.get(level) || []);
        (elm as any).trainFromData?.(data.X, data.y);
      }
    }

    this.trained = true;
  }

  /**
   * Predict with hierarchical model
   */
  predict(x: number[] | number[][], topK: number = 3): HierarchicalELMResult[] {
    if (!this.trained) {
      throw new Error('Model must be trained before prediction');
    }

    const XArray = Array.isArray(x[0]) ? (x as number[][]) : [x as number[]];
    const allResults: HierarchicalELMResult[] = [];

    for (const xi of XArray) {
      const results = this._predictHierarchical(xi, topK);
      allResults.push(...results);
    }

    return allResults;
  }

  /**
   * Hierarchical prediction from root to leaf
   */
  private _predictHierarchical(x: number[], topK: number): HierarchicalELMResult[] {
    const rootELM = this.elms.get('root')!;
    const rootPred = (rootELM as any).predictFromVector?.([x], topK) || [];
    
    const allPaths: HierarchicalELMResult[] = [];

    // For each root prediction, explore children
    for (const rootPredItem of rootPred.slice(0, topK)) {
      const rootLabel = rootPredItem.label || this.rootCategories[rootPredItem.index || 0];
      const rootProb = rootPredItem.prob || 0;

      // Check if root has children
      const children = this.hierarchy.get(rootLabel);
      if (!children || children.length === 0) {
        // Leaf node
        allPaths.push({
          path: [rootLabel],
          label: rootLabel,
          prob: rootProb,
          levelProbs: [rootProb],
        });
        continue;
      }

      // Predict children
      const childELM = this.elms.get(rootLabel);
      if (childELM) {
        const childPred = (childELM as any).predictFromVector?.([x], topK) || [];
        
        for (const childPredItem of childPred.slice(0, topK)) {
          const childLabel = childPredItem.label || children[childPredItem.index || 0];
          const childProb = childPredItem.prob || 0;
          const combinedProb = rootProb * childProb;

          allPaths.push({
            path: [rootLabel, childLabel],
            label: childLabel,
            prob: combinedProb,
            levelProbs: [rootProb, childProb],
          });
        }
      } else {
        // No child ELM, use root
        allPaths.push({
          path: [rootLabel],
          label: rootLabel,
          prob: rootProb,
          levelProbs: [rootProb],
        });
      }
    }

    // Sort by probability and return top-K
    allPaths.sort((a, b) => b.prob - a.prob);
    return allPaths.slice(0, topK);
  }

  /**
   * Get hierarchy structure
   */
  getHierarchy(): Map<string, string[]> {
    return new Map(this.hierarchy);
  }

  /**
   * Get root categories
   */
  getRootCategories(): string[] {
    return [...this.rootCategories];
  }
}

