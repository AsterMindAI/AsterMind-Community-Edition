
// elm_scorer.ts — tiny, self-contained ELM scorer for (query, chunk) relevance
// Uses a random single hidden layer + ridge (closed form via OnlineRidge).
// 
// NOTE: You can also use astermind's ELM or OnlineELM classes from the local build:
// import { ELM, OnlineELM, defaultNumericConfig } from '@astermind/astermind-elm';

// License removed - all features are now free!
import { OnlineRidge } from "../math/online-ridge.js";

export type ProELMConfig = {
  dim: number;      // hidden units
  lambda: number;   // ridge on output
  seed?: number;
};

function rngFactory(seed = 1337) {
  // xorshift32
  let x = (seed >>> 0) || 1;
  return () => {
    x ^= x << 13; x ^= x >> 17; x ^= x << 5;
    return ((x >>> 0) / 0xFFFFFFFF);
  };
}

export class ELMScorer {
  readonly p: number;             // input feature dim
  readonly dim: number;
  readonly lambda: number;
  W: Float64Array;                // (dim x p)
  b: Float64Array;                // (dim)
  ridge: OnlineRidge | null;
  ready: boolean;

  constructor(p: number, cfg: ProELMConfig) {
    // License check removed // License check - ELMScorer uses premium OnlineRidge
    this.p = p;
    this.dim = Math.max(8, cfg.dim | 0);
    this.lambda = Math.max(1e-6, cfg.lambda);
    const rng = rngFactory(cfg.seed ?? 1337);
    this.W = new Float64Array(this.dim * p);
    for (let i = 0; i < this.W.length; i++) this.W[i] = (rng() * 2 - 1) * Math.sqrt(2 / p);
    this.b = new Float64Array(this.dim);
    for (let i = 0; i < this.b.length; i++) this.b[i] = (rng() * 2 - 1);
    this.ridge = new OnlineRidge(this.dim, 1, this.lambda);
    this.ready = false;
  }

  private hidden(x: number[]): Float64Array {
    const h = new Float64Array(this.dim);
    for (let j = 0; j < this.dim; j++) {
      let s = this.b[j];
      const row = j * this.p;
      for (let i = 0; i < this.p; i++) s += this.W[row + i] * x[i];
      // GELU-ish smooth nonlinearity (fast approximate)
      const t = s;
      h[j] = 0.5 * t * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (t + 0.044715 * Math.pow(t, 3))));
    }
    return h;
  }

  partialFit(batchX: number[][], batchY: number[]) {
    if (!this.ridge) this.ridge = new OnlineRidge(this.dim, 1, this.lambda);
    for (let k = 0; k < batchX.length; k++) {
      const h = this.hidden(batchX[k]);                     // Float64Array
      const y = new Float64Array([batchY[k]]);              // <-- make it Float64Array
      this.ridge.update(h, y);
    }
    this.ready = true;
  }

  fit(X: number[][], y: number[], iters = 1, batch = 256) {
    const n = X.length;
    for (let t = 0; t < iters; t++) {
      for (let i = 0; i < n; i += batch) {
        const xb = X.slice(i, i + batch);
        const yb = y.slice(i, i + batch);
        this.partialFit(xb, yb);
      }
    }
    this.ready = true;
  }

  score(x: number[]): number {
    if (!this.ready || !this.ridge) return 0;
    const h = this.hidden(x);
    // y = h^T Beta (single output)
    const Beta = this.ridge.Beta;
    let s = 0;
    for (let j = 0; j < this.dim; j++) s += h[j] * Beta[j];
    return s;
  }
}
