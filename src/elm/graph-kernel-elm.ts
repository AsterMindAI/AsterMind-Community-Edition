// graph-kernel-elm.ts — Graph Kernel ELM
// Graph kernels (Weisfeiler-Lehman, etc.) for graph structure encoding

import { KernelELM } from '../core/KernelELM.js';
import type { Graph, GraphNode, GraphEdge } from './graph-elm.js';

export interface GraphKernelELMOptions {
  categories: string[];
  kernelType?: 'weisfeiler-lehman' | 'shortest-path' | 'random-walk';
  wlIterations?: number; // Weisfeiler-Lehman iterations
  kernel?: 'rbf' | 'polynomial' | 'linear' | 'sigmoid';
  gamma?: number;
  degree?: number;
  coef0?: number;
  activation?: 'relu' | 'tanh' | 'sigmoid' | 'linear';
}

export interface GraphKernelELMResult {
  label: string;
  prob: number;
}

/**
 * Graph Kernel ELM
 * Features:
 * - Graph kernels (Weisfeiler-Lehman, shortest-path, random-walk)
 * - Graph structure encoding
 * - Node classification/regression
 */
export class GraphKernelELM {
  private kelm: KernelELM;
  private categories: string[];
  private options: Required<GraphKernelELMOptions>;
  private trained = false;

  constructor(options: GraphKernelELMOptions) {
        
    this.categories = options.categories;
    this.options = {
      categories: options.categories,
      kernelType: options.kernelType ?? 'weisfeiler-lehman',
      wlIterations: options.wlIterations ?? 3,
      kernel: options.kernel ?? 'rbf',
      gamma: options.gamma ?? 1.0,
      degree: options.degree ?? 2,
      coef0: options.coef0 ?? 0,
      activation: options.activation ?? 'relu',
    };
    
    this.kelm = new KernelELM({
      categories: this.options.categories,
      kernel: this.options.kernel,
      gamma: this.options.gamma,
      degree: this.options.degree,
      coef0: this.options.coef0,
    } as any);
  }

  /**
   * Train on graphs
   */
  train(graphs: Graph[], y: number[] | string[]): void {
    // Prepare labels
    const labelIndices = y.map(label => 
      typeof label === 'number' 
        ? label 
        : this.options.categories.indexOf(label as string)
    );

    // Compute graph kernel features
    const features = this._computeGraphKernelFeatures(graphs);
    
    // Train KELM
    (this.kelm as any).setCategories?.(this.options.categories);
    (this.kelm as any).trainFromData?.(features, labelIndices);
    
    this.trained = true;
  }

  /**
   * Compute graph kernel features
   */
  private _computeGraphKernelFeatures(graphs: Graph[]): number[][] {
    const features: number[][] = [];
    
    for (const graph of graphs) {
      let graphFeatures: number[];
      
      if (this.options.kernelType === 'weisfeiler-lehman') {
        graphFeatures = this._weisfeilerLehmanKernel(graph);
      } else if (this.options.kernelType === 'shortest-path') {
        graphFeatures = this._shortestPathKernel(graph);
      } else {
        graphFeatures = this._randomWalkKernel(graph);
      }
      
      features.push(graphFeatures);
    }
    
    return features;
  }

  /**
   * Weisfeiler-Lehman kernel
   */
  private _weisfeilerLehmanKernel(graph: Graph): number[] {
    const features: number[] = [];
    const nodeLabels = new Map<string | number, string>();
    
    // Initialize labels with node features
    for (const node of graph.nodes) {
      const label = node.features.join(',');
      nodeLabels.set(node.id, label);
    }
    
    // WL iterations
    for (let iter = 0; iter < this.options.wlIterations; iter++) {
      const newLabels = new Map<string | number, string>();
      
      for (const node of graph.nodes) {
        // Get neighbor labels
        const neighbors = graph.edges
          .filter(e => e.source === node.id || e.target === node.id)
          .map(e => e.source === node.id ? e.target : e.source);
        
        const neighborLabels = neighbors
          .map(nid => nodeLabels.get(nid) || '')
          .sort()
          .join(',');
        
        // New label = current label + sorted neighbor labels
        const newLabel = `${nodeLabels.get(node.id)}|${neighborLabels}`;
        newLabels.set(node.id, newLabel);
      }
      
      // Count label frequencies
      const labelCounts = new Map<string, number>();
      for (const label of newLabels.values()) {
        labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
      }
      
      // Add to features
      for (const [label, count] of labelCounts) {
        features.push(count);
      }
      
      nodeLabels.clear();
      for (const [id, label] of newLabels) {
        nodeLabels.set(id, label);
      }
    }
    
    return features.length > 0 ? features : new Array(10).fill(0);
  }

