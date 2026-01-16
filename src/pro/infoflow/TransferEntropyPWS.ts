// src/infoflow/TransferEntropyPWS.ts
// Phase-2 TE-PWS: importance sampling for rare events + path-weight sampling (PWS)
// API mirrors Phase-1 so it plugs in with minimal edits.

// License removed - all features are now free!

export type TEBaseOpts = {
    window?: number;          // rolling buffer (default 256)
    condLags?: number;        // past Y lags to condition on (default 1)
    xLags?: number;           // past X lags to condition on (default 1)
    normalize?: boolean;      // return bits/symbol
};

export type PWSOpts = TEBaseOpts & {
    // Importance sampling / rare events
    tailQuantile?: number;    // mark rare events by Δ||Y|| above this quantile (default 0.9)
    tailBoost?: number;       // multiplicative weight for rare samples (default 4)
    decay?: number;           // exponential time decay (0..1], default 1 (off)

    // Path-weight sampling
    usePWS?: boolean;         // if true, estimate() will call estimatePWS()
    jitterSigma?: number;     // noise scale for perturbed histories as fraction of Y std (default 0.15)
    pwsIters?: number;        // number of jittered paths per sample (default 8)

    // Kernel density
    bandwidth?: number;       // KDE bandwidth scale (auto if not set)
    ridge?: number;           // density floor to avoid log(0) (default 1e-6)

    // Output
    bits?: boolean;           // return bits (log2) vs nats
};

type Vec = number[];
type Mat = number[][];

// --- small helpers ---
function meanStd(arr: number[]): { m: number, s: number } {
    if (arr.length === 0) return { m: 0, s: 0 };
    let m = 0; for (const v of arr) m += v; m /= arr.length;
    let v = 0; for (const x of arr) { const d = x - m; v += d * d; }
    return { m, s: Math.sqrt(v / Math.max(1, arr.length)) || 1e-12 };
}
function l2(a: number[]) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * a[i]; return Math.sqrt(s); }
function sub(a: number[], b: number[]) { const n = Math.min(a.length, b.length); const o = new Array(n); for (let i = 0; i < n; i++) o[i] = a[i] - b[i]; return o; }
function concat(a: number[], b: number[]) { const o = new Array(a.length + b.length); let k = 0; for (const v of a) o[k++] = v; for (const v of b) o[k++] = v; return o; }
function gaussian(x: number, s: number) { const ss = s * s || 1e-12; return Math.exp(-0.5 * x * x / ss) / Math.sqrt(2 * Math.PI * ss); }
function gaussianVec(a: number[], b: number[], s: number) {
    // product kernel with shared bandwidth
    const n = Math.min(a.length, b.length);
    let q = 0; for (let i = 0; i < n; i++) { const d = a[i] - b[i]; q += d * d; }
    const ss = s * s || 1e-12;
    return Math.exp(-0.5 * q / ss) / Math.pow(Math.sqrt(2 * Math.PI * ss), n);
}

export class TransferEntropyPWS {
    private opts: Required<PWSOpts>;
    private xBuf: Vec[] = [];
    private yBuf: Vec[] = [];
    private yDiffBuf: number[] = []; // ||ΔY|| magnitude for rarity
    private wBuf: number[] = [];     // per-sample weights (importance * decay)

    constructor(opts: PWSOpts = {}) {
        this.opts = {
            window: 256, condLags: 1, xLags: 1, normalize: true,
            tailQuantile: 0.9, tailBoost: 4, decay: 1.0,
            usePWS: false, jitterSigma: 0.15, pwsIters: 8,
            bandwidth: 0, ridge: 1e-6, bits: true,
            ...opts
        };
    }

    /** Push one synchronized sample (vectors OK). */
    push(x: number[] | number, y: number[] | number) {
        const X = Array.isArray(x) ? x.slice() : [x];
        const Y = Array.isArray(y) ? y.slice() : [y];
        // Δ||Y|| for rarity
        const prev = this.yBuf.length ? this.yBuf[this.yBuf.length - 1] : Y;
        const d = l2(sub(Y, prev));
        this.xBuf.push(X); this.yBuf.push(Y); this.yDiffBuf.push(d);

        // time decay (most recent → weight 1)
        const tDecay = this.opts.decay;
        const wDecay = tDecay < 1 && this.xBuf.length > 1
            ? Math.pow(tDecay, this.xBuf.length - 1)
            : 1;

        // placeholder weight now; we’ll update after we know tail threshold
        this.wBuf.push(wDecay);

        // maintain window
        while (this.xBuf.length > this.opts.window) {
            this.xBuf.shift(); this.yBuf.shift(); this.yDiffBuf.shift(); this.wBuf.shift();
        }
    }

