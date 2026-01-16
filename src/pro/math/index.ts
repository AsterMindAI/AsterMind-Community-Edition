// src/math/index.ts — production-grade numerics for Ω
// Backward compatible with previous exports; adds robust, stable helpers.

export type Vec = Float64Array;

// ---------- Constants
export const EPS = 1e-12;             // general epsilon for divides/sqrt
export const DISK_EPS = 0.95;         // strict radius for Poincaré-like ops
export const MAX_EXP = 709;           // ~ ln(Number.MAX_VALUE)
export const MIN_EXP = -745;          // ~ ln(Number.MIN_VALUE)

// ---------- Constructors / guards
export function zeros(n: number): Vec { return new Float64Array(n); }

export function isFiniteVec(a: ArrayLike<number>): boolean {
    const n = a.length;
    for (let i = 0; i < n; i++) if (!Number.isFinite(a[i] as number)) return false;
    return true;
}

export function asVec(a: ArrayLike<number>): Vec {
    // Copy into Float64Array for consistent math perf
    return a instanceof Float64Array ? a : new Float64Array(Array.from(a));
}

// ---------- Basic algebra (pure, allocation)
export function dot(a: Vec, b: Vec): number {
    const n = Math.min(a.length, b.length);
    let s = 0;
    for (let i = 0; i < n; i++) s += a[i] * b[i];
    return s;
}

export function add(a: Vec, b: Vec): Vec {
    const n = Math.min(a.length, b.length);
    const o = new Float64Array(n);
    for (let i = 0; i < n; i++) o[i] = a[i] + b[i];
    return o;
}

export function scal(a: Vec, k: number): Vec {
    const n = a.length;
    const o = new Float64Array(n);
    for (let i = 0; i < n; i++) o[i] = a[i] * k;
    return o;
}

export function hadamard(a: Vec, b: Vec): Vec {
    const n = Math.min(a.length, b.length);
    const o = new Float64Array(n);
    for (let i = 0; i < n; i++) o[i] = a[i] * b[i];
    return o;
}

export function tanhVec(a: Vec): Vec {
    const n = a.length;
    const o = new Float64Array(n);
    for (let i = 0; i < n; i++) o[i] = Math.tanh(a[i]);
    return o;
}

// ---------- In-place variants (underscore suffix) to reduce GC
export function add_(out: Vec, a: Vec, b: Vec): Vec {
    const n = Math.min(out.length, a.length, b.length);
    for (let i = 0; i < n; i++) out[i] = a[i] + b[i];
    return out;
}
export function scal_(out: Vec, a: Vec, k: number): Vec {
    const n = Math.min(out.length, a.length);
    for (let i = 0; i < n; i++) out[i] = a[i] * k;
    return out;
}
export function hadamard_(out: Vec, a: Vec, b: Vec): Vec {
    const n = Math.min(out.length, a.length, b.length);
    for (let i = 0; i < n; i++) out[i] = a[i] * b[i];
    return out;
}
export function tanhVec_(out: Vec, a: Vec): Vec {
    const n = Math.min(out.length, a.length);
    for (let i = 0; i < n; i++) out[i] = Math.tanh(a[i]);
    return out;
}

// ---------- Norms / normalization
export function l2(a: Vec): number {
    // robust L2 (avoids NaN on weird input)
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * a[i];
    return Math.sqrt(Math.max(0, s));
}

export function normalizeL2(a: Vec, eps = EPS): Vec {
    const nrm = l2(a);
    if (!(nrm > eps) || !Number.isFinite(nrm)) return new Float64Array(a.length); // zero vec
    const o = new Float64Array(a.length);
    const inv = 1 / nrm;
    for (let i = 0; i < a.length; i++) o[i] = a[i] * inv;
    return o;
}

export function clampVec(a: Vec, lo = -Infinity, hi = Infinity): Vec {
    const n = a.length, o = new Float64Array(n);
    for (let i = 0; i < n; i++) o[i] = Math.min(hi, Math.max(lo, a[i]));
    return o;
}

// ---------- Stats
export function mean(a: Vec): number {
    if (a.length === 0) return 0;
    let s = 0; for (let i = 0; i < a.length; i++) s += a[i];
    return s / a.length;
}

export function variance(a: Vec, mu = mean(a)): number {
    if (a.length === 0) return 0;
    let s = 0; for (let i = 0; i < a.length; i++) { const d = a[i] - mu; s += d * d; }
    return s / a.length;
}

export function standardize(a: Vec): Vec {
    const mu = mean(a);
    const v = variance(a, mu);
    const sd = Math.sqrt(Math.max(v, 0));
    if (!(sd > EPS)) {
        // zero-variance edge: return zeros to avoid blowing up downstream
        return new Float64Array(a.length);
    }
    const o = new Float64Array(a.length);
    const inv = 1 / sd;
    for (let i = 0; i < a.length; i++) o[i] = (a[i] - mu) * inv;
    return o;
}

