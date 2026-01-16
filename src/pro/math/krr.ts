// krr.ts
export interface RidgeOptions {
    lambda?: number;        // base ridge
    ensureSymmetry?: boolean;
    jitterInit?: number;    // starting extra jitter, e.g., 1e-10
    jitterMax?: number;     // max extra jitter to try, e.g., 1e-1
    jitterFactor?: number;  // multiplier per retry, e.g., 10
    cgTol?: number;         // residual tolerance for CG fallback
    cgMaxIter?: number;     // max iterations for CG
    abortSignal?: AbortSignal; // allow cancellation
}

export interface RidgeResult {
    Theta: number[][];
    usedLambda: number;
    method: "cholesky" | "cg";
    iters?: number;         // CG iterations per RHS (max)
    info: string[];         // diagnostics
}

function isFiniteMatrix(M: number[][]) {
    for (let i = 0; i < M.length; i++) {
        const row = M[i];
        if (!row || row.length !== M[0].length) return false;
        for (let j = 0; j < row.length; j++) {
            const v = row[j];
            if (!Number.isFinite(v)) return false;
        }
    }
    return true;
}

function symmetrize(A: number[][]) {
    const n = A.length;
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const v = 0.5 * (A[i][j] + A[j][i]);
            A[i][j] = v; A[j][i] = v;
        }
    }
}

function choleskySolve(A: number[][], Y: number[][]) {
    const n = A.length, m = Y[0].length;
    // L
    const L = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
        for (let j = 0; j <= i; j++) {
            let sum = A[i][j];
            for (let k = 0; k < j; k++) sum -= L[i][k] * L[j][k];
            if (i === j) {
                if (!(sum > 0) || !Number.isFinite(sum)) return null; // not PD
                L[i][j] = Math.sqrt(sum);
            } else {
                L[i][j] = sum / L[j][j];
            }
        }
    }
    // forward solve: L Z = Y
    const Z = Array.from({ length: n }, () => Array(m).fill(0));
    for (let c = 0; c < m; c++) {
        for (let i = 0; i < n; i++) {
            let s = Y[i][c];
            for (let k = 0; k < i; k++) s -= L[i][k] * Z[k][c];
            Z[i][c] = s / L[i][i];
        }
    }
    // back solve: L^T Θ = Z
    const Theta = Array.from({ length: n }, () => Array(m).fill(0));
    for (let c = 0; c < m; c++) {
        for (let i = n - 1; i >= 0; i--) {
            let s = Z[i][c];
            for (let k = i + 1; k < n; k++) s -= L[k][i] * Theta[k][c];
            Theta[i][c] = s / L[i][i];
        }
    }
    return { Theta, L };
}

// CG fallback for SPD system A x = b, where A is given as matrix
function cgSolve(A: number[][], b: number[], tol: number, maxIter: number): { x: number[]; iters: number } {
    const n = A.length;
    const x = new Array(n).fill(0);
    const r = b.slice(); // r = b - A x = b initially
    const p = r.slice();
    let rsold = dot(r, r);
    let it = 0;

    for (; it < maxIter; it++) {
        const Ap = matvec(A, p);
        const alpha = rsold / Math.max(1e-300, dot(p, Ap));
        for (let i = 0; i < n; i++) x[i] += alpha * p[i];
        for (let i = 0; i < n; i++) r[i] -= alpha * Ap[i];
        const rsnew = dot(r, r);
        if (Math.sqrt(rsnew) <= tol) break;
        const beta = rsnew / Math.max(1e-300, rsold);
        for (let i = 0; i < n; i++) p[i] = r[i] + beta * p[i];
        rsold = rsnew;
    }
    return { x, iters: it + 1 };
}

function dot(a: number[], b: number[]) {
    let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s;
}
function matvec(A: number[][], x: number[]) {
    const n = A.length, out = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
        const Ai = A[i]; let s = 0;
        for (let j = 0; j < n; j++) s += Ai[j] * x[j];
        out[i] = s;
    }
    return out;
}

/**
 * Production-grade ridge regression solver:
 * Solves (K + λ I) Θ = Y, with symmetry enforcement, adaptive jitter, and CG fallback.
 */
export function ridgeSolvePro(K: number[][], Y: number[][], opts: RidgeOptions = {}): RidgeResult {
    const info: string[] = [];
    const n = K.length;
    if (n === 0) return { Theta: [], usedLambda: opts.lambda ?? 1e-4, method: "cholesky", info: ["empty system"] };
    if (!isFiniteMatrix(K)) throw new Error("K contains NaN/Inf or ragged rows");
    if (!Array.isArray(Y) || Y.length !== n || Y[0].length === undefined) throw new Error("Y shape mismatch");
    if (!isFiniteMatrix(Y)) throw new Error("Y contains NaN/Inf");

    const m = Y[0].length;

    const baseLambda = Math.max(0, opts.lambda ?? 1e-4);
    const ensureSym = opts.ensureSymmetry ?? true;
    let jitter = opts.jitterInit ?? 1e-10;
    const jitterMax = opts.jitterMax ?? 1e-1;
    const jitterFactor = opts.jitterFactor ?? 10;

    // Build A = (symmetrized K) + (lambda + jitter) I
    const A: number[][] = Array.from({ length: n }, (_, i) => K[i].slice());
    if (ensureSym) symmetrize(A);

    // Try Cholesky with increasing jitter
    let usedLambda = baseLambda;
    while (true) {
        if (opts.abortSignal?.aborted) throw new Error("ridgeSolvePro aborted");
        // add diag
        for (let i = 0; i < n; i++) A[i][i] = (ensureSym ? A[i][i] : (A[i][i] + A[i][i]) * 0.5) + usedLambda;

        const chol = choleskySolve(A, Y);
        if (chol) {
            info.push(`Cholesky ok with lambda=${usedLambda.toExponential(2)}`);
            return { Theta: chol.Theta, usedLambda, method: "cholesky", info };
        } else {
            // remove the just-added lambda before next try
            for (let i = 0; i < n; i++) A[i][i] -= usedLambda;
            if (jitter > jitterMax) {
                info.push(`Cholesky failed up to jitter=${jitterMax}; falling back to CG`);
                break;
            }
            usedLambda = baseLambda + jitter;
            info.push(`Cholesky failed; retry with lambda=${usedLambda.toExponential(2)}`);
            jitter *= jitterFactor;
        }
    }

    // CG fallback: solve A Θ = Y column-wise
    // Rebuild A once with final usedLambda
    for (let i = 0; i < n; i++) A[i][i] = (ensureSym ? A[i][i] : (A[i][i] + A[i][i]) * 0.5) + usedLambda;

    const tol = opts.cgTol ?? 1e-6;
    const maxIter = opts.cgMaxIter ?? Math.min(1000, n * 3);
    const Theta = Array.from({ length: n }, () => Array(m).fill(0));
    let maxIters = 0;

    for (let c = 0; c < m; c++) {
        if (opts.abortSignal?.aborted) throw new Error("ridgeSolvePro aborted");
        const b = new Array(n); for (let i = 0; i < n; i++) b[i] = Y[i][c];
        const { x, iters } = cgSolve(A, b, tol, maxIter);
        maxIters = Math.max(maxIters, iters);
        for (let i = 0; i < n; i++) Theta[i][c] = x[i];
    }
    info.push(`CG solved columns with tol=${tol}, maxIter=${maxIter}, max iters used=${maxIters}`);
    return { Theta, usedLambda, method: "cg", iters: maxIters, info };
}