    /** Basic Phase-2 call: choose PWS or vanilla IS+KDE based on opts.usePWS */
    estimate(): number {
        return this.opts.usePWS ? this.estimatePWS() : this.estimateIS();
    }

    /** Vanilla importance-weighted TE via KDE (no path jitter). */
    estimateIS(): number {
        const N = this.yBuf.length;
        const L = Math.max(1, this.opts.condLags | 0);
        const LX = Math.max(1, this.opts.xLags | 0);
        if (N <= Math.max(L, LX) + 2) return 0;

        // compute tail threshold on recent Δ||Y||
        const diffs = this.yDiffBuf.slice();
        const thr = quantile(diffs, this.opts.tailQuantile);
        // update importance weights
        for (let i = 0; i < this.wBuf.length; i++) {
            const tail = diffs[i] >= thr ? this.opts.tailBoost : 1;
            this.wBuf[i] = Math.max(1e-8, this.wBuf[i] * tail);
        }

        // Build contexts
        const samples: { y: Vec, yPast: Vec, xPast: Vec, w: number }[] = [];
        for (let t = Math.max(L, LX); t < N; t++) {
            const y = this.yBuf[t];
            const yPast = stackPast(this.yBuf, t, L);
            const xPast = stackPast(this.xBuf, t, LX);
            samples.push({ y, yPast, xPast, w: this.wBuf[t] });
        }
        if (samples.length < 4) return 0;

        // bandwidth selection
        const ySc = flatten(samples.map(s => s.y));
        const b = this.opts.bandwidth > 0 ? this.opts.bandwidth
            : silverman(ySc);

        // H(Y|Ypast) and H(Y|Ypast,Xpast) via KDE density ratio
        const HY_Y = condEntropyKDE(samples, 'yPast', b, this.opts.ridge);
        const HY_YX = condEntropyKDE(samples, 'yPast+xPast', b, this.opts.ridge);

        const te = Math.max(0, HY_Y - HY_YX); // >= 0 numerically clipped
        return this.opts.bits ? te / Math.log(2) : te;
    }

    /** Path-Weight Sampling: jitter past contexts, average conditional entropies. */
    estimatePWS(): number {
        const N = this.yBuf.length;
        const L = Math.max(1, this.opts.condLags | 0);
        const LX = Math.max(1, this.opts.xLags | 0);
        if (N <= Math.max(L, LX) + 2) return 0;

        // tail-aware importance weights
        const diffs = this.yDiffBuf.slice();
        const thr = quantile(diffs, this.opts.tailQuantile);
        for (let i = 0; i < this.wBuf.length; i++) {
            const tail = diffs[i] >= thr ? this.opts.tailBoost : 1;
            this.wBuf[i] = Math.max(1e-8, this.wBuf[i] * tail);
        }

        const samples: { y: Vec, yPast: Vec, xPast: Vec, w: number }[] = [];
        for (let t = Math.max(L, LX); t < N; t++) {
            const y = this.yBuf[t];
            const yPast = stackPast(this.yBuf, t, L);
            const xPast = stackPast(this.xBuf, t, LX);
            samples.push({ y, yPast, xPast, w: this.wBuf[t] });
        }
        if (samples.length < 4) return 0;

        const ySc = flatten(samples.map(s => s.y));
        const b = this.opts.bandwidth > 0 ? this.opts.bandwidth : silverman(ySc);
        const J = Math.max(1, this.opts.pwsIters | 0);
        const jSig = this.opts.jitterSigma;

        // baseline entropies
        const baseHY_Y = condEntropyKDE(samples, 'yPast', b, this.opts.ridge);
        const baseHY_YX = condEntropyKDE(samples, 'yPast+xPast', b, this.opts.ridge);

        // jittered contexts
        let accY = 0, accYX = 0;
        for (let j = 0; j < J; j++) {
            const jittered = jitterSamples(samples, jSig);
            accY += condEntropyKDE(jittered, 'yPast', b, this.opts.ridge);
            accYX += condEntropyKDE(jittered, 'yPast+xPast', b, this.opts.ridge);
        }
        const HY_Y = 0.5 * baseHY_Y + 0.5 * (accY / J);
        const HY_YX = 0.5 * baseHY_YX + 0.5 * (accYX / J);

        const te = Math.max(0, HY_Y - HY_YX);
        return this.opts.bits ? te / Math.log(2) : te;
    }
}

