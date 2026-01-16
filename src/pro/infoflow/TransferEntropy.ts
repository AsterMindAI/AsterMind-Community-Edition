// infoflow/TransferEntropy.ts
// Phase-1: streaming Transfer Entropy (TE) with linear-Gaussian approximation.
// TE(X→Y) ≈ 1/2 * log( Var[e | Y_past] / Var[e | Y_past, X_past] ), in nats (set bits=true for /ln2)

// License removed - all features are now free!

export type TEOptions = {
    window?: number;        // rolling window length
    condLags?: number;      // how many Y lags (>=1)
    xLags?: number;         // how many X lags (>=1)
    ridge?: number;         // small L2 for stability
    bits?: boolean;         // report bits instead of nats
};

type Vec = number[];
type Mat = number[][];

function zscore(v: number[]): number[] {
    const n = v.length || 1;
    let m = 0; for (const x of v) m += x; m /= n;
    let s2 = 0; for (const x of v) { const d = x - m; s2 += d * d; }
    const inv = 1 / Math.sqrt(s2 / Math.max(1, n - 1) || 1e-12);
    return v.map(x => (x - m) * inv);
}

function ridgeSolve(X: Mat, y: Vec, l2: number): Vec {
    // Solve (X^T X + l2 I) beta = X^T y via Cholesky (d is small here).
    const n = X.length, d = X[0]?.length || 0;
    if (!n || !d) return new Array(d).fill(0);
    const XtX = new Float64Array(d * d);
    const Xty = new Float64Array(d);
    for (let i = 0; i < n; i++) {
        const row = X[i];
        const yi = y[i];
        for (let j = 0; j < d; j++) {
            Xty[j] += row[j] * yi;
            for (let k = 0; k <= j; k++) XtX[j * d + k] += row[j] * row[k];
        }
    }
    for (let j = 0; j < d; j++) {
        for (let k = 0; k < j; k++) XtX[k * d + j] = XtX[j * d + k];
        XtX[j * d + j] += l2;
    }
    // Cholesky
    const L = new Float64Array(d * d);
    for (let i = 0; i < d; i++) {
        for (let j = 0; j <= i; j++) {
            let s = XtX[i * d + j];
            for (let k = 0; k < j; k++) s -= L[i * d + k] * L[j * d + k];
            L[i * d + j] = (i === j) ? Math.sqrt(Math.max(s, 1e-12)) : s / (L[j * d + j] || 1e-12);
        }
    }
    // Solve L z = Xty
    const z = new Float64Array(d);
    for (let i = 0; i < d; i++) {
        let s = Xty[i];
        for (let k = 0; k < i; k++) s -= L[i * d + k] * z[k];
        z[i] = s / (L[i * d + i] || 1e-12);
    }
    // Solve L^T beta = z
    const beta = new Float64Array(d);
    for (let i = d - 1; i >= 0; i--) {
        let s = z[i];
        for (let k = i + 1; k < d; k++) s -= L[k * d + i] * beta[k];
        beta[i] = s / (L[i * d + i] || 1e-12);
    }
    return Array.from(beta) as number[];
}

function mseResidual(X: Mat, y: Vec, beta: Vec): number {
    const n = X.length || 1;
    let s = 0;
    for (let i = 0; i < n; i++) {
        const row = X[i];
        let p = 0; for (let j = 0; j < row.length; j++) p += row[j] * beta[j];
        const e = y[i] - p;
        s += e * e;
    }
    return s / n;
}

