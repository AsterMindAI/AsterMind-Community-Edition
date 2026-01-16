// graph-elm.ts — Graph ELM for graph-structured data
// Graph neural network + ELM for node/edge classification

import { ELM } from '../core/ELM.js';
export interface GraphELMOptions {
  categories: string[];
  hiddenUnits?: number;
  aggregationType?: 'mean' | 'sum' | 'max'; // Node aggregation method
  numLayers?: number; // Number of graph convolution layers
  activation?: 'relu' | 'tanh' | 'sigmoid' | 'linear';
  maxLen?: number;
  useTokenizer?: boolean;
}

export interface GraphELMResult {
  label: string;
  prob: number;
  nodeFeatures?: number[]; // Extracted node features
}

export interface GraphNode {
  id: string | number;
  features: number[];
}

export interface GraphEdge {
  source: string | number;
  target: string | number;
  weight?: number;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Graph ELM for graph-structured data
 * Features:
 * - Node feature learning
 * - Graph structure encoding
 * - Edge-aware classification
 * - Graph convolution operations
 */
export class GraphELM {
  private elm: ELM;
  private categories: string[];
  private options: Required<GraphELMOptions>;
  private trained = false;
  private nodeFeatureMap: Map<string | number, number[]> = new Map();

  constructor(options: GraphELMOptions) {
        
    this.categories = options.categories;
    this.options = {
      categories: options.categories,
      hiddenUnits: options.hiddenUnits ?? 256,
      aggregationType: options.aggregationType ?? 'mean',
      numLayers: options.numLayers ?? 2,
      activation: options.activation ?? 'relu',
      maxLen: options.maxLen ?? 100,
      useTokenizer: options.useTokenizer ?? true,
    };
    
    this.elm = new ELM({
      useTokenizer: this.options.useTokenizer ? true : undefined,
      hiddenUnits: this.options.hiddenUnits,
      categories: this.options.categories,
      maxLen: this.options.maxLen,
      activation: this.options.activation,
    } as any);
  }

  /**
   * Train on graph data
   * @param graphs Array of graphs
   * @param y Labels for each graph (or node labels)
   */
  train(graphs: Graph[], y: number[] | string[]): void {
    // Prepare labels
    const labelIndices = y.map(label => 
      typeof label === 'number' 
        ? label 
        : this.options.categories.indexOf(label as string)
    );

    // Extract graph features
    const graphFeatures = graphs.map(graph => this._extractGraphFeatures(graph));
    
    // Train base ELM
    (this.elm as any).setCategories?.(this.options.categories);
    (this.elm as any).trainFromData?.(graphFeatures, labelIndices);
    
    this.trained = true;
  }

  /**
   * Extract features from graph structure
   */
  private _extractGraphFeatures(graph: Graph): number[] {
    // Build adjacency map
    const adjacencyMap = new Map<string | number, string[]>();
    for (const edge of graph.edges) {
      if (!adjacencyMap.has(edge.source)) {
        adjacencyMap.set(edge.source, []);
      }
      if (!adjacencyMap.has(edge.target)) {
        adjacencyMap.set(edge.target, []);
      }
      adjacencyMap.get(edge.source)!.push(String(edge.target));
      adjacencyMap.get(edge.target)!.push(String(edge.source));
    }

    // Compute node features through graph convolution
    const nodeFeatures = new Map<string | number, number[]>();
    
    // Initialize with node features
    for (const node of graph.nodes) {
      nodeFeatures.set(node.id, [...node.features]);
    }

    // Graph convolution layers
    for (let layer = 0; layer < this.options.numLayers; layer++) {
      const newFeatures = new Map<string | number, number[]>();
      
      for (const node of graph.nodes) {
        const neighbors = adjacencyMap.get(node.id) || [];
        const neighborFeatures = neighbors
          .map(nid => {
            const node = graph.nodes.find(n => String(n.id) === String(nid));
            return node ? nodeFeatures.get(node.id) : null;
          })
          .filter(f => f !== null) as number[][];

        // Aggregate neighbor features
        const aggregated = this._aggregateNeighbors(neighborFeatures);
        
        // Combine with self features
        const selfFeatures = nodeFeatures.get(node.id) || [];
        const combined = this._combineFeatures(selfFeatures, aggregated);
        
        newFeatures.set(node.id, combined);
      }
      
      // Update features
      for (const [id, features] of newFeatures) {
        nodeFeatures.set(id, features);
      }
    }

    // Aggregate all node features to graph-level features
    const allNodeFeatures = Array.from(nodeFeatures.values());
    const graphFeatures = this._aggregateNodes(allNodeFeatures);
    
    return graphFeatures;
  }