// ---------- Cosine (robust)
export function cosine(a: ArrayLike<number>, b: ArrayLike<number>) {
    const n = Math.min(a.length, b.length);
    if (n === 0) return 0;
    let dotv = 0, na = 0, nb = 0;
    for (let i = 0; i < n; i++) {
        const ai = (a[i] ?? 0) as number, bi = (b[i] ?? 0) as number;
        dotv += ai * bi; na += ai * ai; nb += bi * bi;
    }
    const denom = Math.sqrt(Math.max(na * nb, EPS));
    const v = dotv / denom;
    return Number.isFinite(v) ? v : 0;
}

// ---------- Stable softmax / log-sum-exp
export function logSumExp(a: Vec): number {
    let m = -Infinity;
    for (let i = 0; i < a.length; i++) if (a[i] > m) m = a[i];
    if (!Number.isFinite(m)) m = 0;
    let s = 0;
    for (let i = 0; i < a.length; i++) s += Math.exp(Math.max(MIN_EXP, Math.min(MAX_EXP, a[i] - m)));
    return m + Math.log(Math.max(s, EPS));
}

export function softmax(a: Vec): Float64Array {
    const out = new Float64Array(a.length);
    const lse = logSumExp(a);
    for (let i = 0; i < a.length; i++) out[i] = Math.exp(Math.max(MIN_EXP, Math.min(MAX_EXP, a[i] - lse)));
    // tiny renorm to remove drift
    let s = 0; for (let i = 0; i < out.length; i++) s += out[i];
    const inv = 1 / Math.max(s, EPS);
    for (let i = 0; i < out.length; i++) out[i] *= inv;
    return out;
}

// ---------- Argmax / Top-K
export function argmax(a: ArrayLike<number>): number {
    if (a.length === 0) return -1;
    let idx = 0; let m = (a[0] ?? -Infinity) as number;
    for (let i = 1; i < a.length; i++) {
        const v = (a[i] ?? -Infinity) as number;
        if (v > m) { m = v; idx = i; }
    }
    return idx;
}

export function topK(a: ArrayLike<number>, k: number): { index: number; value: number }[] {
    const n = a.length;
    if (k <= 0 || n === 0) return [];
    const K = Math.min(k, n);
    // simple partial selection (O(nk)); fine for small k in UI
    const res: { index: number; value: number }[] = [];
    for (let i = 0; i < n; i++) {
        const v = (a[i] ?? -Infinity) as number;
        if (res.length < K) {
            res.push({ index: i, value: v });
            if (res.length === K) res.sort((x, y) => y.value - x.value);
        } else if (v > res[K - 1].value) {
            res[K - 1] = { index: i, value: v };
            res.sort((x, y) => y.value - x.value);
        }
    }
    return res;
}

// ---------- Safe exp/log/sigmoid
export function expSafe(x: number): number {
    return Math.exp(Math.max(MIN_EXP, Math.min(MAX_EXP, x)));
}
export function log1pSafe(x: number): number {
    // log(1+x) with guard (x>-1)
    const y = Math.max(x, -1 + EPS);
    return Math.log(1 + y);
}
export function sigmoid(x: number): number {
    if (x >= 0) {
        const z = Math.exp(-Math.min(x, MAX_EXP));
        return 1 / (1 + z);
    } else {
        const z = Math.exp(Math.max(x, MIN_EXP));
        return z / (1 + z);
    }
}

// ---------- Hyperbolic (proxy) distance with strict disk clamp
// Assumes inputs are already bounded; still clamps defensively.
export function hDistProxy(a: Vec, b: Vec): number {
    // clamp radii to avoid denom blow-ups
    let na = 0, nb = 0, sum = 0;
    for (let i = 0; i < a.length; i++) {
        const ai = Math.max(-DISK_EPS, Math.min(DISK_EPS, a[i]));
        const bi = Math.max(-DISK_EPS, Math.min(DISK_EPS, b[i]));
        na += ai * ai; nb += bi * bi;
        const d = ai - bi; sum += d * d;
    }
    const num = 2 * Math.sqrt(Math.max(0, sum));
    const den = Math.max(EPS, (1 - na) * (1 - nb));
    // smooth, monotone proxy; bounded growth; stable near boundary
    return Math.log1p(Math.min(2 * num / den, 1e12));
}

// ---------- Small utilities for UI formatting
export function fmtHead(a: ArrayLike<number>, n = 4, digits = 3): string {
    return Array.from(a).slice(0, n).map(v => (v as number).toFixed(digits)).join(", ");
}

// Re-export specialized math modules
export * from './rff.js';
export * from './online-ridge.js';
export * from './krr.js';