  /**
   * Shortest-path kernel
   */
  private _shortestPathKernel(graph: Graph): number[] {
    // Compute shortest paths between all pairs
    const distances = this._computeShortestPaths(graph);
    
    // Create histogram of distances
    const maxDist = Math.max(...distances.flat().filter(d => d < Infinity));
    const bins = Math.min(10, maxDist + 1);
    const histogram = new Array(bins).fill(0);
    
    for (const row of distances) {
      for (const dist of row) {
        if (dist < Infinity) {
          const bin = Math.min(Math.floor(dist), bins - 1);
          histogram[bin]++;
        }
      }
    }
    
    return histogram;
  }

  /**
   * Random-walk kernel
   */
  private _randomWalkKernel(graph: Graph): number[] {
    // Simplified random-walk kernel
    const features: number[] = [];
    
    // Node degree distribution
    const degrees = new Map<string | number, number>();
    for (const edge of graph.edges) {
      degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
      degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
    }
    
    const degreeHist = new Array(10).fill(0);
    for (const degree of degrees.values()) {
      const bin = Math.min(degree, 9);
      degreeHist[bin]++;
    }
    
    features.push(...degreeHist);
    
    // Graph statistics
    features.push(graph.nodes.length);
    features.push(graph.edges.length);
    features.push(graph.nodes.length > 0 ? graph.edges.length / graph.nodes.length : 0);
    
    return features;
  }

  /**
   * Compute shortest paths (Floyd-Warshall simplified)
   */
  private _computeShortestPaths(graph: Graph): number[][] {
    const n = graph.nodes.length;
    const dist: number[][] = Array(n).fill(null).map(() => Array(n).fill(Infinity));
    
    // Initialize
    for (let i = 0; i < n; i++) {
      dist[i][i] = 0;
    }
    
    // Add edges
    for (const edge of graph.edges) {
      const srcIdx = graph.nodes.findIndex(n => n.id === edge.source);
      const tgtIdx = graph.nodes.findIndex(n => n.id === edge.target);
      if (srcIdx >= 0 && tgtIdx >= 0) {
        dist[srcIdx][tgtIdx] = 1;
        dist[tgtIdx][srcIdx] = 1;
      }
    }
    
    // Floyd-Warshall
    for (let k = 0; k < n; k++) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (dist[i][k] + dist[k][j] < dist[i][j]) {
            dist[i][j] = dist[i][k] + dist[k][j];
          }
        }
      }
    }
    
    return dist;
  }

  /**
   * Predict on graphs
   */
  predict(graphs: Graph | Graph[], topK: number = 3): GraphKernelELMResult[] {
    if (!this.trained) {
      throw new Error('Model must be trained before prediction');
    }

    const graphArray = Array.isArray(graphs) ? graphs : [graphs];
    const features = this._computeGraphKernelFeatures(graphArray);
    const results: GraphKernelELMResult[] = [];

    for (const feature of features) {
      const preds = (this.kelm as any).predictFromVector?.([feature], topK) || [];
      
      for (const pred of preds.slice(0, topK)) {
        results.push({
          label: pred.label || this.options.categories[pred.index || 0],
          prob: pred.prob || 0,
        });
      }
    }

    return results;
  }
}