  /**
   * Aggregate neighbor features
   */
  private _aggregateNeighbors(neighborFeatures: number[][]): number[] {
    if (neighborFeatures.length === 0) {
      return [];
    }

    const dim = neighborFeatures[0].length;
    const aggregated = new Array(dim).fill(0);

    for (const features of neighborFeatures) {
      for (let i = 0; i < dim; i++) {
        if (this.options.aggregationType === 'mean') {
          aggregated[i] += features[i] / neighborFeatures.length;
        } else if (this.options.aggregationType === 'sum') {
          aggregated[i] += features[i];
        } else if (this.options.aggregationType === 'max') {
          aggregated[i] = Math.max(aggregated[i], features[i]);
        }
      }
    }

    return aggregated;
  }

  /**
   * Combine self and neighbor features
   */
  private _combineFeatures(self: number[], neighbors: number[]): number[] {
    const dim = Math.max(self.length, neighbors.length);
    const combined = new Array(dim).fill(0);

    for (let i = 0; i < dim; i++) {
      const selfVal = i < self.length ? self[i] : 0;
      const neighborVal = i < neighbors.length ? neighbors[i] : 0;
      combined[i] = selfVal + neighborVal; // Simple addition
    }

    // Apply activation
    if (this.options.activation === 'relu') {
      return combined.map(x => Math.max(0, x));
    } else if (this.options.activation === 'tanh') {
      return combined.map(x => Math.tanh(x));
    } else if (this.options.activation === 'sigmoid') {
      return combined.map(x => 1 / (1 + Math.exp(-x)));
    }
    
    return combined;
  }

  /**
   * Aggregate all node features to graph level
   */
  private _aggregateNodes(nodeFeatures: number[][]): number[] {
    if (nodeFeatures.length === 0) {
      return [];
    }

    const dim = nodeFeatures[0].length;
    const graphFeatures = new Array(dim).fill(0);

    for (const features of nodeFeatures) {
      for (let i = 0; i < dim; i++) {
        if (this.options.aggregationType === 'mean') {
          graphFeatures[i] += features[i] / nodeFeatures.length;
        } else if (this.options.aggregationType === 'sum') {
          graphFeatures[i] += features[i];
        } else if (this.options.aggregationType === 'max') {
          graphFeatures[i] = Math.max(graphFeatures[i], features[i]);
        }
      }
    }

    return graphFeatures;
  }

  /**
   * Predict on graph
   */
  predict(graph: Graph | Graph[], topK: number = 3): GraphELMResult[] {
    if (!this.trained) {
      throw new Error('Model must be trained before prediction');
    }

    const graphs = Array.isArray(graph) ? graph : [graph];
    const results: GraphELMResult[] = [];

    for (const g of graphs) {
      const graphFeatures = this._extractGraphFeatures(g);
      const preds = (this.elm as any).predictFromVector?.([graphFeatures], topK) || [];
      
      // Store node features for first node (for interpretability)
      const firstNodeFeatures = g.nodes.length > 0 
        ? this.nodeFeatureMap.get(g.nodes[0].id) || g.nodes[0].features
        : undefined;

      for (const pred of preds.slice(0, topK)) {
        results.push({
          label: pred.label || this.options.categories[pred.index || 0],
          prob: pred.prob || 0,
          nodeFeatures: firstNodeFeatures,
        });
      }
    }

    return results;
  }
}