/** Manage many labeled links, PWS-enabled. Same API as Phase-1. */
export class InfoFlowGraphPWS {
    private monitors = new Map<string, TransferEntropyPWS>();
    constructor(private defaultOpts: PWSOpts = {}) {
        // License check removed // Premium feature - requires valid license
    }
    get(name: string): TransferEntropyPWS {
        if (!this.monitors.has(name)) this.monitors.set(name, new TransferEntropyPWS(this.defaultOpts));
        return this.monitors.get(name)!;
    }
    snapshot(): Record<string, number> {
        const out: Record<string, number> = {};
        for (const [k, mon] of this.monitors) out[k] = mon.estimate();
        return out;
    }
}

// ========================= internals =========================

function stackPast(buf: Vec[], t: number, L: number): Vec {
    const out: number[] = [];
    for (let l = 1; l <= L; l++) {
        const v = buf[t - l] ?? buf[0];
        for (let i = 0; i < v.length; i++) out.push(v[i]);
    }
    return out;
}
function flatten(mats: Vec[]): number[] {
    const out: number[] = [];
    for (const v of mats) for (const x of v) out.push(x);
    return out;
}
function silverman(vals: number[]): number {
    // Silverman's rule-of-thumb for Gaussian KDE (per-dim averaged)
    if (vals.length < 2) return 1;
    const { s } = meanStd(vals);
    const n = vals.length;
    return 1.06 * s * Math.pow(n, -1 / 5); // scalar, used for product kernel
}
function quantile(arr: number[], q: number): number {
    if (arr.length === 0) return 0;
    const a = arr.slice().sort((x, y) => x - y);
    const idx = Math.min(a.length - 1, Math.max(0, Math.floor(q * (a.length - 1))));
    return a[idx];
}

type Sample = { y: Vec, yPast: Vec, xPast: Vec, w: number };

function condEntropyKDE(samples: Sample[], mode: 'yPast' | 'yPast+xPast', bw: number, ridge: number): number {
    // H(Y|C) ≈ E[-log p(y|c)] with KDE ratio: p(y,c)/p(c)
    // Use importance weights w and product Gaussian kernels with shared bw.
    const useXY = mode === 'yPast+xPast';
    let totalW = 0, acc = 0;

    // Pre-extract contexts
    const C: Vec[] = samples.map(s => useXY ? concat(s.yPast, s.xPast) : s.yPast);
    const Y: Vec[] = samples.map(s => s.y);
    const W: number[] = samples.map(s => s.w);
    for (let i = 0; i < samples.length; i++) {
        const ci = C[i], yi = Y[i], wi = W[i];
        // joint density p(y,c) ~ sum_j w_j K_c(ci,cj) K_y(yi,yj)
        // context density p(c)  ~ sum_j w_j K_c(ci,cj)
        let num = 0, den = 0;
        for (let j = 0; j < samples.length; j++) {
            const kc = gaussianVec(ci, C[j], bw);
            den += W[j] * kc;
            num += W[j] * kc * gaussianVec(yi, Y[j], bw);
        }
        const p = Math.max(ridge, num / Math.max(ridge, den));
        acc += -Math.log(p) * wi;
        totalW += wi;
    }
    return (totalW > 0) ? acc / totalW : 0;
}

function jitterSamples(samples: Sample[], sigmaFrac: number): Sample[] {
    if (sigmaFrac <= 0) return samples;
    // Estimate per-dim std of yPast across buffer to scale jitter
    const allYp = samples.map(s => s.yPast);
    const dims = allYp[0]?.length || 0;
    const perDim: number[] = new Array(dims).fill(0);
    // compute std per dim
    for (let d = 0; d < dims; d++) {
        const vals: number[] = [];
        for (const v of allYp) vals.push(v[d] ?? 0);
        perDim[d] = meanStd(vals).s || 1e-3;
    }

    // jitter
    const out: Sample[] = new Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        const yp = s.yPast.slice();
        for (let d = 0; d < yp.length; d++) {
            const z = gauss() * sigmaFrac * perDim[d];
            yp[d] += z;
        }
        out[i] = { y: s.y, yPast: yp, xPast: s.xPast, w: s.w };
    }
    return out;
}

function gauss() {
    // Box-Muller
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