// Build supervised datasets for Y_t and regressors made of past Y/X lags.
function makeDesign(ySeq: Vec[], xSeq: Vec[], L: number, LX: number) {
    // ySeq[i] and xSeq[i] are vectors at time i (we’ll average to 1D to keep it cheap)
    const y1d = ySeq.map(v => v.reduce((a, b) => a + b, 0) / Math.max(1, v.length));
    const x1d = xSeq.map(v => v.reduce((a, b) => a + b, 0) / Math.max(1, v.length));
    const N = y1d.length;
    const rowsY: Vec[] = [];
    const rowsYX: Vec[] = [];
    const target: Vec[] = [];
    for (let t = Math.max(L, LX); t < N; t++) {
        // target: current Y (scalar)
        target.push([y1d[t]]);
        // past Y
        const ylags: number[] = [];
        for (let k = 1; k <= L; k++) ylags.push(y1d[t - k]);
        // past X
        const xlags: number[] = [];
        for (let k = 1; k <= LX; k++) xlags.push(x1d[t - k]);
        rowsY.push(ylags);
        rowsYX.push([...ylags, ...xlags]);
    }
    // standardize columns for stability
    const colZ = (M: Mat) => {
        const n = M.length, d = M[0]?.length || 0;
        const out: Mat = Array.from({ length: n }, () => new Array(d).fill(0));
        for (let j = 0; j < d; j++) {
            const col = new Array(n);
            for (let i = 0; i < n; i++) col[i] = M[i][j];
            const zs = zscore(col);
            for (let i = 0; i < n; i++) out[i][j] = zs[i];
        }
        return out;
    };
    return { XY: colZ(rowsY), XYX: colZ(rowsYX), y: target.map(v => v[0]) };
}

export class TransferEntropy {
    private xBuf: Vec[] = [];
    private yBuf: Vec[] = [];
    private opts: Required<TEOptions>;

    constructor(opts: TEOptions = {}) {
        this.opts = {
            window: 256,
            condLags: 1,
            xLags: 1,
            ridge: 1e-3,
            bits: true,
            ...opts
        };
    }

    /** Push a synchronized sample pair (vectors OK). */
    push(x: number[] | number, y: number[] | number) {
        const X = Array.isArray(x) ? x : [x];
        const Y = Array.isArray(y) ? y : [y];
        this.xBuf.push(X); this.yBuf.push(Y);
        const W = this.opts.window;
        if (this.xBuf.length > W) { this.xBuf.shift(); this.yBuf.shift(); }
    }

    /** Estimate TE(X→Y) over the current window. */
    estimate(): number {
        const n = this.xBuf.length;
        const L = Math.max(1, this.opts.condLags | 0);
        const LX = Math.max(1, this.opts.xLags | 0);
        if (n < Math.max(L, LX) + 5) return 0;

        const { XY, XYX, y } = makeDesign(this.yBuf, this.xBuf, L, LX);
        if (!XY.length || !XYX.length) return 0;

        // H1: regress Y_t on Y_{t-1..t-L}
        const b1 = ridgeSolve(XY, y, this.opts.ridge);
        const v1 = mseResidual(XY, y, b1);

        // H2: regress Y_t on [Y_{t-1..t-L}, X_{t-1..t-L}]
        const b2 = ridgeSolve(XYX, y, this.opts.ridge);
        const v2 = mseResidual(XYX, y, b2);

        // TE ≈ 0.5 * log( v1 / v2 )
        const teNats = 0.5 * Math.log(Math.max(1e-12, v1) / Math.max(1e-12, v2));
        const te = Math.max(0, teNats); // no negatives (numerical guard)
        return this.opts.bits ? (te / Math.LN2) : te;
    }
}

export class InfoFlowGraph {
    private monitors = new Map<string, TransferEntropy>();
    constructor(private defaultOpts: TEOptions = {}) {
        // License check removed // Premium feature - requires valid license
    }
    get(name: string): TransferEntropy {
        if (!this.monitors.has(name)) this.monitors.set(name, new TransferEntropy(this.defaultOpts));
        return this.monitors.get(name)!;
    }
    snapshot(): Record<string, number> {
        const out: Record<string, number> = {};
        for (const [k, mon] of this.monitors) out[k] = Number(mon.estimate().toFixed(4));
        return out;
    }
}
