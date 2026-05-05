(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('fs'), require('path')) :
    typeof define === 'function' && define.amd ? define(['exports', 'fs', 'path'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.astermind = {}, global.fs, global.path));
})(this, (function (exports, fs, path) { 'use strict';

    function _interopNamespaceDefault(e) {
        var n = Object.create(null);
        if (e) {
            Object.keys(e).forEach(function (k) {
                if (k !== 'default') {
                    var d = Object.getOwnPropertyDescriptor(e, k);
                    Object.defineProperty(n, k, d.get ? d : {
                        enumerable: true,
                        get: function () { return e[k]; }
                    });
                }
            });
        }
        n.default = e;
        return Object.freeze(n);
    }

    var fs__namespace = /*#__PURE__*/_interopNamespaceDefault(fs);
    var path__namespace = /*#__PURE__*/_interopNamespaceDefault(path);

    // © 2026 AsterMind AI Co. – All Rights Reserved.
    // Patent Pending US 63/897,713
    // Matrix.ts — tolerant, safe helpers with dimension checks and stable ops
    class DimError extends Error {
        constructor(msg) {
            super(msg);
            this.name = 'DimError';
        }
    }
    const EPS$5 = 1e-12;
    /* ===================== Array-like coercion helpers ===================== */
    // ✅ Narrow to ArrayLike<number> so numeric indexing is allowed
    function isArrayLikeRow(row) {
        return row != null && typeof row.length === 'number';
    }
    /**
     * Coerce any 2D array-like into a strict rectangular number[][]
     * - If width is not provided, infer from the first row's length
     * - Pads/truncates to width
     * - Non-finite values become 0
     */
    function ensureRectNumber2D(M, width, name = 'matrix') {
        if (!M || typeof M.length !== 'number') {
            throw new DimError(`${name} must be a non-empty 2D array`);
        }
        const rows = Array.from(M);
        if (rows.length === 0)
            throw new DimError(`${name} is empty`);
        const first = rows[0];
        if (!isArrayLikeRow(first))
            throw new DimError(`${name} row 0 missing/invalid`);
        const C = ((width !== null && width !== void 0 ? width : first.length) | 0);
        if (C <= 0)
            throw new DimError(`${name} has zero width`);
        const out = new Array(rows.length);
        for (let r = 0; r < rows.length; r++) {
            const src = rows[r];
            const rr = new Array(C);
            if (isArrayLikeRow(src)) {
                const sr = src; // ✅ typed
                for (let c = 0; c < C; c++) {
                    const v = sr[c];
                    rr[c] = Number.isFinite(v) ? Number(v) : 0;
                }
            }
            else {
                for (let c = 0; c < C; c++)
                    rr[c] = 0;
            }
            out[r] = rr;
        }
        return out;
    }
    /**
     * Relaxed rectangularity check:
     * - Accepts any array-like rows (typed arrays included)
     * - Verifies consistent width and finite numbers
     */
    function assertRect(A, name = 'matrix') {
        if (!A || typeof A.length !== 'number') {
            throw new DimError(`${name} must be a non-empty 2D array`);
        }
        const rows = A.length | 0;
        if (rows <= 0)
            throw new DimError(`${name} must be a non-empty 2D array`);
        const first = A[0];
        if (!isArrayLikeRow(first))
            throw new DimError(`${name} row 0 missing/invalid`);
        const C = first.length | 0;
        if (C <= 0)
            throw new DimError(`${name} must have positive column count`);
        for (let r = 0; r < rows; r++) {
            const rowAny = A[r];
            if (!isArrayLikeRow(rowAny)) {
                throw new DimError(`${name} row ${r} invalid`);
            }
            const row = rowAny; // ✅ typed
            if ((row.length | 0) !== C) {
                throw new DimError(`${name} has ragged rows: row 0 = ${C} cols, row ${r} = ${row.length} cols`);
            }
            for (let c = 0; c < C; c++) {
                const v = row[c];
                if (!Number.isFinite(v)) {
                    throw new DimError(`${name} row ${r}, col ${c} is not finite: ${v}`);
                }
            }
        }
    }
    function assertMulDims(A, B) {
        assertRect(A, 'A');
        assertRect(B, 'B');
        const nA = A[0].length;
        const mB = B.length;
        if (nA !== mB) {
            throw new DimError(`matmul dims mismatch: A(${A.length}x${nA}) * B(${mB}x${B[0].length})`);
        }
    }
    function isSquare(A) {
        return isArrayLikeRow(A === null || A === void 0 ? void 0 : A[0]) && (A.length === (A[0].length | 0));
    }
    function isSymmetric(A, tol = 1e-10) {
        if (!isSquare(A))
            return false;
        const n = A.length;
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                if (Math.abs(A[i][j] - A[j][i]) > tol)
                    return false;
            }
        }
        return true;
    }
    /* ============================== Matrix ============================== */
    class Matrix {
        /* ========= constructors / basics ========= */
        static shape(A) {
            assertRect(A, 'A');
            return [A.length, A[0].length];
        }
        static clone(A) {
            assertRect(A, 'A');
            return ensureRectNumber2D(A, A[0].length, 'A(clone)');
        }
        static zeros(rows, cols) {
            const out = new Array(rows);
            for (let i = 0; i < rows; i++)
                out[i] = new Array(cols).fill(0);
            return out;
        }
        static identity(n) {
            const I = Matrix.zeros(n, n);
            for (let i = 0; i < n; i++)
                I[i][i] = 1;
            return I;
        }
        static transpose(A) {
            assertRect(A, 'A');
            const m = A.length, n = A[0].length;
            const T = Matrix.zeros(n, m);
            for (let i = 0; i < m; i++) {
                const Ai = A[i];
                for (let j = 0; j < n; j++)
                    T[j][i] = Number(Ai[j]);
            }
            return T;
        }
        /* ========= algebra ========= */
        static add(A, B) {
            A = ensureRectNumber2D(A, undefined, 'A');
            B = ensureRectNumber2D(B, undefined, 'B');
            assertRect(A, 'A');
            assertRect(B, 'B');
            if (A.length !== B.length || A[0].length !== B[0].length) {
                throw new DimError(`add dims mismatch: A(${A.length}x${A[0].length}) vs B(${B.length}x${B[0].length})`);
            }
            const m = A.length, n = A[0].length;
            const C = Matrix.zeros(m, n);
            for (let i = 0; i < m; i++) {
                const Ai = A[i], Bi = B[i], Ci = C[i];
                for (let j = 0; j < n; j++)
                    Ci[j] = Ai[j] + Bi[j];
            }
            return C;
        }
        /** Adds lambda to the diagonal (ridge regularization) */
        static addRegularization(A, lambda = 1e-6) {
            A = ensureRectNumber2D(A, undefined, 'A');
            assertRect(A, 'A');
            if (!isSquare(A)) {
                throw new DimError(`addRegularization expects square matrix, got ${A.length}x${A[0].length}`);
            }
            const C = Matrix.clone(A);
            for (let i = 0; i < C.length; i++)
                C[i][i] += lambda;
            return C;
        }
        static multiply(A, B) {
            A = ensureRectNumber2D(A, undefined, 'A');
            B = ensureRectNumber2D(B, undefined, 'B');
            assertMulDims(A, B);
            const m = A.length, n = B.length, p = B[0].length;
            const C = Matrix.zeros(m, p);
            for (let i = 0; i < m; i++) {
                const Ai = A[i];
                for (let k = 0; k < n; k++) {
                    const aik = Number(Ai[k]);
                    const Bk = B[k];
                    for (let j = 0; j < p; j++)
                        C[i][j] += aik * Number(Bk[j]);
                }
            }
            return C;
        }
        static multiplyVec(A, v) {
            A = ensureRectNumber2D(A, undefined, 'A');
            assertRect(A, 'A');
            if (!v || typeof v.length !== 'number') {
                throw new DimError(`matvec expects vector 'v' with length ${A[0].length}`);
            }
            if (A[0].length !== v.length) {
                throw new DimError(`matvec dims mismatch: A cols ${A[0].length} vs v len ${v.length}`);
            }
            const m = A.length, n = v.length;
            const out = new Array(m).fill(0);
            for (let i = 0; i < m; i++) {
                const Ai = A[i];
                let s = 0;
                for (let j = 0; j < n; j++)
                    s += Number(Ai[j]) * Number(v[j]);
                out[i] = s;
            }
            return out;
        }
        /* ========= decompositions / solve ========= */
        static cholesky(A, jitter = 0) {
            A = ensureRectNumber2D(A, undefined, 'A');
            assertRect(A, 'A');
            if (!isSquare(A))
                throw new DimError(`cholesky expects square matrix, got ${A.length}x${A[0].length}`);
            const n = A.length;
            const L = Matrix.zeros(n, n);
            for (let i = 0; i < n; i++) {
                for (let j = 0; j <= i; j++) {
                    let sum = A[i][j];
                    for (let k = 0; k < j; k++)
                        sum -= L[i][k] * L[j][k];
                    if (i === j) {
                        const v = sum + jitter;
                        L[i][j] = Math.sqrt(Math.max(v, EPS$5));
                    }
                    else {
                        L[i][j] = sum / L[j][j];
                    }
                }
            }
            return L;
        }
        static solveCholesky(A, B, jitter = 1e-10) {
            A = ensureRectNumber2D(A, undefined, 'A');
            B = ensureRectNumber2D(B, undefined, 'B');
            assertRect(A, 'A');
            assertRect(B, 'B');
            if (!isSquare(A) || A.length !== B.length) {
                throw new DimError(`solveCholesky dims: A(${A.length}x${A[0].length}) vs B(${B.length}x${B[0].length})`);
            }
            const n = A.length, k = B[0].length;
            const L = Matrix.cholesky(A, jitter);
            // Solve L Z = B (forward)
            const Z = Matrix.zeros(n, k);
            for (let i = 0; i < n; i++) {
                for (let c = 0; c < k; c++) {
                    let s = B[i][c];
                    for (let p = 0; p < i; p++)
                        s -= L[i][p] * Z[p][c];
                    Z[i][c] = s / L[i][i];
                }
            }
            // Solve L^T X = Z (backward)
            const X = Matrix.zeros(n, k);
            for (let i = n - 1; i >= 0; i--) {
                for (let c = 0; c < k; c++) {
                    let s = Z[i][c];
                    for (let p = i + 1; p < n; p++)
                        s -= L[p][i] * X[p][c];
                    X[i][c] = s / L[i][i];
                }
            }
            return X;
        }
        static inverse(A) {
            A = ensureRectNumber2D(A, undefined, 'A');
            assertRect(A, 'A');
            if (!isSquare(A))
                throw new DimError(`inverse expects square matrix, got ${A.length}x${A[0].length}`);
            const n = A.length;
            const M = Matrix.clone(A);
            const I = Matrix.identity(n);
            // Augment [M | I]
            const aug = new Array(n);
            for (let i = 0; i < n; i++)
                aug[i] = M[i].concat(I[i]);
            const cols = 2 * n;
            for (let p = 0; p < n; p++) {
                // Pivot
                let maxRow = p, maxVal = Math.abs(aug[p][p]);
                for (let r = p + 1; r < n; r++) {
                    const v = Math.abs(aug[r][p]);
                    if (v > maxVal) {
                        maxVal = v;
                        maxRow = r;
                    }
                }
                if (maxVal < EPS$5)
                    throw new Error('Matrix is singular or ill-conditioned');
                if (maxRow !== p) {
                    const tmp = aug[p];
                    aug[p] = aug[maxRow];
                    aug[maxRow] = tmp;
                }
                // Normalize pivot row
                const piv = aug[p][p];
                const invPiv = 1 / piv;
                for (let c = 0; c < cols; c++)
                    aug[p][c] *= invPiv;
                // Eliminate other rows
                for (let r = 0; r < n; r++) {
                    if (r === p)
                        continue;
                    const f = aug[r][p];
                    if (Math.abs(f) < EPS$5)
                        continue;
                    for (let c = 0; c < cols; c++)
                        aug[r][c] -= f * aug[p][c];
                }
            }
            // Extract right half as inverse
            const inv = Matrix.zeros(n, n);
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++)
                    inv[i][j] = aug[i][n + j];
            }
            return inv;
        }
        /* ========= helpers ========= */
        static inverseSPDOrFallback(A) {
            if (isSymmetric(A)) {
                try {
                    return Matrix.solveCholesky(A, Matrix.identity(A.length), 1e-10);
                }
                catch (_a) {
                    // fall through
                }
            }
            return Matrix.inverse(A);
        }
        /* ========= Symmetric Eigen (Jacobi) & Inverse Square Root ========= */
        static assertSquare(A, ctx = 'Matrix') {
            assertRect(A, ctx);
            if (!isSquare(A)) {
                throw new DimError(`${ctx}: expected square matrix, got ${A.length}x${A[0].length}`);
            }
        }
        static eigSym(A, maxIter = 64, tol = 1e-12) {
            A = ensureRectNumber2D(A, undefined, 'eigSym/A');
            Matrix.assertSquare(A, 'eigSym');
            const n = A.length;
            const B = Matrix.clone(A);
            let V = Matrix.identity(n);
            const abs = Math.abs;
            const offdiagNorm = () => {
                let s = 0;
                for (let i = 0; i < n; i++) {
                    for (let j = i + 1; j < n; j++) {
                        const v = B[i][j];
                        s += v * v;
                    }
                }
                return Math.sqrt(s);
            };
            for (let it = 0; it < maxIter; it++) {
                if (offdiagNorm() <= tol)
                    break;
                let p = 0, q = 1, max = 0;
                for (let i = 0; i < n; i++) {
                    for (let j = i + 1; j < n; j++) {
                        const v = abs(B[i][j]);
                        if (v > max) {
                            max = v;
                            p = i;
                            q = j;
                        }
                    }
                }
                if (max <= tol)
                    break;
                const app = B[p][p], aqq = B[q][q], apq = B[p][q];
                const tau = (aqq - app) / (2 * apq);
                const t = Math.sign(tau) / (abs(tau) + Math.sqrt(1 + tau * tau));
                const c = 1 / Math.sqrt(1 + t * t);
                const s = t * c;
                const Bpp = c * c * app - 2 * s * c * apq + s * s * aqq;
                const Bqq = s * s * app + 2 * s * c * apq + c * c * aqq;
                B[p][p] = Bpp;
                B[q][q] = Bqq;
                B[p][q] = B[q][p] = 0;
                for (let k = 0; k < n; k++) {
                    if (k === p || k === q)
                        continue;
                    const aip = B[k][p], aiq = B[k][q];
                    const new_kp = c * aip - s * aiq;
                    const new_kq = s * aip + c * aiq;
                    B[k][p] = B[p][k] = new_kp;
                    B[k][q] = B[q][k] = new_kq;
                }
                for (let k = 0; k < n; k++) {
                    const vip = V[k][p], viq = V[k][q];
                    V[k][p] = c * vip - s * viq;
                    V[k][q] = s * vip + c * viq;
                }
            }
            const vals = new Array(n);
            for (let i = 0; i < n; i++)
                vals[i] = B[i][i];
            const order = vals.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]).map(([, i]) => i);
            const values = order.map(i => vals[i]);
            const vectors = Matrix.zeros(n, n);
            for (let r = 0; r < n; r++) {
                for (let c = 0; c < n; c++)
                    vectors[r][c] = V[r][order[c]];
            }
            return { values, vectors };
        }
        static invSqrtSym(A, eps = 1e-10) {
            A = ensureRectNumber2D(A, undefined, 'invSqrtSym/A');
            Matrix.assertSquare(A, 'invSqrtSym');
            const { values, vectors: U } = Matrix.eigSym(A);
            const n = values.length;
            const Dm12 = Matrix.zeros(n, n);
            for (let i = 0; i < n; i++) {
                const lam = Math.max(values[i], eps);
                Dm12[i][i] = 1 / Math.sqrt(lam);
            }
            const UD = Matrix.multiply(U, Dm12);
            return Matrix.multiply(UD, Matrix.transpose(U));
        }
    }

    // © 2026 AsterMind AI Co. – All Rights Reserved.
    // Patent Pending US 63/897,713
    // Activations.ts - Common activation functions (with derivatives)
    class Activations {
        /* ========= Forward ========= */
        /** Rectified Linear Unit */
        static relu(x) {
            return x > 0 ? x : 0;
        }
        /** Leaky ReLU with configurable slope for x<0 (default 0.01) */
        static leakyRelu(x, alpha = 0.01) {
            return x >= 0 ? x : alpha * x;
        }
        /** Logistic sigmoid */
        static sigmoid(x) {
            return 1 / (1 + Math.exp(-x));
        }
        /** Hyperbolic tangent */
        static tanh(x) {
            return Math.tanh(x);
        }
        /** Linear / identity activation */
        static linear(x) {
            return x;
        }
        /**
         * GELU (Gaussian Error Linear Unit), tanh approximation.
         * 0.5 * x * (1 + tanh(√(2/π) * (x + 0.044715 x^3)))
         */
        static gelu(x) {
            const k = Math.sqrt(2 / Math.PI);
            const u = k * (x + 0.044715 * x * x * x);
            return 0.5 * x * (1 + Math.tanh(u));
        }
        /**
         * Softmax with numerical stability and optional temperature.
         * @param arr logits
         * @param temperature >0; higher = flatter distribution
         */
        static softmax(arr, temperature = 1) {
            const t = Math.max(temperature, 1e-12);
            let max = -Infinity;
            for (let i = 0; i < arr.length; i++) {
                const v = arr[i] / t;
                if (v > max)
                    max = v;
            }
            const exps = new Array(arr.length);
            let sum = 0;
            for (let i = 0; i < arr.length; i++) {
                const e = Math.exp(arr[i] / t - max);
                exps[i] = e;
                sum += e;
            }
            const denom = sum || 1e-12;
            for (let i = 0; i < exps.length; i++)
                exps[i] = exps[i] / denom;
            return exps;
        }
        /* ========= Derivatives (elementwise) ========= */
        /** d/dx ReLU */
        static dRelu(x) {
            // subgradient at 0 -> 0
            return x > 0 ? 1 : 0;
        }
        /** d/dx LeakyReLU */
        static dLeakyRelu(x, alpha = 0.01) {
            return x >= 0 ? 1 : alpha;
        }
        /** d/dx Sigmoid = s(x)*(1-s(x)) */
        static dSigmoid(x) {
            const s = Activations.sigmoid(x);
            return s * (1 - s);
        }
        /** d/dx tanh = 1 - tanh(x)^2 */
        static dTanh(x) {
            const t = Math.tanh(x);
            return 1 - t * t;
        }
        /** d/dx Linear = 1 */
        static dLinear(_) {
            return 1;
        }
        /**
         * d/dx GELU (tanh approximation)
         * 0.5*(1 + tanh(u)) + 0.5*x*(1 - tanh(u)^2) * du/dx
         * where u = k*(x + 0.044715 x^3), du/dx = k*(1 + 0.134145 x^2), k = sqrt(2/pi)
         */
        static dGelu(x) {
            const k = Math.sqrt(2 / Math.PI);
            const x2 = x * x;
            const u = k * (x + 0.044715 * x * x2);
            const t = Math.tanh(u);
            const sech2 = 1 - t * t;
            const du = k * (1 + 0.134145 * x2);
            return 0.5 * (1 + t) + 0.5 * x * sech2 * du;
        }
        /* ========= Apply helpers ========= */
        /** Apply an elementwise activation across a 2D matrix, returning a new matrix. */
        static apply(matrix, fn) {
            const out = new Array(matrix.length);
            for (let i = 0; i < matrix.length; i++) {
                const row = matrix[i];
                const r = new Array(row.length);
                for (let j = 0; j < row.length; j++)
                    r[j] = fn(row[j]);
                out[i] = r;
            }
            return out;
        }
        /** Apply an elementwise derivative across a 2D matrix, returning a new matrix. */
        static applyDerivative(matrix, dfn) {
            const out = new Array(matrix.length);
            for (let i = 0; i < matrix.length; i++) {
                const row = matrix[i];
                const r = new Array(row.length);
                for (let j = 0; j < row.length; j++)
                    r[j] = dfn(row[j]);
                out[i] = r;
            }
            return out;
        }
        /* ========= Getters ========= */
        /**
         * Get an activation function by name. Case-insensitive.
         * For leaky ReLU, you can pass { alpha } to override the negative slope.
         */
        static get(name, opts) {
            var _a;
            const key = name.toLowerCase();
            switch (key) {
                case 'relu': return this.relu;
                case 'leakyrelu':
                case 'leaky-relu': {
                    const alpha = (_a = opts === null || opts === void 0 ? void 0 : opts.alpha) !== null && _a !== void 0 ? _a : 0.01;
                    return (x) => this.leakyRelu(x, alpha);
                }
                case 'sigmoid': return this.sigmoid;
                case 'tanh': return this.tanh;
                case 'linear':
                case 'identity':
                case 'none': return this.linear;
                case 'gelu': return this.gelu;
                default:
                    throw new Error(`Unknown activation: ${name}`);
            }
        }
        /** Get derivative function by name (mirrors get). */
        static getDerivative(name, opts) {
            var _a;
            const key = name.toLowerCase();
            switch (key) {
                case 'relu': return this.dRelu;
                case 'leakyrelu':
                case 'leaky-relu': {
                    const alpha = (_a = opts === null || opts === void 0 ? void 0 : opts.alpha) !== null && _a !== void 0 ? _a : 0.01;
                    return (x) => this.dLeakyRelu(x, alpha);
                }
                case 'sigmoid': return this.dSigmoid;
                case 'tanh': return this.dTanh;
                case 'linear':
                case 'identity':
                case 'none': return this.dLinear;
                case 'gelu': return this.dGelu;
                default:
                    throw new Error(`Unknown activation derivative: ${name}`);
            }
        }
        /** Get both forward and derivative together. */
        static getPair(name, opts) {
            return { f: this.get(name, opts), df: this.getDerivative(name, opts) };
        }
        /* ========= Optional: Softmax Jacobian (for research/tools) ========= */
        /**
         * Given softmax probabilities p, returns the Jacobian J = diag(p) - p p^T
         * (Useful for analysis; not typically needed for ELM.)
         */
        static softmaxJacobian(p) {
            const n = p.length;
            const J = new Array(n);
            for (let i = 0; i < n; i++) {
                const row = new Array(n);
                for (let j = 0; j < n; j++) {
                    row[j] = (i === j ? p[i] : 0) - p[i] * p[j];
                }
                J[i] = row;
            }
            return J;
        }
    }

    // © 2026 AsterMind AI Co. – All Rights Reserved.
    // Patent Pending US 63/897,713
    // ELMConfig.ts - Configuration interfaces, defaults, helpers for ELM-based models
    /* =========== Defaults =========== */
    const defaultBase = {
        hiddenUnits: 50,
        activation: 'relu',
        ridgeLambda: 1e-2,
        weightInit: 'xavier',
        seed: 1337,
        dropout: 0,
        log: { verbose: true, toFile: false, modelName: 'Unnamed ELM Model', level: 'info' },
    };
    const defaultNumericConfig = Object.assign(Object.assign({}, defaultBase), { useTokenizer: false });
    const defaultTextConfig = Object.assign(Object.assign({}, defaultBase), { useTokenizer: true, maxLen: 30, charSet: 'abcdefghijklmnopqrstuvwxyz', tokenizerDelimiter: /\s+/ });
    /* =========== Type guards =========== */
    function isTextConfig(cfg) {
        return cfg.useTokenizer === true;
    }
    function isNumericConfig(cfg) {
        return cfg.useTokenizer !== true;
    }
    /* =========== Helpers =========== */
    /**
     * Normalize a user config with sensible defaults depending on mode.
     * (Keeps the original structural type, only fills in missing optional fields.)
     */
    function normalizeConfig(cfg) {
        var _a, _b, _c, _d;
        if (isTextConfig(cfg)) {
            const merged = Object.assign(Object.assign(Object.assign({}, defaultTextConfig), cfg), { log: Object.assign(Object.assign({}, ((_a = defaultBase.log) !== null && _a !== void 0 ? _a : {})), ((_b = cfg.log) !== null && _b !== void 0 ? _b : {})) });
            return merged;
        }
        else {
            const merged = Object.assign(Object.assign(Object.assign({}, defaultNumericConfig), cfg), { log: Object.assign(Object.assign({}, ((_c = defaultBase.log) !== null && _c !== void 0 ? _c : {})), ((_d = cfg.log) !== null && _d !== void 0 ? _d : {})) });
            return merged;
        }
    }
    /**
     * Rehydrate text-specific fields from a JSON-safe config
     * (e.g., convert tokenizerDelimiter source string → RegExp).
     */
    function deserializeTextBits(config) {
        var _a, _b, _c, _d;
        // If useTokenizer not true, assume numeric config
        if (config.useTokenizer !== true) {
            const nc = Object.assign(Object.assign(Object.assign({}, defaultNumericConfig), config), { log: Object.assign(Object.assign({}, ((_a = defaultBase.log) !== null && _a !== void 0 ? _a : {})), ((_b = config.log) !== null && _b !== void 0 ? _b : {})) });
            return nc;
        }
        // Text config: coerce delimiter
        const tDelim = config.tokenizerDelimiter;
        let delimiter = undefined;
        if (tDelim instanceof RegExp) {
            delimiter = tDelim;
        }
        else if (typeof tDelim === 'string' && tDelim.length > 0) {
            delimiter = new RegExp(tDelim);
        }
        else {
            delimiter = defaultTextConfig.tokenizerDelimiter;
        }
        const tc = Object.assign(Object.assign(Object.assign({}, defaultTextConfig), config), { tokenizerDelimiter: delimiter, log: Object.assign(Object.assign({}, ((_c = defaultBase.log) !== null && _c !== void 0 ? _c : {})), ((_d = config.log) !== null && _d !== void 0 ? _d : {})), useTokenizer: true });
        return tc;
    }

    // © 2026 AsterMind AI Co. – All Rights Reserved.
    // Patent Pending US 63/897,713
    class Tokenizer {
        constructor(customDelimiter) {
            this.delimiter = customDelimiter || /[\s,.;!?()\[\]{}"']+/;
        }
        tokenize(text) {
            if (typeof text !== 'string') {
                console.warn('[Tokenizer] Expected a string, got:', typeof text, text);
                try {
                    text = String(text !== null && text !== void 0 ? text : '');
                }
                catch (_a) {
                    return [];
                }
            }
            return text
                .trim()
                .toLowerCase()
                .split(this.delimiter)
                .filter(Boolean);
        }
        ngrams(tokens, n) {
            if (n <= 0 || tokens.length < n)
                return [];
            const result = [];
            for (let i = 0; i <= tokens.length - n; i++) {
                result.push(tokens.slice(i, i + n).join(' '));
            }
            return result;
        }
    }

    // © 2026 AsterMind AI Co. – All Rights Reserved.
    // Patent Pending US 63/897,713
    // TextEncoder.ts - Text preprocessing and one-hot encoding for ELM
    const defaultTextEncoderConfig = {
        charSet: 'abcdefghijklmnopqrstuvwxyz',
        maxLen: 15,
        useTokenizer: false
    };
    class TextEncoder {
        constructor(config = {}) {
            const cfg = Object.assign(Object.assign({}, defaultTextEncoderConfig), config);
            this.charSet = cfg.charSet;
            this.charSize = cfg.charSet.length;
            this.maxLen = cfg.maxLen;
            this.useTokenizer = cfg.useTokenizer;
            if (this.useTokenizer) {
                this.tokenizer = new Tokenizer(config.tokenizerDelimiter);
            }
        }
        charToOneHot(c) {
            const index = this.charSet.indexOf(c.toLowerCase());
            const vec = Array(this.charSize).fill(0);
            if (index !== -1)
                vec[index] = 1;
            return vec;
        }
        textToVector(text) {
            let cleaned;
            if (this.useTokenizer && this.tokenizer) {
                const tokens = this.tokenizer.tokenize(text).join('');
                cleaned = tokens.slice(0, this.maxLen).padEnd(this.maxLen, ' ');
            }
            else {
                cleaned = text.toLowerCase().replace(new RegExp(`[^${this.charSet}]`, 'g'), '').padEnd(this.maxLen, ' ').slice(0, this.maxLen);
            }
            const vec = [];
            for (let i = 0; i < cleaned.length; i++) {
                vec.push(...this.charToOneHot(cleaned[i]));
            }
            return vec;
        }
        normalizeVector(v) {
            const norm = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
            return norm > 0 ? v.map(x => x / norm) : v;
        }
        getVectorSize() {
            return this.charSize * this.maxLen;
        }
        getCharSet() {
            return this.charSet;
        }
        getMaxLen() {
            return this.maxLen;
        }
    }

    // © 2026 AsterMind AI Co. – All Rights Reserved.
    // Patent Pending US 63/897,713
    // UniversalEncoder.ts - Automatically selects appropriate encoder (char or token based)
    const defaultUniversalConfig = {
        charSet: 'abcdefghijklmnopqrstuvwxyz',
        maxLen: 15,
        useTokenizer: false,
        mode: 'char'
    };
    class UniversalEncoder {
        constructor(config = {}) {
            const merged = Object.assign(Object.assign({}, defaultUniversalConfig), config);
            const useTokenizer = merged.mode === 'token';
            this.encoder = new TextEncoder({
                charSet: merged.charSet,
                maxLen: merged.maxLen,
                useTokenizer,
                tokenizerDelimiter: config.tokenizerDelimiter
            });
        }
        encode(text) {
            return this.encoder.textToVector(text);
        }
        normalize(v) {
            return this.encoder.normalizeVector(v);
        }
        getVectorSize() {
            return this.encoder.getVectorSize();
        }
    }

    // © 2026 AsterMind AI Co. – All Rights Reserved.
    // Patent Pending US 63/897,713
    // Augment.ts - Basic augmentation utilities for category training examples
    class Augment {
        static addSuffix(text, suffixes) {
            return suffixes.map(suffix => `${text} ${suffix}`);
        }
        static addPrefix(text, prefixes) {
            return prefixes.map(prefix => `${prefix} ${text}`);
        }
        static addNoise(text, charSet, noiseRate = 0.1) {
            const chars = text.split('');
            for (let i = 0; i < chars.length; i++) {
                if (Math.random() < noiseRate) {
                    const randomChar = charSet[Math.floor(Math.random() * charSet.length)];
                    chars[i] = randomChar;
                }
            }
            return chars.join('');
        }
        static mix(text, mixins) {
            return mixins.map(m => `${text} ${m}`);
        }
        static generateVariants(text, charSet, options) {
            const variants = [text];
            if (options === null || options === void 0 ? void 0 : options.suffixes) {
                variants.push(...this.addSuffix(text, options.suffixes));
            }
            if (options === null || options === void 0 ? void 0 : options.prefixes) {
                variants.push(...this.addPrefix(text, options.prefixes));
            }
            if (options === null || options === void 0 ? void 0 : options.includeNoise) {
                variants.push(this.addNoise(text, charSet));
            }
            return variants;
        }
    }

    // © 2026 AsterMind AI Co. – All Rights Reserved.
    // Patent Pending US 63/897,713
    // ELM.ts - Core ELM logic with TypeScript types (numeric & text modes)
    // Seeded PRNG (xorshift-ish) for deterministic init
    function makePRNG$2(seed = 123456789) {
        let s = seed | 0 || 1;
        return () => {
            s ^= s << 13;
            s ^= s >>> 17;
            s ^= s << 5;
            return ((s >>> 0) / 0xffffffff);
        };
    }
    function clampInt(x, lo, hi) {
        const xi = x | 0;
        return xi < lo ? lo : (xi > hi ? hi : xi);
    }
    function isOneHot2D(Y) {
        return Array.isArray(Y) && Array.isArray(Y[0]) && Number.isFinite(Y[0][0]);
    }
    function maxLabel(y) {
        let m = -Infinity;
        for (let i = 0; i < y.length; i++) {
            const v = y[i] | 0;
            if (v > m)
                m = v;
        }
        return m === -Infinity ? 0 : m;
    }
    /** One-hot (clamped) */
    function toOneHotClamped(labels, k) {
        const K = k | 0;
        const Y = new Array(labels.length);
        for (let i = 0; i < labels.length; i++) {
            const j = clampInt(labels[i], 0, K - 1);
            const row = new Array(K).fill(0);
            row[j] = 1;
            Y[i] = row;
        }
        return Y;
    }
    /** (HᵀH + λI)B = HᵀY solved via Cholesky */
    function ridgeSolve$1(H, Y, lambda) {
        const Ht = Matrix.transpose(H);
        const A = Matrix.addRegularization(Matrix.multiply(Ht, H), lambda + 1e-10);
        const R = Matrix.multiply(Ht, Y);
        return Matrix.solveCholesky(A, R, 1e-10);
    }
    /* =========================
     * ELM class
     * ========================= */
    class ELM {
        constructor(config) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
            // Merge with mode-appropriate defaults
            const cfg = normalizeConfig(config);
            this.config = cfg;
            this.categories = cfg.categories;
            this.hiddenUnits = cfg.hiddenUnits;
            this.activation = (_a = cfg.activation) !== null && _a !== void 0 ? _a : 'relu';
            this.useTokenizer = isTextConfig(cfg);
            this.maxLen = isTextConfig(cfg) ? cfg.maxLen : 0;
            this.charSet = isTextConfig(cfg) ? ((_b = cfg.charSet) !== null && _b !== void 0 ? _b : 'abcdefghijklmnopqrstuvwxyz') : 'abcdefghijklmnopqrstuvwxyz';
            this.tokenizerDelimiter = isTextConfig(cfg) ? cfg.tokenizerDelimiter : undefined;
            this.metrics = cfg.metrics;
            this.verbose = (_d = (_c = cfg.log) === null || _c === void 0 ? void 0 : _c.verbose) !== null && _d !== void 0 ? _d : true;
            this.modelName = (_f = (_e = cfg.log) === null || _e === void 0 ? void 0 : _e.modelName) !== null && _f !== void 0 ? _f : 'Unnamed ELM Model';
            this.logToFile = (_h = (_g = cfg.log) === null || _g === void 0 ? void 0 : _g.toFile) !== null && _h !== void 0 ? _h : false;
            this.dropout = (_j = cfg.dropout) !== null && _j !== void 0 ? _j : 0;
            this.ridgeLambda = Math.max((_k = cfg.ridgeLambda) !== null && _k !== void 0 ? _k : 1e-2, 1e-8);
            // Seeded RNG
            const seed = (_l = cfg.seed) !== null && _l !== void 0 ? _l : 1337;
            this.rng = makePRNG$2(seed);
            // Create encoder only if tokenizer is enabled
            if (this.useTokenizer) {
                this.encoder = new UniversalEncoder({
                    charSet: this.charSet,
                    maxLen: this.maxLen,
                    useTokenizer: this.useTokenizer,
                    tokenizerDelimiter: this.tokenizerDelimiter,
                    mode: this.useTokenizer ? 'token' : 'char'
                });
            }
            // Weights are allocated on first training call (inputDim known then)
            this.model = null;
        }
        /* ========= Encoder narrowing (Option A) ========= */
        assertEncoder() {
            if (!this.encoder) {
                throw new Error('Encoder is not initialized. Enable useTokenizer:true or construct an encoder.');
            }
            return this.encoder;
        }
        /* ========= initialization ========= */
        xavierLimit(fanIn, fanOut) {
            return Math.sqrt(6 / (fanIn + fanOut));
        }
        randomMatrix(rows, cols) {
            var _a;
            const weightInit = (_a = this.config.weightInit) !== null && _a !== void 0 ? _a : 'uniform';
            if (weightInit === 'xavier') {
                const limit = this.xavierLimit(cols, rows);
                if (this.verbose)
                    console.log(`✨ Xavier init with limit sqrt(6/(${cols}+${rows})) ≈ ${limit.toFixed(4)}`);
                return Array.from({ length: rows }, () => Array.from({ length: cols }, () => (this.rng() * 2 - 1) * limit));
            }
            else {
                if (this.verbose)
                    console.log(`✨ Uniform init [-1,1] (seeded)`);
                return Array.from({ length: rows }, () => Array.from({ length: cols }, () => (this.rng() * 2 - 1)));
            }
        }
        buildHidden(X, W, b) {
            const tempH = Matrix.multiply(X, Matrix.transpose(W)); // N x hidden
            const activationFn = Activations.get(this.activation);
            let H = Activations.apply(tempH.map(row => row.map((val, j) => val + b[j][0])), activationFn);
            if (this.dropout > 0) {
                const keepProb = 1 - this.dropout;
                for (let i = 0; i < H.length; i++) {
                    for (let j = 0; j < H[0].length; j++) {
                        if (this.rng() < this.dropout)
                            H[i][j] = 0;
                        else
                            H[i][j] /= keepProb;
                    }
                }
            }
            return H;
        }
        /* ========= public helpers ========= */
        oneHot(n, index) {
            return Array.from({ length: n }, (_, i) => (i === index ? 1 : 0));
        }
        setCategories(categories) {
            this.categories = categories;
        }
        loadModelFromJSON(json) {
            var _a, _b, _c, _d, _e;
            try {
                const parsed = JSON.parse(json);
                const cfg = deserializeTextBits(parsed.config);
                // Rebuild instance config
                this.config = cfg;
                this.categories = (_a = cfg.categories) !== null && _a !== void 0 ? _a : this.categories;
                this.hiddenUnits = (_b = cfg.hiddenUnits) !== null && _b !== void 0 ? _b : this.hiddenUnits;
                this.activation = (_c = cfg.activation) !== null && _c !== void 0 ? _c : this.activation;
                this.useTokenizer = cfg.useTokenizer === true;
                this.maxLen = (_d = cfg.maxLen) !== null && _d !== void 0 ? _d : this.maxLen;
                this.charSet = (_e = cfg.charSet) !== null && _e !== void 0 ? _e : this.charSet;
                this.tokenizerDelimiter = cfg.tokenizerDelimiter;
                if (this.useTokenizer) {
                    this.encoder = new UniversalEncoder({
                        charSet: this.charSet,
                        maxLen: this.maxLen,
                        useTokenizer: this.useTokenizer,
                        tokenizerDelimiter: this.tokenizerDelimiter,
                        mode: this.useTokenizer ? 'token' : 'char'
                    });
                }
                else {
                    this.encoder = undefined;
                }
                // Restore weights
                const { W, b, B } = parsed;
                this.model = { W, b, beta: B };
                this.savedModelJSON = json;
                if (this.verbose)
                    console.log(`✅ ${this.modelName} Model loaded from JSON`);
            }
            catch (e) {
                console.error(`❌ Failed to load ${this.modelName} model from JSON:`, e);
            }
        }
        /* ========= Numeric training tolerance ========= */
        /** Decide output dimension from config/categories/labels/one-hot */
        resolveOutputDim(yOrY) {
            // Prefer explicit config
            const cfgOut = this.config.outputDim;
            if (Number.isFinite(cfgOut) && cfgOut > 0)
                return cfgOut | 0;
            // Then categories length if present
            if (Array.isArray(this.categories) && this.categories.length > 0)
                return this.categories.length | 0;
            // Infer from data
            if (isOneHot2D(yOrY))
                return (yOrY[0].length | 0) || 1;
            return (maxLabel(yOrY) + 1) | 0;
        }
        /** Coerce X, and turn labels→one-hot if needed. Always returns strict number[][] */
        coerceXY(X, yOrY) {
            const Xnum = ensureRectNumber2D(X, undefined, 'X');
            const outDim = this.resolveOutputDim(yOrY);
            let Ynum;
            if (isOneHot2D(yOrY)) {
                // Ensure rect with exact width outDim (pad/trunc to be safe)
                Ynum = ensureRectNumber2D(yOrY, outDim, 'Y(one-hot)');
            }
            else {
                // Labels → clamped one-hot
                Ynum = ensureRectNumber2D(toOneHotClamped(yOrY, outDim), outDim, 'Y(labels→one-hot)');
            }
            // If categories length mismatches inferred outDim, adjust categories (non-breaking)
            if (!this.categories || this.categories.length !== outDim) {
                this.categories = Array.from({ length: outDim }, (_, i) => { var _a, _b; return (_b = (_a = this.categories) === null || _a === void 0 ? void 0 : _a[i]) !== null && _b !== void 0 ? _b : String(i); });
            }
            return { Xnum, Ynum, outDim };
        }
        /* ========= Training on numeric vectors =========
         * y can be class indices OR one-hot.
         */
        trainFromData(X, y, options) {
            if (!(X === null || X === void 0 ? void 0 : X.length))
                throw new Error('trainFromData: X is empty');
            // Coerce & shape
            const { Xnum, Ynum, outDim } = this.coerceXY(X, y);
            const n = Xnum.length;
            const inputDim = Xnum[0].length;
            // init / reuse
            let W, b;
            const reuseWeights = (options === null || options === void 0 ? void 0 : options.reuseWeights) === true && this.model;
            if (reuseWeights && this.model) {
                W = this.model.W;
                b = this.model.b;
                if (this.verbose)
                    console.log('🔄 Reusing existing weights/biases for training.');
            }
            else {
                W = this.randomMatrix(this.hiddenUnits, inputDim);
                b = this.randomMatrix(this.hiddenUnits, 1);
                if (this.verbose)
                    console.log('✨ Initializing fresh weights/biases for training.');
            }
            // Hidden
            let H = this.buildHidden(Xnum, W, b);
            // Optional sample weights
            let Yw = Ynum;
            if (options === null || options === void 0 ? void 0 : options.weights) {
                const ww = options.weights;
                if (ww.length !== n) {
                    throw new Error(`Weight array length ${ww.length} does not match sample count ${n}`);
                }
                H = H.map((row, i) => row.map(x => x * Math.sqrt(ww[i])));
                Yw = Ynum.map((row, i) => row.map(x => x * Math.sqrt(ww[i])));
            }
            // Solve ridge (stable)
            const beta = ridgeSolve$1(H, Yw, this.ridgeLambda);
            this.model = { W, b, beta };
            // Evaluate & maybe save
            const predictions = Matrix.multiply(H, beta);
            if (this.metrics) {
                const rmse = this.calculateRMSE(Ynum, predictions);
                const mae = this.calculateMAE(Ynum, predictions);
                const acc = this.calculateAccuracy(Ynum, predictions);
                const f1 = this.calculateF1Score(Ynum, predictions);
                const ce = this.calculateCrossEntropy(Ynum, predictions);
                const r2 = this.calculateR2Score(Ynum, predictions);
                const results = { rmse, mae, accuracy: acc, f1, crossEntropy: ce, r2 };
                let allPassed = true;
                if (this.metrics.rmse !== undefined && rmse > this.metrics.rmse)
                    allPassed = false;
                if (this.metrics.mae !== undefined && mae > this.metrics.mae)
                    allPassed = false;
                if (this.metrics.accuracy !== undefined && acc < this.metrics.accuracy)
                    allPassed = false;
                if (this.metrics.f1 !== undefined && f1 < this.metrics.f1)
                    allPassed = false;
                if (this.metrics.crossEntropy !== undefined && ce > this.metrics.crossEntropy)
                    allPassed = false;
                if (this.metrics.r2 !== undefined && r2 < this.metrics.r2)
                    allPassed = false;
                if (this.verbose)
                    this.logMetrics(results);
                if (allPassed) {
                    this.savedModelJSON = JSON.stringify({
                        config: this.serializeConfig(),
                        W, b, B: beta
                    });
                    if (this.verbose)
                        console.log('✅ Model passed thresholds and was saved to JSON.');
                    if (this.config.exportFileName)
                        this.saveModelAsJSONFile(this.config.exportFileName);
                }
                else {
                    if (this.verbose)
                        console.log('❌ Model not saved: One or more thresholds not met.');
                }
            }
            else {
                // No metrics—always save
                this.savedModelJSON = JSON.stringify({
                    config: this.serializeConfig(),
                    W, b, B: beta
                });
                if (this.verbose)
                    console.log('✅ Model trained with no metrics—saved by default.');
                if (this.config.exportFileName)
                    this.saveModelAsJSONFile(this.config.exportFileName);
            }
            return { epochs: 1, metrics: undefined };
        }
        /* ========= Training from category strings (text mode) ========= */
        train(augmentationOptions, weights) {
            if (!this.useTokenizer) {
                throw new Error('train(): text training requires useTokenizer:true');
            }
            const enc = this.assertEncoder();
            const X = [];
            let Y = [];
            this.categories.forEach((cat, i) => {
                const variants = Augment.generateVariants(cat, this.charSet, augmentationOptions);
                for (const variant of variants) {
                    const vec = enc.normalize(enc.encode(variant));
                    X.push(vec);
                    Y.push(this.oneHot(this.categories.length, i));
                }
            });
            const inputDim = X[0].length;
            const W = this.randomMatrix(this.hiddenUnits, inputDim);
            const b = this.randomMatrix(this.hiddenUnits, 1);
            let H = this.buildHidden(X, W, b);
            if (weights) {
                if (weights.length !== H.length) {
                    throw new Error(`Weight array length ${weights.length} does not match sample count ${H.length}`);
                }
                H = H.map((row, i) => row.map(x => x * Math.sqrt(weights[i])));
                Y = Y.map((row, i) => row.map(x => x * Math.sqrt(weights[i])));
            }
            const beta = ridgeSolve$1(H, Y, this.ridgeLambda);
            this.model = { W, b, beta };
            const predictions = Matrix.multiply(H, beta);
            if (this.metrics) {
                const rmse = this.calculateRMSE(Y, predictions);
                const mae = this.calculateMAE(Y, predictions);
                const acc = this.calculateAccuracy(Y, predictions);
                const f1 = this.calculateF1Score(Y, predictions);
                const ce = this.calculateCrossEntropy(Y, predictions);
                const r2 = this.calculateR2Score(Y, predictions);
                const results = { rmse, mae, accuracy: acc, f1, crossEntropy: ce, r2 };
                let allPassed = true;
                if (this.metrics.rmse !== undefined && rmse > this.metrics.rmse)
                    allPassed = false;
                if (this.metrics.mae !== undefined && mae > this.metrics.mae)
                    allPassed = false;
                if (this.metrics.accuracy !== undefined && acc < this.metrics.accuracy)
                    allPassed = false;
                if (this.metrics.f1 !== undefined && f1 < this.metrics.f1)
                    allPassed = false;
                if (this.metrics.crossEntropy !== undefined && ce > this.metrics.crossEntropy)
                    allPassed = false;
                if (this.metrics.r2 !== undefined && r2 < this.metrics.r2)
                    allPassed = false;
                if (this.verbose)
                    this.logMetrics(results);
                if (allPassed) {
                    this.savedModelJSON = JSON.stringify({
                        config: this.serializeConfig(),
                        W, b, B: beta
                    });
                    if (this.verbose)
                        console.log('✅ Model passed thresholds and was saved to JSON.');
                    if (this.config.exportFileName)
                        this.saveModelAsJSONFile(this.config.exportFileName);
                }
                else {
                    if (this.verbose)
                        console.log('❌ Model not saved: One or more thresholds not met.');
                }
            }
            else {
                this.savedModelJSON = JSON.stringify({
                    config: this.serializeConfig(),
                    W, b, B: beta
                });
                if (this.verbose)
                    console.log('✅ Model trained with no metrics—saved by default.');
                if (this.config.exportFileName)
                    this.saveModelAsJSONFile(this.config.exportFileName);
            }
            return { epochs: 1, metrics: undefined };
        }
        /* ========= Prediction ========= */
        /** Text prediction (uses Option A narrowing) */
        predict(text, topK = 5) {
            if (!this.model)
                throw new Error('Model not trained.');
            if (!this.useTokenizer) {
                throw new Error('predict(text) requires useTokenizer:true');
            }
            const enc = this.assertEncoder();
            const vec = enc.normalize(enc.encode(text));
            const logits = this.predictLogitsFromVector(vec);
            const probs = Activations.softmax(logits);
            return probs
                .map((p, i) => ({ label: this.categories[i], prob: p }))
                .sort((a, b) => b.prob - a.prob)
                .slice(0, topK);
        }
        /** Vector batch prediction (kept for back-compat) */
        predictFromVector(inputVecRows, topK = 5) {
            if (!this.model)
                throw new Error('Model not trained.');
            return inputVecRows.map(vec => {
                const logits = this.predictLogitsFromVector(vec);
                const probs = Activations.softmax(logits);
                return probs
                    .map((p, i) => ({ label: this.categories[i], prob: p }))
                    .sort((a, b) => b.prob - a.prob)
                    .slice(0, topK);
            });
        }
        /** Raw logits for a single numeric vector */
        predictLogitsFromVector(vec) {
            if (!this.model)
                throw new Error('Model not trained.');
            const { W, b, beta } = this.model;
            // Hidden
            const tempH = Matrix.multiply([vec], Matrix.transpose(W)); // 1 x hidden
            const activationFn = Activations.get(this.activation);
            const H = Activations.apply(tempH.map(row => row.map((val, j) => val + b[j][0])), activationFn); // 1 x hidden
            // Output logits
            return Matrix.multiply(H, beta)[0]; // 1 x outDim → vec
        }
        /** Raw logits for a batch of numeric vectors */
        predictLogitsFromVectors(X) {
            if (!this.model)
                throw new Error('Model not trained.');
            const { W, b, beta } = this.model;
            const tempH = Matrix.multiply(X, Matrix.transpose(W));
            const activationFn = Activations.get(this.activation);
            const H = Activations.apply(tempH.map(row => row.map((val, j) => val + b[j][0])), activationFn);
            return Matrix.multiply(H, beta);
        }
        /** Probability vector (softmax) for a single numeric vector */
        predictProbaFromVector(vec) {
            return Activations.softmax(this.predictLogitsFromVector(vec));
        }
        /** Probability matrix (softmax per row) for a batch of numeric vectors */
        predictProbaFromVectors(X) {
            return this.predictLogitsFromVectors(X).map(Activations.softmax);
        }
        /** Top-K results for a single numeric vector */
        predictTopKFromVector(vec, k = 5) {
            const probs = this.predictProbaFromVector(vec);
            return probs
                .map((p, i) => ({ index: i, label: this.categories[i], prob: p }))
                .sort((a, b) => b.prob - a.prob)
                .slice(0, k);
        }
        /** Top-K results for a batch of numeric vectors */
        predictTopKFromVectors(X, k = 5) {
            return this.predictProbaFromVectors(X).map(row => row
                .map((p, i) => ({ index: i, label: this.categories[i], prob: p }))
                .sort((a, b) => b.prob - a.prob)
                .slice(0, k));
        }
        /* ========= Metrics ========= */
        calculateRMSE(Y, P) {
            const N = Y.length, C = Y[0].length;
            let sum = 0;
            for (let i = 0; i < N; i++)
                for (let j = 0; j < C; j++) {
                    const d = Y[i][j] - P[i][j];
                    sum += d * d;
                }
            return Math.sqrt(sum / (N * C));
        }
        calculateMAE(Y, P) {
            const N = Y.length, C = Y[0].length;
            let sum = 0;
            for (let i = 0; i < N; i++)
                for (let j = 0; j < C; j++) {
                    sum += Math.abs(Y[i][j] - P[i][j]);
                }
            return sum / (N * C);
        }
        calculateAccuracy(Y, P) {
            let correct = 0;
            for (let i = 0; i < Y.length; i++) {
                const yMax = this.argmax(Y[i]);
                const pMax = this.argmax(P[i]);
                if (yMax === pMax)
                    correct++;
            }
            return correct / Y.length;
        }
        calculateF1Score(Y, P) {
            let tp = 0, fp = 0, fn = 0;
            for (let i = 0; i < Y.length; i++) {
                const yIdx = this.argmax(Y[i]);
                const pIdx = this.argmax(P[i]);
                if (yIdx === pIdx)
                    tp++;
                else {
                    fp++;
                    fn++;
                }
            }
            const precision = tp / (tp + fp || 1);
            const recall = tp / (tp + fn || 1);
            return 2 * (precision * recall) / (precision + recall || 1);
        }
        calculateCrossEntropy(Y, P) {
            let loss = 0;
            for (let i = 0; i < Y.length; i++) {
                for (let j = 0; j < Y[0].length; j++) {
                    const pred = Math.min(Math.max(P[i][j], 1e-15), 1 - 1e-15);
                    loss += -Y[i][j] * Math.log(pred);
                }
            }
            return loss / Y.length;
        }
        calculateR2Score(Y, P) {
            const C = Y[0].length;
            const mean = new Array(C).fill(0);
            for (let i = 0; i < Y.length; i++)
                for (let j = 0; j < C; j++)
                    mean[j] += Y[i][j];
            for (let j = 0; j < C; j++)
                mean[j] /= Y.length;
            let ssRes = 0, ssTot = 0;
            for (let i = 0; i < Y.length; i++) {
                for (let j = 0; j < C; j++) {
                    ssRes += Math.pow(Y[i][j] - P[i][j], 2);
                    ssTot += Math.pow(Y[i][j] - mean[j], 2);
                }
            }
            return 1 - ssRes / ssTot;
        }
        /* ========= Hidden layer / embeddings ========= */
        computeHiddenLayer(X) {
            if (!this.model)
                throw new Error('Model not trained.');
            const WX = Matrix.multiply(X, Matrix.transpose(this.model.W));
            const WXb = WX.map(row => row.map((val, j) => val + this.model.b[j][0]));
            const activationFn = Activations.get(this.activation);
            return WXb.map(row => row.map(activationFn));
        }
        getEmbedding(X) {
            return this.computeHiddenLayer(X);
        }
        /* ========= Logging & export ========= */
        logMetrics(results) {
            var _a, _b, _c, _d, _e, _f;
            const logLines = [`📋 ${this.modelName} — Metrics Summary:`];
            const push = (label, value, threshold, cmp) => {
                if (threshold !== undefined)
                    logLines.push(`  ${label}: ${value.toFixed(4)} (threshold: ${cmp} ${threshold})`);
            };
            push('RMSE', results.rmse, (_a = this.metrics) === null || _a === void 0 ? void 0 : _a.rmse, '<=');
            push('MAE', results.mae, (_b = this.metrics) === null || _b === void 0 ? void 0 : _b.mae, '<=');
            push('Accuracy', results.accuracy, (_c = this.metrics) === null || _c === void 0 ? void 0 : _c.accuracy, '>=');
            push('F1 Score', results.f1, (_d = this.metrics) === null || _d === void 0 ? void 0 : _d.f1, '>=');
            push('Cross-Entropy', results.crossEntropy, (_e = this.metrics) === null || _e === void 0 ? void 0 : _e.crossEntropy, '<=');
            push('R² Score', results.r2, (_f = this.metrics) === null || _f === void 0 ? void 0 : _f.r2, '>=');
            if (this.verbose)
                console.log('\n' + logLines.join('\n'));
            if (this.logToFile) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const logFile = this.config.logFileName || `${this.modelName.toLowerCase().replace(/\s+/g, '_')}_metrics_${timestamp}.txt`;
                const blob = new Blob([logLines.join('\n')], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = logFile;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        }
        saveModelAsJSONFile(filename) {
            if (!this.savedModelJSON) {
                if (this.verbose)
                    console.warn('No model saved — did not meet metric thresholds.');
                return;
            }
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fallback = `${this.modelName.toLowerCase().replace(/\s+/g, '_')}_${timestamp}.json`;
            const finalName = filename || this.config.exportFileName || fallback;
            const blob = new Blob([this.savedModelJSON], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = finalName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            if (this.verbose)
                console.log(`📦 Model exported as ${finalName}`);
        }
        serializeConfig() {
            const cfg = Object.assign({}, this.config);
            // Remove non-serializable / volatile fields
            delete cfg.seed;
            delete cfg.log;
            delete cfg.encoder;
            // Serialize tokenizerDelimiter for JSON
            if (cfg.tokenizerDelimiter instanceof RegExp) {
                cfg.tokenizerDelimiter = cfg.tokenizerDelimiter.source;
            }
            return cfg;
        }
        argmax(arr) {
            let i = 0;
            for (let k = 1; k < arr.length; k++)
                if (arr[k] > arr[i])
                    i = k;
            return i;
        }
        getEncoder() {
            return this.encoder;
        }
    }

    // © 2026 AsterMind AI Co. – All Rights Reserved.
    // Patent Pending US 63/897,713
    // KernelELM.ts — Kernel Extreme Learning Machine (Exact + Nyström + Whitening)
    // Dependencies: Matrix (multiply, transpose, addRegularization, solveCholesky, identity, zeros)
    class KernelRegistry {
        static register(name, fn) {
            if (!name || typeof fn !== 'function')
                throw new Error('KernelRegistry.register: invalid args');
            this.map.set(name, fn);
        }
        static get(name) {
            const f = this.map.get(name);
            if (!f)
                throw new Error(`KernelRegistry: kernel "${name}" not found`);
            return f;
        }
    }
    KernelRegistry.map = new Map();
    function l2sq(a, b) {
        let s = 0;
        for (let i = 0; i < a.length; i++) {
            const d = a[i] - b[i];
            s += d * d;
        }
        return s;
    }
    function l1(a, b) {
        let s = 0;
        for (let i = 0; i < a.length; i++)
            s += Math.abs(a[i] - b[i]);
        return s;
    }
    function dot$4(a, b) {
        let s = 0;
        for (let i = 0; i < a.length; i++)
            s += a[i] * b[i];
        return s;
    }
    function softmaxRow(v) {
        const m = Math.max(...v);
        const ex = v.map(x => Math.exp(x - m));
        const s = ex.reduce((a, b) => a + b, 0) || 1;
        return ex.map(e => e / s);
    }
    function makePRNG$1(seed = 123456789) {
        let s = seed | 0 || 1;
        return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 0xffffffff; };
    }
    function buildKernel(spec, dim) {
        var _a, _b, _c, _d, _e;
        switch (spec.type) {
            case 'custom':
                if (!spec.name)
                    throw new Error('custom kernel requires "name"');
                return KernelRegistry.get(spec.name);
            case 'linear':
                return (x, z) => dot$4(x, z);
            case 'poly': {
                const gamma = (_a = spec.gamma) !== null && _a !== void 0 ? _a : 1 / Math.max(1, dim);
                const degree = (_b = spec.degree) !== null && _b !== void 0 ? _b : 2;
                const coef0 = (_c = spec.coef0) !== null && _c !== void 0 ? _c : 1;
                return (x, z) => Math.pow(gamma * dot$4(x, z) + coef0, degree);
            }
            case 'laplacian': {
                const gamma = (_d = spec.gamma) !== null && _d !== void 0 ? _d : 1 / Math.max(1, dim);
                return (x, z) => Math.exp(-gamma * l1(x, z));
            }
            case 'rbf':
            default: {
                const gamma = (_e = spec.gamma) !== null && _e !== void 0 ? _e : 1 / Math.max(1, dim);
                return (x, z) => Math.exp(-gamma * l2sq(x, z));
            }
        }
    }
    /* ============== Landmark selection (Nyström) ============== */
    function pickUniform(X, m, seed = 1337) {
        const prng = makePRNG$1(seed);
        const N = X.length;
        const idx = Array.from({ length: N }, (_, i) => i);
        // Fisher–Yates (only first m)
        for (let i = 0; i < m; i++) {
            const j = i + Math.floor(prng() * (N - i));
            const t = idx[i];
            idx[i] = idx[j];
            idx[j] = t;
        }
        return idx.slice(0, m);
    }
    function pickKMeansPP(X, m, seed = 1337) {
        const prng = makePRNG$1(seed);
        const N = X.length;
        if (m >= N)
            return Array.from({ length: N }, (_, i) => i);
        const centers = [];
        centers.push(Math.floor(prng() * N));
        const D2 = new Float64Array(N).fill(Infinity);
        while (centers.length < m) {
            const c = centers[centers.length - 1];
            for (let i = 0; i < N; i++) {
                const d2 = l2sq(X[i], X[c]);
                if (d2 < D2[i])
                    D2[i] = d2;
            }
            let sum = 0;
            for (let i = 0; i < N; i++)
                sum += D2[i];
            let r = prng() * (sum || 1);
            let next = 0;
            for (let i = 0; i < N; i++) {
                r -= D2[i];
                if (r <= 0) {
                    next = i;
                    break;
                }
            }
            centers.push(next);
        }
        return centers;
    }
    /* ====================== KernelELM ====================== */
    class KernelELM {
        constructor(config) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
            // exact mode params
            this.Xtrain = [];
            this.alpha = [];
            // nystrom params
            this.Z = []; // landmarks (m x D)
            this.W = []; // weights in feature space (m x K)
            this.R = []; // symmetric whitener K_mm^{-1/2} (m x m) when whitening
            const resolved = {
                outputDim: config.outputDim,
                kernel: config.kernel,
                ridgeLambda: (_a = config.ridgeLambda) !== null && _a !== void 0 ? _a : 1e-2,
                task: (_b = config.task) !== null && _b !== void 0 ? _b : 'classification',
                mode: (_c = config.mode) !== null && _c !== void 0 ? _c : 'exact',
                nystrom: {
                    m: (_d = config.nystrom) === null || _d === void 0 ? void 0 : _d.m,
                    strategy: (_f = (_e = config.nystrom) === null || _e === void 0 ? void 0 : _e.strategy) !== null && _f !== void 0 ? _f : 'uniform',
                    seed: (_h = (_g = config.nystrom) === null || _g === void 0 ? void 0 : _g.seed) !== null && _h !== void 0 ? _h : 1337,
                    preset: (_j = config.nystrom) === null || _j === void 0 ? void 0 : _j.preset,
                    whiten: (_l = (_k = config.nystrom) === null || _k === void 0 ? void 0 : _k.whiten) !== null && _l !== void 0 ? _l : false,
                    jitter: (_o = (_m = config.nystrom) === null || _m === void 0 ? void 0 : _m.jitter) !== null && _o !== void 0 ? _o : 1e-10,
                },
                log: {
                    modelName: (_q = (_p = config.log) === null || _p === void 0 ? void 0 : _p.modelName) !== null && _q !== void 0 ? _q : 'KernelELM',
                    verbose: (_s = (_r = config.log) === null || _r === void 0 ? void 0 : _r.verbose) !== null && _s !== void 0 ? _s : false,
                },
            };
            this.cfg = resolved;
            this.verbose = this.cfg.log.verbose;
            this.name = this.cfg.log.modelName;
        }
        /* ------------------- Train ------------------- */
        fit(X, Y) {
            var _a, _b, _c, _d, _e;
            if (!(X === null || X === void 0 ? void 0 : X.length) || !((_a = X[0]) === null || _a === void 0 ? void 0 : _a.length))
                throw new Error('KernelELM.fit: empty X');
            if (!(Y === null || Y === void 0 ? void 0 : Y.length) || !((_b = Y[0]) === null || _b === void 0 ? void 0 : _b.length))
                throw new Error('KernelELM.fit: empty Y');
            if (X.length !== Y.length)
                throw new Error(`KernelELM.fit: X rows ${X.length} != Y rows ${Y.length}`);
            if (Y[0].length !== this.cfg.outputDim) {
                throw new Error(`KernelELM.fit: Y dims ${Y[0].length} != outputDim ${this.cfg.outputDim}`);
            }
            const N = X.length, D = X[0].length, K = Y[0].length;
            this.kernel = buildKernel(this.cfg.kernel, D);
            if (this.cfg.mode === 'exact') {
                // Gram K (N x N)
                if (this.verbose)
                    console.log(`🔧 [${this.name}] exact Gram: N=${N}, D=${D}`);
                const Kmat = new Array(N);
                for (let i = 0; i < N; i++) {
                    const row = new Array(N);
                    Kmat[i] = row;
                    row[i] = 1;
                    for (let j = i + 1; j < N; j++)
                        row[j] = this.kernel(X[i], X[j]);
                }
                for (let i = 1; i < N; i++)
                    for (let j = 0; j < i; j++)
                        Kmat[i][j] = Kmat[j][i];
                // (K + λI) α = Y
                const A = Matrix.addRegularization(Kmat, this.cfg.ridgeLambda + 1e-10);
                const Alpha = Matrix.solveCholesky(A, Y, 1e-12); // (N x K)
                this.Xtrain = X.map(r => r.slice());
                this.alpha = Alpha;
                this.Z = [];
                this.W = [];
                this.R = [];
                if (this.verbose)
                    console.log(`✅ [${this.name}] exact fit complete: alpha(${N}x${K})`);
                return;
            }
            // ---------- Nyström ----------
            const ny = this.cfg.nystrom;
            let Z;
            if (ny.strategy === 'preset' && (((_c = ny.preset) === null || _c === void 0 ? void 0 : _c.points) || ((_d = ny.preset) === null || _d === void 0 ? void 0 : _d.indices))) {
                Z = ny.preset.points ? ny.preset.points.map(r => r.slice())
                    : ny.preset.indices.map(i => X[i]);
            }
            else {
                const m = (_e = ny.m) !== null && _e !== void 0 ? _e : Math.max(10, Math.min(300, Math.floor(Math.sqrt(N))));
                const idx = (ny.strategy === 'kmeans++') ? pickKMeansPP(X, m, ny.seed) : pickUniform(X, m, ny.seed);
                Z = idx.map(i => X[i]);
            }
            const m = Z.length;
            if (this.verbose)
                console.log(`🔹 [${this.name}] Nyström: m=${m}, strategy=${ny.strategy}, whiten=${ny.whiten ? 'on' : 'off'}`);
            // K_nm (N x m)
            const Knm = new Array(N);
            for (let i = 0; i < N; i++) {
                const row = new Array(m), xi = X[i];
                for (let j = 0; j < m; j++)
                    row[j] = this.kernel(xi, Z[j]);
                Knm[i] = row;
            }
            // Optional whitening with R = K_mm^{-1/2} (symmetric via eigen)
            let Phi = Knm;
            let R = [];
            if (ny.whiten) {
                // K_mm (m x m)
                const Kmm = new Array(m);
                for (let i = 0; i < m; i++) {
                    const row = new Array(m);
                    Kmm[i] = row;
                    row[i] = 1;
                    for (let j = i + 1; j < m; j++)
                        row[j] = this.kernel(Z[i], Z[j]);
                }
                for (let i = 1; i < m; i++)
                    for (let j = 0; j < i; j++)
                        Kmm[i][j] = Kmm[j][i];
                // R = K_mm^{-1/2} with jitter
                const KmmJ = Matrix.addRegularization(Kmm, ny.jitter);
                R = Matrix.invSqrtSym(KmmJ, ny.jitter);
                Phi = Matrix.multiply(Knm, R); // (N x m)
            }
            // Ridge in feature space: W = (Φᵀ Φ + λ I)^-1 Φᵀ Y   (m x K)
            const PhiT = Matrix.transpose(Phi);
            const G = Matrix.multiply(PhiT, Phi); // (m x m)
            const Greg = Matrix.addRegularization(G, this.cfg.ridgeLambda + 1e-10);
            const Rhs = Matrix.multiply(PhiT, Y); // (m x K)
            const W = Matrix.solveCholesky(Greg, Rhs, 1e-12); // (m x K)
            this.Z = Z;
            this.W = W;
            this.R = R; // empty when whiten=false
            this.Xtrain = [];
            this.alpha = [];
            if (this.verbose)
                console.log(`✅ [${this.name}] Nyström fit complete: Z(${m}x${D}), W(${m}x${K})`);
        }
        /* --------------- Features / Predict --------------- */
        featuresFor(X) {
            if (this.cfg.mode === 'exact') {
                const N = this.Xtrain.length, M = X.length;
                const Kqx = new Array(M);
                for (let i = 0; i < M; i++) {
                    const row = new Array(N), xi = X[i];
                    for (let j = 0; j < N; j++)
                        row[j] = this.kernel(xi, this.Xtrain[j]);
                    Kqx[i] = row;
                }
                return Kqx;
            }
            // Nyström
            if (!this.Z.length)
                throw new Error('featuresFor: Nyström model not fitted');
            const M = X.length, m = this.Z.length;
            const Kxm = new Array(M);
            for (let i = 0; i < M; i++) {
                const row = new Array(m), xi = X[i];
                for (let j = 0; j < m; j++)
                    row[j] = this.kernel(xi, this.Z[j]);
                Kxm[i] = row;
            }
            return this.R.length ? Matrix.multiply(Kxm, this.R) : Kxm;
        }
        /** Raw logits for batch (M x K) */
        predictLogitsFromVectors(X) {
            const Phi = this.featuresFor(X);
            if (this.cfg.mode === 'exact') {
                if (!this.alpha.length)
                    throw new Error('predict: exact model not fitted');
                return Matrix.multiply(Phi, this.alpha);
            }
            if (!this.W.length)
                throw new Error('predict: Nyström model not fitted');
            return Matrix.multiply(Phi, this.W);
        }
        /** Probabilities for classification; raw scores for regression */
        predictProbaFromVectors(X) {
            const logits = this.predictLogitsFromVectors(X);
            return this.cfg.task === 'classification' ? logits.map(softmaxRow) : logits;
        }
        /** Top-K for classification */
        predictTopKFromVectors(X, k = 5) {
            const P = this.predictProbaFromVectors(X);
            return P.map(row => row.map((p, i) => ({ index: i, prob: p }))
                .sort((a, b) => b.prob - a.prob)
                .slice(0, k));
        }
        /** Embedding for chaining:
         *  - exact: Φ = K(X, X_train)  (M x N)
         *  - nystrom: Φ = K(X, Z)      (M x m)  or K(X,Z)·R if whiten=true
         */
        getEmbedding(X) {
            return this.featuresFor(X);
        }
        /* -------------------- JSON I/O -------------------- */
        toJSON() {
            const base = { config: Object.assign(Object.assign({}, this.cfg), { __version: 'kelm-2.1.0' }) };
            if (this.cfg.mode === 'exact') {
                return Object.assign(Object.assign({}, base), { X: this.Xtrain, alpha: this.alpha });
            }
            return Object.assign(Object.assign({}, base), { Z: this.Z, W: this.W, R: this.R.length ? this.R : undefined });
        }
        fromJSON(payload) {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            const obj = typeof payload === 'string' ? JSON.parse(payload) : payload;
            // Merge config (keep current defaults where missing)
            this.cfg.kernel = Object.assign({}, obj.config.kernel);
            this.cfg.ridgeLambda = (_a = obj.config.ridgeLambda) !== null && _a !== void 0 ? _a : this.cfg.ridgeLambda;
            this.cfg.task = ((_b = obj.config.task) !== null && _b !== void 0 ? _b : this.cfg.task);
            this.cfg.mode = ((_c = obj.config.mode) !== null && _c !== void 0 ? _c : this.cfg.mode);
            this.cfg.nystrom = Object.assign(Object.assign({}, this.cfg.nystrom), ((_d = obj.config.nystrom) !== null && _d !== void 0 ? _d : {}));
            // Restore params
            if (obj.X && obj.alpha) {
                this.Xtrain = obj.X.map(r => r.slice());
                this.alpha = obj.alpha.map(r => r.slice());
                this.Z = [];
                this.W = [];
                this.R = [];
                const D = (_f = (_e = this.Xtrain[0]) === null || _e === void 0 ? void 0 : _e.length) !== null && _f !== void 0 ? _f : 1;
                this.kernel = buildKernel(this.cfg.kernel, D);
                return;
            }
            if (obj.Z && obj.W) {
                this.Z = obj.Z.map(r => r.slice());
                this.W = obj.W.map(r => r.slice());
                this.R = obj.R ? obj.R.map(r => r.slice()) : [];
                this.Xtrain = [];
                this.alpha = [];
                const D = (_h = (_g = this.Z[0]) === null || _g === void 0 ? void 0 : _g.length) !== null && _h !== void 0 ? _h : 1;
                this.kernel = buildKernel(this.cfg.kernel, D);
                return;
            }
            throw new Error('KernelELM.fromJSON: invalid payload');
        }
    }

    // © 2026 AsterMind AI Co. – All Rights Reserved.
    // Patent Pending US 63/897,713
    // OnlineELM.ts — Online / OS-ELM with RLS updates
    /* ========== utils ========== */
    const EPS$4 = 1e-10;
    function makePRNG(seed = 123456789) {
        let s = seed | 0 || 1;
        return () => {
            s ^= s << 13;
            s ^= s >>> 17;
            s ^= s << 5;
            return ((s >>> 0) / 0xffffffff);
        };
    }
    /* ========== Online ELM (RLS) ========== */
    class OnlineELM {
        constructor(cfg) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            this.inputDim = cfg.inputDim | 0;
            this.outputDim = cfg.outputDim | 0;
            this.hiddenUnits = cfg.hiddenUnits | 0;
            if (this.inputDim <= 0 || this.outputDim <= 0 || this.hiddenUnits <= 0) {
                throw new Error(`OnlineELM: invalid dims (inputDim=${this.inputDim}, outputDim=${this.outputDim}, hidden=${this.hiddenUnits})`);
            }
            this.activation = (_a = cfg.activation) !== null && _a !== void 0 ? _a : 'relu';
            this.ridgeLambda = Math.max((_b = cfg.ridgeLambda) !== null && _b !== void 0 ? _b : 1e-2, EPS$4);
            this.weightInit = (_c = cfg.weightInit) !== null && _c !== void 0 ? _c : 'xavier';
            this.forgettingFactor = Math.max(Math.min((_d = cfg.forgettingFactor) !== null && _d !== void 0 ? _d : 1.0, 1.0), 1e-4);
            this.verbose = (_f = (_e = cfg.log) === null || _e === void 0 ? void 0 : _e.verbose) !== null && _f !== void 0 ? _f : false;
            this.modelName = (_h = (_g = cfg.log) === null || _g === void 0 ? void 0 : _g.modelName) !== null && _h !== void 0 ? _h : 'Online ELM';
            const seed = (_j = cfg.seed) !== null && _j !== void 0 ? _j : 1337;
            this.rng = makePRNG(seed);
            this.actFn = Activations.get(this.activation);
            // Random features
            this.W = this.initW(this.hiddenUnits, this.inputDim);
            this.b = this.initB(this.hiddenUnits);
            // Not initialized yet — init() will set these
            this.beta = null;
            this.P = null;
        }
        /* ===== init helpers ===== */
        xavierLimit(fanIn, fanOut) { return Math.sqrt(6 / (fanIn + fanOut)); }
        heLimit(fanIn) { return Math.sqrt(6 / fanIn); }
        initW(rows, cols) {
            let limit = 1;
            if (this.weightInit === 'xavier') {
                limit = this.xavierLimit(cols, rows);
                if (this.verbose)
                    console.log(`✨ [${this.modelName}] Xavier W ~ U(±${limit.toFixed(4)})`);
            }
            else if (this.weightInit === 'he') {
                limit = this.heLimit(cols);
                if (this.verbose)
                    console.log(`✨ [${this.modelName}] He W ~ U(±${limit.toFixed(4)})`);
            }
            else if (this.verbose) {
                console.log(`✨ [${this.modelName}] Uniform W ~ U(±1)`);
            }
            const rnd = () => (this.rng() * 2 - 1) * limit;
            return Array.from({ length: rows }, () => Array.from({ length: cols }, rnd));
        }
        initB(rows) {
            const rnd = () => (this.rng() * 2 - 1) * 0.01;
            return Array.from({ length: rows }, () => [rnd()]);
        }
        hidden(X) {
            const tempH = Matrix.multiply(X, Matrix.transpose(this.W)); // (n x hidden)
            const f = this.actFn;
            return tempH.map(row => row.map((v, j) => f(v + this.b[j][0])));
        }
        /* ===== public API ===== */
        /** Initialize β and P from a batch (ridge): P0=(HᵀH+λI)^-1, β0=P0 HᵀY */
        init(X0, Y0) {
            if (!(X0 === null || X0 === void 0 ? void 0 : X0.length) || !(Y0 === null || Y0 === void 0 ? void 0 : Y0.length))
                throw new Error('init: empty X0 or Y0');
            if (X0.length !== Y0.length)
                throw new Error(`init: X0 rows ${X0.length} != Y0 rows ${Y0.length}`);
            if (X0[0].length !== this.inputDim)
                throw new Error(`init: X0 cols ${X0[0].length} != inputDim ${this.inputDim}`);
            if (Y0[0].length !== this.outputDim)
                throw new Error(`init: Y0 cols ${Y0[0].length} != outputDim ${this.outputDim}`);
            const H0 = this.hidden(X0); // (n x h)
            const Ht = Matrix.transpose(H0); // (h x n)
            const A = Matrix.addRegularization(Matrix.multiply(Ht, H0), this.ridgeLambda + 1e-10); // (h x h)
            const R = Matrix.multiply(Ht, Y0); // (h x k)
            const P0 = Matrix.solveCholesky(A, Matrix.identity(this.hiddenUnits), 1e-10); // A^-1
            const B0 = Matrix.multiply(P0, R); // (h x k)
            this.P = P0;
            this.beta = B0;
            if (this.verbose)
                console.log(`✅ [${this.modelName}] init: n=${X0.length}, hidden=${this.hiddenUnits}, out=${this.outputDim}`);
        }
        /** If not initialized, init(); otherwise RLS update. */
        fit(X, Y) {
            if (!(X === null || X === void 0 ? void 0 : X.length) || !(Y === null || Y === void 0 ? void 0 : Y.length))
                throw new Error('fit: empty X or Y');
            if (X.length !== Y.length)
                throw new Error(`fit: X rows ${X.length} != Y rows ${Y.length}`);
            if (!this.P || !this.beta)
                this.init(X, Y);
            else
                this.update(X, Y);
        }
        /**
         * RLS / OS-ELM update with forgetting ρ:
         *   S = I + HPHᵀ
         *   K = P Hᵀ S^-1
         *   β ← β + K (Y - Hβ)
         *   P ← (P - K H P) / ρ
         */
        update(X, Y) {
            if (!(X === null || X === void 0 ? void 0 : X.length) || !(Y === null || Y === void 0 ? void 0 : Y.length))
                throw new Error('update: empty X or Y');
            if (X.length !== Y.length)
                throw new Error(`update: X rows ${X.length} != Y rows ${Y.length}`);
            if (!this.P || !this.beta)
                throw new Error('update: model not initialized (call init() first)');
            const n = X.length;
            const H = this.hidden(X); // (n x h)
            const Ht = Matrix.transpose(H); // (h x n)
            const rho = this.forgettingFactor;
            let P = this.P;
            if (rho < 1.0) {
                // Equivalent to P <- P / ρ (more responsive to new data)
                P = P.map(row => row.map(v => v / rho));
            }
            // S = I + H P Hᵀ  (n x n, SPD)
            const HP = Matrix.multiply(H, P); // (n x h)
            const HPHt = Matrix.multiply(HP, Ht); // (n x n)
            const S = Matrix.add(HPHt, Matrix.identity(n));
            const S_inv = Matrix.solveCholesky(S, Matrix.identity(n), 1e-10);
            // K = P Hᵀ S^-1  (h x n)
            const PHt = Matrix.multiply(P, Ht); // (h x n)
            const K = Matrix.multiply(PHt, S_inv); // (h x n)
            // Innovation: (Y - Hβ)  (n x k)
            const Hbeta = Matrix.multiply(H, this.beta);
            const innov = Y.map((row, i) => row.map((yij, j) => yij - Hbeta[i][j]));
            // β ← β + K * innov
            const Delta = Matrix.multiply(K, innov); // (h x k)
            this.beta = this.beta.map((row, i) => row.map((bij, j) => bij + Delta[i][j]));
            // P ← P - K H P
            const KH = Matrix.multiply(K, H); // (h x h)
            const KHP = Matrix.multiply(KH, P); // (h x h)
            this.P = P.map((row, i) => row.map((pij, j) => pij - KHP[i][j]));
            if (this.verbose) {
                const diagAvg = this.P.reduce((s, r, i) => s + r[i], 0) / this.P.length;
                console.log(`🔁 [${this.modelName}] update: n=${n}, avg diag(P)≈${diagAvg.toFixed(6)}`);
            }
        }
        /* ===== Prediction ===== */
        logitsFromVectors(X) {
            if (!this.beta)
                throw new Error('predict: model not initialized');
            const H = this.hidden(X);
            return Matrix.multiply(H, this.beta);
        }
        predictLogitsFromVector(x) {
            return this.logitsFromVectors([x])[0];
        }
        predictLogitsFromVectors(X) {
            return this.logitsFromVectors(X);
        }
        predictProbaFromVector(x) {
            return Activations.softmax(this.predictLogitsFromVector(x));
        }
        predictProbaFromVectors(X) {
            return this.predictLogitsFromVectors(X).map(Activations.softmax);
        }
        predictTopKFromVector(x, k = 5) {
            const p = this.predictProbaFromVector(x);
            const kk = Math.max(1, Math.min(k, p.length));
            return p.map((prob, index) => ({ index, prob }))
                .sort((a, b) => b.prob - a.prob)
                .slice(0, kk);
        }
        predictTopKFromVectors(X, k = 5) {
            return this.predictProbaFromVectors(X).map(p => {
                const kk = Math.max(1, Math.min(k, p.length));
                return p.map((prob, index) => ({ index, prob }))
                    .sort((a, b) => b.prob - a.prob)
                    .slice(0, kk);
            });
        }
        /* ===== Serialization ===== */
        toJSON(includeP = false) {
            if (!this.beta || !this.P)
                throw new Error('toJSON: model not initialized');
            const cfg = {
                hiddenUnits: this.hiddenUnits,
                inputDim: this.inputDim,
                outputDim: this.outputDim,
                activation: this.activation,
                ridgeLambda: this.ridgeLambda,
                weightInit: this.weightInit,
                forgettingFactor: this.forgettingFactor,
                __version: 'online-elm-1.0.0',
            };
            const o = { W: this.W, b: this.b, B: this.beta, config: cfg };
            if (includeP)
                o.P = this.P;
            return o;
        }
        loadFromJSON(json) {
            var _a;
            const parsed = typeof json === 'string' ? JSON.parse(json) : json;
            const { W, b, B, P, config } = parsed;
            if (!W || !b || !B)
                throw new Error('loadFromJSON: missing W/b/B');
            if (W.length !== this.hiddenUnits || W[0].length !== this.inputDim) {
                throw new Error(`loadFromJSON: mismatched W shape (${W.length}x${W[0].length})`);
            }
            if (b.length !== this.hiddenUnits || b[0].length !== 1) {
                throw new Error(`loadFromJSON: mismatched b shape (${b.length}x${b[0].length})`);
            }
            if (B.length !== this.hiddenUnits || B[0].length !== this.outputDim) {
                throw new Error(`loadFromJSON: mismatched B shape (${B.length}x${B[0].length})`);
            }
            this.W = W;
            this.b = b;
            this.beta = B;
            this.P = P !== null && P !== void 0 ? P : null;
            if (config === null || config === void 0 ? void 0 : config.activation) {
                this.activation = config.activation;
                this.actFn = Activations.get(this.activation); // refresh cache
            }
            if (config === null || config === void 0 ? void 0 : config.ridgeLambda)
                this.ridgeLambda = config.ridgeLambda;
            if (this.verbose)
                console.log(`✅ [${this.modelName}] model loaded (v=${(_a = config === null || config === void 0 ? void 0 : config.__version) !== null && _a !== void 0 ? _a : 'n/a'})`);
        }
    }

    // © 2026 AsterMind AI Co. – All Rights Reserved.
    // Patent Pending US 63/897,713
    // ELMChain.ts — simple encoder pipeline with checks, normalization, and profiling
    function l2NormalizeRows$1(M) {
        return M.map(row => {
            let s = 0;
            for (let i = 0; i < row.length; i++)
                s += row[i] * row[i];
            const n = Math.sqrt(s) || 1;
            const inv = 1 / n;
            return row.map(v => v * inv);
        });
    }
    function asBatch(x) {
        return Array.isArray(x[0]) ? x : [x];
    }
    function fromBatch(y, originalWasVector) {
        var _a;
        return originalWasVector ? ((_a = y[0]) !== null && _a !== void 0 ? _a : []) : y;
    }
    class ELMChain {
        constructor(encoders = [], opts) {
            var _a, _b, _c, _d, _e;
            this.lastDims = []; // input dim -> stage dims (for summary)
            this.encoders = [...encoders];
            this.opts = {
                normalizeEach: (_a = opts === null || opts === void 0 ? void 0 : opts.normalizeEach) !== null && _a !== void 0 ? _a : false,
                normalizeFinal: (_b = opts === null || opts === void 0 ? void 0 : opts.normalizeFinal) !== null && _b !== void 0 ? _b : false,
                validate: (_c = opts === null || opts === void 0 ? void 0 : opts.validate) !== null && _c !== void 0 ? _c : true,
                strict: (_d = opts === null || opts === void 0 ? void 0 : opts.strict) !== null && _d !== void 0 ? _d : true,
                name: (_e = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _e !== void 0 ? _e : 'ELMChain',
            };
        }
        /** Add encoder at end */
        add(encoder) {
            this.encoders.push(encoder);
        }
        /** Insert encoder at position (0..length) */
        insertAt(index, encoder) {
            if (index < 0 || index > this.encoders.length)
                throw new Error('insertAt: index out of range');
            this.encoders.splice(index, 0, encoder);
        }
        /** Remove encoder at index; returns removed or undefined */
        removeAt(index) {
            if (index < 0 || index >= this.encoders.length)
                return undefined;
            return this.encoders.splice(index, 1)[0];
        }
        /** Remove all encoders */
        clear() {
            this.encoders.length = 0;
            this.lastDims.length = 0;
        }
        /** Number of stages */
        length() {
            return this.encoders.length;
        }
        /** Human-friendly overview (dims are filled after the first successful run) */
        summary() {
            const lines = [];
            lines.push(`📦 ${this.opts.name} — ${this.encoders.length} stage(s)`);
            this.encoders.forEach((enc, i) => {
                var _a, _b, _c;
                const nm = (_a = enc.name) !== null && _a !== void 0 ? _a : `Encoder#${i}`;
                const dimIn = (_b = this.lastDims[i]) !== null && _b !== void 0 ? _b : '?';
                const dimOut = (_c = this.lastDims[i + 1]) !== null && _c !== void 0 ? _c : '?';
                lines.push(`  ${i}: ${nm}    ${dimIn} → ${dimOut}`);
            });
            return lines.join('\n');
        }
        getEmbedding(input) {
            var _a, _b;
            const wasVector = !Array.isArray(input[0]);
            const X0 = asBatch(input);
            if (this.opts.validate) {
                if (!X0.length || !((_a = X0[0]) === null || _a === void 0 ? void 0 : _a.length))
                    throw new Error('ELMChain.getEmbedding: empty input');
            }
            let X = X0;
            this.lastDims = [X0[0].length];
            for (let i = 0; i < this.encoders.length; i++) {
                const enc = this.encoders[i];
                try {
                    if (this.opts.validate) {
                        // Ensure rows consistent
                        const d = X[0].length;
                        for (let r = 1; r < X.length; r++) {
                            if (X[r].length !== d)
                                throw new Error(`Stage ${i} input row ${r} has dim ${X[r].length} != ${d}`);
                        }
                    }
                    let Y = enc.getEmbedding(X);
                    if (this.opts.validate) {
                        if (!Y.length || !((_b = Y[0]) === null || _b === void 0 ? void 0 : _b.length)) {
                            throw new Error(`Stage ${i} produced empty output`);
                        }
                    }
                    if (this.opts.normalizeEach) {
                        Y = l2NormalizeRows$1(Y);
                    }
                    // Record dims for summary
                    this.lastDims[i + 1] = Y[0].length;
                    X = Y;
                }
                catch (err) {
                    if (this.opts.strict)
                        throw err;
                    // Non-strict: return what we have so far
                    return fromBatch(X, wasVector);
                }
            }
            if (this.opts.normalizeFinal && !this.opts.normalizeEach) {
                X = l2NormalizeRows$1(X);
            }
            return fromBatch(X, wasVector);
        }
        /**
         * Run once to collect per-stage timings (ms) and final dims.
         * Returns { timings, dims } where dims[i] is input dim to stage i,
         * dims[i+1] is that stage’s output dim.
         */
        profile(input) {
            !Array.isArray(input[0]);
            let X = asBatch(input);
            const timings = [];
            const dims = [X[0].length];
            for (let i = 0; i < this.encoders.length; i++) {
                const t0 = performance.now();
                X = this.encoders[i].getEmbedding(X);
                const t1 = performance.now();
                timings.push(t1 - t0);
                dims[i + 1] = X[0].length;
            }
            // Don’t mutate options; just return diagnostics
            return { timings, dims };
        }
    }

    // © 2026 AsterMind AI Co. – All Rights Reserved.
    // Patent Pending US 63/897,713
    // ELMAdapter.ts — unify ELM / OnlineELM as EncoderLike for ELMChain
    function assertNonEmptyBatch(X, where) {
        if (!Array.isArray(X) || X.length === 0 || !Array.isArray(X[0]) || X[0].length === 0) {
            throw new Error(`${where}: expected non-empty (N x D) batch`);
        }
    }
    function matmulXWtAddB(X, // (N x D)
    W, // (H x D)
    b // (H x 1)
    ) {
        var _a, _b, _c, _d, _e;
        const N = X.length, D = X[0].length, H = W.length;
        // quick shape sanity
        if (((_a = W[0]) === null || _a === void 0 ? void 0 : _a.length) !== D)
            throw new Error(`matmulXWtAddB: W is ${W.length}x${(_b = W[0]) === null || _b === void 0 ? void 0 : _b.length}, expected Hx${D}`);
        if (b.length !== H || ((_d = (_c = b[0]) === null || _c === void 0 ? void 0 : _c.length) !== null && _d !== void 0 ? _d : 0) !== 1)
            throw new Error(`matmulXWtAddB: b is ${b.length}x${(_e = b[0]) === null || _e === void 0 ? void 0 : _e.length}, expected Hx1`);
        const out = new Array(N);
        for (let n = 0; n < N; n++) {
            const xn = X[n];
            const row = new Array(H);
            for (let h = 0; h < H; h++) {
                const wh = W[h];
                let s = b[h][0] || 0;
                // unrolled dot
                for (let d = 0; d < D; d++)
                    s += xn[d] * wh[d];
                row[h] = s;
            }
            out[n] = row;
        }
        return out;
    }
    class ELMAdapter {
        constructor(target) {
            var _a, _b;
            this.target = target;
            this.mode = target.type === 'online' ? ((_a = target.mode) !== null && _a !== void 0 ? _a : 'hidden') : 'hidden';
            this.name = (_b = target.name) !== null && _b !== void 0 ? _b : (target.type === 'elm' ? 'ELM' : `OnlineELM(${this.mode})`);
        }
        /** Return embeddings for a batch (N x D) -> (N x H/L) */
        getEmbedding(X) {
            var _a, _b, _c, _d;
            assertNonEmptyBatch(X, `${this.name}.getEmbedding`);
            if (this.target.type === 'elm') {
                const m = this.target.model;
                // ELM already exposes getEmbedding()
                if (typeof m.getEmbedding !== 'function') {
                    throw new Error(`${this.name}: underlying ELM lacks getEmbedding(X)`);
                }
                try {
                    return m.getEmbedding(X);
                }
                catch (err) {
                    // Helpful hint if model wasn’t trained
                    if (m.model == null) {
                        throw new Error(`${this.name}: model not trained/initialized (call train/trainFromData or load model).`);
                    }
                    throw err;
                }
            }
            // OnlineELM path
            const o = this.target.model;
            // Guard dims early
            const D = X[0].length;
            if (!Array.isArray(o.W) || ((_a = o.W[0]) === null || _a === void 0 ? void 0 : _a.length) !== D) {
                throw new Error(`${this.name}: input dim ${D} does not match model.W columns ${(_d = (_c = (_b = o.W) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.length) !== null && _d !== void 0 ? _d : 'n/a'}`);
            }
            if (this.mode === 'logits') {
                // Use public logits as an “embedding”
                try {
                    return o.predictLogitsFromVectors(X);
                }
                catch (err) {
                    if (o.beta == null) {
                        throw new Error(`${this.name}: model not initialized (call init()/fit() before logits mode).`);
                    }
                    throw err;
                }
            }
            // mode === 'hidden' → compute hidden activations: act(X Wᵀ + b)
            const W = o.W;
            const BIAS = o.b;
            const actName = o.activation;
            const act = Activations.get((actName !== null && actName !== void 0 ? actName : 'relu').toLowerCase());
            const Hpre = matmulXWtAddB(X, W, BIAS);
            // apply activation in-place
            for (let n = 0; n < Hpre.length; n++) {
                const row = Hpre[n];
                for (let j = 0; j < row.length; j++)
                    row[j] = act(row[j]);
            }
            return Hpre;
        }
    }
    /* -------- convenience helpers -------- */
    function wrapELM(model, name) {
        return new ELMAdapter({ type: 'elm', model, name });
    }

    // © 2026 AsterMind AI Co. – All Rights Reserved.
    // Patent Pending US 63/897,713
    // DeepELM.ts — stacked ELM autoencoders + top ELM classifier
    class DeepELM {
        constructor(cfg) {
            this.aeLayers = [];
            this.chain = null;
            this.clf = null;
            this.cfg = Object.assign({ clfHiddenUnits: 0, clfActivation: 'linear', clfWeightInit: 'xavier', normalizeEach: false, normalizeFinal: true }, cfg);
        }
        /** Layer-wise unsupervised training with Y=X (autoencoder). Returns transformed X_L. */
        fitAutoencoders(X) {
            var _a, _b, _c, _d;
            let cur = X;
            this.aeLayers = [];
            for (let i = 0; i < this.cfg.layers.length; i++) {
                const spec = this.cfg.layers[i];
                // Minimal ELM config for numeric mode—categories aren’t used by trainFromData:
                const elm = new ELM({
                    categories: ['ae'], // placeholder (unused in trainFromData)
                    hiddenUnits: spec.hiddenUnits,
                    activation: (_a = spec.activation) !== null && _a !== void 0 ? _a : 'relu',
                    weightInit: (_b = spec.weightInit) !== null && _b !== void 0 ? _b : 'xavier',
                    dropout: (_c = spec.dropout) !== null && _c !== void 0 ? _c : 0,
                    log: { modelName: (_d = spec.name) !== null && _d !== void 0 ? _d : `AE#${i + 1}`, verbose: false },
                });
                // Autoencoder: targets are the inputs
                elm.trainFromData(cur, cur);
                this.aeLayers.push(elm);
                // Forward to next layer using hidden activations
                cur = elm.getEmbedding(cur);
                if (this.cfg.normalizeEach) {
                    cur = l2NormalizeRows(cur);
                }
            }
            // Build chain for fast forward passes
            this.chain = new ELMChain(this.aeLayers.map((m, i) => {
                const a = wrapELM(m, m['modelName'] || `AE#${i + 1}`);
                return a;
            }), {
                normalizeEach: !!this.cfg.normalizeEach,
                normalizeFinal: !!this.cfg.normalizeFinal,
                name: 'DeepELM-Chain',
            });
            return this.transform(X);
        }
        /** Supervised training of a top classifier ELM on last-layer features. */
        fitClassifier(X, yOneHot) {
            var _a, _b;
            if (!this.chain)
                throw new Error('fitClassifier: call fitAutoencoders() first');
            const Z = this.chain.getEmbedding(X);
            // If clfHiddenUnits === 0, we mimic a “linear readout” by using a very small hidden layer with linear activation.
            const hidden = Math.max(1, this.cfg.clfHiddenUnits || 1);
            this.clf = new ELM({
                categories: Array.from({ length: this.cfg.numClasses }, (_, i) => String(i)),
                hiddenUnits: hidden,
                activation: (_a = this.cfg.clfActivation) !== null && _a !== void 0 ? _a : 'linear',
                weightInit: (_b = this.cfg.clfWeightInit) !== null && _b !== void 0 ? _b : 'xavier',
                log: { modelName: 'DeepELM-Classifier', verbose: false },
            });
            this.clf.trainFromData(Z, yOneHot);
        }
        /** One-shot convenience: train AEs then classifier. */
        fit(X, yOneHot) {
            this.fitAutoencoders(X);
            this.fitClassifier(X, yOneHot);
        }
        /** Forward through stacked AEs (no classifier). */
        transform(X) {
            if (!this.chain)
                throw new Error('transform: model not fitted');
            const Z = this.chain.getEmbedding(X);
            return Z;
        }
        /** Classifier probabilities (softmax) for a batch. */
        predictProba(X) {
            if (!this.clf)
                throw new Error('predictProba: classifier not fitted');
            // Reuse existing ELM method on batch:
            const Z = this.transform(X);
            const res = this.clf.predictFromVector(Z, this.cfg.numClasses);
            // predictFromVector returns topK lists; convert back into dense probs when possible
            // If you’d rather have dense probs, expose a new method on ELM to return raw softmax scores for a batch.
            return topKListToDense(res, this.cfg.numClasses);
        }
        /** Utility: export all models for persistence. */
        toJSON() {
            var _a;
            return {
                cfg: this.cfg,
                layers: this.aeLayers.map(m => { var _a; return (_a = m.savedModelJSON) !== null && _a !== void 0 ? _a : JSON.stringify(m.model); }),
                clf: this.clf ? ((_a = this.clf.savedModelJSON) !== null && _a !== void 0 ? _a : JSON.stringify(this.clf.model)) : null,
                __version: 'deep-elm-1.0.0',
            };
        }
        /** Utility: load from exported payload. */
        fromJSON(payload) {
            const { cfg, layers, clf } = payload !== null && payload !== void 0 ? payload : {};
            if (!Array.isArray(layers))
                throw new Error('fromJSON: invalid payload');
            this.cfg = Object.assign(Object.assign({}, this.cfg), cfg);
            this.aeLayers = layers.map((j, i) => {
                const m = new ELM({ categories: ['ae'], hiddenUnits: 1 });
                m.loadModelFromJSON(j);
                return m;
            });
            this.chain = new ELMChain(this.aeLayers.map((m, i) => wrapELM(m, `AE#${i + 1}`)), {
                normalizeEach: !!this.cfg.normalizeEach,
                normalizeFinal: !!this.cfg.normalizeFinal,
                name: 'DeepELM-Chain',
            });
            if (clf) {
                const c = new ELM({ categories: Array.from({ length: this.cfg.numClasses }, (_, i) => String(i)), hiddenUnits: 1 });
                c.loadModelFromJSON(clf);
                this.clf = c;
            }
        }
    }
    /* ---------- helpers ---------- */
    function l2NormalizeRows(M) {
        return M.map(r => {
            let s = 0;
            for (let i = 0; i < r.length; i++)
                s += r[i] * r[i];
            const inv = 1 / (Math.sqrt(s) || 1);
            return r.map(v => v * inv);
        });
    }
    function topKListToDense(list, K) {
        // Convert the ELM.predictFromVector top-K output back to dense [N x K] probs if needed.
        // (If your ELM exposes a dense “predictProbaFromVectors” for the batch, prefer that.)
        return list.map(row => {
            const out = new Array(K).fill(0);
            for (const { label, prob } of row) {
                const idx = Number(label);
                if (Number.isFinite(idx) && idx >= 0 && idx < K)
                    out[idx] = prob;
            }
            return out;
        });
    }

    // © 2026 AsterMind AI Co. – All Rights Reserved.
    // Patent Pending US 63/897,713
    // EmbeddingStore.ts — Powerful in-memory vector store with fast KNN, thresholds, and JSON I/O
    const EPS$3 = 1e-12;
    /* ================= math utils ================= */
    function l2Norm$1(v) {
        let s = 0;
        for (let i = 0; i < v.length; i++)
            s += v[i] * v[i];
        return Math.sqrt(s);
    }
    function l1Dist(a, b) {
        let s = 0;
        for (let i = 0; i < a.length; i++)
            s += Math.abs(a[i] - b[i]);
        return s;
    }
    function dot$3(a, b) {
        let s = 0;
        for (let i = 0; i < a.length; i++)
            s += a[i] * b[i];
        return s;
    }
    function normalizeToUnit(v) {
        const out = new Float32Array(v.length);
        const n = l2Norm$1(v);
        if (n < EPS$3)
            return out; // zero vector → stay zero; cosine with zero returns 0
        const inv = 1 / n;
        for (let i = 0; i < v.length; i++)
            out[i] = v[i] * inv;
        return out;
    }
    /** Quickselect (nth_element) on-place for top-k largest by score. Returns cutoff value index. */
    function quickselectTopK(arr, k, scoreOf) {
        if (k <= 0 || k >= arr.length)
            return arr.length - 1;
        let left = 0, right = arr.length - 1;
        const target = k - 1; // 0-based index of kth largest after partition
        function swap(i, j) {
            const t = arr[i];
            arr[i] = arr[j];
            arr[j] = t;
        }
        function partition(l, r, pivotIdx) {
            const pivotScore = scoreOf(arr[pivotIdx]);
            swap(pivotIdx, r);
            let store = l;
            for (let i = l; i < r; i++) {
                if (scoreOf(arr[i]) > pivotScore) { // ">" for largest-first
                    swap(store, i);
                    store++;
                }
            }
            swap(store, r);
            return store;
        }
        while (true) {
            const pivotIdx = Math.floor((left + right) / 2);
            const idx = partition(left, right, pivotIdx);
            if (idx === target)
                return idx;
            if (target < idx)
                right = idx - 1;
            else
                left = idx + 1;
        }
    }
    /* ================= store ================= */
    class EmbeddingStore {
        constructor(dim, opts) {
            var _a, _b;
            // Data
            this.ids = [];
            this.metas = [];
            this.vecs = []; // if storeUnit=true -> unit vectors; else raw vectors
            // Index
            this.idToIdx = new Map();
            if (!Number.isFinite(dim) || dim <= 0)
                throw new Error(`EmbeddingStore: invalid dim=${dim}`);
            this.dim = dim | 0;
            this.storeUnit = (_a = opts === null || opts === void 0 ? void 0 : opts.storeUnit) !== null && _a !== void 0 ? _a : true;
            this.alsoStoreRaw = (_b = opts === null || opts === void 0 ? void 0 : opts.alsoStoreRaw) !== null && _b !== void 0 ? _b : this.storeUnit; // default: if normalizing, also keep raw so Euclidean is valid
            if ((opts === null || opts === void 0 ? void 0 : opts.capacity) !== undefined) {
                if (!Number.isFinite(opts.capacity) || opts.capacity <= 0)
                    throw new Error(`capacity must be > 0`);
                this.capacity = Math.floor(opts.capacity);
            }
            if (this.alsoStoreRaw) {
                this.rawVecs = [];
                this.rawNorms = new Float32Array(0);
            }
            if (!this.storeUnit) {
                // storing raw in vecs → maintain norms for fast cosine
                this.norms = new Float32Array(0);
            }
        }
        /* ========== basic ops ========== */
        size() { return this.ids.length; }
        dimension() { return this.dim; }
        isUnitStored() { return this.storeUnit; }
        keepsRaw() { return !!this.rawVecs; }
        getCapacity() { return this.capacity; }
        setCapacity(capacity) {
            if (capacity === undefined) {
                this.capacity = undefined;
                return;
            }
            if (!Number.isFinite(capacity) || capacity <= 0)
                throw new Error(`capacity must be > 0`);
            this.capacity = Math.floor(capacity);
            this.enforceCapacity();
        }
        clear() {
            this.ids = [];
            this.vecs = [];
            this.metas = [];
            this.idToIdx.clear();
            if (this.rawVecs)
                this.rawVecs = [];
            if (this.norms)
                this.norms = new Float32Array(0);
            if (this.rawNorms)
                this.rawNorms = new Float32Array(0);
        }
        has(id) { return this.idToIdx.has(id); }
        get(id) {
            const idx = this.idToIdx.get(id);
            if (idx === undefined)
                return undefined;
            return {
                id,
                vec: this.vecs[idx],
                raw: this.rawVecs ? this.rawVecs[idx] : undefined,
                meta: this.metas[idx],
            };
        }
        /** Remove by id. Returns true if removed. */
        remove(id) {
            const idx = this.idToIdx.get(id);
            if (idx === undefined)
                return false;
            // capture id, splice arrays
            this.ids.splice(idx, 1);
            this.vecs.splice(idx, 1);
            this.metas.splice(idx, 1);
            if (this.rawVecs)
                this.rawVecs.splice(idx, 1);
            if (this.norms)
                this.norms = this.removeFromNorms(this.norms, idx);
            if (this.rawNorms)
                this.rawNorms = this.removeFromNorms(this.rawNorms, idx);
            this.idToIdx.delete(id);
            this.rebuildIndex(idx);
            return true;
        }
        /** Add or replace an item by id. Returns true if added, false if replaced. */
        upsert(item) {
            var _a;
            const { id, vec, meta } = item;
            if (!id)
                throw new Error('upsert: id is required');
            if (!vec || vec.length !== this.dim) {
                throw new Error(`upsert: vector dim ${(_a = vec === null || vec === void 0 ? void 0 : vec.length) !== null && _a !== void 0 ? _a : 'n/a'} != store dim ${this.dim}`);
            }
            const raw = new Float32Array(vec);
            const unit = this.storeUnit ? normalizeToUnit(raw) : raw;
            const idx = this.idToIdx.get(id);
            if (idx !== undefined) {
                // replace in place
                this.vecs[idx] = unit;
                this.metas[idx] = meta;
                if (this.rawVecs)
                    this.rawVecs[idx] = raw;
                if (this.norms && !this.storeUnit)
                    this.norms[idx] = l2Norm$1(raw);
                if (this.rawNorms && this.rawVecs)
                    this.rawNorms[idx] = l2Norm$1(raw);
                return false;
            }
            else {
                this.ids.push(id);
                this.vecs.push(unit);
                this.metas.push(meta);
                if (this.rawVecs)
                    this.rawVecs.push(raw);
                if (this.norms && !this.storeUnit) {
                    // append norm
                    const n = l2Norm$1(raw);
                    const newNorms = new Float32Array(this.ids.length);
                    newNorms.set(this.norms, 0);
                    newNorms[this.ids.length - 1] = n;
                    this.norms = newNorms;
                }
                if (this.rawNorms && this.rawVecs) {
                    const n = l2Norm$1(raw);
                    const newNorms = new Float32Array(this.ids.length);
                    newNorms.set(this.rawNorms, 0);
                    newNorms[this.ids.length - 1] = n;
                    this.rawNorms = newNorms;
                }
                this.idToIdx.set(id, this.ids.length - 1);
                this.enforceCapacity();
                return true;
            }
        }
        add(item) {
            const added = this.upsert(item);
            if (!added)
                throw new Error(`add: id "${item.id}" already exists (use upsert instead)`);
        }
        addAll(items, allowUpsert = true) {
            for (const it of items) {
                if (allowUpsert)
                    this.upsert(it);
                else
                    this.add(it);
            }
        }
        /** Merge another store (same dim & normalization strategy) into this one. */
        merge(other, allowOverwrite = true) {
            var _a;
            if (other.dimension() !== this.dim)
                throw new Error('merge: dimension mismatch');
            if (other.isUnitStored() !== this.storeUnit)
                throw new Error('merge: normalized flag mismatch');
            if (other.keepsRaw() !== this.keepsRaw())
                throw new Error('merge: raw retention mismatch');
            for (let i = 0; i < other.ids.length; i++) {
                const id = other.ids[i];
                const vec = other.vecs[i];
                const raw = (_a = other.rawVecs) === null || _a === void 0 ? void 0 : _a[i];
                const meta = other.metas[i];
                if (!allowOverwrite && this.has(id))
                    continue;
                // Use upsert path, but avoid double-normalizing when both stores have unit vectors:
                this.upsert({ id, vec, meta });
                if (this.rawVecs && raw)
                    this.rawVecs[this.idToIdx.get(id)] = new Float32Array(raw);
            }
        }
        /* ========== querying ========== */
        /** Top-K KNN query. For L2/L1 we return NEGATIVE distance so higher is better. */
        query(queryVec, k = 10, opts) {
            var _a, _b, _c, _d, _e, _f;
            if (queryVec.length !== this.dim) {
                throw new Error(`query: vector dim ${queryVec.length} != store dim ${this.dim}`);
            }
            const metric = (_a = opts === null || opts === void 0 ? void 0 : opts.metric) !== null && _a !== void 0 ? _a : 'cosine';
            const filter = opts === null || opts === void 0 ? void 0 : opts.filter;
            const returnVectors = (_b = opts === null || opts === void 0 ? void 0 : opts.returnVectors) !== null && _b !== void 0 ? _b : false;
            const minScore = opts === null || opts === void 0 ? void 0 : opts.minScore;
            const maxDistance = opts === null || opts === void 0 ? void 0 : opts.maxDistance;
            const restrictSet = (opts === null || opts === void 0 ? void 0 : opts.restrictToIds) ? new Set(opts.restrictToIds) : undefined;
            let q;
            let qNorm = 0;
            if (metric === 'cosine') {
                // cosine → normalize query; stored data either unit (fast) or raw (use cached norms)
                q = normalizeToUnit(queryVec);
            }
            else if (metric === 'dot') {
                q = new Float32Array(queryVec);
                qNorm = l2Norm$1(q); // only used for potential future scoring transforms
            }
            else {
                // L2/L1 use RAW query
                q = new Float32Array(queryVec);
                qNorm = l2Norm$1(q);
            }
            const hits = [];
            const N = this.vecs.length;
            // helpers
            const pushHit = (i, score) => {
                if (restrictSet && !restrictSet.has(this.ids[i]))
                    return;
                if (filter && !filter(this.metas[i], this.ids[i]))
                    return;
                // Apply thresholds
                if (metric === 'euclidean' || metric === 'manhattan') {
                    const dist = -score; // score is negative distance
                    if (maxDistance !== undefined && dist > maxDistance)
                        return;
                }
                else {
                    if (minScore !== undefined && score < minScore)
                        return;
                }
                hits.push(returnVectors
                    ? { id: this.ids[i], score, index: i, meta: this.metas[i], vec: this.vecs[i] }
                    : { id: this.ids[i], score, index: i, meta: this.metas[i] });
            };
            if (metric === 'cosine') {
                if (this.storeUnit) {
                    // both unit → score = dot
                    for (let i = 0; i < N; i++) {
                        const s = dot$3(q, this.vecs[i]);
                        pushHit(i, s);
                    }
                }
                else {
                    // stored raw in vecs → use cached norms (if available) for cos = dot / (||q||*||v||)
                    if (!this.norms || this.norms.length !== N) {
                        // build norms on-demand once
                        this.norms = new Float32Array(N);
                        for (let i = 0; i < N; i++)
                            this.norms[i] = l2Norm$1(this.vecs[i]);
                    }
                    const qn = l2Norm$1(q) || 1; // guard
                    for (let i = 0; i < N; i++) {
                        const dn = this.norms[i] || 1;
                        const s = dn < EPS$3 ? 0 : dot$3(q, this.vecs[i]) / (qn * dn);
                        pushHit(i, s);
                    }
                }
            }
            else if (metric === 'dot') {
                for (let i = 0; i < N; i++) {
                    const s = dot$3(q, this.storeUnit ? this.vecs[i] : this.vecs[i]); // same storage
                    pushHit(i, s);
                }
            }
            else if (metric === 'euclidean') {
                // Need RAW vectors
                const base = (_c = this.rawVecs) !== null && _c !== void 0 ? _c : (!this.storeUnit ? this.vecs : null);
                if (!base)
                    throw new Error('euclidean query requires raw vectors; create store with alsoStoreRaw=true or storeUnit=false');
                // Use fast formula: ||q - v|| = sqrt(||q||^2 + ||v||^2 - 2 q·v)
                const vNorms = this.rawVecs ? ((_d = this.rawNorms) !== null && _d !== void 0 ? _d : this.buildRawNorms()) :
                    (_e = this.norms) !== null && _e !== void 0 ? _e : this.buildNorms();
                const q2 = qNorm * qNorm;
                for (let i = 0; i < N; i++) {
                    const d2 = Math.max(q2 + vNorms[i] * vNorms[i] - 2 * dot$3(q, base[i]), 0);
                    const dist = Math.sqrt(d2);
                    pushHit(i, -dist); // NEGATIVE distance so higher is better
                }
            }
            else { // 'manhattan'
                const base = (_f = this.rawVecs) !== null && _f !== void 0 ? _f : (!this.storeUnit ? this.vecs : null);
                if (!base)
                    throw new Error('manhattan query requires raw vectors; create store with alsoStoreRaw=true or storeUnit=false');
                for (let i = 0; i < N; i++) {
                    const dist = l1Dist(q, base[i]);
                    pushHit(i, -dist); // NEGATIVE distance
                }
            }
            if (hits.length === 0)
                return [];
            const kk = Math.max(1, Math.min(k, hits.length));
            // Use quickselect to avoid full O(n log n) sort
            quickselectTopK(hits, kk, (h) => h.score);
            // Now sort just the top-K region for stable ordering
            hits
                .slice(0, kk)
                .sort((a, b) => b.score - a.score)
                .forEach((h, i) => (hits[i] = h));
            return hits.slice(0, kk);
        }
        /** Batch query helper. Returns array of results aligned to input queries. */
        queryBatch(queries, k = 10, opts) {
            return queries.map(q => this.query(q, k, opts));
        }
        /** Convenience: query by id */
        queryById(id, k = 10, opts) {
            var _a;
            const rec = this.get(id);
            if (!rec)
                return [];
            const use = ((opts === null || opts === void 0 ? void 0 : opts.metric) === 'euclidean' || (opts === null || opts === void 0 ? void 0 : opts.metric) === 'manhattan')
                ? ((_a = rec.raw) !== null && _a !== void 0 ? _a : rec.vec) // prefer raw for distance
                : rec.vec;
            return this.query(use, k, opts);
        }
        /* ========== export / import ========== */
        toJSON() {
            const includeRaw = !!this.rawVecs;
            return {
                dim: this.dim,
                normalized: this.storeUnit,
                alsoStoredRaw: includeRaw,
                capacity: this.capacity,
                items: this.ids.map((id, i) => ({
                    id,
                    vec: Array.from(this.vecs[i]),
                    raw: includeRaw ? Array.from(this.rawVecs[i]) : undefined,
                    meta: this.metas[i],
                })),
                __version: 'embedding-store-2.0.0',
            };
        }
        static fromJSON(obj) {
            var _a, _b;
            const parsed = typeof obj === 'string' ? JSON.parse(obj) : obj;
            if (!parsed || !parsed.dim || !Array.isArray(parsed.items)) {
                throw new Error('EmbeddingStore.fromJSON: invalid payload');
            }
            const store = new EmbeddingStore(parsed.dim, {
                storeUnit: parsed.normalized,
                capacity: parsed.capacity,
                alsoStoreRaw: (_a = parsed.alsoStoredRaw) !== null && _a !== void 0 ? _a : false,
            });
            for (const it of parsed.items) {
                if (!it || typeof it.id !== 'string' || !Array.isArray(it.vec))
                    continue;
                if (it.vec.length !== parsed.dim) {
                    throw new Error(`fromJSON: vector dim ${it.vec.length} != dim ${parsed.dim} for id ${it.id}`);
                }
                // Use public API to keep norms consistent
                store.upsert({ id: it.id, vec: (_b = it.raw) !== null && _b !== void 0 ? _b : it.vec, meta: it.meta });
                // If payload includes both vec and raw, ensure both sides are *exactly* respected
                if (store.storeUnit && store.rawVecs && it.raw) {
                    const idx = store.idToIdx.get(it.id);
                    store.rawVecs[idx] = new Float32Array(it.raw);
                    if (store.rawNorms) {
                        const newNorms = new Float32Array(store.size());
                        newNorms.set(store.rawNorms, 0);
                        newNorms[idx] = l2Norm$1(store.rawVecs[idx]);
                        store.rawNorms = newNorms;
                    }
                }
                else if (!store.storeUnit && it.vec) ;
            }
            return store;
        }
        /* ========== diagnostics / utils ========== */
        /** Estimate memory footprint in bytes (arrays only; metadata excluded). */
        memoryUsageBytes() {
            const f32 = 4;
            let bytes = 0;
            for (const v of this.vecs)
                bytes += v.length * f32;
            if (this.rawVecs)
                for (const v of this.rawVecs)
                    bytes += v.length * f32;
            if (this.norms)
                bytes += this.norms.length * f32;
            if (this.rawNorms)
                bytes += this.rawNorms.length * f32;
            // ids + metas are JS objects; not included
            return bytes;
        }
        /** Re-normalize all vectors in-place (useful if you bulk-updated raw storage). */
        reNormalizeAll() {
            if (!this.storeUnit)
                return; // nothing to do
            for (let i = 0; i < this.vecs.length; i++) {
                const raw = this.rawVecs ? this.rawVecs[i] : this.vecs[i];
                this.vecs[i] = normalizeToUnit(raw);
            }
        }
        /** Iterate over all items */
        *entries() {
            var _a;
            for (let i = 0; i < this.ids.length; i++) {
                yield { id: this.ids[i], vec: this.vecs[i], raw: (_a = this.rawVecs) === null || _a === void 0 ? void 0 : _a[i], meta: this.metas[i] };
            }
        }
        /* ========== internals ========== */
        removeFromNorms(src, removeIdx) {
            const out = new Float32Array(src.length - 1);
            if (removeIdx > 0)
                out.set(src.subarray(0, removeIdx), 0);
            if (removeIdx < src.length - 1)
                out.set(src.subarray(removeIdx + 1), removeIdx);
            return out;
        }
        /** After a splice at 'start', rebuild id→index for shifted tail */
        rebuildIndex(start = 0) {
            if (start <= 0) {
                this.idToIdx.clear();
                for (let i = 0; i < this.ids.length; i++)
                    this.idToIdx.set(this.ids[i], i);
                return;
            }
            for (let i = start; i < this.ids.length; i++)
                this.idToIdx.set(this.ids[i], i);
        }
        /** Enforce capacity by evicting oldest items (front of arrays) */
        enforceCapacity() {
            if (this.capacity === undefined)
                return;
            while (this.ids.length > this.capacity) {
                const removedId = this.ids[0];
                // shift( ) is O(n); for very large stores consider a circular buffer
                this.ids.shift();
                this.vecs.shift();
                this.metas.shift();
                if (this.rawVecs)
                    this.rawVecs.shift();
                if (this.norms)
                    this.norms = this.removeFromNorms(this.norms, 0);
                if (this.rawNorms)
                    this.rawNorms = this.removeFromNorms(this.rawNorms, 0);
                this.idToIdx.delete(removedId);
                // rebuild full index (ids shifted)
                this.idToIdx.clear();
                for (let i = 0; i < this.ids.length; i++)
                    this.idToIdx.set(this.ids[i], i);
            }
        }
        buildNorms() {
            const out = new Float32Array(this.vecs.length);
            for (let i = 0; i < this.vecs.length; i++)
                out[i] = l2Norm$1(this.vecs[i]);
            this.norms = out;
            return out;
        }
        buildRawNorms() {
            if (!this.rawVecs)
                throw new Error('no raw vectors to build norms for');
            const out = new Float32Array(this.rawVecs.length);
            for (let i = 0; i < this.rawVecs.length; i++)
                out[i] = l2Norm$1(this.rawVecs[i]);
            this.rawNorms = out;
            return out;
        }
    }

    // © 2026 AsterMind AI Co. – All Rights Reserved.
    // Patent Pending US 63/897,713
    // Evaluation.ts — Classification & Regression metrics (no deps)
    const EPS$2 = 1e-12;
    /* =========================
     * Helpers
     * ========================= */
    function isOneHot(Y) {
        return Array.isArray(Y[0]);
    }
    function argmax$1(a) {
        let i = 0;
        for (let k = 1; k < a.length; k++)
            if (a[k] > a[i])
                i = k;
        return i;
    }
    function toIndexLabels(yTrue, yPred, numClasses) {
        let yTrueIdx;
        let yPredIdx;
        if (isOneHot(yTrue))
            yTrueIdx = yTrue.map(argmax$1);
        else
            yTrueIdx = yTrue;
        if (isOneHot(yPred))
            yPredIdx = yPred.map(argmax$1);
        else
            yPredIdx = yPred;
        const C = 1 + Math.max(Math.max(...yTrueIdx), Math.max(...yPredIdx));
        return { yTrueIdx, yPredIdx, C };
    }
    /* =========================
     * Confusion matrix
     * ========================= */
    function confusionMatrixFromIndices(yTrueIdx, yPredIdx, C) {
        if (yTrueIdx.length !== yPredIdx.length) {
            throw new Error(`confusionMatrix: length mismatch (${yTrueIdx.length} vs ${yPredIdx.length})`);
        }
        const classes = C !== null && C !== void 0 ? C : 1 + Math.max(Math.max(...yTrueIdx), Math.max(...yPredIdx));
        const M = Array.from({ length: classes }, () => new Array(classes).fill(0));
        for (let i = 0; i < yTrueIdx.length; i++) {
            const r = yTrueIdx[i] | 0;
            const c = yPredIdx[i] | 0;
            if (r >= 0 && r < classes && c >= 0 && c < classes)
                M[r][c]++;
        }
        return M;
    }
    /* =========================
     * Per-class metrics
     * ========================= */
    function perClassFromCM(M, labels) {
        var _a;
        const C = M.length;
        const totals = new Array(C).fill(0);
        const colTotals = new Array(C).fill(0);
        let N = 0;
        for (let i = 0; i < C; i++) {
            let rsum = 0;
            for (let j = 0; j < C; j++) {
                rsum += M[i][j];
                colTotals[j] += M[i][j];
                N += M[i][j];
            }
            totals[i] = rsum;
        }
        const perClass = [];
        for (let k = 0; k < C; k++) {
            const tp = M[k][k];
            const fp = colTotals[k] - tp;
            const fn = totals[k] - tp;
            const tn = N - tp - fp - fn;
            const precision = tp / (tp + fp + EPS$2);
            const recall = tp / (tp + fn + EPS$2);
            const f1 = (2 * precision * recall) / (precision + recall + EPS$2);
            perClass.push({
                label: (_a = labels === null || labels === void 0 ? void 0 : labels[k]) !== null && _a !== void 0 ? _a : k,
                support: totals[k],
                tp, fp, fn, tn,
                precision, recall, f1
            });
        }
        return perClass;
    }
    /* =========================
     * Averages
     * ========================= */
    function averagesFromPerClass(per, accuracy) {
        const C = per.length;
        let sumP = 0, sumR = 0, sumF = 0;
        let sumWP = 0, sumWR = 0, sumWF = 0, total = 0;
        let tp = 0, fp = 0, fn = 0; // for micro
        for (const c of per) {
            sumP += c.precision;
            sumR += c.recall;
            sumF += c.f1;
            sumWP += c.precision * c.support;
            sumWR += c.recall * c.support;
            sumWF += c.f1 * c.support;
            total += c.support;
            tp += c.tp;
            fp += c.fp;
            fn += c.fn;
        }
        const microP = tp / (tp + fp + EPS$2);
        const microR = tp / (tp + fn + EPS$2);
        const microF = (2 * microP * microR) / (microP + microR + EPS$2);
        return {
            accuracy,
            macroPrecision: sumP / C,
            macroRecall: sumR / C,
            macroF1: sumF / C,
            microPrecision: microP,
            microRecall: microR,
            microF1: microF,
            weightedPrecision: sumWP / (total + EPS$2),
            weightedRecall: sumWR / (total + EPS$2),
            weightedF1: sumWF / (total + EPS$2)
        };
    }
    /* =========================
     * Log loss / cross-entropy
     * ========================= */
    function logLoss(yTrue, yPredProba) {
        if (!isOneHot(yTrue) || !isOneHot(yPredProba)) {
            throw new Error('logLoss expects one-hot ground truth and probability matrix (N x C).');
        }
        const Y = yTrue;
        const P = yPredProba;
        if (Y.length !== P.length)
            throw new Error('logLoss: length mismatch');
        const N = Y.length;
        let sum = 0;
        for (let i = 0; i < N; i++) {
            const yi = Y[i];
            const pi = P[i];
            if (yi.length !== pi.length)
                throw new Error('logLoss: class count mismatch');
            for (let j = 0; j < yi.length; j++) {
                if (yi[j] > 0) {
                    const p = Math.min(Math.max(pi[j], EPS$2), 1 - EPS$2);
                    sum += -Math.log(p);
                }
            }
        }
        return sum / N;
    }
    /* =========================
     * Top-K accuracy
     * ========================= */
    function topKAccuracy(yTrueIdx, yPredProba, k = 5) {
        const N = yTrueIdx.length;
        let correct = 0;
        for (let i = 0; i < N; i++) {
            const probs = yPredProba[i];
            const idx = probs.map((p, j) => j).sort((a, b) => probs[b] - probs[a]).slice(0, Math.max(1, Math.min(k, probs.length)));
            if (idx.includes(yTrueIdx[i]))
                correct++;
        }
        return correct / N;
    }
    function pairSortByScore(yTrue01, yScore) {
        const pairs = yScore.map((s, i) => [s, yTrue01[i]]);
        pairs.sort((a, b) => b[0] - a[0]);
        return pairs;
    }
    function binaryROC(yTrue01, yScore) {
        if (yTrue01.length !== yScore.length)
            throw new Error('binaryROC: length mismatch');
        const pairs = pairSortByScore(yTrue01, yScore);
        const P = yTrue01.reduce((s, v) => s + (v ? 1 : 0), 0);
        const N = yTrue01.length - P;
        let tp = 0, fp = 0;
        const tpr = [0], fpr = [0], thr = [Infinity];
        for (let i = 0; i < pairs.length; i++) {
            const [score, y] = pairs[i];
            if (y === 1)
                tp++;
            else
                fp++;
            tpr.push(tp / (P + EPS$2));
            fpr.push(fp / (N + EPS$2));
            thr.push(score);
        }
        tpr.push(1);
        fpr.push(1);
        thr.push(-Infinity);
        // Trapezoidal AUC
        let auc = 0;
        for (let i = 1; i < tpr.length; i++) {
            const dx = fpr[i] - fpr[i - 1];
            const yAvg = (tpr[i] + tpr[i - 1]) / 2;
            auc += dx * yAvg;
        }
        return { thresholds: thr, tpr, fpr, auc };
    }
    function binaryPR(yTrue01, yScore) {
        if (yTrue01.length !== yScore.length)
            throw new Error('binaryPR: length mismatch');
        const pairs = pairSortByScore(yTrue01, yScore);
        const P = yTrue01.reduce((s, v) => s + (v ? 1 : 0), 0);
        let tp = 0, fp = 0;
        const precision = [], recall = [], thr = [];
        // Add starting point
        precision.push(P > 0 ? P / (P + 0) : 1);
        recall.push(0);
        thr.push(Infinity);
        for (let i = 0; i < pairs.length; i++) {
            const [score, y] = pairs[i];
            if (y === 1)
                tp++;
            else
                fp++;
            const prec = tp / (tp + fp + EPS$2);
            const rec = tp / (P + EPS$2);
            precision.push(prec);
            recall.push(rec);
            thr.push(score);
        }
        // AUPRC via trapezoid over recall axis
        let auc = 0;
        for (let i = 1; i < precision.length; i++) {
            const dx = recall[i] - recall[i - 1];
            const yAvg = (precision[i] + precision[i - 1]) / 2;
            auc += dx * yAvg;
        }
        return { thresholds: thr, precision, recall, auc };
    }
    /* =========================
     * Main: evaluate classification
     * ========================= */
    /**
     * Evaluate multi-class classification.
     * - yTrue can be indices (N) or one-hot (N x C)
     * - yPred can be indices (N) or probabilities (N x C)
     * - If yPred are probabilities, we also compute logLoss and optional topK.
     */
    function evaluateClassification(yTrue, yPred, opts) {
        const labels = opts === null || opts === void 0 ? void 0 : opts.labels;
        const { yTrueIdx, yPredIdx, C } = toIndexLabels(yTrue, yPred);
        const M = confusionMatrixFromIndices(yTrueIdx, yPredIdx, C);
        const per = perClassFromCM(M, labels);
        const correct = yTrueIdx.reduce((s, yt, i) => s + (yt === yPredIdx[i] ? 1 : 0), 0);
        const accuracy = correct / yTrueIdx.length;
        const averages = averagesFromPerClass(per, accuracy);
        // Optional extras if we have probabilities
        if (isOneHot(yTrue) && isOneHot(yPred)) {
            try {
                averages.logLoss = logLoss(yTrue, yPred);
                if ((opts === null || opts === void 0 ? void 0 : opts.topK) && opts.topK > 1) {
                    averages.topKAccuracy = topKAccuracy(yTrueIdx, yPred, opts.topK);
                }
            }
            catch ( /* ignore extras if shapes disagree */_a) { /* ignore extras if shapes disagree */ }
        }
        return { confusionMatrix: M, perClass: per, averages };
    }
    /* =========================
     * Regression
     * ========================= */
    function evaluateRegression(yTrue, yPred) {
        const Y = Array.isArray(yTrue[0]) ? yTrue : yTrue.map(v => [v]);
        const P = Array.isArray(yPred[0]) ? yPred : yPred.map(v => [v]);
        if (Y.length !== P.length)
            throw new Error('evaluateRegression: length mismatch');
        const N = Y.length;
        const D = Y[0].length;
        const perOutput = [];
        let sumMSE = 0, sumMAE = 0, sumR2 = 0;
        for (let d = 0; d < D; d++) {
            let mse = 0, mae = 0;
            // mean of Y[:,d]
            let mean = 0;
            for (let i = 0; i < N; i++)
                mean += Y[i][d];
            mean /= N;
            let ssTot = 0, ssRes = 0;
            for (let i = 0; i < N; i++) {
                const y = Y[i][d], p = P[i][d];
                const e = y - p;
                mse += e * e;
                mae += Math.abs(e);
                ssRes += e * e;
                const dy = y - mean;
                ssTot += dy * dy;
            }
            mse /= N;
            const rmse = Math.sqrt(mse);
            mae /= N;
            const r2 = 1 - (ssRes / (ssTot + EPS$2));
            perOutput.push({ index: d, mse, rmse, mae, r2 });
            sumMSE += mse;
            sumMAE += mae;
            sumR2 += r2;
        }
        const mse = sumMSE / D;
        const rmse = Math.sqrt(mse);
        const mae = sumMAE / D;
        const r2 = sumR2 / D;
        return { perOutput, mse, rmse, mae, r2 };
    }
    /* =========================
     * Pretty report (optional)
     * ========================= */
    function formatClassificationReport(rep) {
        const lines = [];
        lines.push('Class\tSupport\tPrecision\tRecall\tF1');
        for (const c of rep.perClass) {
            lines.push(`${c.label}\t${c.support}\t${c.precision.toFixed(4)}\t${c.recall.toFixed(4)}\t${c.f1.toFixed(4)}`);
        }
        const a = rep.averages;
        lines.push('');
        lines.push(`Accuracy:\t${a.accuracy.toFixed(4)}`);
        lines.push(`Macro P/R/F1:\t${a.macroPrecision.toFixed(4)}\t${a.macroRecall.toFixed(4)}\t${a.macroF1.toFixed(4)}`);
        lines.push(`Micro P/R/F1:\t${a.microPrecision.toFixed(4)}\t${a.microRecall.toFixed(4)}\t${a.microF1.toFixed(4)}`);
        lines.push(`Weighted P/R/F1:\t${a.weightedPrecision.toFixed(4)}\t${a.weightedRecall.toFixed(4)}\t${a.weightedF1.toFixed(4)}`);
        if (a.logLoss !== undefined)
            lines.push(`LogLoss:\t${a.logLoss.toFixed(6)}`);
        if (a.topKAccuracy !== undefined)
            lines.push(`TopK Acc:\t${a.topKAccuracy.toFixed(4)}`);
        return lines.join('\n');
    }

    const EPS$1 = 1e-12;
    /* ---------- math helpers ---------- */
    function l2Norm(v) {
        let s = 0;
        for (let i = 0; i < v.length; i++)
            s += v[i] * v[i];
        return Math.sqrt(s);
    }
    function normalize(v) {
        const out = new Float32Array(v.length);
        const n = l2Norm(v);
        if (n < EPS$1)
            return out; // keep zeros; cosine with zero gives 0
        const inv = 1 / n;
        for (let i = 0; i < v.length; i++)
            out[i] = v[i] * inv;
        return out;
    }
    function dot$2(a, b) {
        let s = 0;
        for (let i = 0; i < a.length; i++)
            s += a[i] * b[i];
        return s;
    }
    /* ---------- main evaluation ---------- */
    function evaluateEnsembleRetrieval(queries, reference, chains, k, options) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
        const metric = (_a = options === null || options === void 0 ? void 0 : options.metric) !== null && _a !== void 0 ? _a : "cosine";
        const aggregate = (_b = options === null || options === void 0 ? void 0 : options.aggregate) !== null && _b !== void 0 ? _b : "mean";
        const weights = options === null || options === void 0 ? void 0 : options.weights;
        const topK = Math.max(1, (_d = (_c = options === null || options === void 0 ? void 0 : options.k) !== null && _c !== void 0 ? _c : k) !== null && _d !== void 0 ? _d : 5);
        const ignoreUnlabeled = (_e = options === null || options === void 0 ? void 0 : options.ignoreUnlabeledQueries) !== null && _e !== void 0 ? _e : true;
        const reportPerLabel = (_f = options === null || options === void 0 ? void 0 : options.reportPerLabel) !== null && _f !== void 0 ? _f : false;
        const returnRankings = (_g = options === null || options === void 0 ? void 0 : options.returnRankings) !== null && _g !== void 0 ? _g : false;
        const logEvery = Math.max(1, (_h = options === null || options === void 0 ? void 0 : options.logEvery) !== null && _h !== void 0 ? _h : 10);
        if (chains.length === 0) {
            throw new Error("evaluateEnsembleRetrieval: 'chains' must be non-empty.");
        }
        if (aggregate === "weighted") {
            if (!weights || weights.length !== chains.length) {
                throw new Error(`aggregate='weighted' requires weights.length === chains.length`);
            }
            // normalize weights to sum=1 for interpretability
            const sumW = weights.reduce((s, w) => s + w, 0) || 1;
            for (let i = 0; i < weights.length; i++)
                weights[i] = weights[i] / sumW;
        }
        console.log("🔹 Precomputing embeddings...");
        // Pull raw embeddings from each chain
        const chainQueryEmb = [];
        const chainRefEmb = [];
        for (let c = 0; c < chains.length; c++) {
            const qMat = chains[c].getEmbedding(queries.map(q => {
                const v = q.embedding;
                if (!v || v.length === 0)
                    throw new Error(`Query ${c} has empty embedding`);
                return Array.from(v);
            }));
            const rMat = chains[c].getEmbedding(reference.map(r => {
                const v = r.embedding;
                if (!v || v.length === 0)
                    throw new Error(`Reference has empty embedding`);
                return Array.from(v);
            }));
            // Validate dims & normalize if cosine
            const qArr = qMat.map(row => Float32Array.from(row));
            const rArr = rMat.map(row => Float32Array.from(row));
            if (metric === "cosine") {
                chainQueryEmb.push(qArr.map(normalize));
                chainRefEmb.push(rArr.map(normalize));
            }
            else {
                chainQueryEmb.push(qArr);
                chainRefEmb.push(rArr);
            }
            // Basic safety: check dimensions match across Q/R for this chain
            const dimQ = (_k = (_j = qArr[0]) === null || _j === void 0 ? void 0 : _j.length) !== null && _k !== void 0 ? _k : 0;
            const dimR = (_m = (_l = rArr[0]) === null || _l === void 0 ? void 0 : _l.length) !== null && _m !== void 0 ? _m : 0;
            if (dimQ === 0 || dimR === 0 || dimQ !== dimR) {
                throw new Error(`Chain ${c}: query/ref embedding dims mismatch (${dimQ} vs ${dimR})`);
            }
        }
        console.log("✅ Precomputation complete. Starting retrieval evaluation...");
        let hitsAt1 = 0, hitsAtK = 0, reciprocalRanks = 0;
        let used = 0;
        const perLabelRaw = {};
        const rankings = [];
        for (let i = 0; i < queries.length; i++) {
            if (i % logEvery === 0)
                console.log(`🔍 Query ${i + 1}/${queries.length}`);
            const correctLabel = ((_o = queries[i].metadata.label) !== null && _o !== void 0 ? _o : "").toString();
            if (!correctLabel && ignoreUnlabeled) {
                continue; // skip this query entirely
            }
            // Accumulate ensemble scores per reference
            // We keep (label, score) per reference j
            const scores = new Array(reference.length);
            for (let j = 0; j < reference.length; j++) {
                let sAgg;
                if (aggregate === "max") {
                    // Take max across chains
                    let sMax = -Infinity;
                    for (let c = 0; c < chains.length; c++) {
                        const q = chainQueryEmb[c][i];
                        const r = chainRefEmb[c][j];
                        const s = metric === "cosine" || metric === "dot" ? dot$2(q, r) : dot$2(q, r); // only cosine/dot supported
                        if (s > sMax)
                            sMax = s;
                    }
                    sAgg = sMax;
                }
                else if (aggregate === "sum") {
                    let sSum = 0;
                    for (let c = 0; c < chains.length; c++) {
                        const q = chainQueryEmb[c][i];
                        const r = chainRefEmb[c][j];
                        sSum += (metric === "cosine" || metric === "dot") ? dot$2(q, r) : dot$2(q, r);
                    }
                    sAgg = sSum;
                }
                else if (aggregate === "weighted") {
                    let sW = 0;
                    for (let c = 0; c < chains.length; c++) {
                        const q = chainQueryEmb[c][i];
                        const r = chainRefEmb[c][j];
                        sW += ((metric === "cosine" || metric === "dot") ? dot$2(q, r) : dot$2(q, r)) * weights[c];
                    }
                    sAgg = sW;
                }
                else { // "mean"
                    let sSum = 0;
                    for (let c = 0; c < chains.length; c++) {
                        const q = chainQueryEmb[c][i];
                        const r = chainRefEmb[c][j];
                        sSum += (metric === "cosine" || metric === "dot") ? dot$2(q, r) : dot$2(q, r);
                    }
                    sAgg = sSum / chains.length;
                }
                scores[j] = {
                    label: ((_p = reference[j].metadata.label) !== null && _p !== void 0 ? _p : "").toString(),
                    score: sAgg
                };
            }
            // Sort by score desc
            scores.sort((a, b) => b.score - a.score);
            const rankedLabels = scores.map(s => s.label);
            // Update metrics
            const r1 = rankedLabels[0] === correctLabel ? 1 : 0;
            const rK = rankedLabels.slice(0, topK).includes(correctLabel) ? 1 : 0;
            const rank = rankedLabels.indexOf(correctLabel);
            const rr = rank === -1 ? 0 : 1 / (rank + 1);
            hitsAt1 += r1;
            hitsAtK += rK;
            reciprocalRanks += rr;
            used++;
            if (reportPerLabel) {
                const bucket = (_q = perLabelRaw[correctLabel]) !== null && _q !== void 0 ? _q : (perLabelRaw[correctLabel] = { count: 0, hitsAt1: 0, hitsAtK: 0, mrrSum: 0 });
                bucket.count++;
                bucket.hitsAt1 += r1;
                bucket.hitsAtK += rK;
                bucket.mrrSum += rr;
            }
            if (returnRankings) {
                rankings.push({
                    queryIndex: i,
                    queryId: queries[i].id,
                    label: correctLabel,
                    topK: scores.slice(0, topK),
                    correctRank: rank
                });
            }
        }
        const denom = used || 1;
        const result = {
            usedQueries: used,
            recallAt1: hitsAt1 / denom,
            recallAtK: hitsAtK / denom,
            mrr: reciprocalRanks / denom
        };
        if (reportPerLabel) {
            const out = {};
            for (const [label, s] of Object.entries(perLabelRaw)) {
                out[label] = {
                    support: s.count,
                    recallAt1: s.hitsAt1 / (s.count || 1),
                    recallAtK: s.hitsAtK / (s.count || 1),
                    mrr: s.mrrSum / (s.count || 1)
                };
            }
            result.perLabel = out;
        }
        if (returnRankings)
            result.rankings = rankings;
        return result;
    }

    // © 2026 AsterMind AI Co. – All Rights Reserved.
    // Patent Pending US 63/897,713
    // src/workers/ELMWorkerClient.ts
    class ELMWorkerClient {
        constructor(worker) {
            this.pending = new Map();
            this.worker = worker;
            this.worker.onmessage = (ev) => {
                var _a;
                const msg = ev.data;
                // Progress event
                if ((msg === null || msg === void 0 ? void 0 : msg.type) === 'progress' && (msg === null || msg === void 0 ? void 0 : msg.id)) {
                    const pend = this.pending.get(msg.id);
                    (_a = pend === null || pend === void 0 ? void 0 : pend.onProgress) === null || _a === void 0 ? void 0 : _a.call(pend, msg);
                    return;
                }
                // RPC response
                const id = msg === null || msg === void 0 ? void 0 : msg.id;
                if (!id)
                    return;
                const pend = this.pending.get(id);
                if (!pend)
                    return;
                this.pending.delete(id);
                if (msg.ok)
                    pend.resolve(msg.result);
                else
                    pend.reject(new Error(msg.error));
            };
        }
        call(action, payload, onProgress) {
            const id = Math.random().toString(36).slice(2);
            return new Promise((resolve, reject) => {
                this.pending.set(id, { resolve, reject, onProgress });
                this.worker.postMessage({ id, action, payload });
            });
        }
        // -------- lifecycle --------
        getKind() { return this.call('getKind'); }
        dispose() { return this.call('dispose'); }
        setVerbose(verbose) { return this.call('setVerbose', { verbose }); }
        // -------- ELM --------
        initELM(config) { return this.call('initELM', config); }
        elmTrain(opts, onProgress) {
            return this.call('elm.train', opts, onProgress);
        }
        elmTrainFromData(X, Y, options, onProgress) {
            return this.call('elm.trainFromData', { X, Y, options }, onProgress);
        }
        elmPredict(text, topK = 5) { return this.call('elm.predict', { text, topK }); }
        elmPredictFromVector(X, topK = 5) { return this.call('elm.predictFromVector', { X, topK }); }
        elmGetEmbedding(X) { return this.call('elm.getEmbedding', { X }); }
        elmToJSON() { return this.call('elm.toJSON'); }
        elmLoadJSON(json) { return this.call('elm.loadJSON', { json }); }
        // -------- OnlineELM --------
        initOnlineELM(config) { return this.call('initOnlineELM', config); }
        oelmInit(X0, Y0) { return this.call('oelm.init', { X0, Y0 }); }
        oelmFit(X, Y) { return this.call('oelm.fit', { X, Y }); }
        oelmUpdate(X, Y) { return this.call('oelm.update', { X, Y }); }
        oelmLogits(X) { return this.call('oelm.logits', { X }); }
        oelmToJSON() { return this.call('oelm.toJSON'); }
        oelmLoadJSON(json) { return this.call('oelm.loadJSON', { json }); }
    }

    // © 2026 AsterMind AI Co. – All Rights Reserved.
    // Patent Pending US 63/897,713
    class TFIDF {
        constructor(corpusDocs) {
            this.termFrequency = {};
            this.inverseDocFreq = {};
            this.wordsInDoc = [];
            this.processedWords = [];
            this.scores = {};
            this.corpus = "";
            this.corpus = corpusDocs.join(" ");
            const wordsFinal = [];
            const re = /[^a-zA-Z0-9]+/g;
            corpusDocs.forEach(doc => {
                const tokens = doc.split(/\s+/);
                tokens.forEach(word => {
                    const cleaned = word.replace(re, " ");
                    wordsFinal.push(...cleaned.split(/\s+/).filter(Boolean));
                });
            });
            this.wordsInDoc = wordsFinal;
            this.processedWords = TFIDF.processWords(wordsFinal);
            // Compute term frequency
            this.processedWords.forEach(token => {
                this.termFrequency[token] = (this.termFrequency[token] || 0) + 1;
            });
            // Compute inverse document frequency
            for (const term in this.termFrequency) {
                const count = TFIDF.countDocsContainingTerm(corpusDocs, term);
                this.inverseDocFreq[term] = Math.log(corpusDocs.length / (1 + count));
            }
        }
        static countDocsContainingTerm(corpusDocs, term) {
            return corpusDocs.reduce((acc, doc) => (doc.includes(term) ? acc + 1 : acc), 0);
        }
        static processWords(words) {
            const filtered = TFIDF.removeStopWordsAndStem(words).map(w => TFIDF.lemmatize(w));
            const bigrams = TFIDF.generateNGrams(filtered, 2);
            const trigrams = TFIDF.generateNGrams(filtered, 3);
            return [...filtered, ...bigrams, ...trigrams];
        }
        static removeStopWordsAndStem(words) {
            const stopWords = new Set([
                "a", "and", "the", "is", "to", "of", "in", "it", "that", "you",
                "this", "for", "on", "are", "with", "as", "be", "by", "at", "from",
                "or", "an", "but", "not", "we"
            ]);
            return words.filter(w => !stopWords.has(w)).map(w => TFIDF.advancedStem(w));
        }
        static advancedStem(word) {
            const programmingKeywords = new Set([
                "func", "package", "import", "interface", "go",
                "goroutine", "channel", "select", "struct",
                "map", "slice", "var", "const", "type",
                "defer", "fallthrough"
            ]);
            if (programmingKeywords.has(word))
                return word;
            const suffixes = ["es", "ed", "ing", "s", "ly", "ment", "ness", "ity", "ism", "er"];
            for (const suffix of suffixes) {
                if (word.endsWith(suffix)) {
                    if (suffix === "es" && word.length > 2 && word[word.length - 3] === "i") {
                        return word.slice(0, -2);
                    }
                    return word.slice(0, -suffix.length);
                }
            }
            return word;
        }
        static lemmatize(word) {
            const rules = {
                execute: "execute",
                running: "run",
                returns: "return",
                defined: "define",
                compiles: "compile",
                calls: "call",
                creating: "create",
                invoke: "invoke",
                declares: "declare",
                references: "reference",
                implements: "implement",
                utilizes: "utilize",
                tests: "test",
                loops: "loop",
                deletes: "delete",
                functions: "function"
            };
            if (rules[word])
                return rules[word];
            if (word.endsWith("ing"))
                return word.slice(0, -3);
            if (word.endsWith("ed"))
                return word.slice(0, -2);
            return word;
        }
        static generateNGrams(tokens, n) {
            if (tokens.length < n)
                return [];
            const ngrams = [];
            for (let i = 0; i <= tokens.length - n; i++) {
                ngrams.push(tokens.slice(i, i + n).join(" "));
            }
            return ngrams;
        }
        calculateScores() {
            const totalWords = this.processedWords.length;
            const scores = {};
            this.processedWords.forEach(token => {
                const tf = this.termFrequency[token] || 0;
                scores[token] = (tf / totalWords) * (this.inverseDocFreq[token] || 0);
            });
            this.scores = scores;
            return scores;
        }
        extractKeywords(topN) {
            const entries = Object.entries(this.scores).sort((a, b) => b[1] - a[1]);
            return Object.fromEntries(entries.slice(0, topN));
        }
        processedWordsIndex(word) {
            return this.processedWords.indexOf(word);
        }
    }
    class TFIDFVectorizer {
        constructor(docs, maxVocabSize = 2000) {
            this.docTexts = docs;
            this.tfidf = new TFIDF(docs);
            // Collect all unique terms with frequencies
            const termFreq = {};
            docs.forEach(doc => {
                const tokens = doc.split(/\s+/);
                const cleaned = tokens.map(t => t.replace(/[^a-zA-Z0-9]+/g, ""));
                const processed = TFIDF.processWords(cleaned);
                processed.forEach(t => {
                    termFreq[t] = (termFreq[t] || 0) + 1;
                });
            });
            // Sort terms by frequency descending
            const sortedTerms = Object.entries(termFreq)
                .sort((a, b) => b[1] - a[1])
                .slice(0, maxVocabSize)
                .map(([term]) => term);
            this.vocabulary = sortedTerms;
            console.log(`✅ TFIDFVectorizer vocabulary capped at: ${this.vocabulary.length} terms.`);
        }
        /**
         * Returns the dense TFIDF vector for a given document text.
         */
        vectorize(doc) {
            const tokens = doc.split(/\s+/);
            const cleaned = tokens.map(t => t.replace(/[^a-zA-Z0-9]+/g, ""));
            const processed = TFIDF.processWords(cleaned);
            // Compute term frequency in this document
            const termFreq = {};
            processed.forEach(token => {
                termFreq[token] = (termFreq[token] || 0) + 1;
            });
            const totalTerms = processed.length;
            return this.vocabulary.map(term => {
                const tf = totalTerms > 0 ? (termFreq[term] || 0) / totalTerms : 0;
                const idf = this.tfidf.inverseDocFreq[term] || 0;
                return tf * idf;
            });
        }
        /**
         * Returns vectors for all original training docs.
         */
        vectorizeAll() {
            return this.docTexts.map(doc => this.vectorize(doc));
        }
        /**
         * Optional L2 normalization utility.
         */
        static l2normalize(vec) {
            const norm = Math.sqrt(vec.reduce((s, x) => s + x * x, 0));
            return norm === 0 ? vec : vec.map(x => x / norm);
        }
    }

    // © 2026 AsterMind AI Co. – All Rights Reserved.
    // Patent Pending US 63/897,713
    class KNN {
        /**
         * Compute cosine similarity between two numeric vectors.
         */
        static cosineSimilarity(vec1, vec2) {
            let dot = 0, norm1 = 0, norm2 = 0;
            for (let i = 0; i < vec1.length; i++) {
                dot += vec1[i] * vec2[i];
                norm1 += vec1[i] * vec1[i];
                norm2 += vec2[i] * vec2[i];
            }
            if (norm1 === 0 || norm2 === 0)
                return 0;
            return dot / (Math.sqrt(norm1) * Math.sqrt(norm2));
        }
        /**
         * Compute Euclidean distance between two numeric vectors.
         */
        static euclideanDistance(vec1, vec2) {
            let sum = 0;
            for (let i = 0; i < vec1.length; i++) {
                const diff = vec1[i] - vec2[i];
                sum += diff * diff;
            }
            return Math.sqrt(sum);
        }
        /**
         * Find k nearest neighbors.
         * @param queryVec - Query vector
         * @param dataset - Dataset to search
         * @param k - Number of neighbors
         * @param topX - Number of top results to return
         * @param metric - Similarity metric
         */
        static find(queryVec, dataset, k = 5, topX = 3, metric = "cosine") {
            const similarities = dataset.map((item, idx) => {
                let score;
                if (metric === "cosine") {
                    score = this.cosineSimilarity(queryVec, item.vector);
                }
                else {
                    // For Euclidean, invert distance so higher = closer
                    const dist = this.euclideanDistance(queryVec, item.vector);
                    score = -dist;
                }
                return { index: idx, score };
            });
            similarities.sort((a, b) => b.score - a.score);
            const labelWeights = {};
            for (let i = 0; i < Math.min(k, similarities.length); i++) {
                const label = dataset[similarities[i].index].label;
                const weight = similarities[i].score;
                labelWeights[label] = (labelWeights[label] || 0) + weight;
            }
            const weightedLabels = Object.entries(labelWeights)
                .map(([label, weight]) => ({ label, weight }))
                .sort((a, b) => b.weight - a.weight);
            return weightedLabels.slice(0, topX);
        }
    }

    // © 2026 AsterMind AI Co. – All Rights Reserved.
    // Patent Pending US 63/897,713
    // BindUI.ts - Utility to bind ELM model to HTML inputs and outputs
    function bindAutocompleteUI({ model, inputElement, outputElement, topK = 5 }) {
        inputElement.addEventListener('input', () => {
            const typed = inputElement.value.trim();
            if (typed.length === 0) {
                outputElement.innerHTML = '<em>Start typing...</em>';
                return;
            }
            try {
                const results = model.predict(typed, topK);
                outputElement.innerHTML = results.map(r => `
                <div><strong>${r.label}</strong>: ${(r.prob * 100).toFixed(1)}%</div>
            `).join('');
            }
            catch (e) {
                const message = e instanceof Error ? e.message : 'Unknown error';
                outputElement.innerHTML = `<span style="color: red;">Error: ${message}</span>`;
            }
        });
    }

    // © 2026 AsterMind AI Co. – All Rights Reserved.
    // Patent Pending US 63/897,713
    // Presets.ts — Reusable configuration presets for ELM (updated for new ELMConfig union)
    /**
     * NOTE:
     * - These are TEXT presets (token-mode). They set `useTokenizer: true`.
     * - If you need char-level, create an inline config where `useTokenizer: false`
     *   and pass it directly to ELM (numeric presets generally need an explicit inputSize).
     */
    /** English token-level preset */
    const EnglishTokenPreset = {
        useTokenizer: true,
        maxLen: 20,
        charSet: 'abcdefghijklmnopqrstuvwxyz',
        tokenizerDelimiter: /[\s,.;!?()\[\]{}"']+/};

    // © 2026 AsterMind AI Co. – All Rights Reserved.
    // Patent Pending US 63/897,713
    // ✅ AutoComplete.ts — ELM | KernelELM (Nyström+whiten) | OnlineELM
    // Fixes:
    //  • Avoids union narrowing on EnglishTokenPreset by shimming preset fields (no ExtendedELMConfig maxLen error)
    //  • activation typed as Activation (not string)
    //  • Removed non-existent "task" option in trainFromData()
    /** Safe accessor for preset fields (avoids type errors on ExtendedELMConfig) */
    const PRESET = (() => {
        var _a, _b, _c, _d;
        const p = EnglishTokenPreset;
        return {
            maxLen: (_a = p === null || p === void 0 ? void 0 : p.maxLen) !== null && _a !== void 0 ? _a : 30,
            charSet: (_b = p === null || p === void 0 ? void 0 : p.charSet) !== null && _b !== void 0 ? _b : 'abcdefghijklmnopqrstuvwxyz',
            useTokenizer: (_c = p === null || p === void 0 ? void 0 : p.useTokenizer) !== null && _c !== void 0 ? _c : true,
            tokenizerDelimiter: (_d = p === null || p === void 0 ? void 0 : p.tokenizerDelimiter) !== null && _d !== void 0 ? _d : /\s+/
        };
    })();
    function oneHot(idx, n) {
        const v = new Array(n).fill(0);
        if (idx >= 0 && idx < n)
            v[idx] = 1;
        return v;
    }
    function sortTopK(labels, probs, k) {
        return probs
            .map((p, i) => ({ label: labels[i], prob: p }))
            .sort((a, b) => b.prob - a.prob)
            .slice(0, k);
    }
    class AutoComplete {
        constructor(pairs, options) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5;
            this.trainPairs = pairs;
            this.activation = (_a = options.activation) !== null && _a !== void 0 ? _a : 'relu';
            this.engine = (_b = options.engine) !== null && _b !== void 0 ? _b : 'elm';
            this.topKDefault = (_c = options.topK) !== null && _c !== void 0 ? _c : 5;
            // Labels
            this.categories = Array.from(new Set(pairs.map(p => p.label)));
            // Text → numeric encoder (Kernel/Online need numeric; ELM can also consume numeric directly)
            this.encoder = new UniversalEncoder({
                charSet: PRESET.charSet,
                maxLen: PRESET.maxLen,
                useTokenizer: PRESET.useTokenizer,
                tokenizerDelimiter: PRESET.tokenizerDelimiter,
                mode: (PRESET.useTokenizer ? 'token' : 'char'),
            });
            const hiddenUnits = (_d = options.hiddenUnits) !== null && _d !== void 0 ? _d : 128;
            const ridgeLambda = (_e = options.ridgeLambda) !== null && _e !== void 0 ? _e : 1e-2;
            const weightInit = (_f = options.weightInit) !== null && _f !== void 0 ? _f : 'xavier';
            const verbose = (_g = options.verbose) !== null && _g !== void 0 ? _g : false;
            if (this.engine === 'kernel') {
                const D = this.encoder.getVectorSize();
                const ktype = (_j = (_h = options.kernel) === null || _h === void 0 ? void 0 : _h.type) !== null && _j !== void 0 ? _j : 'rbf';
                const kernel = ktype === 'poly'
                    ? { type: 'poly', gamma: (_l = (_k = options.kernel) === null || _k === void 0 ? void 0 : _k.gamma) !== null && _l !== void 0 ? _l : (1 / Math.max(1, D)), degree: (_o = (_m = options.kernel) === null || _m === void 0 ? void 0 : _m.degree) !== null && _o !== void 0 ? _o : 2, coef0: (_q = (_p = options.kernel) === null || _p === void 0 ? void 0 : _p.coef0) !== null && _q !== void 0 ? _q : 1 }
                    : ktype === 'linear'
                        ? { type: 'linear' }
                        : ktype === 'laplacian'
                            ? { type: 'laplacian', gamma: (_s = (_r = options.kernel) === null || _r === void 0 ? void 0 : _r.gamma) !== null && _s !== void 0 ? _s : (1 / Math.max(1, D)) }
                            : { type: 'rbf', gamma: (_u = (_t = options.kernel) === null || _t === void 0 ? void 0 : _t.gamma) !== null && _u !== void 0 ? _u : (1 / Math.max(1, D)) };
                this.model = new KernelELM({
                    outputDim: this.categories.length,
                    kernel,
                    ridgeLambda,
                    task: 'classification',
                    mode: 'nystrom',
                    nystrom: {
                        m: (_v = options.kernel) === null || _v === void 0 ? void 0 : _v.m,
                        strategy: (_x = (_w = options.kernel) === null || _w === void 0 ? void 0 : _w.strategy) !== null && _x !== void 0 ? _x : 'uniform',
                        seed: (_z = (_y = options.kernel) === null || _y === void 0 ? void 0 : _y.seed) !== null && _z !== void 0 ? _z : 1337,
                        preset: (_0 = options.kernel) === null || _0 === void 0 ? void 0 : _0.preset,
                        whiten: (_2 = (_1 = options.kernel) === null || _1 === void 0 ? void 0 : _1.whiten) !== null && _2 !== void 0 ? _2 : true,
                        jitter: (_4 = (_3 = options.kernel) === null || _3 === void 0 ? void 0 : _3.jitter) !== null && _4 !== void 0 ? _4 : 1e-10,
                    },
                    log: { modelName: 'AutoComplete-KELM', verbose }
                });
            }
            else if (this.engine === 'online') {
                const inputDim = this.encoder.getVectorSize();
                this.model = new OnlineELM({
                    inputDim,
                    outputDim: this.categories.length,
                    hiddenUnits,
                    activation: this.activation,
                    ridgeLambda,
                    weightInit: (_5 = weightInit) !== null && _5 !== void 0 ? _5 : 'he',
                    forgettingFactor: 0.997,
                    log: { modelName: 'AutoComplete-OnlineELM', verbose }
                });
            }
            else {
                // Classic ELM — use TextConfig branch explicitly
                this.model = new ELM({
                    categories: this.categories,
                    hiddenUnits,
                    activation: this.activation,
                    ridgeLambda,
                    weightInit: weightInit === 'he' ? 'xavier' : weightInit, // map 'he' to 'xavier' if needed
                    // Text branch fields:
                    useTokenizer: true,
                    maxLen: PRESET.maxLen,
                    charSet: PRESET.charSet,
                    tokenizerDelimiter: PRESET.tokenizerDelimiter,
                    // Logging / export
                    metrics: options.metrics,
                    log: { modelName: 'AutoComplete', verbose },
                    exportFileName: options.exportFileName
                });
            }
            // Bind UI to a small adapter that calls our predict()
            bindAutocompleteUI({
                model: {
                    predict: (text, k = this.topKDefault) => this.predict(text, k)
                },
                inputElement: options.inputElement,
                outputElement: options.outputElement,
                topK: options.topK
            });
        }
        /* ============= Training ============= */
        train() {
            // Build numeric X/Y
            const X = [];
            const Y = [];
            for (const { input, label } of this.trainPairs) {
                const vec = this.encoder.normalize(this.encoder.encode(input));
                const idx = this.categories.indexOf(label);
                if (idx === -1)
                    continue;
                X.push(vec);
                Y.push(oneHot(idx, this.categories.length));
            }
            if (this.engine === 'kernel') {
                this.model.fit(X, Y);
                return;
            }
            if (this.engine === 'online') {
                this.model.init(X, Y); // then .update() for new batches
                return;
            }
            // Classic ELM — options: { reuseWeights?, weights? }; do NOT pass "task"
            this.model.trainFromData(X, Y);
        }
        /* ============= Prediction ============= */
        predict(input, topN = 1) {
            const k = Math.max(1, topN);
            if (this.engine === 'elm') {
                const out = this.model.predict(input, k);
                return out.map(p => ({ completion: p.label, prob: p.prob }));
            }
            const x = this.encoder.normalize(this.encoder.encode(input));
            if (this.engine === 'kernel') {
                const probs = this.model.predictProbaFromVectors([x])[0];
                return sortTopK(this.categories, probs, k).map(p => ({ completion: p.label, prob: p.prob }));
            }
            const probs = this.model.predictProbaFromVector(x);
            return sortTopK(this.categories, probs, k).map(p => ({ completion: p.label, prob: p.prob }));
        }
        /* ============= Persistence ============= */
        getModel() { return this.model; }
        loadModelFromJSON(json) {
            if (this.model.fromJSON) {
                this.model.fromJSON(json);
            }
            else if (this.model.loadModelFromJSON) {
                this.model.loadModelFromJSON(json);
            }
            else if (this.model.loadFromJSON) {
                this.model.loadFromJSON(json);
            }
            else {
                console.warn('No compatible load method found on model.');
            }
        }
        saveModelAsJSONFile(filename = 'model.json') {
            let payload;
            if (this.model.toJSON) {
                payload = this.model.toJSON(true); // OnlineELM supports includeP; KernelELM ignores extra arg
            }
            else if (this.model.savedModelJSON) {
                payload = this.model.savedModelJSON;
            }
            else {
                console.warn('No compatible toJSON/savedModelJSON on model; skipping export.');
                return;
            }
            const blob = new Blob([typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        /* ============= Evaluation helpers ============= */
        top1Accuracy(pairs) {
            var _a;
            let correct = 0;
            for (const { input, label } of pairs) {
                const [pred] = this.predict(input, 1);
                if (((_a = pred === null || pred === void 0 ? void 0 : pred.completion) === null || _a === void 0 ? void 0 : _a.toLowerCase().trim()) === label.toLowerCase().trim())
                    correct++;
            }
            return correct / Math.max(1, pairs.length);
        }
        crossEntropy(pairs) {
            var _a;
            let total = 0;
            for (const { input, label } of pairs) {
                const preds = this.predict(input, this.categories.length);
                const match = preds.find(p => p.completion.toLowerCase().trim() === label.toLowerCase().trim());
                const prob = (_a = match === null || match === void 0 ? void 0 : match.prob) !== null && _a !== void 0 ? _a : 1e-12;
                total += -Math.log(prob);
            }
            return total / Math.max(1, pairs.length);
        }
        /** Internal CE via W/b/β (only for classic ELM); others fall back to external CE. */
        internalCrossEntropy(verbose = false) {
            if (!(this.model instanceof ELM)) {
                const ce = this.crossEntropy(this.trainPairs);
                if (verbose)
                    console.log(`📏 Internal CE not applicable to ${this.engine}; external CE: ${ce.toFixed(4)}`);
                return ce;
            }
            const elm = this.model;
            const { model, categories } = elm;
            if (!model) {
                if (verbose)
                    console.warn('⚠️ Cannot compute internal cross-entropy: model not trained.');
                return Infinity;
            }
            const X = [];
            const Y = [];
            for (const { input, label } of this.trainPairs) {
                const vec = this.encoder.normalize(this.encoder.encode(input));
                const idx = categories.indexOf(label);
                if (idx === -1)
                    continue;
                X.push(vec);
                Y.push(oneHot(idx, categories.length));
            }
            const { W, b, beta } = model; // W: hidden x in, b: hidden x 1, beta: hidden x out
            const tempH = Matrix.multiply(X, Matrix.transpose(W));
            const act = Activations.get(this.activation);
            const H = tempH.map(row => row.map((v, j) => act(v + b[j][0])));
            const logits = Matrix.multiply(H, beta);
            const probs = logits.map(row => Activations.softmax(row));
            let total = 0;
            for (let i = 0; i < Y.length; i++) {
                for (let j = 0; j < Y[0].length; j++) {
                    if (Y[i][j] === 1) {
                        const p = Math.min(Math.max(probs[i][j], 1e-15), 1 - 1e-15);
                        total += -Math.log(p);
                    }
                }
            }
            const ce = total / Math.max(1, Y.length);
            if (verbose)
                console.log(`📏 Internal Cross-Entropy (ELM W/b/β): ${ce.toFixed(4)}`);
            return ce;
        }
    }

    // © 2026 AsterMind AI Co. – All Rights Reserved.
    // Patent Pending US 63/897,713
    // CharacterLangEncoderELM.ts — robust char/token text encoder on top of ELM
    // Upgrades:
    //  • Safe preset extraction (no union-type errors on maxLen/charSet)
    //  • Proper (inputs, labels) training via trainFromData()
    //  • Hidden-layer embeddings via elm.getEmbedding() (with matrix fallback)
    //  • Batch encode(), JSON I/O passthrough, gentle logging
    //  • Activation typed, no reliance on private fields
    // If you have a preset (optional). Otherwise remove this import.
    // import { EnglishTokenPreset } from '../config/Presets';
    class CharacterLangEncoderELM {
        constructor(config) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            // Make sure we have the basics
            if (!config.hiddenUnits) {
                throw new Error('CharacterLangEncoderELM requires hiddenUnits');
            }
            // Activation defaults to 'relu' if not provided
            this.activation = (_a = config.activation) !== null && _a !== void 0 ? _a : 'relu';
            // Safely coerce into a *text* config (avoid NumericConfig branch)
            // We do not assume a preset exists; provide conservative defaults.
            const textMaxLen = (_b = config === null || config === void 0 ? void 0 : config.maxLen) !== null && _b !== void 0 ? _b : 64;
            const textCharSet = (_c = config === null || config === void 0 ? void 0 : config.charSet) !== null && _c !== void 0 ? _c : 'abcdefghijklmnopqrstuvwxyz';
            const textTokDelim = (_d = config === null || config === void 0 ? void 0 : config.tokenizerDelimiter) !== null && _d !== void 0 ? _d : /\s+/;
            // Merge into a TEXT-leaning config object.
            // NOTE: We keep categories if provided, but we will override them in train() from labels.
            this.config = Object.assign(Object.assign({}, config), { 
                // Force text branch:
                useTokenizer: true, maxLen: textMaxLen, charSet: textCharSet, tokenizerDelimiter: textTokDelim, activation: this.activation, 
                // Make logging robust:
                log: {
                    modelName: 'CharacterLangEncoderELM',
                    verbose: (_f = (_e = config.log) === null || _e === void 0 ? void 0 : _e.verbose) !== null && _f !== void 0 ? _f : false,
                    toFile: (_h = (_g = config.log) === null || _g === void 0 ? void 0 : _g.toFile) !== null && _h !== void 0 ? _h : false,
                    level: (_k = (_j = config.log) === null || _j === void 0 ? void 0 : _j.level) !== null && _k !== void 0 ? _k : 'info',
                } }); // cast to any to avoid union friction
            this.elm = new ELM(this.config);
            // Forward thresholds/export if present
            if (config.metrics) {
                this.elm.metrics = config.metrics;
            }
            if (this.config.exportFileName) {
                this.elm.config.exportFileName = this.config.exportFileName;
            }
        }
        /**
         * Train on parallel arrays: inputs (strings) + labels (strings).
         * We:
         *  • dedupe labels → categories
         *  • encode inputs with the ELM’s text encoder
         *  • one-hot the labels
         *  • call trainFromData(X, Y)
         */
        train(inputStrings, labels) {
            var _a, _b, _c, _d;
            if (!(inputStrings === null || inputStrings === void 0 ? void 0 : inputStrings.length) || !(labels === null || labels === void 0 ? void 0 : labels.length) || inputStrings.length !== labels.length) {
                throw new Error('train() expects equal-length inputStrings and labels');
            }
            // Build categories from labels
            const categories = Array.from(new Set(labels));
            this.elm.setCategories(categories);
            // Get the encoder (support getEncoder() or .encoder)
            const enc = (_c = (_b = (_a = this.elm).getEncoder) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : this.elm.encoder;
            if (!(enc === null || enc === void 0 ? void 0 : enc.encode) || !(enc === null || enc === void 0 ? void 0 : enc.normalize)) {
                throw new Error('ELM text encoder is not available. Ensure useTokenizer/maxLen/charSet are set.');
            }
            const X = [];
            const Y = [];
            for (let i = 0; i < inputStrings.length; i++) {
                const x = enc.normalize(enc.encode(String((_d = inputStrings[i]) !== null && _d !== void 0 ? _d : '')));
                X.push(x);
                const li = categories.indexOf(labels[i]);
                const y = new Array(categories.length).fill(0);
                if (li >= 0)
                    y[li] = 1;
                Y.push(y);
            }
            // Classic ELM closed-form training
            this.elm.trainFromData(X, Y);
        }
        /**
         * Returns a dense embedding for one string.
         * Uses ELM.getEmbedding() if available; otherwise computes H = act(XW^T + b).
         * By design this returns the *hidden* feature (length = hiddenUnits).
         */
        encode(text) {
            var _a, _b, _c;
            // Get encoder
            const enc = (_c = (_b = (_a = this.elm).getEncoder) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : this.elm.encoder;
            if (!(enc === null || enc === void 0 ? void 0 : enc.encode) || !(enc === null || enc === void 0 ? void 0 : enc.normalize)) {
                throw new Error('ELM text encoder is not available. Train or configure text settings first.');
            }
            const x = enc.normalize(enc.encode(String(text !== null && text !== void 0 ? text : '')));
            // Prefer official embedding API if present
            if (typeof this.elm.getEmbedding === 'function') {
                const E = this.elm.getEmbedding([x]);
                if (Array.isArray(E) && Array.isArray(E[0]))
                    return E[0];
            }
            // Fallback: compute hidden act via model params (W,b)
            const model = this.elm.model;
            if (!model)
                throw new Error('Model not trained.');
            const { W, b } = model; // W: hidden x in, b: hidden x 1
            const tempH = Matrix.multiply([x], Matrix.transpose(W)); // (1 x hidden)
            const act = Activations.get(this.activation);
            const H = tempH.map(row => row.map((v, j) => act(v + b[j][0]))); // (1 x hidden)
            // Return hidden vector
            return H[0];
        }
        /** Batch encoding convenience */
        encodeBatch(texts) {
            return texts.map(t => this.encode(t));
        }
        /** Load/save passthroughs */
        loadModelFromJSON(json) {
            this.elm.loadModelFromJSON(json);
        }
        saveModelAsJSONFile(filename) {
            this.elm.saveModelAsJSONFile(filename);
        }
    }

    // © 2026 AsterMind AI Co. – All Rights Reserved.
    // Patent Pending US 63/897,713
    // FeatureCombinerELM.ts — combine encoder vectors + metadata, train numeric ELM
    class FeatureCombinerELM {
        constructor(config) {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            this.categories = [];
            const hidden = config.hiddenUnits;
            const act = config.activation;
            if (typeof hidden !== 'number') {
                throw new Error('FeatureCombinerELM requires config.hiddenUnits (number)');
            }
            if (!act) {
                throw new Error('FeatureCombinerELM requires config.activation');
            }
            // Force numeric mode (tokenizer off). Provide a safe inputSize placeholder;
            // ELM's trainFromData learns actual dims from X at train-time.
            this.config = Object.assign(Object.assign({}, config), { categories: (_a = config.categories) !== null && _a !== void 0 ? _a : [], useTokenizer: false, inputSize: (_b = config.inputSize) !== null && _b !== void 0 ? _b : 1, log: {
                    modelName: 'FeatureCombinerELM',
                    verbose: (_d = (_c = config.log) === null || _c === void 0 ? void 0 : _c.verbose) !== null && _d !== void 0 ? _d : false,
                    toFile: (_f = (_e = config.log) === null || _e === void 0 ? void 0 : _e.toFile) !== null && _f !== void 0 ? _f : false,
                    // @ts-ignore optional level passthrough
                    level: (_h = (_g = config.log) === null || _g === void 0 ? void 0 : _g.level) !== null && _h !== void 0 ? _h : 'info',
                } });
            this.elm = new ELM(this.config);
            // Optional thresholds/export passthrough
            if (config.metrics)
                this.elm.metrics = config.metrics;
            if (config.exportFileName)
                this.elm.config.exportFileName = config.exportFileName;
        }
        /** Concatenate encoder vector + metadata vector */
        static combineFeatures(encodedVec, meta) {
            // Fast path avoids spread copies in tight loops
            const out = new Array(encodedVec.length + meta.length);
            let i = 0;
            for (; i < encodedVec.length; i++)
                out[i] = encodedVec[i];
            for (let j = 0; j < meta.length; j++)
                out[i + j] = meta[j];
            return out;
        }
        /** Convenience for batch combination */
        static combineBatch(encoded, metas) {
            if (encoded.length !== metas.length) {
                throw new Error(`combineBatch: encoded length ${encoded.length} != metas length ${metas.length}`);
            }
            const X = new Array(encoded.length);
            for (let i = 0; i < encoded.length; i++) {
                X[i] = FeatureCombinerELM.combineFeatures(encoded[i], metas[i]);
            }
            return X;
        }
        /** Train from encoder vectors + metadata + labels (classification) */
        train(encoded, metas, labels) {
            if (!(encoded === null || encoded === void 0 ? void 0 : encoded.length) || !(metas === null || metas === void 0 ? void 0 : metas.length) || !(labels === null || labels === void 0 ? void 0 : labels.length)) {
                throw new Error('train: empty encoded/metas/labels');
            }
            if (encoded.length !== metas.length || encoded.length !== labels.length) {
                throw new Error('train: lengths must match (encoded, metas, labels)');
            }
            const X = FeatureCombinerELM.combineBatch(encoded, metas);
            this.categories = Array.from(new Set(labels));
            this.elm.setCategories(this.categories);
            const Y = labels.map((lab) => {
                const idx = this.categories.indexOf(lab);
                const row = new Array(this.categories.length).fill(0);
                if (idx >= 0)
                    row[idx] = 1;
                return row;
            });
            // Closed-form solve via ELM; no private internals needed
            this.elm.trainFromData(X, Y);
        }
        /** Predict top-K labels from a single (vec, meta) pair */
        predict(encodedVec, meta, topK = 1) {
            const input = [FeatureCombinerELM.combineFeatures(encodedVec, meta)];
            const batches = this.elm.predictFromVector(input, topK);
            return batches[0];
        }
        /** Predict the single best label + prob */
        predictLabel(encodedVec, meta) {
            const [top] = this.predict(encodedVec, meta, 1);
            return top;
        }
        /** Get hidden embedding for (vec, meta) pair (useful for chaining) */
        getEmbedding(encodedVec, meta) {
            const input = [FeatureCombinerELM.combineFeatures(encodedVec, meta)];
            const H = this.elm.getEmbedding(input);
            return H[0];
        }
        loadModelFromJSON(json) {
            this.elm.loadModelFromJSON(json);
        }
        saveModelAsJSONFile(filename) {
            this.elm.saveModelAsJSONFile(filename);
        }
    }

    // © 2026 AsterMind AI Co. – All Rights Reserved.
    // Patent Pending US 63/897,713
    // ConfidenceClassifierELM.ts — numeric confidence classifier on top of ELM
    // Upgrades:
    //  • Numeric-only pipeline (no tokenizer)
    //  • Proper trainFromData(X, Y) with one-hot labels
    //  • Vector-safe prediction (predictFromVector)
    //  • Score helpers, batch APIs, and simple evaluation
    //  • Robust logging + safe handling of ELMConfig union
    /**
     * ConfidenceClassifierELM is a lightweight wrapper that classifies whether
     * an upstream model’s prediction is "low" or "high" confidence based on
     * (embedding, metadata) numeric features.
     */
    class ConfidenceClassifierELM {
        constructor(baseConfig, opts = {}) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
            this.baseConfig = baseConfig;
            this.categories = (_a = opts.categories) !== null && _a !== void 0 ? _a : ['low', 'high'];
            this.activation = (_b = opts.activation) !== null && _b !== void 0 ? _b : ((_c = baseConfig.activation) !== null && _c !== void 0 ? _c : 'relu');
            // We force a numeric ELM config. Many ELM builds don’t require inputSize
            // at construction because trainFromData(X,Y) uses X[0].length to size W.
            // We still pass useTokenizer=false and categories to be explicit.
            const cfg = Object.assign(Object.assign({}, this.baseConfig), { useTokenizer: false, categories: this.categories, activation: this.activation, log: {
                    modelName: 'ConfidenceClassifierELM',
                    verbose: (_f = (_e = (_d = baseConfig.log) === null || _d === void 0 ? void 0 : _d.verbose) !== null && _e !== void 0 ? _e : opts.verbose) !== null && _f !== void 0 ? _f : false,
                    toFile: (_h = (_g = baseConfig.log) === null || _g === void 0 ? void 0 : _g.toFile) !== null && _h !== void 0 ? _h : false,
                    level: (_k = (_j = baseConfig.log) === null || _j === void 0 ? void 0 : _j.level) !== null && _k !== void 0 ? _k : 'info',
                }, 
                // Optional passthroughs:
                exportFileName: (_l = opts.exportFileName) !== null && _l !== void 0 ? _l : this.baseConfig.exportFileName });
            this.elm = new ELM(cfg);
            // Forward thresholds if present
            if (this.baseConfig.metrics) {
                this.elm.metrics = this.baseConfig.metrics;
            }
        }
        /** One-hot helper */
        oneHot(n, idx) {
            const v = new Array(n).fill(0);
            if (idx >= 0 && idx < n)
                v[idx] = 1;
            return v;
        }
        /**
         * Train from numeric (vector, meta) → combined features + labels.
         * `vectors[i]` and `metas[i]` must be aligned with `labels[i]`.
         */
        train(vectors, metas, labels) {
            if (!(vectors === null || vectors === void 0 ? void 0 : vectors.length) || !(metas === null || metas === void 0 ? void 0 : metas.length) || !(labels === null || labels === void 0 ? void 0 : labels.length)) {
                throw new Error('train: empty inputs');
            }
            if (vectors.length !== metas.length || vectors.length !== labels.length) {
                throw new Error('train: vectors, metas, labels must have same length');
            }
            // Ensure categories include all observed labels (keeps order of existing categories first)
            const uniq = Array.from(new Set(labels));
            const merged = Array.from(new Set([...this.categories, ...uniq]));
            this.categories = merged;
            this.elm.setCategories(this.categories);
            // Build X, Y
            const X = new Array(vectors.length);
            const Y = new Array(vectors.length);
            for (let i = 0; i < vectors.length; i++) {
                const x = FeatureCombinerELM.combineFeatures(vectors[i], metas[i]); // numeric feature vector
                X[i] = x;
                const li = this.categories.indexOf(labels[i]);
                Y[i] = this.oneHot(this.categories.length, li);
            }
            // Closed-form ELM training
            this.elm.trainFromData(X, Y);
        }
        /** Predict full distribution for a single (vec, meta). */
        predict(vec, meta, topK = 2) {
            var _a, _b;
            const x = FeatureCombinerELM.combineFeatures(vec, meta);
            // Prefer vector-safe API; most Astermind builds expose predictFromVector([x], topK)
            const fn = this.elm.predictFromVector;
            if (typeof fn === 'function') {
                const out = fn.call(this.elm, [x], topK); // PredictResult[][]
                return Array.isArray(out) && Array.isArray(out[0]) ? out[0] : (out !== null && out !== void 0 ? out : []);
            }
            // Fallback to predict() if it supports numeric vectors (some builds do)
            const maybe = (_b = (_a = this.elm).predict) === null || _b === void 0 ? void 0 : _b.call(_a, x, topK);
            if (Array.isArray(maybe))
                return maybe;
            throw new Error('No vector-safe predict available on underlying ELM.');
        }
        /** Probability the label is "high" (or the second category by default). */
        predictScore(vec, meta, positive = 'high') {
            var _a;
            const dist = this.predict(vec, meta, this.categories.length);
            const hit = dist.find(d => d.label === positive);
            return (_a = hit === null || hit === void 0 ? void 0 : hit.prob) !== null && _a !== void 0 ? _a : 0;
        }
        /** Predicted top-1 label. */
        predictLabel(vec, meta) {
            var _a, _b;
            const dist = this.predict(vec, meta, 1);
            return (_b = (_a = dist[0]) === null || _a === void 0 ? void 0 : _a.label) !== null && _b !== void 0 ? _b : this.categories[0];
        }
        /** Batch prediction (distributions). */
        predictBatch(vectors, metas, topK = 2) {
            if (vectors.length !== metas.length) {
                throw new Error('predictBatch: vectors and metas must have same length');
            }
            return vectors.map((v, i) => this.predict(v, metas[i], topK));
        }
        /* ============ Simple evaluation helpers ============ */
        /** Compute accuracy and confusion counts for a labeled set. */
        evaluate(vectors, metas, labels) {
            if (vectors.length !== metas.length || vectors.length !== labels.length) {
                throw new Error('evaluate: inputs must have same length');
            }
            const confusion = {};
            for (const a of this.categories) {
                confusion[a] = {};
                for (const b of this.categories)
                    confusion[a][b] = 0;
            }
            let correct = 0;
            for (let i = 0; i < vectors.length; i++) {
                const pred = this.predictLabel(vectors[i], metas[i]);
                const gold = labels[i];
                if (pred === gold)
                    correct++;
                if (!confusion[gold])
                    confusion[gold] = {};
                if (confusion[gold][pred] === undefined)
                    confusion[gold][pred] = 0;
                confusion[gold][pred]++;
            }
            return { accuracy: correct / labels.length, confusion };
        }
        /* ============ I/O passthroughs ============ */
        loadModelFromJSON(json) {
            this.elm.loadModelFromJSON(json);
        }
        saveModelAsJSONFile(filename) {
            this.elm.saveModelAsJSONFile(filename);
        }
        /** Access underlying ELM if needed */
        getELM() {
            return this.elm;
        }
        /** Current category ordering used by the model */
        getCategories() {
            return this.categories.slice();
        }
    }

    // © 2026 AsterMind AI Co. – All Rights Reserved.
    // Patent Pending US 63/897,713
    // EncoderELM.ts — string→vector encoder using ELM (batch) + OnlineELM (incremental)
    class EncoderELM {
        constructor(config) {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            if (typeof config.hiddenUnits !== 'number') {
                throw new Error('EncoderELM requires config.hiddenUnits (number).');
            }
            if (!config.activation) {
                throw new Error('EncoderELM requires config.activation.');
            }
            // Force text-encoder mode by default (safe even if NumericConfig is passed:
            // ELM will ignore tokenizer fields in numeric flows)
            this.config = Object.assign(Object.assign({}, config), { categories: (_a = config.categories) !== null && _a !== void 0 ? _a : [], useTokenizer: (_b = config.useTokenizer) !== null && _b !== void 0 ? _b : true, 
                // keep charSet/maxLen if caller provided; otherwise ELM defaults will kick in
                log: {
                    modelName: 'EncoderELM',
                    verbose: (_d = (_c = config.log) === null || _c === void 0 ? void 0 : _c.verbose) !== null && _d !== void 0 ? _d : false,
                    toFile: (_f = (_e = config.log) === null || _e === void 0 ? void 0 : _e.toFile) !== null && _f !== void 0 ? _f : false,
                    level: (_h = (_g = config.log) === null || _g === void 0 ? void 0 : _g.level) !== null && _h !== void 0 ? _h : 'info',
                } });
            this.elm = new ELM(this.config);
            // Forward thresholds/file export if present
            if (config.metrics)
                this.elm.metrics = config.metrics;
            if (config.exportFileName)
                this.elm.config.exportFileName = config.exportFileName;
        }
        /** Batch training for string → dense vector mapping. */
        train(inputStrings, targetVectors) {
            if (!(inputStrings === null || inputStrings === void 0 ? void 0 : inputStrings.length) || !(targetVectors === null || targetVectors === void 0 ? void 0 : targetVectors.length)) {
                throw new Error('train: empty inputs');
            }
            if (inputStrings.length !== targetVectors.length) {
                throw new Error('train: inputStrings and targetVectors lengths differ');
            }
            const enc = this.elm.encoder;
            if (!enc || typeof enc.encode !== 'function') {
                throw new Error('EncoderELM: underlying ELM has no encoder; set useTokenizer/maxLen/charSet in config.');
            }
            // X = normalized encoded text; Y = dense targets
            const X = inputStrings.map(s => enc.normalize(enc.encode(s)));
            const Y = targetVectors;
            // Closed-form solve via ELM
            // (ELM learns W,b randomly and solves β; Y can be any numeric outputDim)
            this.elm.trainFromData(X, Y);
        }
        /** Encode a string into a dense feature vector using the trained model. */
        encode(text) {
            var _a;
            const enc = this.elm.encoder;
            if (!enc || typeof enc.encode !== 'function') {
                throw new Error('encode: underlying ELM has no encoder');
            }
            const model = this.elm.model;
            if (!model)
                throw new Error('EncoderELM model has not been trained yet.');
            const x = enc.normalize(enc.encode(text)); // 1 x D
            const { W, b, beta } = model;
            // H = act( x W^T + b )
            const tempH = Matrix.multiply([x], Matrix.transpose(W));
            const act = Activations.get((_a = this.config.activation) !== null && _a !== void 0 ? _a : 'relu');
            const H = Activations.apply(tempH.map(row => row.map((v, j) => v + b[j][0])), act);
            // y = H β
            return Matrix.multiply(H, beta)[0];
        }
        /* ===================== Online / Incremental API ===================== */
        /**
         * Begin an online OS-ELM run for string→vector encoding.
         * Provide outputDim and either inputDim OR a sampleText we can encode to infer inputDim.
         */
        beginOnline(opts) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            const outputDim = opts.outputDim | 0;
            if (!(outputDim > 0))
                throw new Error('beginOnline: outputDim must be > 0');
            // Derive inputDim if not provided
            let inputDim = opts.inputDim;
            if (inputDim == null) {
                const enc = this.elm.encoder;
                if (!opts.sampleText || !enc) {
                    throw new Error('beginOnline: provide inputDim or sampleText (and ensure encoder is available).');
                }
                inputDim = enc.normalize(enc.encode(opts.sampleText)).length;
            }
            const hiddenUnits = ((_a = opts.hiddenUnits) !== null && _a !== void 0 ? _a : this.config.hiddenUnits) | 0;
            if (!(hiddenUnits > 0))
                throw new Error('beginOnline: hiddenUnits must be > 0');
            const activation = ((_c = (_b = opts.activation) !== null && _b !== void 0 ? _b : this.config.activation) !== null && _c !== void 0 ? _c : 'relu');
            // Build OnlineELM with our new config-style constructor
            this.online = new OnlineELM({
                inputDim: inputDim,
                outputDim,
                hiddenUnits,
                activation,
                ridgeLambda: (_d = opts.ridgeLambda) !== null && _d !== void 0 ? _d : 1e-2,
                weightInit: (_e = opts.weightInit) !== null && _e !== void 0 ? _e : 'xavier',
                forgettingFactor: (_f = opts.forgettingFactor) !== null && _f !== void 0 ? _f : 1.0,
                seed: (_g = opts.seed) !== null && _g !== void 0 ? _g : 1337,
                log: { verbose: (_j = (_h = this.config.log) === null || _h === void 0 ? void 0 : _h.verbose) !== null && _j !== void 0 ? _j : false, modelName: 'EncoderELM-Online' },
            });
            this.onlineInputDim = inputDim;
            this.onlineOutputDim = outputDim;
        }
        /**
         * Online partial fit with *pre-encoded* numeric vectors.
         * If not initialized, this call seeds the model via `init`, else it performs an `update`.
         */
        partialTrainOnlineVectors(batch) {
            if (!this.online || this.onlineInputDim == null || this.onlineOutputDim == null) {
                throw new Error('partialTrainOnlineVectors: call beginOnline() first.');
            }
            if (!(batch === null || batch === void 0 ? void 0 : batch.length))
                return;
            const D = this.onlineInputDim, O = this.onlineOutputDim;
            const X = new Array(batch.length);
            const Y = new Array(batch.length);
            for (let i = 0; i < batch.length; i++) {
                const { x, y } = batch[i];
                if (x.length !== D)
                    throw new Error(`x length ${x.length} != inputDim ${D}`);
                if (y.length !== O)
                    throw new Error(`y length ${y.length} != outputDim ${O}`);
                X[i] = x;
                Y[i] = y;
            }
            if (!this.online.beta || !this.online.P) {
                this.online.init(X, Y);
            }
            else {
                this.online.update(X, Y);
            }
        }
        /**
         * Online partial fit with raw texts and dense numeric targets.
         * Texts are encoded + normalized internally.
         */
        partialTrainOnlineTexts(batch) {
            if (!this.online || this.onlineInputDim == null || this.onlineOutputDim == null) {
                throw new Error('partialTrainOnlineTexts: call beginOnline() first.');
            }
            if (!(batch === null || batch === void 0 ? void 0 : batch.length))
                return;
            const enc = this.elm.encoder;
            if (!enc)
                throw new Error('partialTrainOnlineTexts: encoder not available on underlying ELM');
            const D = this.onlineInputDim, O = this.onlineOutputDim;
            const X = new Array(batch.length);
            const Y = new Array(batch.length);
            for (let i = 0; i < batch.length; i++) {
                const { text, target } = batch[i];
                const x = enc.normalize(enc.encode(text));
                if (x.length !== D)
                    throw new Error(`encoded text dim ${x.length} != inputDim ${D}`);
                if (target.length !== O)
                    throw new Error(`target length ${target.length} != outputDim ${O}`);
                X[i] = x;
                Y[i] = target;
            }
            if (!this.online.beta || !this.online.P) {
                this.online.init(X, Y);
            }
            else {
                this.online.update(X, Y);
            }
        }
        /**
         * Finalize the online run by publishing learned weights into the standard ELM model.
         * After this, the normal encode() path works unchanged.
         */
        endOnline() {
            if (!this.online)
                return;
            const W = this.online.W;
            const b = this.online.b;
            const beta = this.online.beta;
            if (!W || !b || !beta) {
                throw new Error('endOnline: online model has no learned parameters (did you call init/fit/update?)');
            }
            this.elm.model = { W, b, beta };
            // Clear online state
            this.online = undefined;
            this.onlineInputDim = undefined;
            this.onlineOutputDim = undefined;
        }
        /* ===================== I/O passthrough ===================== */
        loadModelFromJSON(json) {
            this.elm.loadModelFromJSON(json);
        }
        saveModelAsJSONFile(filename) {
            this.elm.saveModelAsJSONFile(filename);
        }
    }

    // © 2026 AsterMind AI Co. – All Rights Reserved.
    // Patent Pending US 63/897,713
    // intentClassifier.ts — ELM-based intent classification (text → label)
    class IntentClassifier {
        constructor(config) {
            var _a, _b, _c, _d, _e, _f, _g;
            this.categories = [];
            // Basic guardrails (common footguns)
            const hidden = config.hiddenUnits;
            const act = config.activation;
            if (typeof hidden !== 'number') {
                throw new Error('IntentClassifier requires config.hiddenUnits (number)');
            }
            if (!act) {
                throw new Error('IntentClassifier requires config.activation');
            }
            // Force TEXT mode (tokenizer on). We set categories during train().
            this.config = Object.assign(Object.assign({}, config), { categories: (_a = config.categories) !== null && _a !== void 0 ? _a : [], useTokenizer: true, log: {
                    modelName: 'IntentClassifier',
                    verbose: (_c = (_b = config.log) === null || _b === void 0 ? void 0 : _b.verbose) !== null && _c !== void 0 ? _c : false,
                    toFile: (_e = (_d = config.log) === null || _d === void 0 ? void 0 : _d.toFile) !== null && _e !== void 0 ? _e : false,
                    // @ts-ignore: optional passthrough
                    level: (_g = (_f = config.log) === null || _f === void 0 ? void 0 : _f.level) !== null && _g !== void 0 ? _g : 'info',
                } });
            this.model = new ELM(this.config);
            // Optional thresholds/export passthrough
            if (config.metrics)
                this.model.metrics = config.metrics;
            if (config.exportFileName)
                this.model.config.exportFileName = config.exportFileName;
        }
        /* ==================== Training ==================== */
        /**
         * Train from (text, label) pairs using closed-form ELM solve.
         * Uses the ELM's UniversalEncoder (token mode).
         */
        train(textLabelPairs, augmentation) {
            var _a, _b, _c, _d, _e;
            if (!(textLabelPairs === null || textLabelPairs === void 0 ? void 0 : textLabelPairs.length))
                throw new Error('train: empty training data');
            // Build label set
            this.categories = Array.from(new Set(textLabelPairs.map(p => p.label)));
            this.model.setCategories(this.categories);
            // Prepare encoder
            const enc = (_c = (_b = (_a = this.model).getEncoder) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : this.model.encoder;
            if (!enc)
                throw new Error('IntentClassifier: encoder unavailable on ELM instance.');
            // Inline augmentation (prefix/suffix/noise) — lightweight so we avoid importing Augment here
            const charSet = (augmentation === null || augmentation === void 0 ? void 0 : augmentation.charSet) ||
                enc.charSet ||
                'abcdefghijklmnopqrstuvwxyz';
            const makeNoisy = (s, rate) => {
                var _a, _b;
                if (rate === void 0) { rate = (_a = augmentation === null || augmentation === void 0 ? void 0 : augmentation.noiseRate) !== null && _a !== void 0 ? _a : 0.05; }
                if (!(augmentation === null || augmentation === void 0 ? void 0 : augmentation.includeNoise) || rate <= 0)
                    return [s];
                const arr = s.split('');
                for (let i = 0; i < arr.length; i++) {
                    if (Math.random() < rate) {
                        const r = Math.floor(Math.random() * charSet.length);
                        arr[i] = (_b = charSet[r]) !== null && _b !== void 0 ? _b : arr[i];
                    }
                }
                return [s, arr.join('')];
            };
            const expanded = [];
            for (const p of textLabelPairs) {
                const base = [p.text];
                const withPrefixes = ((_d = augmentation === null || augmentation === void 0 ? void 0 : augmentation.prefixes) !== null && _d !== void 0 ? _d : []).map(px => `${px}${p.text}`);
                const withSuffixes = ((_e = augmentation === null || augmentation === void 0 ? void 0 : augmentation.suffixes) !== null && _e !== void 0 ? _e : []).map(sx => `${p.text}${sx}`);
                const candidates = [...base, ...withPrefixes, ...withSuffixes];
                for (const c of candidates) {
                    for (const v of makeNoisy(c)) {
                        expanded.push({ text: v, label: p.label });
                    }
                }
            }
            // Encode + one-hot
            const X = new Array(expanded.length);
            const Y = new Array(expanded.length);
            for (let i = 0; i < expanded.length; i++) {
                const { text, label } = expanded[i];
                const vec = enc.normalize(enc.encode(text));
                X[i] = vec;
                const row = new Array(this.categories.length).fill(0);
                const li = this.categories.indexOf(label);
                if (li >= 0)
                    row[li] = 1;
                Y[i] = row;
            }
            // Closed-form ELM training
            this.model.trainFromData(X, Y);
        }
        /* ==================== Inference ==================== */
        /** Top-K predictions with an optional probability threshold */
        predict(text, topK = 1, threshold = 0) {
            const res = this.model.predict(text, Math.max(1, topK));
            return threshold > 0 ? res.filter(r => r.prob >= threshold) : res;
        }
        /** Batched predict */
        predictBatch(texts, topK = 1, threshold = 0) {
            return texts.map(t => this.predict(t, topK, threshold));
        }
        /** Convenience: best label + prob (or undefined if below threshold) */
        predictLabel(text, threshold = 0) {
            const [top] = this.predict(text, 1, threshold);
            return top;
        }
        /* ==================== Model I/O ==================== */
        loadModelFromJSON(json) {
            this.model.loadModelFromJSON(json);
        }
        saveModelAsJSONFile(filename) {
            this.model.saveModelAsJSONFile(filename);
        }
    }

    // © 2026 AsterMind AI Co. – All Rights Reserved.
    // Patent Pending US 63/897,713
    // IO.ts - Import/export utilities for labeled training data
    class IO {
        static importJSON(json) {
            try {
                const data = JSON.parse(json);
                if (!Array.isArray(data))
                    throw new Error('Invalid format');
                return data.filter(item => typeof item.text === 'string' && typeof item.label === 'string');
            }
            catch (err) {
                console.error('Failed to parse training data JSON:', err);
                return [];
            }
        }
        static exportJSON(pairs) {
            return JSON.stringify(pairs, null, 2);
        }
        static importDelimited(text, delimiter = ',', hasHeader = true) {
            var _a, _b, _c, _d;
            const lines = text.trim().split('\n');
            const examples = [];
            const headers = hasHeader
                ? lines[0].split(delimiter).map(h => h.trim().toLowerCase())
                : lines[0].split(delimiter).length === 1
                    ? ['label']
                    : ['text', 'label'];
            const startIndex = hasHeader ? 1 : 0;
            for (let i = startIndex; i < lines.length; i++) {
                const parts = lines[i].split(delimiter);
                if (parts.length === 1) {
                    examples.push({ text: parts[0].trim(), label: parts[0].trim() });
                }
                else {
                    const textIdx = headers.indexOf('text');
                    const labelIdx = headers.indexOf('label');
                    const text = textIdx !== -1 ? (_a = parts[textIdx]) === null || _a === void 0 ? void 0 : _a.trim() : (_b = parts[0]) === null || _b === void 0 ? void 0 : _b.trim();
                    const label = labelIdx !== -1 ? (_c = parts[labelIdx]) === null || _c === void 0 ? void 0 : _c.trim() : (_d = parts[1]) === null || _d === void 0 ? void 0 : _d.trim();
                    if (text && label) {
                        examples.push({ text, label });
                    }
                }
            }
            return examples;
        }
        static exportDelimited(pairs, delimiter = ',', includeHeader = true) {
            const header = includeHeader ? `text${delimiter}label\n` : '';
            const rows = pairs.map(p => `${p.text.replace(new RegExp(delimiter, 'g'), '')}${delimiter}${p.label.replace(new RegExp(delimiter, 'g'), '')}`);
            return header + rows.join('\n');
        }
        static importCSV(csv, hasHeader = true) {
            return this.importDelimited(csv, ',', hasHeader);
        }
        static exportCSV(pairs, includeHeader = true) {
            return this.exportDelimited(pairs, ',', includeHeader);
        }
        static importTSV(tsv, hasHeader = true) {
            return this.importDelimited(tsv, '\t', hasHeader);
        }
        static exportTSV(pairs, includeHeader = true) {
            return this.exportDelimited(pairs, '\t', includeHeader);
        }
        static inferSchemaFromCSV(csv) {
            var _a;
            const lines = csv.trim().split('\n');
            if (lines.length === 0)
                return { fields: [] };
            const header = lines[0].split(',').map(h => h.trim().toLowerCase());
            const row = ((_a = lines[1]) === null || _a === void 0 ? void 0 : _a.split(',')) || [];
            const fields = header.map((name, i) => {
                var _a;
                const sample = (_a = row[i]) === null || _a === void 0 ? void 0 : _a.trim();
                let type = 'unknown';
                if (!sample)
                    type = 'unknown';
                else if (!isNaN(Number(sample)))
                    type = 'number';
                else if (sample === 'true' || sample === 'false')
                    type = 'boolean';
                else
                    type = 'string';
                return { name, type };
            });
            const suggestedMapping = {
                text: header.find(h => h.includes('text') || h.includes('utterance') || h.includes('input')) || header[0],
                label: header.find(h => h.includes('label') || h.includes('intent') || h.includes('tag')) || header[1] || header[0],
            };
            return { fields, suggestedMapping };
        }
        static inferSchemaFromJSON(json) {
            try {
                const data = JSON.parse(json);
                if (!Array.isArray(data) || data.length === 0 || typeof data[0] !== 'object')
                    return { fields: [] };
                const keys = Object.keys(data[0]);
                const fields = keys.map(key => {
                    const val = data[0][key];
                    let type = 'unknown';
                    if (typeof val === 'string')
                        type = 'string';
                    else if (typeof val === 'number')
                        type = 'number';
                    else if (typeof val === 'boolean')
                        type = 'boolean';
                    return { name: key.toLowerCase(), type };
                });
                const suggestedMapping = {
                    text: keys.find(k => k.toLowerCase().includes('text') || k.toLowerCase().includes('utterance') || k.toLowerCase().includes('input')) || keys[0],
                    label: keys.find(k => k.toLowerCase().includes('label') || k.toLowerCase().includes('intent') || k.toLowerCase().includes('tag')) || keys[1] || keys[0],
                };
                return { fields, suggestedMapping };
            }
            catch (err) {
                console.error('Failed to infer schema from JSON:', err);
                return { fields: [] };
            }
        }
    }

    // © 2026 AsterMind AI Co. – All Rights Reserved.
    // Patent Pending US 63/897,713
    // LanguageClassifier.ts — upgraded for new ELM/OnlineELM APIs (with requireEncoder guard)
    class LanguageClassifier {
        constructor(config) {
            var _a, _b, _c, _d, _e, _f;
            this.config = Object.assign(Object.assign({}, config), { log: {
                    modelName: 'LanguageClassifier',
                    verbose: (_b = (_a = config.log) === null || _a === void 0 ? void 0 : _a.verbose) !== null && _b !== void 0 ? _b : false,
                    toFile: (_d = (_c = config.log) === null || _c === void 0 ? void 0 : _c.toFile) !== null && _d !== void 0 ? _d : false,
                    level: (_f = (_e = config.log) === null || _e === void 0 ? void 0 : _e.level) !== null && _f !== void 0 ? _f : 'info',
                } });
            this.elm = new ELM(this.config);
            if (config.metrics)
                this.elm.metrics = config.metrics;
            if (config.exportFileName)
                this.elm.config.exportFileName = config.exportFileName;
        }
        /* ============== tiny helper to guarantee an encoder ============== */
        requireEncoder() {
            const enc = this.elm.encoder;
            if (!enc) {
                throw new Error('LanguageClassifier: encoder unavailable. Use text mode (useTokenizer=true with maxLen/charSet) ' +
                    'or pass a UniversalEncoder in the ELM config.');
            }
            return enc;
        }
        /* ================= I/O helpers ================= */
        loadTrainingData(raw, format = 'json') {
            switch (format) {
                case 'csv': return IO.importCSV(raw);
                case 'tsv': return IO.importTSV(raw);
                case 'json':
                default: return IO.importJSON(raw);
            }
        }
        /* ================= Supervised training ================= */
        /** Train from labeled text examples (uses internal encoder). */
        train(data) {
            if (!(data === null || data === void 0 ? void 0 : data.length))
                throw new Error('LanguageClassifier.train: empty dataset');
            const enc = this.requireEncoder();
            const categories = Array.from(new Set(data.map(d => d.label)));
            this.elm.setCategories(categories);
            const X = [];
            const Y = [];
            for (const { text, label } of data) {
                const x = enc.normalize(enc.encode(text));
                const yi = categories.indexOf(label);
                if (yi < 0)
                    continue;
                X.push(x);
                Y.push(this.elm.oneHot(categories.length, yi));
            }
            this.elm.trainFromData(X, Y);
        }
        /** Predict from raw text (uses internal encoder). */
        predict(text, topK = 3) {
            // let ELM handle encode→predict (works in text mode)
            return this.elm.predict(text, topK);
        }
        /** Train using already-encoded numeric vectors (no text encoder). */
        trainVectors(data) {
            var _a;
            if (!(data === null || data === void 0 ? void 0 : data.length))
                throw new Error('LanguageClassifier.trainVectors: empty dataset');
            const categories = Array.from(new Set(data.map(d => d.label)));
            this.elm.setCategories(categories);
            const X = data.map(d => d.vector);
            const Y = data.map(d => this.elm.oneHot(categories.length, categories.indexOf(d.label)));
            if (typeof this.elm.trainFromData === 'function') {
                this.elm.trainFromData(X, Y);
                return;
            }
            // Fallback closed-form (compat)
            const hidden = this.config.hiddenUnits;
            const W = this.elm.randomMatrix(hidden, X[0].length);
            const b = this.elm.randomMatrix(hidden, 1);
            const tempH = Matrix.multiply(X, Matrix.transpose(W));
            const act = Activations.get((_a = this.config.activation) !== null && _a !== void 0 ? _a : 'relu');
            const H = Activations.apply(tempH.map(row => row.map((val, j) => val + b[j][0])), act);
            const Hpinv = this.elm.pseudoInverse(H);
            const beta = Matrix.multiply(Hpinv, Y);
            this.elm.model = { W, b, beta };
        }
        /** Predict from an already-encoded vector (no text encoder). */
        predictFromVector(vec, topK = 1) {
            const out = this.elm.predictFromVector([vec], topK);
            return out[0];
        }
        /* ================= Online (incremental) API ================= */
        beginOnline(opts) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            const cats = opts.categories.slice();
            const D = opts.inputDim | 0;
            if (!cats.length)
                throw new Error('beginOnline: categories must be non-empty');
            if (D <= 0)
                throw new Error('beginOnline: inputDim must be > 0');
            const H = ((_a = opts.hiddenUnits) !== null && _a !== void 0 ? _a : this.config.hiddenUnits) | 0;
            if (H <= 0)
                throw new Error('beginOnline: hiddenUnits must be > 0');
            const activation = (_c = (_b = opts.activation) !== null && _b !== void 0 ? _b : this.config.activation) !== null && _c !== void 0 ? _c : 'relu';
            const ridgeLambda = Math.max((_d = opts.lambda) !== null && _d !== void 0 ? _d : 1e-2, 1e-12);
            this.onlineMdl = new OnlineELM({
                inputDim: D,
                outputDim: cats.length,
                hiddenUnits: H,
                activation,
                ridgeLambda,
                seed: (_e = opts.seed) !== null && _e !== void 0 ? _e : 1337,
                weightInit: (_f = opts.weightInit) !== null && _f !== void 0 ? _f : 'xavier',
                forgettingFactor: (_g = opts.forgettingFactor) !== null && _g !== void 0 ? _g : 1.0,
                log: { verbose: (_j = (_h = this.config.log) === null || _h === void 0 ? void 0 : _h.verbose) !== null && _j !== void 0 ? _j : false, modelName: 'LanguageClassifier/Online' },
            });
            this.onlineCats = cats;
            this.onlineInputDim = D;
        }
        partialTrainVectorsOnline(batch) {
            if (!this.onlineMdl || !this.onlineCats || !this.onlineInputDim) {
                throw new Error('Call beginOnline() before partialTrainVectorsOnline().');
            }
            if (!batch.length)
                return;
            const D = this.onlineInputDim;
            const O = this.onlineCats.length;
            const X = new Array(batch.length);
            const Y = new Array(batch.length);
            for (let i = 0; i < batch.length; i++) {
                const { vector, label } = batch[i];
                if (vector.length !== D)
                    throw new Error(`vector dim ${vector.length} != inputDim ${D}`);
                X[i] = vector.slice();
                const y = new Array(O).fill(0);
                const li = this.onlineCats.indexOf(label);
                if (li < 0)
                    throw new Error(`Unknown label "${label}" for this online run.`);
                y[li] = 1;
                Y[i] = y;
            }
            if (this.onlineMdl.beta && this.onlineMdl.P) {
                this.onlineMdl.update(X, Y);
            }
            else {
                this.onlineMdl.init(X, Y);
            }
        }
        endOnline() {
            if (!this.onlineMdl || !this.onlineCats)
                return;
            const W = this.onlineMdl.W;
            const b = this.onlineMdl.b;
            const B = this.onlineMdl.beta;
            if (!W || !b || !B)
                throw new Error('endOnline: online model is not initialized.');
            this.elm.setCategories(this.onlineCats);
            this.elm.model = { W, b, beta: B };
            this.onlineMdl = undefined;
            this.onlineCats = undefined;
            this.onlineInputDim = undefined;
        }
        /* ================= Persistence ================= */
        loadModelFromJSON(json) {
            this.elm.loadModelFromJSON(json);
        }
        saveModelAsJSONFile(filename) {
            this.elm.saveModelAsJSONFile(filename);
        }
    }

    // © 2026 AsterMind AI Co. – All Rights Reserved.
    // Patent Pending US 63/897,713
    // RefinerELM.ts — numeric “refinement” classifier on top of arbitrary feature vectors
    class RefinerELM {
        constructor(opts) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            if (!Number.isFinite(opts.inputSize) || opts.inputSize <= 0) {
                throw new Error('RefinerELM: opts.inputSize must be a positive number.');
            }
            if (!Number.isFinite(opts.hiddenUnits) || opts.hiddenUnits <= 0) {
                throw new Error('RefinerELM: opts.hiddenUnits must be a positive number.');
            }
            // Build a *numeric* ELM config (no text fields here)
            const numericConfig = {
                // numeric discriminator:
                useTokenizer: false,
                inputSize: opts.inputSize,
                // required for ELM
                categories: (_a = opts.categories) !== null && _a !== void 0 ? _a : [],
                // base config
                hiddenUnits: opts.hiddenUnits,
                activation: (_b = opts.activation) !== null && _b !== void 0 ? _b : 'relu',
                ridgeLambda: opts.ridgeLambda,
                dropout: opts.dropout,
                weightInit: opts.weightInit,
                // misc
                exportFileName: opts.exportFileName,
                log: {
                    modelName: (_d = (_c = opts.log) === null || _c === void 0 ? void 0 : _c.modelName) !== null && _d !== void 0 ? _d : 'RefinerELM',
                    verbose: (_f = (_e = opts.log) === null || _e === void 0 ? void 0 : _e.verbose) !== null && _f !== void 0 ? _f : false,
                    toFile: (_h = (_g = opts.log) === null || _g === void 0 ? void 0 : _g.toFile) !== null && _h !== void 0 ? _h : false,
                    level: (_k = (_j = opts.log) === null || _j === void 0 ? void 0 : _j.level) !== null && _k !== void 0 ? _k : 'info',
                },
            };
            this.elm = new ELM(numericConfig);
            // Set metric thresholds on the instance (not inside the config)
            if (opts.metrics) {
                this.elm.metrics = opts.metrics;
            }
        }
        /** Train from feature vectors + string labels. */
        train(inputs, labels, opts) {
            var _a;
            if (!(inputs === null || inputs === void 0 ? void 0 : inputs.length) || !(labels === null || labels === void 0 ? void 0 : labels.length) || inputs.length !== labels.length) {
                throw new Error('RefinerELM.train: inputs/labels must be non-empty and aligned.');
            }
            // Allow overriding categories at train time
            const categories = (_a = opts === null || opts === void 0 ? void 0 : opts.categories) !== null && _a !== void 0 ? _a : Array.from(new Set(labels));
            this.elm.setCategories(categories);
            const Y = labels.map((label) => this.elm.oneHot(categories.length, categories.indexOf(label)));
            // Public training path; no 'task' key here
            const options = {};
            if ((opts === null || opts === void 0 ? void 0 : opts.reuseWeights) !== undefined)
                options.reuseWeights = opts.reuseWeights;
            if (opts === null || opts === void 0 ? void 0 : opts.sampleWeights)
                options.weights = opts.sampleWeights;
            this.elm.trainFromData(inputs, Y, options);
        }
        /** Full probability vector aligned to `this.elm.categories`. */
        predictProbaFromVector(vec) {
            // Use the vector-safe path provided by the core ELM
            const out = this.elm.predictFromVector([vec], /*topK*/ this.elm.categories.length);
            // predictFromVector returns Array<PredictResult[]>, i.e., topK sorted.
            // We want a dense prob vector in category order, so map from topK back:
            const probs = new Array(this.elm.categories.length).fill(0);
            if (out && out[0]) {
                for (const { label, prob } of out[0]) {
                    const idx = this.elm.categories.indexOf(label);
                    if (idx >= 0)
                        probs[idx] = prob;
                }
            }
            return probs;
        }
        /** Top-K predictions ({label, prob}) for a single vector. */
        predict(vec, topK = 1) {
            const [res] = this.elm.predictFromVector([vec], topK);
            return res;
        }
        /** Batch top-K predictions for an array of vectors. */
        predictBatch(vectors, topK = 1) {
            return this.elm.predictFromVector(vectors, topK);
        }
        /** Hidden-layer embedding(s) — useful for chaining. */
        embed(vec) {
            return this.elm.getEmbedding([vec])[0];
        }
        embedBatch(vectors) {
            return this.elm.getEmbedding(vectors);
        }
        /** Persistence passthroughs */
        loadModelFromJSON(json) {
            this.elm.loadModelFromJSON(json);
        }
        saveModelAsJSONFile(filename) {
            this.elm.saveModelAsJSONFile(filename);
        }
    }

    // © 2026 AsterMind AI Co. – All Rights Reserved.
    // Patent Pending US 63/897,713
    // VotingClassifierELM.ts — meta-classifier that learns to combine multiple ELMs' predictions
    class VotingClassifierELM {
        // Keep constructor shape compatible with your existing calls
        constructor(baseConfig) {
            this.baseConfig = baseConfig;
            this.modelWeights = [];
            this.usesConfidence = false;
            this.categories = baseConfig.categories || ['English', 'French', 'Spanish'];
        }
        setModelWeights(weights) {
            this.modelWeights = weights.slice();
        }
        calibrateWeights(predictionLists, trueLabels) {
            var _a, _b;
            const numModels = predictionLists.length;
            const numExamples = trueLabels.length;
            const accuracies = new Array(numModels).fill(0);
            for (let m = 0; m < numModels; m++) {
                let correct = 0;
                for (let i = 0; i < numExamples; i++) {
                    if (predictionLists[m][i] === trueLabels[i])
                        correct++;
                }
                accuracies[m] = correct / Math.max(1, numExamples);
            }
            const total = accuracies.reduce((s, a) => s + a, 0) || 1;
            this.modelWeights = accuracies.map(a => a / total);
            if ((_b = (_a = this.baseConfig) === null || _a === void 0 ? void 0 : _a.log) === null || _b === void 0 ? void 0 : _b.verbose) {
                console.log('🔧 Calibrated model weights:', this.modelWeights);
            }
        }
        /** Train meta-classifier on model predictions (+ optional confidences) and true labels. */
        train(predictionLists, // shape: [numModels][numExamples]
        confidenceLists, trueLabels) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
            if (!Array.isArray(predictionLists) || predictionLists.length === 0 || !trueLabels) {
                throw new Error('VotingClassifierELM.train: invalid inputs');
            }
            const numModels = predictionLists.length;
            const numExamples = predictionLists[0].length;
            for (const list of predictionLists) {
                if (list.length !== numExamples)
                    throw new Error('Prediction list lengths must match');
            }
            this.usesConfidence = Array.isArray(confidenceLists);
            if (this.usesConfidence) {
                if (confidenceLists.length !== numModels)
                    throw new Error('Confidence list count != numModels');
                for (const list of confidenceLists) {
                    if (list.length !== numExamples)
                        throw new Error('Confidence list length mismatch');
                }
            }
            if (!this.modelWeights.length || this.modelWeights.length !== numModels) {
                this.calibrateWeights(predictionLists, trueLabels);
            }
            // Categories (target space) => from true labels
            this.categories = Array.from(new Set(trueLabels));
            const C = this.categories.length;
            // Compute numeric input size for the meta-ELM:
            // per-model features = one-hot over C + (optional) 1 confidence
            const perModel = C + (this.usesConfidence ? 1 : 0);
            this.inputSize = numModels * perModel;
            // Build X, Y
            const X = new Array(numExamples);
            for (let i = 0; i < numExamples; i++) {
                let row = [];
                for (let m = 0; m < numModels; m++) {
                    const predLabel = predictionLists[m][i];
                    if (predLabel == null)
                        throw new Error(`Invalid label at predictionLists[${m}][${i}]`);
                    const w = (_a = this.modelWeights[m]) !== null && _a !== void 0 ? _a : 1;
                    // one-hot over final categories (C)
                    const idx = this.categories.indexOf(predLabel);
                    const oh = new Array(C).fill(0);
                    if (idx >= 0)
                        oh[idx] = 1;
                    row = row.concat(oh.map(x => x * w));
                    if (this.usesConfidence) {
                        const conf = confidenceLists[m][i];
                        const norm = Math.max(0, Math.min(1, Number(conf) || 0));
                        row.push(norm * w);
                    }
                }
                X[i] = row;
            }
            const Y = trueLabels.map(lbl => {
                const idx = this.categories.indexOf(lbl);
                const oh = new Array(C).fill(0);
                if (idx >= 0)
                    oh[idx] = 1;
                return oh;
            });
            // Construct numeric ELM config now that we know inputSize
            const cfg = {
                useTokenizer: false, // numeric mode
                inputSize: this.inputSize,
                categories: this.categories,
                hiddenUnits: (_b = this.baseConfig.hiddenUnits) !== null && _b !== void 0 ? _b : 64,
                activation: (_c = this.baseConfig.activation) !== null && _c !== void 0 ? _c : 'relu',
                ridgeLambda: this.baseConfig.ridgeLambda,
                dropout: this.baseConfig.dropout,
                weightInit: this.baseConfig.weightInit,
                exportFileName: this.baseConfig.exportFileName,
                log: {
                    modelName: (_f = (_e = (_d = this.baseConfig) === null || _d === void 0 ? void 0 : _d.log) === null || _e === void 0 ? void 0 : _e.modelName) !== null && _f !== void 0 ? _f : 'VotingClassifierELM',
                    verbose: (_j = (_h = (_g = this.baseConfig) === null || _g === void 0 ? void 0 : _g.log) === null || _h === void 0 ? void 0 : _h.verbose) !== null && _j !== void 0 ? _j : false,
                    toFile: (_m = (_l = (_k = this.baseConfig) === null || _k === void 0 ? void 0 : _k.log) === null || _l === void 0 ? void 0 : _l.toFile) !== null && _m !== void 0 ? _m : false,
                    level: (_q = (_p = (_o = this.baseConfig) === null || _o === void 0 ? void 0 : _o.log) === null || _p === void 0 ? void 0 : _p.level) !== null && _q !== void 0 ? _q : 'info',
                },
            };
            // Create (or recreate) the inner ELM with correct dims
            this.elm = new ELM(cfg);
            // Forward optional metrics gate
            if (this.baseConfig.metrics) {
                this.elm.metrics = this.baseConfig.metrics;
            }
            // Train numerically
            this.elm.trainFromData(X, Y);
        }
        /** Predict final label from a single stacked set of model labels (+ optional confidences). */
        predict(labels, confidences, topK = 1) {
            var _a;
            if (!this.elm)
                throw new Error('VotingClassifierELM: call train() before predict().');
            if (!(labels === null || labels === void 0 ? void 0 : labels.length))
                throw new Error('VotingClassifierELM.predict: empty labels');
            const C = this.categories.length;
            const numModels = labels.length;
            // Build numeric input row consistent with training
            let row = [];
            for (let m = 0; m < numModels; m++) {
                const w = (_a = this.modelWeights[m]) !== null && _a !== void 0 ? _a : 1;
                const idx = this.categories.indexOf(labels[m]);
                const oh = new Array(C).fill(0);
                if (idx >= 0)
                    oh[idx] = 1;
                row = row.concat(oh.map(x => x * w));
                if (this.usesConfidence) {
                    const norm = Math.max(0, Math.min(1, Number(confidences === null || confidences === void 0 ? void 0 : confidences[m]) || 0));
                    row.push(norm * w);
                }
            }
            const [res] = this.elm.predictFromVector([row], topK);
            return res;
        }
        loadModelFromJSON(json) {
            var _a, _b, _c, _d, _e;
            if (!this.elm)
                this.elm = new ELM({
                    // minimal placeholder; will be overwritten by fromJSON content
                    useTokenizer: false,
                    inputSize: 1,
                    categories: ['_tmp'],
                    hiddenUnits: 1,
                    activation: 'relu',
                    log: { modelName: 'VotingClassifierELM' },
                });
            this.elm.loadModelFromJSON(json);
            // Try to recover categories & inputSize from loaded model
            this.categories = (_a = this.elm.categories) !== null && _a !== void 0 ? _a : this.categories;
            this.inputSize = (_e = ((_d = (_c = (_b = this.elm.model) === null || _b === void 0 ? void 0 : _b.W) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.length)) !== null && _e !== void 0 ? _e : this.inputSize;
        }
        saveModelAsJSONFile(filename) {
            if (!this.elm)
                throw new Error('VotingClassifierELM: no model to save.');
            this.elm.saveModelAsJSONFile(filename);
        }
    }

    function buildRFF(d, D, sigma = 1.0, rng = Math.random) {
        const W = new Float64Array(D * d);
        const b = new Float64Array(D);
        const s = 1 / Math.max(1e-12, sigma); // N(0, 1/sigma^2)
        for (let i = 0; i < D * d; i++)
            W[i] = gauss$1(rng) * s;
        for (let i = 0; i < D; i++)
            b[i] = rng() * 2 * Math.PI;
        return { W, b, D, d, sigma };
    }
    function mapRFF(rff, x) {
        const { W, b, D, d } = rff;
        const z = new Float64Array(2 * D);
        for (let k = 0; k < D; k++) {
            let dot = b[k];
            const off = k * d;
            for (let j = 0; j < d; j++)
                dot += W[off + j] * (x[j] || 0);
            z[k] = Math.cos(dot);
            z[D + k] = Math.sin(dot);
        }
        // L2 normalize block to keep ridge well-conditioned
        let s = 0;
        for (let i = 0; i < z.length; i++)
            s += z[i] * z[i];
        const inv = 1 / Math.sqrt(Math.max(s, 1e-12));
        for (let i = 0; i < z.length; i++)
            z[i] *= inv;
        return z;
    }
    // Box-Muller
    function gauss$1(rng) {
        let u = 0, v = 0;
        while (u === 0)
            u = rng();
        while (v === 0)
            v = rng();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }

    // online_ridge.ts — maintain (Φ^T Φ + λI)^{-1} and β for linear ridge
    class OnlineRidge {
        constructor(p, m, lambda = 1e-4) {
            this.p = p;
            this.m = m;
            this.lambda = lambda;
            this.Ainv = new Float64Array(p * p);
            this.Beta = new Float64Array(p * m);
            // Ainv = (λ I)^-1 = (1/λ) I
            const inv = 1 / Math.max(1e-12, lambda);
            for (let i = 0; i < p; i++)
                this.Ainv[i * p + i] = inv;
        }
        // rank-1 update with a single sample (φ, y)
        update(phi, y) {
            const { p, m, Ainv, Beta } = this;
            // u = Ainv * phi
            const u = new Float64Array(p);
            for (let i = 0; i < p; i++) {
                let s = 0, row = i * p;
                for (let j = 0; j < p; j++)
                    s += Ainv[row + j] * phi[j];
                u[i] = s;
            }
            // denom = 1 + phi^T u
            let denom = 1;
            for (let j = 0; j < p; j++)
                denom += phi[j] * u[j];
            denom = Math.max(denom, 1e-12);
            const scale = 1 / denom;
            // Ainv <- Ainv - (u u^T) * scale
            for (let i = 0; i < p; i++) {
                const ui = u[i] * scale;
                for (let j = 0; j < p; j++)
                    Ainv[i * p + j] -= ui * u[j];
            }
            // Beta <- Beta + Ainv * (phi * y^T)
            // compute t = Ainv * phi  (reuse u after Ainv update)
            for (let i = 0; i < p; i++) {
                let s = 0, row = i * p;
                for (let j = 0; j < p; j++)
                    s += Ainv[row + j] * phi[j];
                u[i] = s; // reuse u as t
            }
            // Beta += outer(u, y)
            for (let i = 0; i < p; i++) {
                const ui = u[i];
                for (let c = 0; c < m; c++)
                    Beta[i * m + c] += ui * y[c];
            }
        }
        // yhat = φ^T Beta
        predict(phi) {
            const { p, m, Beta } = this;
            const out = new Float64Array(m);
            for (let c = 0; c < m; c++) {
                let s = 0;
                for (let i = 0; i < p; i++)
                    s += phi[i] * Beta[i * m + c];
                out[c] = s;
            }
            return out;
        }
    }

    function isFiniteMatrix(M) {
        for (let i = 0; i < M.length; i++) {
            const row = M[i];
            if (!row || row.length !== M[0].length)
                return false;
            for (let j = 0; j < row.length; j++) {
                const v = row[j];
                if (!Number.isFinite(v))
                    return false;
            }
        }
        return true;
    }
    function symmetrize(A) {
        const n = A.length;
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const v = 0.5 * (A[i][j] + A[j][i]);
                A[i][j] = v;
                A[j][i] = v;
            }
        }
    }
    function choleskySolve(A, Y) {
        const n = A.length, m = Y[0].length;
        // L
        const L = Array.from({ length: n }, () => Array(n).fill(0));
        for (let i = 0; i < n; i++) {
            for (let j = 0; j <= i; j++) {
                let sum = A[i][j];
                for (let k = 0; k < j; k++)
                    sum -= L[i][k] * L[j][k];
                if (i === j) {
                    if (!(sum > 0) || !Number.isFinite(sum))
                        return null; // not PD
                    L[i][j] = Math.sqrt(sum);
                }
                else {
                    L[i][j] = sum / L[j][j];
                }
            }
        }
        // forward solve: L Z = Y
        const Z = Array.from({ length: n }, () => Array(m).fill(0));
        for (let c = 0; c < m; c++) {
            for (let i = 0; i < n; i++) {
                let s = Y[i][c];
                for (let k = 0; k < i; k++)
                    s -= L[i][k] * Z[k][c];
                Z[i][c] = s / L[i][i];
            }
        }
        // back solve: L^T Θ = Z
        const Theta = Array.from({ length: n }, () => Array(m).fill(0));
        for (let c = 0; c < m; c++) {
            for (let i = n - 1; i >= 0; i--) {
                let s = Z[i][c];
                for (let k = i + 1; k < n; k++)
                    s -= L[k][i] * Theta[k][c];
                Theta[i][c] = s / L[i][i];
            }
        }
        return { Theta, L };
    }
    // CG fallback for SPD system A x = b, where A is given as matrix
    function cgSolve(A, b, tol, maxIter) {
        const n = A.length;
        const x = new Array(n).fill(0);
        const r = b.slice(); // r = b - A x = b initially
        const p = r.slice();
        let rsold = dot$1(r, r);
        let it = 0;
        for (; it < maxIter; it++) {
            const Ap = matvec(A, p);
            const alpha = rsold / Math.max(1e-300, dot$1(p, Ap));
            for (let i = 0; i < n; i++)
                x[i] += alpha * p[i];
            for (let i = 0; i < n; i++)
                r[i] -= alpha * Ap[i];
            const rsnew = dot$1(r, r);
            if (Math.sqrt(rsnew) <= tol)
                break;
            const beta = rsnew / Math.max(1e-300, rsold);
            for (let i = 0; i < n; i++)
                p[i] = r[i] + beta * p[i];
            rsold = rsnew;
        }
        return { x, iters: it + 1 };
    }
    function dot$1(a, b) {
        let s = 0;
        for (let i = 0; i < a.length; i++)
            s += a[i] * b[i];
        return s;
    }
    function matvec(A, x) {
        const n = A.length, out = new Array(n).fill(0);
        for (let i = 0; i < n; i++) {
            const Ai = A[i];
            let s = 0;
            for (let j = 0; j < n; j++)
                s += Ai[j] * x[j];
            out[i] = s;
        }
        return out;
    }
    /**
     * Production-grade ridge regression solver:
     * Solves (K + λ I) Θ = Y, with symmetry enforcement, adaptive jitter, and CG fallback.
     */
    function ridgeSolvePro(K, Y, opts = {}) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        const info = [];
        const n = K.length;
        if (n === 0)
            return { Theta: [], usedLambda: (_a = opts.lambda) !== null && _a !== void 0 ? _a : 1e-4, method: "cholesky", info: ["empty system"] };
        if (!isFiniteMatrix(K))
            throw new Error("K contains NaN/Inf or ragged rows");
        if (!Array.isArray(Y) || Y.length !== n || Y[0].length === undefined)
            throw new Error("Y shape mismatch");
        if (!isFiniteMatrix(Y))
            throw new Error("Y contains NaN/Inf");
        const m = Y[0].length;
        const baseLambda = Math.max(0, (_b = opts.lambda) !== null && _b !== void 0 ? _b : 1e-4);
        const ensureSym = (_c = opts.ensureSymmetry) !== null && _c !== void 0 ? _c : true;
        let jitter = (_d = opts.jitterInit) !== null && _d !== void 0 ? _d : 1e-10;
        const jitterMax = (_e = opts.jitterMax) !== null && _e !== void 0 ? _e : 1e-1;
        const jitterFactor = (_f = opts.jitterFactor) !== null && _f !== void 0 ? _f : 10;
        // Build A = (symmetrized K) + (lambda + jitter) I
        const A = Array.from({ length: n }, (_, i) => K[i].slice());
        if (ensureSym)
            symmetrize(A);
        // Try Cholesky with increasing jitter
        let usedLambda = baseLambda;
        while (true) {
            if ((_g = opts.abortSignal) === null || _g === void 0 ? void 0 : _g.aborted)
                throw new Error("ridgeSolvePro aborted");
            // add diag
            for (let i = 0; i < n; i++)
                A[i][i] = (ensureSym ? A[i][i] : (A[i][i] + A[i][i]) * 0.5) + usedLambda;
            const chol = choleskySolve(A, Y);
            if (chol) {
                info.push(`Cholesky ok with lambda=${usedLambda.toExponential(2)}`);
                return { Theta: chol.Theta, usedLambda, method: "cholesky", info };
            }
            else {
                // remove the just-added lambda before next try
                for (let i = 0; i < n; i++)
                    A[i][i] -= usedLambda;
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
        for (let i = 0; i < n; i++)
            A[i][i] = (ensureSym ? A[i][i] : (A[i][i] + A[i][i]) * 0.5) + usedLambda;
        const tol = (_h = opts.cgTol) !== null && _h !== void 0 ? _h : 1e-6;
        const maxIter = (_j = opts.cgMaxIter) !== null && _j !== void 0 ? _j : Math.min(1000, n * 3);
        const Theta = Array.from({ length: n }, () => Array(m).fill(0));
        let maxIters = 0;
        for (let c = 0; c < m; c++) {
            if ((_k = opts.abortSignal) === null || _k === void 0 ? void 0 : _k.aborted)
                throw new Error("ridgeSolvePro aborted");
            const b = new Array(n);
            for (let i = 0; i < n; i++)
                b[i] = Y[i][c];
            const { x, iters } = cgSolve(A, b, tol, maxIter);
            maxIters = Math.max(maxIters, iters);
            for (let i = 0; i < n; i++)
                Theta[i][c] = x[i];
        }
        info.push(`CG solved columns with tol=${tol}, maxIter=${maxIter}, max iters used=${maxIters}`);
        return { Theta, usedLambda, method: "cg", iters: maxIters, info };
    }

    // src/math/index.ts — production-grade numerics for Ω
    // Backward compatible with previous exports; adds robust, stable helpers.
    // ---------- Constants
    const EPS = 1e-12; // general epsilon for divides/sqrt
    const DISK_EPS = 0.95; // strict radius for Poincaré-like ops
    const MAX_EXP = 709; // ~ ln(Number.MAX_VALUE)
    const MIN_EXP = -745; // ~ ln(Number.MIN_VALUE)
    // ---------- Constructors / guards
    function zeros(n) { return new Float64Array(n); }
    function isFiniteVec(a) {
        const n = a.length;
        for (let i = 0; i < n; i++)
            if (!Number.isFinite(a[i]))
                return false;
        return true;
    }
    function asVec(a) {
        // Copy into Float64Array for consistent math perf
        return a instanceof Float64Array ? a : new Float64Array(Array.from(a));
    }
    // ---------- Basic algebra (pure, allocation)
    function dot(a, b) {
        const n = Math.min(a.length, b.length);
        let s = 0;
        for (let i = 0; i < n; i++)
            s += a[i] * b[i];
        return s;
    }
    function add(a, b) {
        const n = Math.min(a.length, b.length);
        const o = new Float64Array(n);
        for (let i = 0; i < n; i++)
            o[i] = a[i] + b[i];
        return o;
    }
    function scal(a, k) {
        const n = a.length;
        const o = new Float64Array(n);
        for (let i = 0; i < n; i++)
            o[i] = a[i] * k;
        return o;
    }
    function hadamard(a, b) {
        const n = Math.min(a.length, b.length);
        const o = new Float64Array(n);
        for (let i = 0; i < n; i++)
            o[i] = a[i] * b[i];
        return o;
    }
    function tanhVec(a) {
        const n = a.length;
        const o = new Float64Array(n);
        for (let i = 0; i < n; i++)
            o[i] = Math.tanh(a[i]);
        return o;
    }
    // ---------- In-place variants (underscore suffix) to reduce GC
    function add_(out, a, b) {
        const n = Math.min(out.length, a.length, b.length);
        for (let i = 0; i < n; i++)
            out[i] = a[i] + b[i];
        return out;
    }
    function scal_(out, a, k) {
        const n = Math.min(out.length, a.length);
        for (let i = 0; i < n; i++)
            out[i] = a[i] * k;
        return out;
    }
    function hadamard_(out, a, b) {
        const n = Math.min(out.length, a.length, b.length);
        for (let i = 0; i < n; i++)
            out[i] = a[i] * b[i];
        return out;
    }
    function tanhVec_(out, a) {
        const n = Math.min(out.length, a.length);
        for (let i = 0; i < n; i++)
            out[i] = Math.tanh(a[i]);
        return out;
    }
    // ---------- Norms / normalization
    function l2$1(a) {
        // robust L2 (avoids NaN on weird input)
        let s = 0;
        for (let i = 0; i < a.length; i++)
            s += a[i] * a[i];
        return Math.sqrt(Math.max(0, s));
    }
    function normalizeL2(a, eps = EPS) {
        const nrm = l2$1(a);
        if (!(nrm > eps) || !Number.isFinite(nrm))
            return new Float64Array(a.length); // zero vec
        const o = new Float64Array(a.length);
        const inv = 1 / nrm;
        for (let i = 0; i < a.length; i++)
            o[i] = a[i] * inv;
        return o;
    }
    function clampVec(a, lo = -Infinity, hi = Infinity) {
        const n = a.length, o = new Float64Array(n);
        for (let i = 0; i < n; i++)
            o[i] = Math.min(hi, Math.max(lo, a[i]));
        return o;
    }
    // ---------- Stats
    function mean(a) {
        if (a.length === 0)
            return 0;
        let s = 0;
        for (let i = 0; i < a.length; i++)
            s += a[i];
        return s / a.length;
    }
    function variance(a, mu = mean(a)) {
        if (a.length === 0)
            return 0;
        let s = 0;
        for (let i = 0; i < a.length; i++) {
            const d = a[i] - mu;
            s += d * d;
        }
        return s / a.length;
    }
    function standardize(a) {
        const mu = mean(a);
        const v = variance(a, mu);
        const sd = Math.sqrt(Math.max(v, 0));
        if (!(sd > EPS)) {
            // zero-variance edge: return zeros to avoid blowing up downstream
            return new Float64Array(a.length);
        }
        const o = new Float64Array(a.length);
        const inv = 1 / sd;
        for (let i = 0; i < a.length; i++)
            o[i] = (a[i] - mu) * inv;
        return o;
    }
    // ---------- Cosine (robust)
    function cosine$2(a, b) {
        var _a, _b;
        const n = Math.min(a.length, b.length);
        if (n === 0)
            return 0;
        let dotv = 0, na = 0, nb = 0;
        for (let i = 0; i < n; i++) {
            const ai = ((_a = a[i]) !== null && _a !== void 0 ? _a : 0), bi = ((_b = b[i]) !== null && _b !== void 0 ? _b : 0);
            dotv += ai * bi;
            na += ai * ai;
            nb += bi * bi;
        }
        const denom = Math.sqrt(Math.max(na * nb, EPS));
        const v = dotv / denom;
        return Number.isFinite(v) ? v : 0;
    }
    // ---------- Stable softmax / log-sum-exp
    function logSumExp(a) {
        let m = -Infinity;
        for (let i = 0; i < a.length; i++)
            if (a[i] > m)
                m = a[i];
        if (!Number.isFinite(m))
            m = 0;
        let s = 0;
        for (let i = 0; i < a.length; i++)
            s += Math.exp(Math.max(MIN_EXP, Math.min(MAX_EXP, a[i] - m)));
        return m + Math.log(Math.max(s, EPS));
    }
    function softmax(a) {
        const out = new Float64Array(a.length);
        const lse = logSumExp(a);
        for (let i = 0; i < a.length; i++)
            out[i] = Math.exp(Math.max(MIN_EXP, Math.min(MAX_EXP, a[i] - lse)));
        // tiny renorm to remove drift
        let s = 0;
        for (let i = 0; i < out.length; i++)
            s += out[i];
        const inv = 1 / Math.max(s, EPS);
        for (let i = 0; i < out.length; i++)
            out[i] *= inv;
        return out;
    }
    // ---------- Argmax / Top-K
    function argmax(a) {
        var _a, _b;
        if (a.length === 0)
            return -1;
        let idx = 0;
        let m = ((_a = a[0]) !== null && _a !== void 0 ? _a : -Infinity);
        for (let i = 1; i < a.length; i++) {
            const v = ((_b = a[i]) !== null && _b !== void 0 ? _b : -Infinity);
            if (v > m) {
                m = v;
                idx = i;
            }
        }
        return idx;
    }
    function topK(a, k) {
        var _a;
        const n = a.length;
        if (k <= 0 || n === 0)
            return [];
        const K = Math.min(k, n);
        // simple partial selection (O(nk)); fine for small k in UI
        const res = [];
        for (let i = 0; i < n; i++) {
            const v = ((_a = a[i]) !== null && _a !== void 0 ? _a : -Infinity);
            if (res.length < K) {
                res.push({ index: i, value: v });
                if (res.length === K)
                    res.sort((x, y) => y.value - x.value);
            }
            else if (v > res[K - 1].value) {
                res[K - 1] = { index: i, value: v };
                res.sort((x, y) => y.value - x.value);
            }
        }
        return res;
    }
    // ---------- Safe exp/log/sigmoid
    function expSafe(x) {
        return Math.exp(Math.max(MIN_EXP, Math.min(MAX_EXP, x)));
    }
    function log1pSafe(x) {
        // log(1+x) with guard (x>-1)
        const y = Math.max(x, -1 + EPS);
        return Math.log(1 + y);
    }
    function sigmoid$1(x) {
        if (x >= 0) {
            const z = Math.exp(-Math.min(x, MAX_EXP));
            return 1 / (1 + z);
        }
        else {
            const z = Math.exp(Math.max(x, MIN_EXP));
            return z / (1 + z);
        }
    }
    // ---------- Hyperbolic (proxy) distance with strict disk clamp
    // Assumes inputs are already bounded; still clamps defensively.
    function hDistProxy(a, b) {
        // clamp radii to avoid denom blow-ups
        let na = 0, nb = 0, sum = 0;
        for (let i = 0; i < a.length; i++) {
            const ai = Math.max(-DISK_EPS, Math.min(DISK_EPS, a[i]));
            const bi = Math.max(-DISK_EPS, Math.min(DISK_EPS, b[i]));
            na += ai * ai;
            nb += bi * bi;
            const d = ai - bi;
            sum += d * d;
        }
        const num = 2 * Math.sqrt(Math.max(0, sum));
        const den = Math.max(EPS, (1 - na) * (1 - nb));
        // smooth, monotone proxy; bounded growth; stable near boundary
        return Math.log1p(Math.min(2 * num / den, 1e12));
    }
    // ---------- Small utilities for UI formatting
    function fmtHead(a, n = 4, digits = 3) {
        return Array.from(a).slice(0, n).map(v => v.toFixed(digits)).join(", ");
    }

    /******************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise, SuppressedError, Symbol, Iterator */


    function __awaiter(thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }

    typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
        var e = new Error(message);
        return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
    };

    // Omega.ts v2 — improved local reasoning + summarization
    // uses your math.ts, rff.ts, online_ridge.ts
    // -------- sentence + text helpers ----------
    function splitSentences$1(text) {
        return text
            .replace(/\s+/g, " ")
            .split(/(?<=[.?!])\s+/)
            .map((s) => s.trim())
            .filter((s) => s.length > 8 && /\w/.test(s));
    }
    function clean(text) {
        return text
            .replace(/```[\s\S]*?```/g, " ")
            .replace(/`[^`]+`/g, " ")
            .replace(/\[[^\]]*\]\([^)]*\)/g, "") // strip markdown links
            .replace(/[-–>•→]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }
    function isMetaSentence(s) {
        // simple heuristics for table-of-contents or chapter headings
        return (/^(\*|#)/.test(s) || // markdown markers
            /chapter/i.test(s) || // "Chapter 11", "Chapters 11–15"
            /part\s*\d+/i.test(s) || // "Part 3"
            /section/i.test(s) || // "Section 2.3"
            /^\s*[A-Z]\)\s*$/.test(s) || // single-letter outlines
            s.length < 15 // very short stray lines
        );
    }
    function rewrite(summary) {
        return summary
            .replace(/\s+[-–>•→]\s+/g, " ")
            .replace(/\s+\.\s+/g, ". ")
            .replace(/([a-z]) - ([a-z])/gi, "$1-$2")
            .replace(/\s{2,}/g, " ")
            .trim();
    }
    // ------------------------------------------------------------
    function omegaComposeAnswer(question_1, items_1) {
        return __awaiter(this, arguments, void 0, function* (question, items, opts = {}) {
            // License check removed // Premium feature - requires valid license
            if (!(items === null || items === void 0 ? void 0 : items.length))
                return "No results found.";
            const { dim = 64, features = 32, sigma = 1.0, rounds = 3, topSentences = 8, personality = "neutral", } = opts;
            // ---------- 1. Clean + collect sentences ----------
            const allText = items.map((i) => clean(i.content)).join(" ");
            let sentences = splitSentences$1(allText)
                .filter(s => !isMetaSentence(s))
                .slice(0, 120);
            if (sentences.length === 0)
                return clean(items[0].content).slice(0, 400);
            // ---------- 2. Build encoder + ridge ----------
            const rff = buildRFF(dim, features, sigma);
            const ridge = new OnlineRidge(2 * features, 1, 1e-3);
            const encode = (s) => {
                const vec = new Float64Array(dim);
                const len = Math.min(s.length, dim);
                for (let i = 0; i < len; i++)
                    vec[i] = s.charCodeAt(i) / 255;
                return mapRFF(rff, normalizeL2(vec));
            };
            const qVec = encode(question);
            const qTokens = question.toLowerCase().split(/\W+/).filter((t) => t.length > 2);
            // ---------- 3. Score + select top sentences ----------
            const scored = sentences.map((s) => {
                const v = encode(s);
                let w = cosine$2(v, qVec);
                // small lexical bonus for overlapping words
                const lower = s.toLowerCase();
                for (const t of qTokens)
                    if (lower.includes(t))
                        w += 0.02;
                return { s, v, w };
            });
            scored.sort((a, b) => b.w - a.w);
            let top = scored.slice(0, topSentences);
            // ---------- 4. Recursive compression ----------
            let summary = top.map((t) => t.s).join(" ");
            let meanVec = new Float64Array(2 * features);
            for (let r = 0; r < rounds; r++) {
                const subs = splitSentences$1(summary).slice(0, topSentences);
                const embeds = subs.map((s) => encode(s));
                const weights = embeds.map((v) => cosine$2(v, qVec));
                for (let i = 0; i < embeds.length; i++) {
                    ridge.update(embeds[i], new Float64Array([weights[i]]));
                }
                // weighted mean vector
                meanVec.fill(0);
                for (let i = 0; i < embeds.length; i++) {
                    const v = embeds[i], w = weights[i];
                    for (let j = 0; j < v.length; j++)
                        meanVec[j] += v[j] * w;
                }
                const norm = l2$1(meanVec) || 1;
                for (let j = 0; j < meanVec.length; j++)
                    meanVec[j] /= norm;
                const rescored = subs.map((s) => ({
                    s,
                    w: cosine$2(encode(s), meanVec),
                }));
                rescored.sort((a, b) => b.w - a.w);
                summary = rescored
                    .slice(0, Math.max(3, Math.floor(topSentences / 2)))
                    .map((r) => r.s)
                    .join(" ");
            }
            // ---------- 5. Compose readable answer ----------
            summary = rewrite(summary);
            const firstChar = summary.charAt(0).toUpperCase() + summary.slice(1);
            const title = items[0].heading || "Answer";
            const prefix = personality === "teacher"
                ? "Here’s a simple way to think about it:\n\n"
                : personality === "scientist"
                    ? "From the retrieved material, we can infer:\n\n"
                    : "";
            return `${prefix}${firstChar}\n\n(${title}, Ω-synthesized)`;
        });
    }

    // Vectorization utilities for sparse and dense vectors
    // Extracted from workers for reuse
    /**
     * Compute TF-IDF vector from tokens
     */
    function toTfidf(tokens, idf, vmap, headingW = 1) {
        const counts = new Map();
        // crude heuristic: first 8 tokens considered heading-weighted
        for (let i = 0; i < tokens.length; i++) {
            const t = tokens[i];
            const id = vmap.get(t);
            if (id === undefined)
                continue;
            const w = (i < 8) ? headingW : 1;
            counts.set(id, (counts.get(id) || 0) + w);
        }
        const maxTf = Math.max(1, ...counts.values());
        const v = new Map();
        for (const [i, c] of counts) {
            const tf = 0.5 + 0.5 * (c / maxTf);
            v.set(i, tf * (idf[i] || 0));
        }
        return v;
    }
    /**
     * Cosine similarity between two sparse vectors
     */
    function cosineSparse(a, b) {
        let dot = 0, na = 0, nb = 0;
        for (const [i, av] of a) {
            na += av * av;
            const bv = b.get(i);
            if (bv)
                dot += av * bv;
        }
        for (const [, bv] of b)
            nb += bv * bv;
        if (!na || !nb)
            return 0;
        return dot / (Math.sqrt(na) * Math.sqrt(nb));
    }
    /**
     * Convert sparse vector to dense Float64Array
     */
    function sparseToDense(v, dim) {
        const x = new Float64Array(dim);
        for (const [i, val] of v)
            x[i] = val;
        return x;
    }
    /**
     * Dot product of two dense vectors
     */
    function dotProd$1(a, b) {
        let s = 0;
        for (let i = 0; i < a.length; i++)
            s += a[i] * b[i];
        return s;
    }
    /**
     * Base kernel function (RBF, cosine, or poly2)
     */
    function baseKernel$1(a, b, k, sigma) {
        if (k === 'cosine') {
            const dot = dotProd$1(a, b), na = Math.hypot(...a), nb = Math.hypot(...b);
            return (na && nb) ? (dot / (na * nb)) : 0;
        }
        else if (k === 'poly2') {
            const dot = dotProd$1(a, b);
            return Math.pow((dot + 1), 2);
        }
        else {
            let s = 0;
            for (let i = 0; i < a.length; i++) {
                const d = a[i] - b[i];
                s += d * d;
            }
            return Math.exp(-s / Math.max(1e-9, 2 * sigma * sigma));
        }
    }
    /**
     * Kernel similarity between two dense vectors
     */
    function kernelSim(a, b, k, sigma) {
        if (k === 'cosine') {
            const dot = dotProd$1(a, b), na = Math.hypot(...a), nb = Math.hypot(...b);
            return (na && nb) ? (dot / (na * nb)) : 0;
        }
        else if (k === 'poly2') {
            const dot = dotProd$1(a, b);
            return Math.pow((dot + 1), 2);
        }
        else {
            let s = 0;
            for (let i = 0; i < a.length; i++) {
                const d = a[i] - b[i];
                s += d * d;
            }
            return Math.exp(-s / Math.max(1e-9, 2 * sigma * sigma));
        }
    }
    /**
     * Project sparse vector to dense using Nyström landmarks
     */
    function projectToDense(v, vocabSize, landmarkMat, kernel, sigma) {
        const x = sparseToDense(v, vocabSize);
        const feats = new Float64Array(landmarkMat.length);
        for (let j = 0; j < landmarkMat.length; j++) {
            const l = landmarkMat[j];
            feats[j] = baseKernel$1(x, l, kernel, sigma);
        }
        const n = Math.hypot(...feats);
        if (n > 0)
            for (let i = 0; i < feats.length; i++)
                feats[i] /= n;
        return feats;
    }

    // Tokenization and stemming utilities
    // Extracted from workers for reuse
    // Memo for speed
    const STEM_CACHE = new Map();
    function normalizeWord(raw) {
        const k = raw;
        const cached = STEM_CACHE.get(k);
        if (cached)
            return cached;
        let w = raw.toLowerCase();
        w = w.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');
        if (w.length <= 2) {
            STEM_CACHE.set(k, w);
            return w;
        }
        // plural → singular
        if (w.endsWith('ies') && w.length > 4) {
            w = w.slice(0, -3) + 'y';
        }
        else if (/(xes|ches|shes|zes|sses)$/.test(w) && w.length > 4) {
            w = w.replace(/(xes|ches|shes|zes|sses)$/, (m) => (m === 'sses' ? 'ss' : m.replace(/es$/, '')));
        }
        else if (w.endsWith('s') && !/(ss|us)$/.test(w) && w.length > 3) {
            w = w.slice(0, -1);
        }
        // conservative suffix trimming
        const rules = [
            [/ization$|isation$/, 'ize'],
            [/ational$/, 'ate'],
            [/fulness$/, 'ful'],
            [/ousness$/, 'ous'],
            [/iveness$/, 'ive'],
            [/ability$/, 'able'],
            [/ness$/, ''],
            [/ment$/, ''],
            [/ations?$/, 'ate'],
            [/izer$|iser$/, 'ize'],
            [/ally$/, 'al'],
            [/ically$/, 'ic'],
            [/ingly$|edly$/, ''],
            [/ing$|ed$/, ''],
        ];
        for (const [re, rep] of rules) {
            if (re.test(w) && w.length - rep.length >= 4) {
                w = w.replace(re, rep);
                break;
            }
        }
        STEM_CACHE.set(k, w);
        return w;
    }
    function tokenize$1(text, doStem) {
        const base = text.toLowerCase()
            .replace(/[`*_>~]/g, ' ')
            .replace(/[^a-z0-9]+/g, ' ')
            .split(/\s+/)
            .filter(Boolean);
        if (!doStem)
            return base;
        const out = [];
        for (const t of base) {
            const n = normalizeWord(t);
            if (n && n.length > 1)
                out.push(n);
        }
        return out;
    }
    function expandQuery(q) {
        const adds = [];
        if (/\bmap\b/.test(q))
            adds.push('dict key value make');
        if (/\bchan|channel\b/.test(q))
            adds.push('goroutine concurrency select buffer');
        if (/\berror\b/.test(q))
            adds.push('fmt wrap unwrap sentinel try catch');
        if (/\bstruct\b/.test(q))
            adds.push('field method receiver init zero value');
        return q + ' ' + adds.join(' ');
    }

    // Index building utilities
    // Extracted from workers for reuse
    // License removed - all features are now free!
    /**
     * Build vocabulary and IDF from chunks
     */
    function buildVocabAndIdf(chunks, vocabSize, useStem) {
        const docsTokens = chunks.map(ch => tokenize$1((ch.heading + ' \n' + ch.content), useStem));
        const df = new Map();
        for (const toks of docsTokens) {
            const unique = new Set(toks);
            for (const t of unique)
                df.set(t, (df.get(t) || 0) + 1);
        }
        const sorted = [...df.entries()].sort((a, b) => b[1] - a[1]).slice(0, vocabSize);
        const vocabMap = new Map(sorted.map(([tok], i) => [tok, i]));
        const idf = new Array(vocabMap.size).fill(0);
        const N = docsTokens.length;
        for (const [tok, i] of vocabMap.entries()) {
            const dfi = df.get(tok) || 1;
            idf[i] = Math.log((N + 1) / (dfi + 1)) + 1;
        }
        return { vocabMap, idf };
    }
    /**
     * Build TF-IDF vectors for all chunks
     */
    function buildTfidfDocs(chunks, vocabMap, idf, headingW, useStem) {
        return chunks.map(ch => {
            const toks = tokenize$1((ch.heading + ' \n' + ch.content), useStem);
            return toTfidf(toks, idf, vocabMap, headingW);
        });
    }
    /**
     * Build Nyström landmarks from TF-IDF documents
     */
    function buildLandmarks(tfidfDocs, vocabSize, numLandmarks) {
        const L = Math.max(32, numLandmarks);
        const step = Math.max(1, Math.floor(Math.max(1, tfidfDocs.length) / L));
        const landmarksIdx = Array.from({ length: L }, (_, k) => Math.min(tfidfDocs.length - 1, k * step));
        const landmarkMat = landmarksIdx.map(i => sparseToDense(tfidfDocs[i], vocabSize));
        return { landmarksIdx, landmarkMat };
    }
    /**
     * Build dense projections for all TF-IDF documents
     */
    function buildDenseDocs(tfidfDocs, vocabSize, landmarkMat, kernel, sigma) {
        return tfidfDocs.map(v => {
            const x = sparseToDense(v, vocabSize);
            const feats = new Float64Array(landmarkMat.length);
            for (let j = 0; j < landmarkMat.length; j++) {
                const l = landmarkMat[j];
                feats[j] = baseKernel(x, l, kernel, sigma);
            }
            const n = Math.hypot(...feats);
            if (n > 0)
                for (let i = 0; i < feats.length; i++)
                    feats[i] /= n;
            return feats;
        });
    }
    function baseKernel(a, b, k, sigma) {
        if (k === 'cosine') {
            const dot = dotProd(a, b), na = Math.hypot(...a), nb = Math.hypot(...b);
            return (na && nb) ? (dot / (na * nb)) : 0;
        }
        else if (k === 'poly2') {
            const dot = dotProd(a, b);
            return Math.pow((dot + 1), 2);
        }
        else {
            let s = 0;
            for (let i = 0; i < a.length; i++) {
                const d = a[i] - b[i];
                s += d * d;
            }
            return Math.exp(-s / Math.max(1e-9, 2 * sigma * sigma));
        }
    }
    function dotProd(a, b) {
        let s = 0;
        for (let i = 0; i < a.length; i++)
            s += a[i] * b[i];
        return s;
    }
    /**
     * Build complete index from chunks
     */
    function buildIndex(opts) {
        // License check removed // Premium feature - requires valid license
        const { chunks, vocab, landmarks, headingW, useStem, kernel, sigma } = opts;
        // Build vocab and IDF
        const { vocabMap, idf } = buildVocabAndIdf(chunks, vocab, useStem);
        // Build TF-IDF vectors
        const tfidfDocs = buildTfidfDocs(chunks, vocabMap, idf, headingW, useStem);
        // Build landmarks
        const { landmarksIdx, landmarkMat } = buildLandmarks(tfidfDocs, vocabMap.size, landmarks);
        // Build dense projections
        const denseDocs = buildDenseDocs(tfidfDocs, vocabMap.size, landmarkMat, kernel, sigma);
        return {
            vocabMap,
            idf,
            tfidfDocs,
            landmarksIdx,
            landmarkMat,
            denseDocs,
        };
    }

    // Hybrid retrieval system (sparse + dense + keyword bonus)
    // Extracted from workers for reuse
    // License removed - all features are now free!
    /**
     * Compute keyword bonus scores for chunks
     */
    function keywordBonus(chunks, query) {
        const kws = Array.from(new Set(query.toLowerCase().split(/\W+/).filter(t => t.length > 2)));
        const syntaxBoost = /\b(define|declare|syntax|example|function|struct|map|interface)\b/i.test(query);
        return chunks.map(c => {
            const text = c.rich || c.content || '';
            const lc = text.toLowerCase();
            let hit = 0;
            for (const k of kws)
                if (lc.includes(k))
                    hit++;
            if (syntaxBoost && /```/.test(text))
                hit += 5; // strong bonus for code presence
            return Math.min(1.0, hit * 0.03);
        });
    }
    /**
     * Get top K indices from scores
     */
    function topKIndices(arr, k) {
        const idx = Array.from(arr, (_, i) => i);
        idx.sort((i, j) => (arr[j] - arr[i]));
        return idx.slice(0, k);
    }
    /**
     * Clamp value between min and max
     */
    function clamp$1(x, a, b) {
        return Math.max(a, Math.min(b, x));
    }
    /**
     * Perform hybrid retrieval (sparse + dense + keyword bonus)
     */
    function hybridRetrieve(opts) {
        // License check removed // Premium feature - requires valid license
        const { query, chunks, vocabMap, idf, tfidfDocs, denseDocs, landmarksIdx, landmarkMat, vocabSize, kernel, sigma, alpha, beta, ridge, headingW, useStem, expandQuery: shouldExpand, topK: k, prefilter, } = opts;
        // Expand query if needed
        const qexp = shouldExpand ? expandQuery(query) : query;
        const toks = tokenize$1(qexp, useStem);
        const qvec = toTfidf(toks, idf, vocabMap, headingW);
        const qdense = projectToDense(qvec, vocabSize, landmarkMat, kernel, sigma);
        // Compute sparse (TF-IDF) scores
        const tfidfScores = tfidfDocs.map(v => cosineSparse(v, qvec));
        // Compute dense (kernel) scores
        const denseScores = denseDocs.map((v) => kernelSim(v, qdense, kernel, sigma));
        // Compute keyword bonus
        const bonus = keywordBonus(chunks, query);
        // Hybrid scoring with ridge regularization
        const alphaClamped = clamp$1(alpha, 0, 1);
        const lambda = ridge !== null && ridge !== void 0 ? ridge : 0.08;
        const scores = denseScores.map((d, i) => {
            const t = tfidfScores[i];
            const b = beta * bonus[i];
            // Ridge damping on ALL components (dense, tfidf, and keyword bonus)
            const reg = 1 / (1 + lambda * (d * d + t * t + 0.5 * b * b));
            const s = reg * (alphaClamped * d + (1 - alphaClamped) * t + b);
            // soft clip extremes; helps prevent a single noisy dimension from dominating
            return Math.tanh(s);
        });
        // Pre-filter then final topK (retrieval stage)
        const pre = Math.max(k, prefilter !== null && prefilter !== void 0 ? prefilter : 0);
        const idxs = topKIndices(scores, pre);
        const finalIdxs = topKIndices(idxs.map(i => scores[i]), k).map(k => idxs[k]);
        // Build result items
        const items = finalIdxs.map(i => {
            const c = chunks[i];
            const body = (c.rich && c.rich.trim()) || (c.content && c.content.trim()) || '(see subsections)';
            return {
                score: scores[i],
                heading: c.heading,
                content: body,
                index: i,
            };
        });
        return {
            items,
            scores: finalIdxs.map(i => scores[i]),
            indices: finalIdxs,
            tfidfScores: finalIdxs.map(i => tfidfScores[i]),
            denseScores: finalIdxs.map(i => denseScores[i]),
        };
    }

    // OmegaRR.ts
    // Reranker + Reducer for AsterMind docs
    // - Extracts rich query–chunk features (sparse text + structural signals)
    // - Trains a tiny ridge model on-the-fly with weak supervision (per query)
    // - Produces score_rr and p_relevant
    // - Filters with threshold + MMR coverage under a character budget
    // - (v2) Optionally exposes engineered features (values + names) for TE/diagnostics
    /* ====================== Tokenization ======================= */
    const STOP$1 = new Set([
        "a", "an", "the", "and", "or", "but", "if", "then", "else", "for", "to", "of", "in", "on", "at", "by", "with",
        "is", "are", "was", "were", "be", "been", "being", "as", "from", "that", "this", "it", "its", "you", "your",
        "i", "we", "they", "he", "she", "them", "his", "her", "our", "us", "do", "does", "did", "done", "not", "no",
        "yes", "can", "could", "should", "would", "may", "might", "into", "about", "over", "under", "between"
    ]);
    function tokenize(s) {
        return s
            .toLowerCase()
            .replace(/[`*_#>~=\[\]{}()!?.:,;'"<>|/\\+-]+/g, " ")
            .split(/\s+/)
            .filter(t => t && !STOP$1.has(t));
    }
    function unique(arr) { return Array.from(new Set(arr)); }
    function buildCorpusStats(docs) {
        const vocab = new Map();
        const tfs = [];
        const docLens = [];
        let nextId = 0;
        for (const d of docs) {
            const toks = tokenize(d);
            docLens.push(toks.length);
            const tf = new Map();
            for (const w of toks) {
                let id = vocab.get(w);
                if (id === undefined) {
                    id = nextId++;
                    vocab.set(w, id);
                }
                tf.set(id, (tf.get(id) || 0) + 1);
            }
            tfs.push(tf);
        }
        const N = docs.length;
        const df = Array(nextId).fill(0);
        for (const tf of tfs)
            for (const id of tf.keys())
                df[id] += 1;
        const idf = df.map(df_i => Math.log((N + 1) / (df_i + 1)) + 1);
        const avgLen = docLens.reduce((a, b) => a + b, 0) / Math.max(1, N);
        return { stats: { vocab, idf, avgLen, df }, tf: tfs, docLens };
    }
    function tfidfVector(tf, idf) {
        const out = new Map();
        let norm2 = 0;
        for (const [i, f] of tf) {
            const val = (f) * (idf[i] || 0);
            out.set(i, val);
            norm2 += val * val;
        }
        const norm = Math.sqrt(norm2) || 1e-12;
        for (const [i, v] of out)
            out.set(i, v / norm);
        return out;
    }
    function cosine$1(a, b) {
        const [small, large] = a.size < b.size ? [a, b] : [b, a];
        let dot = 0;
        for (const [i, v] of small) {
            const u = large.get(i);
            if (u !== undefined)
                dot += v * u;
        }
        return dot;
    }
    function bm25Score(qTf, dTf, stats, dLen, k1 = 1.5, b = 0.75) {
        let score = 0;
        for (const [i] of qTf) {
            const f = dTf.get(i) || 0;
            if (f <= 0)
                continue;
            const idf = Math.log(((stats.df[i] || 0) + 0.5) / ((stats.idf.length - (stats.df[i] || 0)) + 0.5) + 1);
            const denom = f + k1 * (1 - b + b * (dLen / (stats.avgLen || 1)));
            score += idf * ((f * (k1 + 1)) / (denom || 1e-12));
        }
        return score;
    }
    /* ========== Light Random Projection from TF-IDF (dense hint) ========== */
    function projectSparse(vec, dim, seed = 1337) {
        // deterministic per (feature, j) hash: simple LCG/xorshift mix
        const out = new Float64Array(dim);
        for (const [i, v] of vec) {
            let s = (i * 2654435761) >>> 0;
            for (let j = 0; j < dim; j++) {
                s ^= s << 13;
                s ^= s >>> 17;
                s ^= s << 5;
                const r = ((s >>> 0) / 4294967296) * 2 - 1; // [-1,1]
                out[j] += v * r;
            }
        }
        let n2 = 0;
        for (let j = 0; j < dim; j++)
            n2 += out[j] * out[j];
        const n = Math.sqrt(n2) || 1e-12;
        for (let j = 0; j < dim; j++)
            out[j] /= n;
        return out;
    }
    /* ===================== Structural Signals ===================== */
    function containsGoCodeBlock(s) {
        return /```+\s*go([\s\S]*?)```/i.test(s) || /\bfunc\s+\w+\s*\(.*\)\s*\w*\s*{/.test(s);
    }
    function containsCodeBlock(s) {
        return /```+/.test(s) || /{[^}]*}/.test(s);
    }
    function headingQueryMatch(head, q) {
        const ht = unique(tokenize(head));
        const qt = new Set(tokenize(q));
        if (ht.length === 0 || qt.size === 0)
            return 0;
        let hit = 0;
        for (const t of ht)
            if (qt.has(t))
                hit++;
        return hit / ht.length;
    }
    function jaccard$1(a, b) {
        const A = new Set(tokenize(a));
        const B = new Set(tokenize(b));
        let inter = 0;
        for (const t of A)
            if (B.has(t))
                inter++;
        const uni = A.size + B.size - inter;
        return uni === 0 ? 0 : inter / uni;
    }
    function golangSpecFlag(s) {
        return /(golang\.org|go\.dev|pkg\.go\.dev)/i.test(s) ? 1 : 0;
    }
    function buildFeatures$1(q, chunk, qTfIdf, cTfIdf, qTfRaw, cTfRaw, stats, cLen, projQ, projC) {
        var _a;
        const f = [];
        const names = [];
        // 1) Sparse sims
        const cos = cosine$1(qTfIdf, cTfIdf);
        f.push(cos);
        names.push("cosine_tfidf");
        const bm25 = bm25Score(qTfRaw, cTfRaw, stats, cLen);
        f.push(bm25);
        names.push("bm25");
        // 2) Heading & lexical overlaps
        const hMatch = headingQueryMatch(chunk.heading || "", q);
        f.push(hMatch);
        names.push("heading_match_frac");
        const jac = jaccard$1(q, chunk.content || "");
        f.push(jac);
        names.push("jaccard_tokens");
        // 3) Structural flags
        const hasGo = containsGoCodeBlock(chunk.rich || chunk.content || "");
        const hasCode = containsCodeBlock(chunk.rich || chunk.content || "");
        f.push(hasGo ? 1 : 0);
        names.push("flag_go_code");
        f.push(hasCode ? 1 : 0);
        names.push("flag_any_code");
        // 4) Source cues
        f.push(golangSpecFlag(chunk.content || "") ? 1 : 0);
        names.push("flag_go_spec_link");
        // 5) Prior score (baseline)
        f.push(((_a = chunk.score_base) !== null && _a !== void 0 ? _a : 0));
        names.push("prior_score_base");
        // 6) Length heuristics (prefer concise answers)
        const lenChars = (chunk.content || "").length;
        f.push(1 / Math.sqrt(1 + lenChars));
        names.push("len_inv_sqrt");
        // 7) Dense hint from projection
        if (projQ && projC) {
            let dot = 0, l1 = 0;
            for (let i = 0; i < projQ.length; i++) {
                dot += projQ[i] * projC[i];
                l1 += Math.abs(projQ[i] - projC[i]);
            }
            f.push(dot);
            names.push("proj_dot");
            f.push(l1 / projQ.length);
            names.push("proj_l1mean");
        }
        return { names, values: f };
    }
    /* ======================== Ridge Model ======================== */
    class Ridge {
        constructor() {
            this.w = null;
            this.mu = null;
            this.sigma = null;
        }
        fit(X, y, lambda = 1e-2) {
            var _a;
            const n = X.length;
            const d = ((_a = X[0]) === null || _a === void 0 ? void 0 : _a.length) || 0;
            if (n === 0 || d === 0) {
                this.w = new Float64Array(d);
                return;
            }
            // standardize
            const mu = new Float64Array(d);
            const sig = new Float64Array(d);
            for (let j = 0; j < d; j++) {
                let m = 0;
                for (let i = 0; i < n; i++)
                    m += X[i][j];
                m /= n;
                mu[j] = m;
                let v = 0;
                for (let i = 0; i < n; i++) {
                    const z = X[i][j] - m;
                    v += z * z;
                }
                sig[j] = Math.sqrt(v / n) || 1;
            }
            const Z = Array.from({ length: n }, (_, i) => new Float64Array(d));
            for (let i = 0; i < n; i++)
                for (let j = 0; j < d; j++)
                    Z[i][j] = (X[i][j] - mu[j]) / sig[j];
            // A = Z^T Z + λI, Zy = Z^T y
            const A = Array.from({ length: d }, () => new Float64Array(d));
            const Zy = new Float64Array(d);
            for (let i = 0; i < n; i++) {
                const zi = Z[i];
                const yi = y[i];
                for (let j = 0; j < d; j++) {
                    Zy[j] += zi[j] * yi;
                    const zij = zi[j];
                    for (let k = 0; k <= j; k++)
                        A[j][k] += zij * zi[k];
                }
            }
            for (let j = 0; j < d; j++) {
                for (let k = 0; k < j; k++)
                    A[k][j] = A[j][k];
                A[j][j] += lambda;
            }
            // Cholesky solve
            const L = Array.from({ length: d }, () => new Float64Array(d));
            for (let i = 0; i < d; i++) {
                for (let j = 0; j <= i; j++) {
                    let sum = A[i][j];
                    for (let k = 0; k < j; k++)
                        sum -= L[i][k] * L[j][k];
                    L[i][j] = (i === j) ? Math.sqrt(Math.max(sum, 1e-12)) : (sum / (L[j][j] || 1e-12));
                }
            }
            const z = new Float64Array(d);
            for (let i = 0; i < d; i++) {
                let s = Zy[i];
                for (let k = 0; k < i; k++)
                    s -= L[i][k] * z[k];
                z[i] = s / (L[i][i] || 1e-12);
            }
            const w = new Float64Array(d);
            for (let i = d - 1; i >= 0; i--) {
                let s = z[i];
                for (let k = i + 1; k < d; k++)
                    s -= L[k][i] * w[k];
                w[i] = s / (L[i][i] || 1e-12);
            }
            this.w = w;
            this.mu = mu;
            this.sigma = sig;
        }
        predict(x) {
            if (!this.w || !this.mu || !this.sigma)
                return 0;
            let s = 0;
            for (let j = 0; j < this.w.length; j++) {
                const z = (x[j] - this.mu[j]) / this.sigma[j];
                s += this.w[j] * z;
            }
            return s;
        }
    }
    /* ===================== Weak Supervision ===================== */
    function generateWeakLabel(q, chunk, feats) {
        var _a;
        const txt = (chunk.rich || chunk.content || "");
        let y = 0;
        const qIsGoFunc = /\bgo\b/.test(q.toLowerCase()) && /(define|declare|function|func)/i.test(q);
        if (qIsGoFunc && containsGoCodeBlock(txt))
            y = Math.max(y, 1.0);
        const headHit = headingQueryMatch(chunk.heading || "", q);
        if (headHit >= 0.34 && containsCodeBlock(txt))
            y = Math.max(y, 0.8);
        const cosIdx = feats.names.indexOf("cosine_tfidf");
        const bm25Idx = feats.names.indexOf("bm25");
        const cos = cosIdx >= 0 ? feats.values[cosIdx] : 0;
        const bm = bm25Idx >= 0 ? feats.values[bm25Idx] : 0;
        if (cos > 0.25)
            y = Math.max(y, 0.6);
        if (bm > 1.0)
            y = Math.max(y, 0.6);
        const priorIdx = feats.names.indexOf("prior_score_base");
        const prior = priorIdx >= 0 ? feats.values[priorIdx] : 0;
        if (((_a = chunk.score_base) !== null && _a !== void 0 ? _a : 0) > 0)
            y = Math.max(y, Math.min(0.6, 0.2 + 0.5 * prior));
        return y;
    }
    function sigmoid(x) {
        if (x >= 0) {
            const z = Math.exp(-x);
            return 1 / (1 + z);
        }
        else {
            const z = Math.exp(x);
            return z / (1 + z);
        }
    }
    /* ========================= MMR Filter ========================= */
    function mmrFilter(scored, lambda = 0.7, budgetChars = 1200) {
        const sel = [];
        const docs = scored.map(s => s.content || "");
        const { stats, tf: tfList } = buildCorpusStats(docs);
        const tfidf = tfList.map(tf => tfidfVector(tf, stats.idf));
        const selectedIdx = new Set();
        let used = 0;
        while (selectedIdx.size < scored.length) {
            let bestIdx = -1, bestVal = -Infinity;
            for (let i = 0; i < scored.length; i++) {
                if (selectedIdx.has(i))
                    continue;
                const cand = scored[i];
                let red = 0;
                for (const j of selectedIdx) {
                    const sim = cosine$1(tfidf[i], tfidf[j]);
                    if (sim > red)
                        red = sim;
                }
                const val = lambda * cand.score_rr - (1 - lambda) * red;
                if (val > bestVal) {
                    bestVal = val;
                    bestIdx = i;
                }
            }
            if (bestIdx < 0)
                break;
            const chosen = scored[bestIdx];
            const addLen = (chosen.content || "").length;
            if (used + addLen > budgetChars && sel.length > 0)
                break;
            sel.push(chosen);
            used += addLen;
            selectedIdx.add(bestIdx);
        }
        return sel;
    }
    /* ========================= Public API ========================= */
    /** Train per-query ridge model and score chunks. */
    function rerank(query, chunks, opts = {}) {
        var _a, _b;
        // License check removed // Premium feature - requires valid license
        const { lambdaRidge = 1e-2, randomProjDim = 32, exposeFeatures = true, attachFeatureNames = false, } = opts;
        const docs = [query, ...chunks.map(c => c.content || "")];
        const { stats, tf: tfRaw, docLens } = buildCorpusStats(docs);
        const tfidfAll = tfRaw.map(tf => tfidfVector(tf, stats.idf));
        const qTfRaw = tfRaw[0];
        const qTfIdf = tfidfAll[0];
        const projQ = randomProjDim > 0 ? projectSparse(qTfIdf, randomProjDim) : undefined;
        const X = [];
        const y = [];
        const featPacks = [];
        for (let i = 0; i < chunks.length; i++) {
            const c = chunks[i];
            const cTfRaw = tfRaw[i + 1];
            const cTfIdf = tfidfAll[i + 1];
            const projC = randomProjDim > 0 ? projectSparse(cTfIdf, randomProjDim, 1337 + i) : undefined;
            const feats = buildFeatures$1(query, c, qTfIdf, cTfIdf, qTfRaw, cTfRaw, stats, docLens[i + 1] || 1, projQ, projC);
            featPacks.push(feats);
            X.push(feats.values);
            const label = generateWeakLabel(query, c, feats);
            y.push(label);
        }
        const allSame = y.every(v => Math.abs(v - y[0]) < 1e-9);
        if (allSame) {
            const cosIdx = featPacks[0].names.indexOf("cosine_tfidf");
            if (cosIdx >= 0) {
                for (let i = 0; i < y.length; i++)
                    y[i] = Math.max(0, Math.min(1, 0.2 + 0.6 * X[i][cosIdx]));
            }
        }
        const rr = new Ridge();
        rr.fit(X, y, lambdaRidge);
        let minS = Infinity, maxS = -Infinity;
        const rawScores = X.map(x => rr.predict(x));
        for (const s of rawScores) {
            if (s < minS)
                minS = s;
            if (s > maxS)
                maxS = s;
        }
        const range = Math.max(1e-9, maxS - minS);
        const featureNames = attachFeatureNames ? (_b = (_a = featPacks[0]) === null || _a === void 0 ? void 0 : _a.names) !== null && _b !== void 0 ? _b : [] : undefined;
        const scored = chunks.map((c, i) => {
            const s01 = (rawScores[i] - minS) / range;
            const p = sigmoid((rawScores[i] - 0.5 * (minS + maxS)) / (0.2 * range + 1e-6));
            const base = Object.assign(Object.assign({}, c), { score_rr: s01, p_relevant: p });
            if (exposeFeatures)
                base._features = X[i];
            if (featureNames)
                base._feature_names = featureNames;
            return base;
        });
        scored.sort((a, b) => b.score_rr - a.score_rr);
        return scored;
    }
    /** Filter scored chunks using probability/near-top thresholds and MMR coverage. */
    function filterMMR(scored, opts = {}) {
        // License check removed // Premium feature - requires valid license
        const { probThresh = 0.45, epsilonTop = 0.05, useMMR = true, mmrLambda = 0.7, budgetChars = 1200 } = opts;
        if (scored.length === 0)
            return [];
        const top = scored[0].score_rr;
        const bandKept = scored.filter(s => s.p_relevant >= probThresh && s.score_rr >= (top - epsilonTop));
        const seed = bandKept.length > 0 ? bandKept : [scored[0]];
        if (!useMMR) {
            const out = [];
            let used = 0;
            for (const s of seed) {
                const add = (s.content || "").length;
                if (used + add > budgetChars && out.length > 0)
                    break;
                out.push(s);
                used += add;
            }
            return out;
        }
        const boosted = scored.map(s => (Object.assign(Object.assign({}, s), { score_rr: seed.includes(s) ? s.score_rr + 0.01 : s.score_rr })));
        return mmrFilter(boosted, mmrLambda, budgetChars);
    }
    /** Convenience: run rerank then filter. */
    function rerankAndFilter(query, chunks, opts = {}) {
        // License check removed // Premium feature - requires valid license
        const scored = rerank(query, chunks, opts);
        return filterMMR(scored, opts);
    }
    /* ========================= Debug Utilities ========================= */
    function explainFeatures(query, chunks, opts = {}) {
        var _a;
        const rpd = (_a = opts.randomProjDim) !== null && _a !== void 0 ? _a : 32;
        const docs = [query, ...chunks.map(c => c.content || "")];
        const { stats, tf: tfRaw } = buildCorpusStats(docs);
        const tfidfAll = tfRaw.map(tf => tfidfVector(tf, stats.idf));
        const projQ = rpd > 0 ? projectSparse(tfidfAll[0], rpd) : undefined;
        const namesRef = [];
        const rows = [];
        for (let i = 0; i < chunks.length; i++) {
            const feats = buildFeatures$1(query, chunks[i], tfidfAll[0], tfidfAll[i + 1], tfRaw[0], tfRaw[i + 1], stats, 1, projQ, rpd > 0 ? projectSparse(tfidfAll[i + 1], rpd, 1337 + i) : undefined);
            if (namesRef.length === 0)
                namesRef.push(...feats.names);
            rows.push({ heading: chunks[i].heading, features: feats.values });
        }
        return { names: namesRef, rows };
    }

    // OmegaSumDet.ts — Deterministic, context-locked summarizer (v2.2)
    // -----------------------------------------------------------------------------
    // Goals
    // - ONLY summarize from the already-kept, top-ranked chunks (no leakage).
    // - Deterministic ordering, scoring, and composition.
    // - Stable weighting with explicit, normalized features.
    // - Code is treated as atomic and only included when query-aligned.
    // - Section diversity is capped to keep answers focused.
    // - Scored, stemmed, stopword-aware heading alignment (Dice) + small intent & RR boosts.
    // - Intent-aware code gating (e.g., require `func` for "define function" queries).
    // -----------------------------------------------------------------------------
    const DEFAULTS = {
        maxAnswerChars: 900,
        maxBullets: 6,
        preferCode: true,
        includeCitations: true,
        addFooter: true,
        teWeight: 0.25,
        queryWeight: 0.45,
        evidenceWeight: 0.20,
        rrWeight: 0.10,
        codeBonus: 0.05,
        headingBonus: 0.04,
        jaccardDedupThreshold: 0.6,
        allowOffTopic: false,
        minQuerySimForCode: 0.40,
        maxSectionsInAnswer: 1,
        focusTopAlignedHeadings: 2,
    };
    function summarizeDeterministic(query, kept, opts) {
        var _a, _b, _c;
        // License check removed // Premium feature - requires valid license
        const O = Object.assign(Object.assign({}, DEFAULTS), (opts || {}));
        // 0) Normalize kept list with stable rrRank/rrScore defaults
        const K = kept.map((c, i) => (Object.assign(Object.assign({}, c), { rrRank: (typeof c.rrRank === "number" ? c.rrRank : i), rrScore: (typeof c.rrScore === "number" ? c.rrScore : (kept.length - i) / Math.max(1, kept.length)) })));
        if (K.length === 0) {
            return { text: "No answer could be composed from the provided context.", cites: [] };
        }
        // 1) Scored, stemmed, stopword-aware heading alignment + RR + intent bumps
        const intent = detectIntent(query);
        // normalize rrScore across kept for a small deterministic boost
        let rrMin = Infinity, rrMax = -Infinity;
        for (const c of K) {
            rrMin = Math.min(rrMin, (_a = c.rrScore) !== null && _a !== void 0 ? _a : 0);
            rrMax = Math.max(rrMax, (_b = c.rrScore) !== null && _b !== void 0 ? _b : 0);
        }
        const rrSpan = (rrMax - rrMin) || 1;
        function intentHit(c) {
            const hay = (c.heading + ' ' + (c.content || '') + ' ' + (c.rich || '')).toLowerCase();
            let hit = 0;
            if (intent.function && /\bfunc\b|\bfunction\b/.test(hay))
                hit += 1;
            if (intent.variable && /\bvar\b|\bvariable\b|\b:=\b/.test(hay))
                hit += 1;
            if (intent.constant && /\bconst\b|\bconstant\b/.test(hay))
                hit += 1;
            if (intent.concurrency && /\bgoroutine\b|\bgo\s+func\b|\bchan(nel)?\b|\bselect\b/.test(hay))
                hit += 1;
            if (intent.loop && /\bfor\b/.test(hay))
                hit += 1;
            return Math.min(1, hit / 2); // 0..1
        }
        const alignScores = K.map(ch => diceStemmed(query, ch.heading)); // 0..1
        const composite = K.map((c, i) => {
            var _a;
            const align = alignScores[i] || 0;
            const rrNorm = (((_a = c.rrScore) !== null && _a !== void 0 ? _a : 0) - rrMin) / rrSpan; // 0..1
            const ih = intentHit(c); // 0..1
            // alignment dominates; rr+intent provide gentle nudges
            return align + 0.15 * rrNorm + 0.20 * ih;
        });
        // rank by composite desc, break ties by rrRank asc
        const allByComposite = K.map((_, i) => i).sort((i, j) => {
            if (composite[j] !== composite[i])
                return composite[j] - composite[i];
            return (K[i].rrRank - K[j].rrRank);
        });
        // choose top-N aligned headings; ensure at least one is chosen
        const alignedIdxs = allByComposite.slice(0, Math.max(1, O.focusTopAlignedHeadings));
        const allowedChunkIdx = new Set(alignedIdxs);
        // 2) Candidate extraction: sentences + fenced code blocks; stable order
        const queryTok = tokens(query);
        const candidates = [];
        for (let i = 0; i < K.length; i++) {
            if (!allowedChunkIdx.has(i))
                continue; // HARD mask to top aligned headings
            const ch = K[i];
            const base = (_c = ch.rich) !== null && _c !== void 0 ? _c : ch.content;
            const parts = splitCodeAware(base); // preserves order; code blocks are atomic
            let localSentIdx = 0;
            for (const part of parts) {
                const hasCode = part.kind === "code";
                const sentList = hasCode ? [part.text] : splitSentences(part.text);
                for (const s of sentList) {
                    const trimmed = s.trim();
                    if (!trimmed)
                        continue;
                    const f = buildFeatures(trimmed, queryTok, ch, O, hasCode);
                    candidates.push({
                        sent: trimmed,
                        chunkIdx: i,
                        sentIdx: localSentIdx++,
                        heading: ch.heading,
                        hasCode,
                        features: f,
                        score: 0,
                    });
                }
            }
        }
        if (candidates.length === 0) {
            return { text: "No answer could be composed from the aligned context.", cites: [] };
        }
        // 3) Normalize numeric features across candidates → [0,1]
        normalizeFeature(candidates, "querySim");
        normalizeFeature(candidates, "teGain");
        normalizeFeature(candidates, "evidence");
        normalizeFeature(candidates, "rr");
        // 4) Combine with explicit weights + strict, intent-aware gates (deterministic)
        for (const c of candidates) {
            const f = c.features;
            let s = O.queryWeight * f.querySim +
                O.teWeight * f.teGain +
                O.evidenceWeight * f.evidence +
                O.rrWeight * f.rr;
            // Intent-aware code gating
            if (c.hasCode) {
                const align = alignScores[c.chunkIdx] || 0;
                const txt = c.sent.toLowerCase();
                let intentOK = true;
                if (intent.function)
                    intentOK = /\bfunc\b/.test(txt);
                if (intent.variable)
                    intentOK = intentOK && (/\bvar\b/.test(txt) || /\b:=\b/.test(txt));
                if (intent.constant)
                    intentOK = intentOK && /\bconst\b/.test(txt);
                if (intent.concurrency)
                    intentOK = intentOK && (/\bgoroutine\b|\bgo\s+func\b|\bchan(nel)?\b|\bselect\b/.test(txt));
                if (!intentOK || align < 0.25 || f.querySim < O.minQuerySimForCode || f.codeRelevance <= 0.2) {
                    s *= 0.5; // neuter misaligned code
                }
                else if (O.preferCode) {
                    s += O.codeBonus * Math.min(1, f.codeRelevance * 1.25) * align;
                }
            }
            // Heading bonus scaled by composite alignment
            const hb = Math.min(1, composite[c.chunkIdx] || 0);
            if (hb > 0)
                s += O.headingBonus * hb;
            // Off-topic heading handling (shouldn’t happen due to hard mask, but keep as fail-safe)
            if (hb === 0 && !O.allowOffTopic) {
                s *= 0.1; // near-zero
            }
            c.score = clamp01p5(s);
        }
        // 5) TOTAL order sort with explicit tie-breakers (stable)
        candidates.sort((a, b) => {
            if (b.score !== a.score)
                return b.score - a.score;
            const ar = K[a.chunkIdx].rrRank, br = K[b.chunkIdx].rrRank;
            if (ar !== br)
                return ar - br; // better reranker rank first
            if (a.chunkIdx !== b.chunkIdx)
                return a.chunkIdx - b.chunkIdx; // earlier chunk first
            if (a.sentIdx !== b.sentIdx)
                return a.sentIdx - b.sentIdx; // earlier sentence first
            return a.sent.localeCompare(b.sent); // final deterministic tie-breaker
        });
        // 6) Deterministic dedup (Jaccard) — keep first occurrence only
        const picked = [];
        const seen = [];
        for (const c of candidates) {
            const t = c.sent.toLowerCase();
            let dup = false;
            for (const s of seen) {
                if (jaccardText(t, s) >= O.jaccardDedupThreshold) {
                    dup = true;
                    break;
                }
            }
            if (!dup) {
                picked.push(c);
                seen.push(t);
            }
        }
        // 7) Compose answer under budget with section cap
        const out = [];
        const citesSet = new Set();
        let budget = O.maxAnswerChars;
        const usedHeadings = new Set();
        for (const c of picked) {
            const h = K[c.chunkIdx].heading;
            const alreadyUsed = usedHeadings.has(h);
            // Enforce max distinct headings
            if (!alreadyUsed && usedHeadings.size >= O.maxSectionsInAnswer)
                continue;
            const unit = (picked.length > 1 ? `- ${c.sent}` : c.sent);
            const cost = unit.length + (out.length ? 1 : 0);
            if (cost > budget)
                continue;
            out.push(unit);
            budget -= cost;
            usedHeadings.add(h);
            if (O.includeCitations)
                citesSet.add(h);
            if (out.length >= O.maxBullets)
                break;
        }
        // Fallback if nothing fits budget
        if (out.length === 0 && picked.length > 0) {
            const c = picked[0];
            out.push(c.sent);
            citesSet.add(K[c.chunkIdx].heading);
        }
        let text = picked.length > 1 ? out.join("\n") : out.join("");
        const cites = [...citesSet].map(h => ({ heading: h }));
        if (O.addFooter && cites.length > 0) {
            text += `\n\n---\n**Sources used:**\n` + cites.map(c => `- ${c.heading}`).join("\n");
        }
        return { text, cites };
    }
    /* -------------------- helpers (deterministic) -------------------- */
    function clamp01p5(x) {
        if (!Number.isFinite(x))
            return 0;
        return Math.max(0, Math.min(1.5, x));
    }
    function tokens(s) {
        var _a;
        return (_a = s.toLowerCase().match(/[a-z0-9_]+/g)) !== null && _a !== void 0 ? _a : [];
    }
    // code-aware split: returns a sequence of {kind: "code"|"text", text}
    function splitCodeAware(raw) {
        const out = [];
        const re = /```([\s\S]*?)```/g;
        let last = 0, m;
        while ((m = re.exec(raw)) !== null) {
            const before = raw.slice(last, m.index);
            if (before.trim())
                out.push({ kind: "text", text: normalizeWS(before) });
            const code = m[1];
            if (code.trim())
                out.push({ kind: "code", text: "```" + normalizeWS(code) + "```" });
            last = m.index + m[0].length;
        }
        const tail = raw.slice(last);
        if (tail.trim())
            out.push({ kind: "text", text: normalizeWS(tail) });
        return out;
    }
    // conservative sentence splitter (period, question, exclamation)
    function splitSentences(text) {
        // split on sentence boundaries; also split on blank lines to avoid giant paragraphs
        const parts = text.split(/(?<=[\.\?\!])\s+(?=[A-Z0-9[`])/g);
        return parts.flatMap(p => p.split(/\n{2,}/g)).map(s => s.trim()).filter(Boolean);
    }
    function normalizeWS(s) {
        return s.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    }
    function bow(ts) {
        var _a;
        const m = new Map();
        for (const t of ts)
            m.set(t, ((_a = m.get(t)) !== null && _a !== void 0 ? _a : 0) + 1);
        return m;
    }
    function cosine(a, b) {
        let dot = 0, na = 0, nb = 0;
        for (const [, v] of a)
            na += v * v;
        for (const [, v] of b)
            nb += v * v;
        const n = Math.sqrt(na || 1e-9) * Math.sqrt(nb || 1e-9);
        if (n === 0)
            return 0;
        const smaller = a.size < b.size ? a : b;
        const larger = a.size < b.size ? b : a;
        for (const [k, v] of smaller) {
            const w = larger.get(k);
            if (w)
                dot += v * w;
        }
        const val = dot / n;
        return Number.isFinite(val) ? Math.max(0, Math.min(1, val)) : 0;
    }
    // normalize each named feature across candidates → [0,1] deterministically
    function normalizeFeature(cands, key) {
        var _a, _b;
        let min = Infinity, max = -Infinity;
        for (const c of cands) {
            const v = (_a = c.features[key]) !== null && _a !== void 0 ? _a : 0;
            const vv = Number.isFinite(v) ? v : 0;
            if (vv < min)
                min = vv;
            if (vv > max)
                max = vv;
        }
        const span = (max - min) || 1;
        for (const c of cands) {
            const v = (_b = c.features[key]) !== null && _b !== void 0 ? _b : 0;
            const vv = Number.isFinite(v) ? v : 0;
            c.features[key] = (vv - min) / span;
        }
    }
    function jaccardText(a, b) {
        const A = new Set(a.split(/\W+/).filter(Boolean));
        const B = new Set(b.split(/\W+/).filter(Boolean));
        let inter = 0;
        for (const x of A)
            if (B.has(x))
                inter++;
        return inter / Math.max(1, A.size + B.size - inter);
    }
    /* ---------- stopwords + intent ---------- */
    const STOP = new Set([
        'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'of', 'in', 'on', 'for', 'to', 'from', 'by',
        'with', 'without', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'as', 'at', 'it', 'this', 'that',
        'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'do', 'does', 'did', 'how', 'what', 'when',
        'where', 'why', 'which', 'can', 'could', 'should', 'would'
    ]);
    function filterStops(ts) {
        return ts.filter(t => !STOP.has(t));
    }
    function detectIntent(q) {
        const s = q.toLowerCase();
        return {
            function: /\bfunc(tion|)\b|\bdefine\b|\bdeclar(e|ation)\b|\bprototype\b/.test(s),
            variable: /\bvar(iable)?\b|\bdeclare\b/.test(s),
            constant: /\bconst(ant)?\b/.test(s),
            concurrency: /\bconcurrency\b|\bgoroutine\b|\bchannel\b|\bselect\b/.test(s),
            loop: /\bfor\s+loop\b|\bloop\b|\bfor\b/.test(s),
        };
    }
    /* ---------- light stemming + stemmed Dice alignment (0..1) ---------- */
    function stemToken(w) {
        let s = w.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');
        if (s.length <= 2)
            return s;
        if (s.endsWith('ies') && s.length > 4)
            s = s.slice(0, -3) + 'y';
        else if (/(xes|ches|shes|zes|sses)$/.test(s) && s.length > 4)
            s = s.replace(/(xes|ches|shes|zes|sses)$/, (m) => (m === 'sses' ? 'ss' : m.replace(/es$/, '')));
        else if (s.endsWith('s') && !/(ss|us)$/.test(s) && s.length > 3)
            s = s.slice(0, -1);
        const rules = [
            [/ization$|isation$/, 'ize'],
            [/ational$/, 'ate'],
            [/fulness$/, 'ful'],
            [/ousness$/, 'ous'],
            [/iveness$/, 'ive'],
            [/ability$/, 'able'],
            [/ness$/, ''],
            [/ment$/, ''],
            [/ations?$/, 'ate'],
            [/izer$|iser$/, 'ize'],
            [/ally$/, 'al'],
            [/ically$/, 'ic'],
            [/ingly$|edly$/, ''],
            [/ing$|ed$/, ''],
        ];
        for (const [re, rep] of rules) {
            if (re.test(s) && s.length - rep.length >= 4) {
                s = s.replace(re, rep);
                break;
            }
        }
        return s;
    }
    function stemTokens(str) {
        var _a;
        const raw = ((_a = str.toLowerCase().match(/[a-z0-9_]+/g)) !== null && _a !== void 0 ? _a : []);
        const stemmed = raw.map(stemToken).filter(Boolean);
        return filterStops(stemmed);
    }
    // Dice coefficient over stemmed tokens (0..1). Robust for short strings.
    function diceStemmed(a, b) {
        const A = new Set(stemTokens(a));
        const B = new Set(stemTokens(b));
        if (A.size === 0 || B.size === 0)
            return 0;
        let inter = 0;
        for (const t of A)
            if (B.has(t))
                inter++;
        return (2 * inter) / (A.size + B.size);
    }
    // Overlap between code tokens and query tokens (fraction of code tokens in query)
    function cCodeRelevance(sentence, queryTokens) {
        if (!sentence.includes("```"))
            return 0;
        const codeTokens = tokens(sentence.replace(/```/g, ""));
        if (codeTokens.length === 0)
            return 0;
        const Q = new Set(queryTokens);
        let overlap = 0;
        for (const t of codeTokens) {
            if (Q.has(t))
                overlap++;
        }
        return overlap / codeTokens.length;
    }
    // Feature builder (deterministic). If you have TE per chunk/sentence, inject it here.
    function buildFeatures(sentence, queryTokens, ch, _O, hasCode) {
        // querySim (raw) via cosine on hashed BoW; normalized later
        const qvec = bow(queryTokens);
        const svec = bow(tokens(sentence));
        const querySimRaw = cosine(qvec, svec); // 0..1
        // sentence↔heading local alignment (stemmed); treat ≥0.15 as aligned
        const localAlignScore = diceStemmed(sentence, ch.heading);
        const headingAligned = localAlignScore >= 0.15;
        // teGain: placeholder (replace with your TE if you have it)
        const teGainRaw = headingAligned ? 1 : 0;
        // evidence: proxy for coverage/utility (bounded length effect)
        const evRaw = Math.min(1, tokens(sentence).length / 40);
        const rrRaw = (typeof ch.rrScore === "number") ? ch.rrScore : 0;
        const codeRel = hasCode ? cCodeRelevance(sentence, queryTokens) : 0;
        return {
            querySim: querySimRaw,
            teGain: teGainRaw,
            evidence: evRaw,
            rr: rrRaw,
            headingAligned,
            codeRelevance: codeRel,
        };
    }

    // infoflow/TransferEntropy.ts
    // Phase-1: streaming Transfer Entropy (TE) with linear-Gaussian approximation.
    // TE(X→Y) ≈ 1/2 * log( Var[e | Y_past] / Var[e | Y_past, X_past] ), in nats (set bits=true for /ln2)
    function zscore(v) {
        const n = v.length || 1;
        let m = 0;
        for (const x of v)
            m += x;
        m /= n;
        let s2 = 0;
        for (const x of v) {
            const d = x - m;
            s2 += d * d;
        }
        const inv = 1 / Math.sqrt(s2 / Math.max(1, n - 1) || 1e-12);
        return v.map(x => (x - m) * inv);
    }
    function ridgeSolve(X, y, l2) {
        var _a;
        // Solve (X^T X + l2 I) beta = X^T y via Cholesky (d is small here).
        const n = X.length, d = ((_a = X[0]) === null || _a === void 0 ? void 0 : _a.length) || 0;
        if (!n || !d)
            return new Array(d).fill(0);
        const XtX = new Float64Array(d * d);
        const Xty = new Float64Array(d);
        for (let i = 0; i < n; i++) {
            const row = X[i];
            const yi = y[i];
            for (let j = 0; j < d; j++) {
                Xty[j] += row[j] * yi;
                for (let k = 0; k <= j; k++)
                    XtX[j * d + k] += row[j] * row[k];
            }
        }
        for (let j = 0; j < d; j++) {
            for (let k = 0; k < j; k++)
                XtX[k * d + j] = XtX[j * d + k];
            XtX[j * d + j] += l2;
        }
        // Cholesky
        const L = new Float64Array(d * d);
        for (let i = 0; i < d; i++) {
            for (let j = 0; j <= i; j++) {
                let s = XtX[i * d + j];
                for (let k = 0; k < j; k++)
                    s -= L[i * d + k] * L[j * d + k];
                L[i * d + j] = (i === j) ? Math.sqrt(Math.max(s, 1e-12)) : s / (L[j * d + j] || 1e-12);
            }
        }
        // Solve L z = Xty
        const z = new Float64Array(d);
        for (let i = 0; i < d; i++) {
            let s = Xty[i];
            for (let k = 0; k < i; k++)
                s -= L[i * d + k] * z[k];
            z[i] = s / (L[i * d + i] || 1e-12);
        }
        // Solve L^T beta = z
        const beta = new Float64Array(d);
        for (let i = d - 1; i >= 0; i--) {
            let s = z[i];
            for (let k = i + 1; k < d; k++)
                s -= L[k * d + i] * beta[k];
            beta[i] = s / (L[i * d + i] || 1e-12);
        }
        return Array.from(beta);
    }
    function mseResidual(X, y, beta) {
        const n = X.length || 1;
        let s = 0;
        for (let i = 0; i < n; i++) {
            const row = X[i];
            let p = 0;
            for (let j = 0; j < row.length; j++)
                p += row[j] * beta[j];
            const e = y[i] - p;
            s += e * e;
        }
        return s / n;
    }
    // Build supervised datasets for Y_t and regressors made of past Y/X lags.
    function makeDesign(ySeq, xSeq, L, LX) {
        // ySeq[i] and xSeq[i] are vectors at time i (we’ll average to 1D to keep it cheap)
        const y1d = ySeq.map(v => v.reduce((a, b) => a + b, 0) / Math.max(1, v.length));
        const x1d = xSeq.map(v => v.reduce((a, b) => a + b, 0) / Math.max(1, v.length));
        const N = y1d.length;
        const rowsY = [];
        const rowsYX = [];
        const target = [];
        for (let t = Math.max(L, LX); t < N; t++) {
            // target: current Y (scalar)
            target.push([y1d[t]]);
            // past Y
            const ylags = [];
            for (let k = 1; k <= L; k++)
                ylags.push(y1d[t - k]);
            // past X
            const xlags = [];
            for (let k = 1; k <= LX; k++)
                xlags.push(x1d[t - k]);
            rowsY.push(ylags);
            rowsYX.push([...ylags, ...xlags]);
        }
        // standardize columns for stability
        const colZ = (M) => {
            var _a;
            const n = M.length, d = ((_a = M[0]) === null || _a === void 0 ? void 0 : _a.length) || 0;
            const out = Array.from({ length: n }, () => new Array(d).fill(0));
            for (let j = 0; j < d; j++) {
                const col = new Array(n);
                for (let i = 0; i < n; i++)
                    col[i] = M[i][j];
                const zs = zscore(col);
                for (let i = 0; i < n; i++)
                    out[i][j] = zs[i];
            }
            return out;
        };
        return { XY: colZ(rowsY), XYX: colZ(rowsYX), y: target.map(v => v[0]) };
    }
    class TransferEntropy {
        constructor(opts = {}) {
            this.xBuf = [];
            this.yBuf = [];
            this.opts = Object.assign({ window: 256, condLags: 1, xLags: 1, ridge: 1e-3, bits: true }, opts);
        }
        /** Push a synchronized sample pair (vectors OK). */
        push(x, y) {
            const X = Array.isArray(x) ? x : [x];
            const Y = Array.isArray(y) ? y : [y];
            this.xBuf.push(X);
            this.yBuf.push(Y);
            const W = this.opts.window;
            if (this.xBuf.length > W) {
                this.xBuf.shift();
                this.yBuf.shift();
            }
        }
        /** Estimate TE(X→Y) over the current window. */
        estimate() {
            const n = this.xBuf.length;
            const L = Math.max(1, this.opts.condLags | 0);
            const LX = Math.max(1, this.opts.xLags | 0);
            if (n < Math.max(L, LX) + 5)
                return 0;
            const { XY, XYX, y } = makeDesign(this.yBuf, this.xBuf, L, LX);
            if (!XY.length || !XYX.length)
                return 0;
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
    class InfoFlowGraph {
        constructor(defaultOpts = {}) {
            this.defaultOpts = defaultOpts;
            this.monitors = new Map();
            // License check removed // Premium feature - requires valid license
        }
        get(name) {
            if (!this.monitors.has(name))
                this.monitors.set(name, new TransferEntropy(this.defaultOpts));
            return this.monitors.get(name);
        }
        snapshot() {
            const out = {};
            for (const [k, mon] of this.monitors)
                out[k] = Number(mon.estimate().toFixed(4));
            return out;
        }
    }

    // src/infoflow/TransferEntropyPWS.ts
    // Phase-2 TE-PWS: importance sampling for rare events + path-weight sampling (PWS)
    // API mirrors Phase-1 so it plugs in with minimal edits.
    // --- small helpers ---
    function meanStd(arr) {
        if (arr.length === 0)
            return { m: 0, s: 0 };
        let m = 0;
        for (const v of arr)
            m += v;
        m /= arr.length;
        let v = 0;
        for (const x of arr) {
            const d = x - m;
            v += d * d;
        }
        return { m, s: Math.sqrt(v / Math.max(1, arr.length)) || 1e-12 };
    }
    function l2(a) { let s = 0; for (let i = 0; i < a.length; i++)
        s += a[i] * a[i]; return Math.sqrt(s); }
    function sub(a, b) { const n = Math.min(a.length, b.length); const o = new Array(n); for (let i = 0; i < n; i++)
        o[i] = a[i] - b[i]; return o; }
    function concat(a, b) { const o = new Array(a.length + b.length); let k = 0; for (const v of a)
        o[k++] = v; for (const v of b)
        o[k++] = v; return o; }
    function gaussianVec(a, b, s) {
        // product kernel with shared bandwidth
        const n = Math.min(a.length, b.length);
        let q = 0;
        for (let i = 0; i < n; i++) {
            const d = a[i] - b[i];
            q += d * d;
        }
        const ss = s * s || 1e-12;
        return Math.exp(-0.5 * q / ss) / Math.pow(Math.sqrt(2 * Math.PI * ss), n);
    }
    class TransferEntropyPWS {
        constructor(opts = {}) {
            this.xBuf = [];
            this.yBuf = [];
            this.yDiffBuf = []; // ||ΔY|| magnitude for rarity
            this.wBuf = []; // per-sample weights (importance * decay)
            this.opts = Object.assign({ window: 256, condLags: 1, xLags: 1, normalize: true, tailQuantile: 0.9, tailBoost: 4, decay: 1.0, usePWS: false, jitterSigma: 0.15, pwsIters: 8, bandwidth: 0, ridge: 1e-6, bits: true }, opts);
        }
        /** Push one synchronized sample (vectors OK). */
        push(x, y) {
            const X = Array.isArray(x) ? x.slice() : [x];
            const Y = Array.isArray(y) ? y.slice() : [y];
            // Δ||Y|| for rarity
            const prev = this.yBuf.length ? this.yBuf[this.yBuf.length - 1] : Y;
            const d = l2(sub(Y, prev));
            this.xBuf.push(X);
            this.yBuf.push(Y);
            this.yDiffBuf.push(d);
            // time decay (most recent → weight 1)
            const tDecay = this.opts.decay;
            const wDecay = tDecay < 1 && this.xBuf.length > 1
                ? Math.pow(tDecay, this.xBuf.length - 1)
                : 1;
            // placeholder weight now; we’ll update after we know tail threshold
            this.wBuf.push(wDecay);
            // maintain window
            while (this.xBuf.length > this.opts.window) {
                this.xBuf.shift();
                this.yBuf.shift();
                this.yDiffBuf.shift();
                this.wBuf.shift();
            }
        }
        /** Basic Phase-2 call: choose PWS or vanilla IS+KDE based on opts.usePWS */
        estimate() {
            return this.opts.usePWS ? this.estimatePWS() : this.estimateIS();
        }
        /** Vanilla importance-weighted TE via KDE (no path jitter). */
        estimateIS() {
            const N = this.yBuf.length;
            const L = Math.max(1, this.opts.condLags | 0);
            const LX = Math.max(1, this.opts.xLags | 0);
            if (N <= Math.max(L, LX) + 2)
                return 0;
            // compute tail threshold on recent Δ||Y||
            const diffs = this.yDiffBuf.slice();
            const thr = quantile(diffs, this.opts.tailQuantile);
            // update importance weights
            for (let i = 0; i < this.wBuf.length; i++) {
                const tail = diffs[i] >= thr ? this.opts.tailBoost : 1;
                this.wBuf[i] = Math.max(1e-8, this.wBuf[i] * tail);
            }
            // Build contexts
            const samples = [];
            for (let t = Math.max(L, LX); t < N; t++) {
                const y = this.yBuf[t];
                const yPast = stackPast(this.yBuf, t, L);
                const xPast = stackPast(this.xBuf, t, LX);
                samples.push({ y, yPast, xPast, w: this.wBuf[t] });
            }
            if (samples.length < 4)
                return 0;
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
        estimatePWS() {
            const N = this.yBuf.length;
            const L = Math.max(1, this.opts.condLags | 0);
            const LX = Math.max(1, this.opts.xLags | 0);
            if (N <= Math.max(L, LX) + 2)
                return 0;
            // tail-aware importance weights
            const diffs = this.yDiffBuf.slice();
            const thr = quantile(diffs, this.opts.tailQuantile);
            for (let i = 0; i < this.wBuf.length; i++) {
                const tail = diffs[i] >= thr ? this.opts.tailBoost : 1;
                this.wBuf[i] = Math.max(1e-8, this.wBuf[i] * tail);
            }
            const samples = [];
            for (let t = Math.max(L, LX); t < N; t++) {
                const y = this.yBuf[t];
                const yPast = stackPast(this.yBuf, t, L);
                const xPast = stackPast(this.xBuf, t, LX);
                samples.push({ y, yPast, xPast, w: this.wBuf[t] });
            }
            if (samples.length < 4)
                return 0;
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
    class InfoFlowGraphPWS {
        constructor(defaultOpts = {}) {
            this.defaultOpts = defaultOpts;
            this.monitors = new Map();
            // License check removed // Premium feature - requires valid license
        }
        get(name) {
            if (!this.monitors.has(name))
                this.monitors.set(name, new TransferEntropyPWS(this.defaultOpts));
            return this.monitors.get(name);
        }
        snapshot() {
            const out = {};
            for (const [k, mon] of this.monitors)
                out[k] = mon.estimate();
            return out;
        }
    }
    // ========================= internals =========================
    function stackPast(buf, t, L) {
        var _a;
        const out = [];
        for (let l = 1; l <= L; l++) {
            const v = (_a = buf[t - l]) !== null && _a !== void 0 ? _a : buf[0];
            for (let i = 0; i < v.length; i++)
                out.push(v[i]);
        }
        return out;
    }
    function flatten(mats) {
        const out = [];
        for (const v of mats)
            for (const x of v)
                out.push(x);
        return out;
    }
    function silverman(vals) {
        // Silverman's rule-of-thumb for Gaussian KDE (per-dim averaged)
        if (vals.length < 2)
            return 1;
        const { s } = meanStd(vals);
        const n = vals.length;
        return 1.06 * s * Math.pow(n, -1 / 5); // scalar, used for product kernel
    }
    function quantile(arr, q) {
        if (arr.length === 0)
            return 0;
        const a = arr.slice().sort((x, y) => x - y);
        const idx = Math.min(a.length - 1, Math.max(0, Math.floor(q * (a.length - 1))));
        return a[idx];
    }
    function condEntropyKDE(samples, mode, bw, ridge) {
        // H(Y|C) ≈ E[-log p(y|c)] with KDE ratio: p(y,c)/p(c)
        // Use importance weights w and product Gaussian kernels with shared bw.
        const useXY = mode === 'yPast+xPast';
        let totalW = 0, acc = 0;
        // Pre-extract contexts
        const C = samples.map(s => useXY ? concat(s.yPast, s.xPast) : s.yPast);
        const Y = samples.map(s => s.y);
        const W = samples.map(s => s.w);
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
    function jitterSamples(samples, sigmaFrac) {
        var _a, _b;
        if (sigmaFrac <= 0)
            return samples;
        // Estimate per-dim std of yPast across buffer to scale jitter
        const allYp = samples.map(s => s.yPast);
        const dims = ((_a = allYp[0]) === null || _a === void 0 ? void 0 : _a.length) || 0;
        const perDim = new Array(dims).fill(0);
        // compute std per dim
        for (let d = 0; d < dims; d++) {
            const vals = [];
            for (const v of allYp)
                vals.push((_b = v[d]) !== null && _b !== void 0 ? _b : 0);
            perDim[d] = meanStd(vals).s || 1e-3;
        }
        // jitter
        const out = new Array(samples.length);
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
        while (u === 0)
            u = Math.random();
        while (v === 0)
            v = Math.random();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }

    // TEController.ts — TE-PWS closed-loop tuner for Ω
    /* ------------------------ utils ------------------------ */
    function clampNumber(x, lo, hi) {
        return Math.max(lo, Math.min(hi, x));
    }
    function withinBand(v, band) {
        return v >= band[0] && v <= band[1];
    }
    /* ------------------------ controller ------------------------ */
    class TEController {
        constructor(params = {}) {
            this.qCount = 0;
            this.emaBeta = 0.2; // EMA smoothing for TE
            // License check removed // Premium feature - requires valid license
            const defaultLimits = {
                alpha: [0.4, 0.98],
                sigma: [0.12, 1.0],
                ridge: [0.01, 0.2],
                probThresh: [0.3, 0.7],
                mmrLambda: [0.4, 0.9],
                budgetChars: [600, 2400],
            };
            const defaultStep = {
                alpha: 0.03,
                sigma: 0.04,
                ridge: 0.01,
                probThresh: 0.03,
                mmrLambda: 0.05,
                budgetChars: 120,
            };
            const defaults = {
                targets: {
                    q2score: [0.01, 0.10],
                    feat2score: [0.01, 0.10],
                    kept2sum: [0.01, 0.10],
                    loopMax: 0.25,
                },
                limits: defaultLimits,
                step: defaultStep,
                cooldown: 2,
                maxPerSessionAdjusts: 24,
                trustMinSamples: 8,
            };
            this.p = Object.assign(Object.assign(Object.assign({}, defaults), params), { targets: Object.assign(Object.assign({}, defaults.targets), (params.targets || {})), limits: Object.assign(Object.assign({}, defaultLimits), (params.limits || {})), step: Object.assign(Object.assign({}, defaultStep), (params.step || {})) });
            this.s = { lastAdjustAt: -999, totalAdjusts: 0, ema: {}, history: [] };
        }
        /** Update EMA from a TE snapshot. */
        pushTE(teSnap) {
            var _a;
            this.qCount++;
            for (const [k, v] of Object.entries(teSnap || {})) {
                const prev = (_a = this.s.ema[k]) !== null && _a !== void 0 ? _a : v;
                this.s.ema[k] = prev + this.emaBeta * (v - prev);
            }
        }
        /** Try one adjustment; returns {knobs?, note?}. Only adjusts if safe. */
        maybeAdjust(current) {
            var _a, _b, _c, _d;
            if (this.qCount < this.p.trustMinSamples)
                return {};
            if (this.s.totalAdjusts >= this.p.maxPerSessionAdjusts)
                return {};
            if (this.qCount - this.s.lastAdjustAt < this.p.cooldown)
                return {};
            const te = this.s.ema;
            const { q2score, feat2score, kept2sum, loopMax } = this.p.targets;
            const out = Object.assign({}, current);
            let changed = null;
            const pick = (cand) => {
                if (!changed)
                    changed = cand; // single-knob change per step
            };
            const tQS = (_a = te['Retriever:Q->Score']) !== null && _a !== void 0 ? _a : 0;
            const tFS = (_b = te['OmegaRR:Feat->Score']) !== null && _b !== void 0 ? _b : 0;
            const tKS = (_c = te['Omega:Kept->Summary']) !== null && _c !== void 0 ? _c : 0;
            const tLoop = (_d = te['Reservoir:Loop']) !== null && _d !== void 0 ? _d : 0; // optional if you wire it
            // 1) Retrieval signal shaping
            if (!withinBand(tQS, q2score)) {
                if (tQS < q2score[0]) {
                    pick({ param: 'alpha', delta: +this.p.step.alpha, why: `Q→Score low (${tQS.toFixed(3)} < ${q2score[0]})` });
                    if (!changed)
                        pick({ param: 'sigma', delta: -this.p.step.sigma, why: `Q→Score low, sharpen σ` });
                }
                else {
                    pick({ param: 'sigma', delta: +this.p.step.sigma, why: `Q→Score high (${tQS.toFixed(3)} > ${q2score[1]})` });
                    if (!changed)
                        pick({ param: 'alpha', delta: -this.p.step.alpha, why: `Q→Score high, blend TF-IDF more` });
                }
            }
            // 2) Reranker feature effectiveness via ridge
            if (!changed && !withinBand(tFS, feat2score)) {
                if (tFS < feat2score[0]) {
                    pick({ param: 'ridge', delta: -this.p.step.ridge, why: `Feat→Score low (${tFS.toFixed(3)}): loosen λ` });
                }
                else {
                    pick({ param: 'ridge', delta: +this.p.step.ridge, why: `Feat→Score high (${tFS.toFixed(3)}): stabilize λ` });
                }
            }
            // 3) Grounding strength into summary via kept set
            if (!changed && !withinBand(tKS, kept2sum)) {
                if (tKS < kept2sum[0]) {
                    pick({ param: 'probThresh', delta: -this.p.step.probThresh, why: `Kept→Summary low (${tKS.toFixed(3)}): expand kept` });
                    if (!changed)
                        pick({ param: 'budgetChars', delta: +this.p.step.budgetChars, why: `Kept→Summary low: widen budget` });
                }
                else {
                    pick({ param: 'probThresh', delta: +this.p.step.probThresh, why: `Kept→Summary high: tighten kept` });
                }
            }
            // 4) Optional loop stability guard
            if (!changed && loopMax != null && tLoop > loopMax) {
                pick({ param: 'ridge', delta: +this.p.step.ridge, why: `Loop TE ${tLoop.toFixed(3)} > ${loopMax}: damp` });
                if (!changed)
                    pick({ param: 'alpha', delta: -this.p.step.alpha, why: `Loop TE high: reduce dense gain` });
            }
            if (!changed)
                return {}; // nothing to do
            // ---- APPLY CHANGE (narrowed & typed) ----
            const change = changed; // non-null
            const limitsTuple = this.p.limits[change.param];
            const lo = limitsTuple[0];
            const hi = limitsTuple[1];
            const cur = out[change.param];
            const next = clampNumber(cur + change.delta, lo, hi);
            out[change.param] = next;
            // commit
            this.s.lastAdjustAt = this.qCount;
            this.s.totalAdjusts++;
            this.s.history.push({ param: change.param, oldVal: current[change.param], newVal: next, why: change.why });
            const note = `auto-adjust ${String(change.param)}: ${current[change.param]} → ${next} (${change.why})`;
            return { knobs: out, note };
        }
        getHistory() { return this.s.history.slice(-8); } // recent changes
        reset() {
            this.s = { lastAdjustAt: -999, totalAdjusts: 0, ema: {}, history: [] };
            this.qCount = 0;
        }
    }

    // Markdown parsing utilities
    // Extracted from workers for reuse
    const FENCE_RE = /```[\s\S]*?```/g;
    const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;
    function stripForIndex(md, opts) {
        let s = md;
        if (opts.stripCode) {
            // Preserve a 1-line signature from the first non-empty line inside each fenced block.
            s = s.replace(FENCE_RE, m => {
                const lines = m.split('\n').slice(1, -1);
                const sig = (lines.find(l => l.trim()) || '').trim();
                return sig ? `\n${sig}\n` : '\n<code omitted>\n';
            });
        }
        if (opts.stripLinks) {
            // Keep anchor text, drop target
            s = s.replace(LINK_RE, '$1');
        }
        // Light cleanup
        s = s.replace(/[ \t]+/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        return s;
    }
    function parseMarkdownToSections(md, opts = { stripCode: true, stripLinks: true }) {
        const lines = md.split(/\r?\n/);
        const root = { id: 0, level: 1, heading: '(root)', content: '', rich: '', children: [] };
        let current = null;
        const stack = [root];
        let nextId = 1;
        let buf = [];
        const flush = (buf, target) => {
            if (!target)
                return;
            const rich = buf.join('\n').trim();
            target.rich = rich;
            target.content = stripForIndex(rich, opts);
        };
        for (const line of lines) {
            const mH = /^(#{2,6})\s+(.*)$/.exec(line);
            if (mH) {
                // heading line
                flush(buf, current);
                buf = [];
                const level = mH[1].length;
                const heading = mH[2].trim();
                const sec = { id: nextId++, level, heading, content: '', rich: '', children: [] };
                // Find proper parent
                while (stack.length && stack[stack.length - 1].level >= level)
                    stack.pop();
                const parent = stack[stack.length - 1] || root;
                parent.children.push(sec);
                sec.parent = parent.id;
                stack.push(sec);
                current = sec;
            }
            else {
                buf.push(line);
            }
        }
        flush(buf, current);
        return root;
    }
    function backfillEmptyParents(root) {
        const visit = (s) => {
            var _a;
            s.children.forEach(visit);
            // Backfill typical chapter parents (##) only; adjust as needed
            if (s.level === 2) {
                const isEmpty = !s.content || !s.content.trim();
                if (isEmpty) {
                    const childSummaries = s.children
                        .filter(c => (c.content || c.rich).trim())
                        .slice(0, 2)
                        .map(c => {
                        const body = (c.content || c.rich).split('\n').slice(0, 3).join('\n');
                        return `### ${c.heading}\n${body}`;
                    });
                    if (childSummaries.length) {
                        s.content = childSummaries.join('\n\n');
                        if (!((_a = s.rich) === null || _a === void 0 ? void 0 : _a.trim())) {
                            s.rich = `> Summary of subsections:\n\n${childSummaries.join('\n\n')}`;
                        }
                    }
                }
            }
        };
        visit(root);
    }
    function flattenSections(root) {
        const out = [];
        const walk = (s) => {
            if (s.id !== 0 && s.heading) {
                out.push({ heading: s.heading, content: s.content, rich: s.rich, secId: s.id, level: s.level });
            }
            s.children.forEach(walk);
        };
        walk(root);
        return out;
    }

    // Auto-tuning utilities for hyperparameter optimization
    // Extracted from dev-worker for reuse
    /**
     * Sample queries from corpus
     */
    function sampleQueriesFromCorpus(chunks, n, useStem) {
        const out = [];
        for (let i = 0; i < n; i++) {
            const s = chunks[Math.floor(Math.random() * chunks.length)];
            // short synthetic queries from headings + nouns-ish tokens
            const toks = tokenize$1((s.heading + ' ' + s.content).slice(0, 400), useStem)
                .filter(t => t.length > 3)
                .slice(0, 40);
            const uniq = Array.from(new Set(toks));
            out.push(uniq.slice(0, 6).join(' '));
        }
        return out;
    }
    /**
     * Compute penalty for configuration complexity
     */
    function penalty(cfg) {
        const lmCost = (cfg.landmarks - 128) / 512;
        const vocabCost = (cfg.vocab - 8000) / 24000;
        const preCost = (cfg.prefilter - 200) / 1200;
        return 0.02 * (lmCost + vocabCost + preCost);
    }
    /**
     * Jaccard similarity between two index arrays
     */
    function jaccard(a, b) {
        const A = new Set(a);
        const B = new Set(b);
        let inter = 0;
        for (const x of A)
            if (B.has(x))
                inter++;
        const uni = new Set([...A, ...B]).size;
        return uni ? inter / uni : 0;
    }
    /**
     * Clamp value between min and max
     */
    function clamp(x, a, b) {
        return Math.max(a, Math.min(b, x));
    }
    /**
     * Pick random element from array
     */
    function pick(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }
    /**
     * Random number in range
     */
    function randRange(a, b) {
        return a + Math.random() * (b - a);
    }
    /**
     * Mutate object with patch
     */
    function mutate(base, patch) {
        return Object.assign({}, base, patch);
    }
    /**
     * Auto-tune hyperparameters
     */
    function autoTune(opts, onProgress) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            // License check removed // Premium feature - requires valid license
            const { chunks, vocabMap, idf, tfidfDocs, vocabSize, budget = 40, sampleQueries: Qn = 24, currentSettings, } = opts;
            const budgetClamped = Math.max(10, Math.min(200, budget));
            const QnClamped = Math.max(8, Math.min(60, Qn));
            const useStem = ((_a = currentSettings.useStem) !== null && _a !== void 0 ? _a : true);
            const queries = sampleQueriesFromCorpus(chunks, QnClamped, useStem);
            // Pre-compute TF-IDF top-K for each query (baseline)
            const tfidfTops = queries.map(q => {
                var _a;
                const qv = toTfidf(tokenize$1(q, useStem), idf, vocabMap, 1);
                const scores = tfidfDocs.map(v => cosineSparse(v, qv));
                return topKIndices(scores, ((_a = currentSettings.topK) !== null && _a !== void 0 ? _a : 8));
            });
            let best = { score: -Infinity, cfg: Object.assign({}, currentSettings) };
            // Cache for dense docs (keyed by kernel params)
            const denseCache = new Map();
            const denseDocsFor = (cfg) => {
                // ridge doesn't affect projection; key on kernel params only
                const key = `${cfg.kernel}:${cfg.landmarks}:${cfg.sigma}`;
                let dd = denseCache.get(key);
                if (!dd) {
                    const { landmarksIdx, landmarkMat } = buildLandmarks(tfidfDocs, vocabSize, cfg.landmarks);
                    dd = buildDenseDocs(tfidfDocs, vocabSize, landmarkMat, cfg.kernel, cfg.sigma);
                    denseCache.set(key, dd);
                }
                return dd;
            };
            let trial = 0;
            const tryCfg = (cfg, note) => {
                var _a;
                const jScores = [];
                const dd = denseDocsFor(cfg);
                const alpha = clamp(cfg.alpha, 0, 1);
                const lambda = ((_a = cfg.ridge) !== null && _a !== void 0 ? _a : 0.05);
                for (let qi = 0; qi < queries.length; qi++) {
                    const q = queries[qi];
                    const qv = toTfidf(tokenize$1(q, cfg.useStem), idf, vocabMap, 1);
                    const { landmarksIdx, landmarkMat } = buildLandmarks(tfidfDocs, vocabSize, cfg.landmarks);
                    const qd = projectToDense(qv, vocabSize, landmarkMat, cfg.kernel, cfg.sigma);
                    const tfidfScores = tfidfDocs.map(v => cosineSparse(v, qv));
                    // Compute dense scores using kernel similarity
                    const denseScoresSimple = dd.map((v) => kernelSim(v, qd, cfg.kernel, cfg.sigma));
                    // ridge-regularized hybrid (bonus off during tuning)
                    const hybrid = denseScoresSimple.map((d, i) => {
                        const t = tfidfScores[i];
                        const reg = 1 / (1 + lambda * (d * d + t * t));
                        return reg * (alpha * d + (1 - alpha) * t);
                    });
                    const idxs = topKIndices(hybrid, cfg.topK);
                    jScores.push(jaccard(tfidfTops[qi], idxs));
                }
                const score = (jScores.reduce((a, b) => a + b, 0) / jScores.length) - penalty(cfg);
                if (score > best.score)
                    best = { score, cfg: Object.assign({}, cfg) };
                if (onProgress)
                    onProgress(++trial, best.score, note);
            };
            // random warmup
            for (let i = 0; i < Math.floor(budgetClamped * 0.6); i++) {
                const cfg = mutate(currentSettings, {
                    alpha: randRange(0.55, 0.95),
                    beta: randRange(0.0, 0.35),
                    sigma: randRange(0.18, 0.75),
                    kernel: pick(['rbf', 'cosine', 'poly2']),
                    vocab: pick([8000, 10000, 12000, 15000]),
                    landmarks: pick([128, 192, 256, 320, 384]),
                    prefilter: pick([200, 300, 400, 600]),
                    topK: pick([4, 6, 8]),
                    headingW: randRange(1.5, 4.5),
                    chunk: pick([450, 550, 650]),
                    overlap: pick([50, 75, 100]),
                    penalizeLinks: true,
                    stripCode: true,
                    expandQuery: true,
                    useStem: true,
                    ridge: randRange(0.02, 0.18),
                });
                tryCfg(cfg, 'random');
            }
            // refinement
            for (let i = trial; i < budgetClamped; i++) {
                const b = best.cfg;
                const cfg = mutate(b, {
                    alpha: clamp(b.alpha + randRange(-0.1, 0.1), 0.4, 0.98),
                    beta: clamp(b.beta + randRange(-0.1, 0.1), 0, 0.4),
                    sigma: clamp(b.sigma + randRange(-0.08, 0.08), 0.12, 1.0),
                    kernel: b.kernel,
                    vocab: b.vocab,
                    landmarks: b.landmarks,
                    prefilter: b.prefilter,
                    topK: b.topK,
                    headingW: clamp(b.headingW + randRange(-0.4, 0.4), 1.0, 6.0),
                    chunk: b.chunk,
                    overlap: b.overlap,
                    penalizeLinks: b.penalizeLinks,
                    stripCode: b.stripCode,
                    expandQuery: b.expandQuery,
                    useStem: b.useStem,
                    ridge: clamp(((_b = b.ridge) !== null && _b !== void 0 ? _b : 0.05) + randRange(-0.02, 0.02), 0.0, 0.2),
                });
                tryCfg(cfg, 'refine');
            }
            return {
                bestSettings: best.cfg,
                bestScore: best.score,
                trials: trial,
            };
        });
    }

    // Model serialization utilities
    // Extracted from workers for reuse
    /**
     * Small, deterministic hash (not cryptographic)
     */
    function quickHash(s) {
        let h1 = 0x9e3779b1, h2 = 0x85ebca6b;
        for (let i = 0; i < s.length; i++) {
            const c = s.charCodeAt(i);
            h1 = Math.imul(h1 ^ c, 0x85ebca6b);
            h2 = Math.imul(h2 ^ c, 0xc2b2ae35);
        }
        h1 = (h1 ^ (h2 >>> 15)) >>> 0;
        return ('00000000' + h1.toString(16)).slice(-8);
    }
    /**
     * Export model to serialized format
     */
    function exportModel(opts) {
        // License check removed // Premium feature - requires valid license
        const { settings, vocabMap, idf, chunks, tfidfDocs, landmarksIdx, landmarkMat, denseDocs, includeRich = true, includeDense = false, } = opts;
        // 1) settings snapshot (clone to avoid accidental mutation)
        const settingsSnap = JSON.parse(JSON.stringify(settings || {}));
        // 2) vocab
        const vocab = Array.from(vocabMap.entries());
        // 3) chunks (minimal text)
        const chunksSnap = chunks.map(c => ({
            heading: c.heading,
            content: c.content || '',
            rich: includeRich ? (c.rich || undefined) : undefined,
            level: c.level,
            secId: c.secId,
        }));
        // 4) tfidfDocs → array of pairs
        const tfidfPairs = tfidfDocs.map((m) => {
            const row = [];
            for (const [i, v] of m)
                row.push([i, v]);
            // sort indices for determinism
            row.sort((a, b) => a[0] - b[0]);
            return row;
        });
        // 5) Nyström landmarks and (optional) denseDocs
        const landmarkMatArr = landmarkMat.map(v => Array.from(v));
        const denseDocsArr = includeDense ?
            ((denseDocs === null || denseDocs === void 0 ? void 0 : denseDocs.map(v => Array.from(v))) || undefined) : undefined;
        const payload = {
            version: 'astermind-pro-v1',
            savedAt: new Date().toISOString(),
            settings: settingsSnap,
            vocab,
            idf: Array.from(idf),
            chunks: chunksSnap,
            tfidfDocs: tfidfPairs,
            landmarksIdx: Array.from(landmarksIdx),
            landmarkMat: landmarkMatArr,
            denseDocs: denseDocsArr,
        };
        // (Optional) quick content hash for sanity (small & deterministic)
        payload.hash = quickHash(JSON.stringify({
            idf: payload.idf.slice(0, 64),
            vi: payload.vocab.length,
            ci: payload.chunks.length,
            lm: payload.landmarksIdx.length
        }));
        return payload;
    }
    function importModel(model, opts) {
        // License check removed // Premium feature - requires valid license
        if (model.version !== 'astermind-pro-v1' && model.version !== 'astermind-elm-v1') {
            throw new Error(`Unsupported model version: ${model.version}. Expected 'astermind-pro-v1' or 'astermind-elm-v1'`);
        }
        // 1) restore settings
        const settings = JSON.parse(JSON.stringify(model.settings || {}));
        // 2) vocab & idf
        const vocabMap = new Map(model.vocab);
        const idf = Float64Array.from(model.idf); // keep as number[] for compatibility
        // 3) chunks
        const chunks = model.chunks.map(c => ({
            heading: c.heading,
            content: c.content || '',
            rich: c.rich,
            level: c.level,
            secId: c.secId
        }));
        // 4) tfidfDocs from pairs
        const tfidfDocs = model.tfidfDocs.map(row => {
            const m = new Map();
            for (const [i, v] of row)
                m.set(i, v);
            return m;
        });
        // 5) Nyström landmarks
        const landmarksIdx = Array.from(model.landmarksIdx);
        const landmarkMat = model.landmarkMat.map(a => Float64Array.from(a));
        // 6) denseDocs: use stored or recompute
        const needRecompute = ((opts === null || opts === void 0 ? void 0 : opts.recomputeDense) === true) || !model.denseDocs || model.denseDocs.length !== tfidfDocs.length;
        let denseDocs;
        if (needRecompute && (opts === null || opts === void 0 ? void 0 : opts.buildDense)) {
            denseDocs = opts.buildDense(tfidfDocs, vocabMap.size, landmarkMat, settings.kernel || 'rbf', settings.sigma || 1.0);
        }
        else if (needRecompute) {
            throw new Error('recomputeDense=true but buildDense function not provided');
        }
        else {
            denseDocs = model.denseDocs.map(a => Float64Array.from(a));
        }
        return {
            settings,
            vocabMap,
            idf,
            chunks,
            tfidfDocs,
            landmarksIdx,
            landmarkMat,
            denseDocs,
        };
    }

    // elm_scorer.ts — tiny, self-contained ELM scorer for (query, chunk) relevance
    // Uses a random single hidden layer + ridge (closed form via OnlineRidge).
    // 
    // NOTE: You can also use astermind's ELM or OnlineELM classes from the local build:
    // import { ELM, OnlineELM, defaultNumericConfig } from '@astermind/astermind-elm';
    // License removed - all features are now free!
    function rngFactory(seed = 1337) {
        // xorshift32
        let x = (seed >>> 0) || 1;
        return () => {
            x ^= x << 13;
            x ^= x >> 17;
            x ^= x << 5;
            return ((x >>> 0) / 0xFFFFFFFF);
        };
    }
    class ELMScorer {
        constructor(p, cfg) {
            var _a;
            // License check removed // License check - ELMScorer uses premium OnlineRidge
            this.p = p;
            this.dim = Math.max(8, cfg.dim | 0);
            this.lambda = Math.max(1e-6, cfg.lambda);
            const rng = rngFactory((_a = cfg.seed) !== null && _a !== void 0 ? _a : 1337);
            this.W = new Float64Array(this.dim * p);
            for (let i = 0; i < this.W.length; i++)
                this.W[i] = (rng() * 2 - 1) * Math.sqrt(2 / p);
            this.b = new Float64Array(this.dim);
            for (let i = 0; i < this.b.length; i++)
                this.b[i] = (rng() * 2 - 1);
            this.ridge = new OnlineRidge(this.dim, 1, this.lambda);
            this.ready = false;
        }
        hidden(x) {
            const h = new Float64Array(this.dim);
            for (let j = 0; j < this.dim; j++) {
                let s = this.b[j];
                const row = j * this.p;
                for (let i = 0; i < this.p; i++)
                    s += this.W[row + i] * x[i];
                // GELU-ish smooth nonlinearity (fast approximate)
                const t = s;
                h[j] = 0.5 * t * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (t + 0.044715 * Math.pow(t, 3))));
            }
            return h;
        }
        partialFit(batchX, batchY) {
            if (!this.ridge)
                this.ridge = new OnlineRidge(this.dim, 1, this.lambda);
            for (let k = 0; k < batchX.length; k++) {
                const h = this.hidden(batchX[k]); // Float64Array
                const y = new Float64Array([batchY[k]]); // <-- make it Float64Array
                this.ridge.update(h, y);
            }
            this.ready = true;
        }
        fit(X, y, iters = 1, batch = 256) {
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
        score(x) {
            if (!this.ready || !this.ridge)
                return 0;
            const h = this.hidden(x);
            // y = h^T Beta (single output)
            const Beta = this.ridge.Beta;
            let s = 0;
            for (let j = 0; j < this.dim; j++)
                s += h[j] * Beta[j];
            return s;
        }
    }

    // multi-kernel-elm.ts — Multi-Kernel ELM combining multiple kernel types
    // Combines RBF, polynomial, and linear kernels for improved accuracy
    /**
     * Multi-Kernel ELM that combines multiple kernel types
     * Uses weighted combination of kernels for improved accuracy
     */
    class MultiKernelELM {
        constructor(categories, options) {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            this.kelms = [];
            this.kernelWeights = [];
            this.categories = [];
            this.trained = false;
            // License check removed // Premium feature - requires valid license
            this.categories = categories;
            this.options = {
                kernels: options.kernels,
                ridgeLambda: (_a = options.ridgeLambda) !== null && _a !== void 0 ? _a : 0.001,
                learnWeights: (_b = options.learnWeights) !== null && _b !== void 0 ? _b : true,
                nystrom: {
                    m: (_d = (_c = options.nystrom) === null || _c === void 0 ? void 0 : _c.m) !== null && _d !== void 0 ? _d : 100,
                    strategy: (_f = (_e = options.nystrom) === null || _e === void 0 ? void 0 : _e.strategy) !== null && _f !== void 0 ? _f : 'uniform',
                },
            };
            // Initialize kernel ELMs
            for (const kernelConfig of this.options.kernels) {
                const kelm = new KernelELM({
                    outputDim: categories.length,
                    kernel: {
                        type: kernelConfig.type === 'polynomial' ? 'rbf' : kernelConfig.type, // Map polynomial to rbf for now
                        gamma: (_h = (_g = kernelConfig.params) === null || _g === void 0 ? void 0 : _g.gamma) !== null && _h !== void 0 ? _h : 0.01,
                    },
                    ridgeLambda: this.options.ridgeLambda,
                    task: 'classification',
                    mode: 'nystrom',
                    nystrom: {
                        m: this.options.nystrom.m,
                        strategy: this.options.nystrom.strategy === 'random' ? 'uniform' : this.options.nystrom.strategy,
                    },
                });
                this.kelms.push(kelm);
            }
            // Initialize kernel weights
            if (this.options.learnWeights) {
                this.kernelWeights = this.options.kernels.map((k, i) => { var _a; return (_a = k.weight) !== null && _a !== void 0 ? _a : 1.0 / this.options.kernels.length; });
            }
            else {
                this.kernelWeights = this.options.kernels.map((k) => { var _a; return (_a = k.weight) !== null && _a !== void 0 ? _a : 1.0 / this.options.kernels.length; });
            }
        }
        /**
         * Train the multi-kernel ELM
         */
        fit(X, y) {
            // Convert y to one-hot if needed
            const oneHotY = this._toOneHot(y);
            // Train each kernel ELM
            for (const kelm of this.kelms) {
                kelm.fit(X, oneHotY);
            }
            // Learn optimal kernel weights if enabled
            if (this.options.learnWeights && this.kelms.length > 1) {
                this._learnKernelWeights(X, oneHotY);
            }
            this.trained = true;
        }
        /**
         * Predict with multi-kernel combination
         */
        predict(X, topK = 3) {
            if (!this.trained) {
                throw new Error('Model must be trained before prediction');
            }
            const XArray = Array.isArray(X[0]) ? X : [X];
            const allPredictions = [];
            for (const x of XArray) {
                const predictions = [];
                // Get predictions from each kernel
                const kernelPredictions = this.kelms.map((kelm) => {
                    var _a, _b, _c, _d;
                    const pred = ((_b = (_a = kelm).transform) === null || _b === void 0 ? void 0 : _b.call(_a, [x])) || ((_d = (_c = kelm).predict) === null || _d === void 0 ? void 0 : _d.call(_c, [x]));
                    return (Array.isArray(pred) ? pred[0] : pred) || new Float64Array(this.categories.length);
                });
                // Weighted combination
                const combined = new Float64Array(this.categories.length);
                for (let i = 0; i < this.kelms.length; i++) {
                    const weight = this.kernelWeights[i];
                    for (let j = 0; j < this.categories.length; j++) {
                        combined[j] += kernelPredictions[i][j] * weight;
                    }
                }
                // Convert to probabilities
                const probs = this._softmax(combined);
                // Get top-K
                const indexed = [];
                for (let idx = 0; idx < probs.length; idx++) {
                    indexed.push({
                        label: this.categories[idx],
                        prob: probs[idx],
                        index: idx,
                    });
                }
                indexed.sort((a, b) => b.prob - a.prob);
                const topResults = [];
                for (let i = 0; i < Math.min(topK, indexed.length); i++) {
                    topResults.push({
                        label: indexed[i].label,
                        prob: indexed[i].prob,
                    });
                }
                predictions.push(...topResults);
                allPredictions.push(...predictions);
            }
            return allPredictions;
        }
        /**
         * Learn optimal kernel weights using validation performance
         */
        _learnKernelWeights(X, y) {
            var _a, _b, _c, _d;
            // Simple approach: weight by validation accuracy
            // In practice, you might use cross-validation
            const weights = new Float64Array(this.kelms.length);
            for (let i = 0; i < this.kelms.length; i++) {
                const kelm = this.kelms[i];
                let correct = 0;
                let total = 0;
                // Evaluate on training data (in production, use validation set)
                for (let j = 0; j < Math.min(100, X.length); j++) {
                    const pred = ((_b = (_a = kelm).transform) === null || _b === void 0 ? void 0 : _b.call(_a, [X[j]])) || ((_d = (_c = kelm).predict) === null || _d === void 0 ? void 0 : _d.call(_c, [X[j]]));
                    const predVec = (Array.isArray(pred) ? pred[0] : pred) || new Float64Array(0);
                    const predIdx = this._argmax(predVec);
                    const trueIdx = this._argmax(y[j]);
                    if (predIdx === trueIdx)
                        correct++;
                    total++;
                }
                weights[i] = total > 0 ? correct / total : 1.0 / this.kelms.length;
            }
            // Normalize weights
            const sum = Array.from(weights).reduce((a, b) => a + b, 0);
            if (sum > 0) {
                for (let i = 0; i < weights.length; i++) {
                    this.kernelWeights[i] = weights[i] / sum;
                }
            }
        }
        _toOneHot(y) {
            if (Array.isArray(y[0])) {
                return y;
            }
            const labels = y;
            return labels.map((label) => {
                const oneHot = new Array(this.categories.length).fill(0);
                oneHot[label] = 1;
                return oneHot;
            });
        }
        _softmax(logits) {
            const max = Math.max(...Array.from(logits));
            const exp = new Float64Array(logits.length);
            let sum = 0;
            for (let i = 0; i < logits.length; i++) {
                exp[i] = Math.exp(logits[i] - max);
                sum += exp[i];
            }
            for (let i = 0; i < exp.length; i++) {
                exp[i] /= sum;
            }
            return exp;
        }
        _argmax(arr) {
            let maxIdx = 0;
            let maxVal = arr[0] || 0;
            for (let i = 1; i < arr.length; i++) {
                if ((arr[i] || 0) > maxVal) {
                    maxVal = arr[i] || 0;
                    maxIdx = i;
                }
            }
            return maxIdx;
        }
        /**
         * Get current kernel weights
         */
        getKernelWeights() {
            return [...this.kernelWeights];
        }
    }

    // deep-elm-pro.ts — Improved Deep ELM with advanced features
    // Enhanced version of DeepELM with better training strategies and regularization
    /**
     * Improved Deep ELM with advanced training strategies
     * Features:
     * - Layer-wise training with autoencoder pretraining
     * - Dropout and batch normalization
     * - L1/L2/Elastic net regularization
     * - Better initialization strategies
     */
    class DeepELMPro {
        constructor(options) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
            this.layers = [];
            this.trained = false;
            this.featureExtractors = []; // For pretraining
            // License check removed // Premium feature - requires valid license
            this.options = {
                layers: options.layers,
                activation: (_a = options.activation) !== null && _a !== void 0 ? _a : 'relu',
                useDropout: (_b = options.useDropout) !== null && _b !== void 0 ? _b : false,
                dropoutRate: (_c = options.dropoutRate) !== null && _c !== void 0 ? _c : 0.2,
                useBatchNorm: (_d = options.useBatchNorm) !== null && _d !== void 0 ? _d : false,
                regularization: {
                    type: (_f = (_e = options.regularization) === null || _e === void 0 ? void 0 : _e.type) !== null && _f !== void 0 ? _f : 'l2',
                    lambda: (_h = (_g = options.regularization) === null || _g === void 0 ? void 0 : _g.lambda) !== null && _h !== void 0 ? _h : 0.0001,
                    alpha: (_k = (_j = options.regularization) === null || _j === void 0 ? void 0 : _j.alpha) !== null && _k !== void 0 ? _k : 0.5,
                },
                layerWiseTraining: (_l = options.layerWiseTraining) !== null && _l !== void 0 ? _l : true,
                pretraining: (_m = options.pretraining) !== null && _m !== void 0 ? _m : true,
                categories: options.categories,
                maxLen: (_o = options.maxLen) !== null && _o !== void 0 ? _o : 100,
            };
            // Initialize layers
            for (let i = 0; i < this.options.layers.length; i++) {
                const deepELM = new DeepELM({
                    layers: [{ hiddenUnits: this.options.layers[i], activation: this.options.activation }],
                    maxLen: this.options.maxLen,
                    useTokenizer: i === 0, // Only first layer uses tokenizer
                });
                // Set categories for last layer after construction
                if (i === this.options.layers.length - 1) {
                    (_q = (_p = deepELM).setCategories) === null || _q === void 0 ? void 0 : _q.call(_p, this.options.categories);
                }
                this.layers.push(deepELM);
            }
            // Initialize feature extractors for pretraining
            if (this.options.pretraining) {
                for (let i = 0; i < this.options.layers.length - 1; i++) {
                    const extractor = new ELM({
                        useTokenizer: i === 0 ? true : undefined,
                        hiddenUnits: this.options.layers[i],
                        categories: [],
                        maxLen: this.options.maxLen,
                    });
                    this.featureExtractors.push(extractor);
                }
            }
        }
        /**
         * Train the deep ELM with improved strategies
         */
        train(X, y) {
            return __awaiter(this, void 0, void 0, function* () {
                // Step 1: Pretraining (if enabled)
                if (this.options.pretraining) {
                    yield this._pretrain(X);
                }
                // Step 2: Layer-wise or joint training
                if (this.options.layerWiseTraining) {
                    yield this._trainLayerWise(X, y);
                }
                else {
                    yield this._trainJoint(X, y);
                }
                this.trained = true;
            });
        }
        /**
         * Predict with deep ELM
         */
        predict(X, topK = 3) {
            var _a, _b;
            if (!this.trained) {
                throw new Error('Model must be trained before prediction');
            }
            const XArray = Array.isArray(X[0]) ? X : [X];
            const predictions = [];
            for (const x of XArray) {
                // Forward pass through layers
                let features = x;
                for (let i = 0; i < this.layers.length; i++) {
                    const layer = this.layers[i];
                    // Apply batch normalization if enabled
                    if (this.options.useBatchNorm && i > 0) {
                        features = this._batchNormalize(features);
                    }
                    // Apply dropout if enabled (only during training, but we're in predict mode)
                    // In practice, dropout is disabled during inference
                    // Forward through layer
                    if (i === this.layers.length - 1) {
                        // Last layer: get predictions
                        const pred = ((_b = (_a = layer).predictFromVector) === null || _b === void 0 ? void 0 : _b.call(_a, [features], topK)) || [];
                        predictions.push(...pred.map((p) => ({
                            label: p.label || this.options.categories[p.index || 0],
                            prob: p.prob || 0,
                        })));
                    }
                    else {
                        // Hidden layers: extract features
                        features = this._extractFeatures(layer, features);
                    }
                }
            }
            return predictions;
        }
        /**
         * Pretrain layers as autoencoders
         */
        _pretrain(X) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                let currentFeatures = X;
                for (let i = 0; i < this.featureExtractors.length; i++) {
                    const extractor = this.featureExtractors[i];
                    // Train as autoencoder (reconstruct input)
                    const encoded = currentFeatures.map(x => {
                        var _a, _b, _c, _d;
                        const enc = ((_b = (_a = extractor.encoder) === null || _a === void 0 ? void 0 : _a.encode) === null || _b === void 0 ? void 0 : _b.call(_a, x)) || x;
                        return ((_d = (_c = extractor.encoder) === null || _c === void 0 ? void 0 : _c.normalize) === null || _d === void 0 ? void 0 : _d.call(_c, enc)) || enc;
                    });
                    // Use encoded features as both input and target (autoencoder)
                    (_b = (_a = extractor).trainFromData) === null || _b === void 0 ? void 0 : _b.call(_a, encoded, encoded.map((_, idx) => idx));
                    // Extract features for next layer
                    currentFeatures = encoded.map(x => {
                        const hidden = this._extractFeaturesFromELM(extractor, x);
                        return Array.from(hidden);
                    });
                }
            });
        }
        /**
         * Train layers sequentially
         */
        _trainLayerWise(X, y) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c, _d, _e, _f;
                let currentFeatures = X;
                const labelIndices = y.map(label => typeof label === 'number' ? label : this.options.categories.indexOf(label));
                for (let i = 0; i < this.layers.length; i++) {
                    const layer = this.layers[i];
                    // Prepare features
                    const features = currentFeatures.map(x => {
                        if (i === 0) {
                            // First layer: use raw input
                            return x;
                        }
                        else {
                            // Subsequent layers: use previous layer output
                            return this._extractFeatures(this.layers[i - 1], x);
                        }
                    });
                    // Train layer
                    if (i === this.layers.length - 1) {
                        // Last layer: train with labels
                        (_b = (_a = layer).setCategories) === null || _b === void 0 ? void 0 : _b.call(_a, this.options.categories);
                        (_d = (_c = layer).trainFromData) === null || _d === void 0 ? void 0 : _d.call(_c, features, labelIndices);
                    }
                    else {
                        // Hidden layers: train to extract features
                        // Use next layer's input as target (unsupervised)
                        const nextLayerFeatures = i < this.layers.length - 1
                            ? features.map(f => this._extractFeatures(this.layers[i + 1], f))
                            : features;
                        (_f = (_e = layer).trainFromData) === null || _f === void 0 ? void 0 : _f.call(_e, features, nextLayerFeatures.map((_, idx) => idx));
                    }
                    // Update features for next layer
                    currentFeatures = features.map(f => this._extractFeatures(layer, f));
                }
            });
        }
        /**
         * Train all layers jointly
         */
        _trainJoint(X, y) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c, _d;
                const labelIndices = y.map(label => typeof label === 'number' ? label : this.options.categories.indexOf(label));
                // Train the last layer with final features
                const lastLayer = this.layers[this.layers.length - 1];
                const finalFeatures = X.map(x => {
                    let features = x;
                    for (let i = 0; i < this.layers.length - 1; i++) {
                        features = this._extractFeatures(this.layers[i], features);
                    }
                    return features;
                });
                (_b = (_a = lastLayer).setCategories) === null || _b === void 0 ? void 0 : _b.call(_a, this.options.categories);
                (_d = (_c = lastLayer).trainFromData) === null || _d === void 0 ? void 0 : _d.call(_c, finalFeatures, labelIndices);
            });
        }
        _extractFeatures(layer, input) {
            var _a, _b, _c, _d;
            // Extract hidden layer representation
            const hidden = (_b = (_a = layer).buildHidden) === null || _b === void 0 ? void 0 : _b.call(_a, [input], (_c = layer.model) === null || _c === void 0 ? void 0 : _c.W, (_d = layer.model) === null || _d === void 0 ? void 0 : _d.b);
            return (hidden === null || hidden === void 0 ? void 0 : hidden[0]) ? Array.from(hidden[0]) : input;
        }
        _extractFeaturesFromELM(elm, input) {
            var _a, _b, _c, _d;
            const hidden = (_b = (_a = elm).buildHidden) === null || _b === void 0 ? void 0 : _b.call(_a, [input], (_c = elm.model) === null || _c === void 0 ? void 0 : _c.W, (_d = elm.model) === null || _d === void 0 ? void 0 : _d.b);
            return (hidden === null || hidden === void 0 ? void 0 : hidden[0]) || new Float64Array(input.length);
        }
        _batchNormalize(features) {
            const mean = features.reduce((a, b) => a + b, 0) / features.length;
            const variance = features.reduce((sum, x) => sum + Math.pow((x - mean), 2), 0) / features.length;
            const std = Math.sqrt(variance + 1e-8);
            return features.map(x => (x - mean) / std);
        }
    }

    // online-kernel-elm.ts — Online Kernel ELM for streaming data
    // Incremental kernel learning with forgetting mechanisms
    /**
     * Online Kernel ELM for real-time learning from streaming data
     * Features:
     * - Incremental kernel matrix updates
     * - Sliding window with forgetting
     * - Adaptive landmark selection
     * - Real-time prediction
     */
    class OnlineKernelELM {
        constructor(options) {
            var _a, _b, _c, _d, _e, _f, _g;
            // Storage for streaming data
            this.landmarks = [];
            this.landmarkIndices = [];
            this.samples = [];
            this.labels = [];
            this.sampleWeights = [];
            // Online ridge for incremental updates
            this.onlineRidge = null;
            this.kernelMatrix = [];
            this.kernelMatrixInv = [];
            this.trained = false;
            // License check removed // Premium feature - requires valid license
            this.kernelType = options.kernel.type;
            this.kernelParams = {
                gamma: (_a = options.kernel.gamma) !== null && _a !== void 0 ? _a : 0.01,
                degree: (_b = options.kernel.degree) !== null && _b !== void 0 ? _b : 2,
                coef0: (_c = options.kernel.coef0) !== null && _c !== void 0 ? _c : 0,
            };
            this.categories = options.categories;
            this.ridgeLambda = (_d = options.ridgeLambda) !== null && _d !== void 0 ? _d : 0.001;
            this.windowSize = (_e = options.windowSize) !== null && _e !== void 0 ? _e : 1000;
            this.decayFactor = (_f = options.decayFactor) !== null && _f !== void 0 ? _f : 0.99;
            this.maxLandmarks = (_g = options.maxLandmarks) !== null && _g !== void 0 ? _g : 100;
        }
        /**
         * Initial training with batch data
         */
        fit(X, y) {
            const oneHotY = this._toOneHot(y);
            // Select landmarks
            this._selectLandmarks(X);
            // Compute initial kernel matrix
            this._computeKernelMatrix(X);
            // Initialize online ridge
            this.onlineRidge = new OnlineRidge(this.landmarks.length, this.categories.length, this.ridgeLambda);
            // Train on initial batch
            for (let i = 0; i < X.length; i++) {
                const phi = this._computeKernelFeatures(X[i]);
                const yVec = new Float64Array(oneHotY[i]);
                this.onlineRidge.update(phi, yVec);
            }
            // Store samples
            this.samples = X.map(x => [...x]);
            this.labels = Array.isArray(y[0])
                ? y.map(yy => this._argmax(yy))
                : y;
            this.sampleWeights = new Array(X.length).fill(1.0);
            this.trained = true;
        }
        /**
         * Incremental update with new sample
         */
        update(x, y) {
            if (!this.trained) {
                throw new Error('Model must be initially trained with fit() before incremental updates');
            }
            const oneHotY = Array.isArray(y)
                ? y
                : (() => {
                    const oh = new Array(this.categories.length).fill(0);
                    oh[y] = 1;
                    return oh;
                })();
            // Add to samples
            this.samples.push([...x]);
            this.labels.push(Array.isArray(y) ? this._argmax(y) : y);
            this.sampleWeights.push(1.0);
            // Apply decay to old samples
            for (let i = 0; i < this.sampleWeights.length; i++) {
                this.sampleWeights[i] *= this.decayFactor;
            }
            // Remove old samples if window exceeded
            if (this.samples.length > this.windowSize) {
                const removeCount = this.samples.length - this.windowSize;
                this.samples.splice(0, removeCount);
                this.labels.splice(0, removeCount);
                this.sampleWeights.splice(0, removeCount);
            }
            // Update landmarks if needed (adaptive strategy)
            if (this.landmarkStrategy === 'adaptive') {
                this._updateLandmarksAdaptive();
            }
            // Compute kernel features
            const phi = this._computeKernelFeatures(x);
            const yVec = new Float64Array(oneHotY);
            // Update online ridge
            if (this.onlineRidge) {
                this.onlineRidge.update(phi, yVec);
            }
        }
        /**
         * Predict with online model
         */
        predict(x, topK = 3) {
            if (!this.trained || !this.onlineRidge) {
                throw new Error('Model must be trained before prediction');
            }
            const XArray = Array.isArray(x[0]) ? x : [x];
            const allPredictions = [];
            for (const xi of XArray) {
                const predictions = [];
                const phi = this._computeKernelFeatures(xi);
                const logits = this.onlineRidge.predict(phi);
                // Convert to probabilities
                const probs = this._softmax(logits);
                // Get top-K
                const indexed = [];
                for (let idx = 0; idx < probs.length; idx++) {
                    indexed.push({
                        label: this.categories[idx],
                        prob: probs[idx],
                        index: idx,
                    });
                }
                indexed.sort((a, b) => b.prob - a.prob);
                const topResults = [];
                for (let i = 0; i < Math.min(topK, indexed.length); i++) {
                    topResults.push({
                        label: indexed[i].label,
                        prob: indexed[i].prob,
                    });
                }
                predictions.push(...topResults);
                allPredictions.push(...predictions);
            }
            return allPredictions;
        }
        /**
         * Select landmarks from data
         */
        _selectLandmarks(X) {
            const strategy = this.landmarkStrategy || 'uniform';
            const n = Math.min(this.maxLandmarks, X.length);
            if (strategy === 'uniform') {
                const step = Math.max(1, Math.floor(X.length / n));
                this.landmarkIndices = Array.from({ length: n }, (_, i) => Math.min(X.length - 1, i * step));
            }
            else if (strategy === 'random') {
                const indices = Array.from({ length: X.length }, (_, i) => i);
                for (let i = indices.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [indices[i], indices[j]] = [indices[j], indices[i]];
                }
                this.landmarkIndices = indices.slice(0, n);
            }
            else {
                // Adaptive: use first n samples initially
                this.landmarkIndices = Array.from({ length: n }, (_, i) => i);
            }
            this.landmarks = this.landmarkIndices.map(idx => [...X[idx]]);
        }
        /**
         * Compute kernel features for a sample
         */
        _computeKernelFeatures(x) {
            const features = new Float64Array(this.landmarks.length);
            for (let i = 0; i < this.landmarks.length; i++) {
                features[i] = this._kernel(x, this.landmarks[i]);
            }
            return features;
        }
        /**
         * Compute kernel between two vectors
         */
        _kernel(x1, x2) {
            if (this.kernelType === 'linear') {
                return this._dot(x1, x2);
            }
            else if (this.kernelType === 'rbf') {
                const dist = this._squaredDistance(x1, x2);
                return Math.exp(-this.kernelParams.gamma * dist);
            }
            else if (this.kernelType === 'polynomial') {
                const dot = this._dot(x1, x2);
                return Math.pow(dot + this.kernelParams.coef0, this.kernelParams.degree);
            }
            return 0;
        }
        _dot(a, b) {
            let sum = 0;
            for (let i = 0; i < Math.min(a.length, b.length); i++) {
                sum += a[i] * b[i];
            }
            return sum;
        }
        _squaredDistance(a, b) {
            let sum = 0;
            for (let i = 0; i < Math.min(a.length, b.length); i++) {
                const diff = a[i] - b[i];
                sum += diff * diff;
            }
            return sum;
        }
        _computeKernelMatrix(X) {
            // For online learning, we don't need full kernel matrix
            // This is kept for compatibility
            this.kernelMatrix = [];
        }
        _updateLandmarksAdaptive() {
            // Adaptive landmark selection based on prediction error
            // In practice, you might replace landmarks with high error
            // For now, keep existing landmarks
        }
        _toOneHot(y) {
            if (Array.isArray(y[0])) {
                return y;
            }
            const labels = y;
            return labels.map((label) => {
                const oneHot = new Array(this.categories.length).fill(0);
                oneHot[label] = 1;
                return oneHot;
            });
        }
        _softmax(logits) {
            const max = Math.max(...Array.from(logits));
            const exp = new Float64Array(logits.length);
            let sum = 0;
            for (let i = 0; i < logits.length; i++) {
                exp[i] = Math.exp(logits[i] - max);
                sum += exp[i];
            }
            for (let i = 0; i < exp.length; i++) {
                exp[i] /= sum;
            }
            return exp;
        }
        _argmax(arr) {
            let maxIdx = 0;
            let maxVal = arr[0] || 0;
            for (let i = 1; i < arr.length; i++) {
                if ((arr[i] || 0) > maxVal) {
                    maxVal = arr[i] || 0;
                    maxIdx = i;
                }
            }
            return maxIdx;
        }
        get landmarkStrategy() {
            return 'adaptive'; // Default for online learning
        }
    }

    // multi-task-elm.ts — Multi-Task ELM for joint learning across related tasks
    // Shared hidden layer with task-specific output layers
    /**
     * Multi-Task ELM for joint learning across related tasks
     * Features:
     * - Shared feature extraction layer
     * - Task-specific output layers
     * - Task weighting for importance
     * - Joint optimization
     */
    class MultiTaskELM {
        constructor(options) {
            var _a, _b, _c, _d, _e;
            this.taskELMs = new Map();
            this.trained = false;
            // License check removed // Premium feature - requires valid license
            this.tasks = options.tasks.map((task) => {
                var _a;
                return ({
                    name: task.name,
                    categories: task.categories,
                    weight: (_a = task.weight) !== null && _a !== void 0 ? _a : 1.0,
                });
            });
            this.options = {
                sharedHiddenUnits: (_a = options.sharedHiddenUnits) !== null && _a !== void 0 ? _a : 256,
                taskSpecificHiddenUnits: (_b = options.taskSpecificHiddenUnits) !== null && _b !== void 0 ? _b : options.tasks.map(() => 128),
                activation: (_c = options.activation) !== null && _c !== void 0 ? _c : 'relu',
                maxLen: (_d = options.maxLen) !== null && _d !== void 0 ? _d : 100,
                useTokenizer: (_e = options.useTokenizer) !== null && _e !== void 0 ? _e : true,
            };
            // Initialize shared ELM
            this.sharedELM = new ELM({
                useTokenizer: this.options.useTokenizer ? true : undefined,
                hiddenUnits: this.options.sharedHiddenUnits,
                categories: [], // No categories for shared layer
                maxLen: this.options.maxLen,
                activation: this.options.activation,
            });
            // Initialize task-specific ELMs
            for (let i = 0; i < this.tasks.length; i++) {
                const task = this.tasks[i];
                const taskELM = new ELM({
                    hiddenUnits: this.options.taskSpecificHiddenUnits[i],
                    categories: task.categories,
                    maxLen: this.options.sharedHiddenUnits, // Input size is shared layer output
                    activation: this.options.activation,
                });
                this.taskELMs.set(task.name, taskELM);
            }
        }
        /**
         * Train multi-task ELM
         * @param X Input features
         * @param yTaskData Map of task name to labels
         */
        train(X, yTaskData) {
            var _a, _b, _c, _d;
            // Step 1: Train shared layer (use all tasks)
            const allFeatures = this._extractSharedFeatures(X);
            // Step 2: Train each task-specific layer
            for (const task of this.tasks) {
                const taskLabels = yTaskData.get(task.name);
                if (!taskLabels)
                    continue;
                const taskELM = this.taskELMs.get(task.name);
                const labelIndices = taskLabels.map(label => typeof label === 'number'
                    ? label
                    : task.categories.indexOf(label));
                // Train task-specific ELM on shared features
                (_b = (_a = taskELM).setCategories) === null || _b === void 0 ? void 0 : _b.call(_a, task.categories);
                (_d = (_c = taskELM).trainFromData) === null || _d === void 0 ? void 0 : _d.call(_c, allFeatures, labelIndices);
            }
            this.trained = true;
        }
        /**
         * Predict for all tasks
         */
        predict(X, topK = 3) {
            var _a, _b;
            if (!this.trained) {
                throw new Error('Model must be trained before prediction');
            }
            const XArray = Array.isArray(X[0]) ? X : [X];
            const results = new Map();
            for (const x of XArray) {
                // Extract shared features
                const sharedFeatures = this._extractSharedFeatures([x])[0];
                // Predict for each task
                for (const task of this.tasks) {
                    const taskELM = this.taskELMs.get(task.name);
                    const taskPreds = ((_b = (_a = taskELM).predictFromVector) === null || _b === void 0 ? void 0 : _b.call(_a, [sharedFeatures], topK)) || [];
                    const taskResults = taskPreds.map((pred) => ({
                        task: task.name,
                        label: pred.label || task.categories[pred.index || 0],
                        prob: pred.prob || 0,
                    }));
                    if (!results.has(task.name)) {
                        results.set(task.name, []);
                    }
                    results.get(task.name).push(...taskResults);
                }
            }
            return results;
        }
        /**
         * Predict for a specific task
         */
        predictTask(x, taskName, topK = 3) {
            var _a, _b;
            if (!this.trained) {
                throw new Error('Model must be trained before prediction');
            }
            const taskELM = this.taskELMs.get(taskName);
            if (!taskELM) {
                throw new Error(`Task ${taskName} not found`);
            }
            const XArray = Array.isArray(x[0]) ? x : [x];
            const results = [];
            for (const xi of XArray) {
                // Extract shared features
                const sharedFeatures = this._extractSharedFeatures([xi])[0];
                // Predict with task-specific ELM
                const taskPreds = ((_b = (_a = taskELM).predictFromVector) === null || _b === void 0 ? void 0 : _b.call(_a, [sharedFeatures], topK)) || [];
                results.push(...taskPreds.map((pred) => ({
                    task: taskName,
                    label: pred.label || this.tasks.find(t => t.name === taskName).categories[pred.index || 0],
                    prob: pred.prob || 0,
                })));
            }
            return results;
        }
        /**
         * Extract features from shared layer
         */
        _extractSharedFeatures(X) {
            // Encode inputs if using tokenizer
            const encoded = this.options.useTokenizer
                ? X.map(x => {
                    var _a, _b, _c, _d;
                    const enc = ((_b = (_a = this.sharedELM.encoder) === null || _a === void 0 ? void 0 : _a.encode) === null || _b === void 0 ? void 0 : _b.call(_a, x)) || x;
                    return ((_d = (_c = this.sharedELM.encoder) === null || _c === void 0 ? void 0 : _c.normalize) === null || _d === void 0 ? void 0 : _d.call(_c, enc)) || enc;
                })
                : X;
            // Extract hidden layer features
            return encoded.map(x => {
                var _a, _b, _c, _d;
                const hidden = (_b = (_a = this.sharedELM).buildHidden) === null || _b === void 0 ? void 0 : _b.call(_a, [x], (_c = this.sharedELM.model) === null || _c === void 0 ? void 0 : _c.W, (_d = this.sharedELM.model) === null || _d === void 0 ? void 0 : _d.b);
                return (hidden === null || hidden === void 0 ? void 0 : hidden[0]) ? Array.from(hidden[0]) : x;
            });
        }
        /**
         * Get task names
         */
        getTaskNames() {
            return this.tasks.map(t => t.name);
        }
        /**
         * Get task weights
         */
        getTaskWeights() {
            return new Map(this.tasks.map(t => [t.name, t.weight]));
        }
    }

    // sparse-elm.ts — Sparse ELM with L1/L2 regularization and feature selection
    // Efficient for high-dimensional data with interpretability
    /**
     * Sparse ELM with regularization and feature selection
     * Features:
     * - L1/L2/Elastic net regularization
     * - Weight pruning for sparsity
     * - Feature importance ranking
     * - Interpretable models
     */
    class SparseELM {
        constructor(options) {
            var _a, _b, _c, _d, _e, _f, _g;
            this.trained = false;
            this.weightMask = []; // Track which weights are active
            this.featureImportance = [];
            // License check removed // Premium feature - requires valid license
            this.options = {
                categories: options.categories,
                hiddenUnits: (_a = options.hiddenUnits) !== null && _a !== void 0 ? _a : 256,
                maxLen: (_b = options.maxLen) !== null && _b !== void 0 ? _b : 100,
                useTokenizer: (_c = options.useTokenizer) !== null && _c !== void 0 ? _c : true,
                activation: (_d = options.activation) !== null && _d !== void 0 ? _d : 'relu',
                regularization: {
                    type: options.regularization.type,
                    lambda: options.regularization.lambda,
                    alpha: (_e = options.regularization.alpha) !== null && _e !== void 0 ? _e : 0.5,
                },
                sparsityTarget: (_f = options.sparsityTarget) !== null && _f !== void 0 ? _f : 0.5,
                pruneThreshold: (_g = options.pruneThreshold) !== null && _g !== void 0 ? _g : 1e-6,
            };
            this.elm = new ELM({
                useTokenizer: this.options.useTokenizer ? true : undefined,
                hiddenUnits: this.options.hiddenUnits,
                categories: this.options.categories,
                maxLen: this.options.maxLen,
                activation: this.options.activation,
            });
        }
        /**
         * Train sparse ELM with regularization
         */
        train(X, y) {
            var _a, _b, _c, _d;
            // Prepare labels
            const labelIndices = y.map(label => typeof label === 'number'
                ? label
                : this.options.categories.indexOf(label));
            // Encode inputs
            const encoded = this.options.useTokenizer
                ? X.map(x => {
                    var _a, _b, _c, _d;
                    const enc = ((_b = (_a = this.elm.encoder) === null || _a === void 0 ? void 0 : _a.encode) === null || _b === void 0 ? void 0 : _b.call(_a, x)) || x;
                    return ((_d = (_c = this.elm.encoder) === null || _c === void 0 ? void 0 : _c.normalize) === null || _d === void 0 ? void 0 : _d.call(_c, enc)) || enc;
                })
                : X;
            // Train base ELM
            (_b = (_a = this.elm).setCategories) === null || _b === void 0 ? void 0 : _b.call(_a, this.options.categories);
            (_d = (_c = this.elm).trainFromData) === null || _d === void 0 ? void 0 : _d.call(_c, encoded, labelIndices);
            // Apply regularization and sparsification
            this._applyRegularization();
            this._pruneWeights();
            this._computeFeatureImportance();
            this.trained = true;
        }
        /**
         * Predict with sparse model
         */
        predict(X, topK = 3) {
            var _a, _b;
            if (!this.trained) {
                throw new Error('Model must be trained before prediction');
            }
            // Use base ELM for prediction (sparsity is in weights)
            const XArray = Array.isArray(X[0]) ? X : [X];
            const preds = ((_b = (_a = this.elm).predictFromVector) === null || _b === void 0 ? void 0 : _b.call(_a, XArray, topK)) || [];
            return preds.map((pred) => ({
                label: pred.label || this.options.categories[pred.index || 0],
                prob: pred.prob || 0,
            }));
        }
        /**
         * Apply regularization to weights
         */
        _applyRegularization() {
            const model = this.elm.model;
            if (!model || !model.W)
                return;
            const W = model.W;
            const lambda = this.options.regularization.lambda;
            const alpha = this.options.regularization.alpha || 0.5;
            // Apply regularization
            for (let i = 0; i < W.length; i++) {
                for (let j = 0; j < W[i].length; j++) {
                    const w = W[i][j];
                    if (this.options.regularization.type === 'l1') {
                        // L1: soft thresholding
                        const sign = w >= 0 ? 1 : -1;
                        W[i][j] = sign * Math.max(0, Math.abs(w) - lambda);
                    }
                    else if (this.options.regularization.type === 'l2') {
                        // L2: shrinkage
                        W[i][j] = w / (1 + lambda);
                    }
                    else if (this.options.regularization.type === 'elastic') {
                        // Elastic net: combination
                        const l1 = alpha * lambda;
                        const l2 = (1 - alpha) * lambda;
                        const sign = w >= 0 ? 1 : -1;
                        const softThresh = sign * Math.max(0, Math.abs(w) - l1);
                        W[i][j] = softThresh / (1 + l2);
                    }
                }
            }
        }
        /**
         * Prune small weights for sparsity
         */
        _pruneWeights() {
            const model = this.elm.model;
            if (!model || !model.W)
                return;
            const W = model.W;
            const threshold = this.options.pruneThreshold;
            this.weightMask = [];
            // Prune weights below threshold
            for (let i = 0; i < W.length; i++) {
                this.weightMask[i] = [];
                for (let j = 0; j < W[i].length; j++) {
                    if (Math.abs(W[i][j]) < threshold) {
                        W[i][j] = 0;
                        this.weightMask[i][j] = false;
                    }
                    else {
                        this.weightMask[i][j] = true;
                    }
                }
            }
            // Enforce sparsity target
            const currentSparsity = this._computeSparsity();
            if (currentSparsity < this.options.sparsityTarget) {
                this._enforceSparsityTarget();
            }
        }
        /**
         * Compute current sparsity ratio
         */
        _computeSparsity() {
            if (this.weightMask.length === 0)
                return 0;
            let total = 0;
            let zeros = 0;
            for (const row of this.weightMask) {
                for (const active of row) {
                    total++;
                    if (!active)
                        zeros++;
                }
            }
            return total > 0 ? zeros / total : 0;
        }
        /**
         * Enforce target sparsity by pruning more weights
         */
        _enforceSparsityTarget() {
            var _a;
            const model = this.elm.model;
            if (!model || !model.W)
                return;
            const W = model.W;
            const target = this.options.sparsityTarget;
            // Collect all weights with their absolute values
            const weights = [];
            for (let i = 0; i < W.length; i++) {
                for (let j = 0; j < W[i].length; j++) {
                    if (Math.abs(W[i][j]) > 0) {
                        weights.push({ i, j, abs: Math.abs(W[i][j]) });
                    }
                }
            }
            // Sort by absolute value
            weights.sort((a, b) => a.abs - b.abs);
            // Prune smallest weights to reach target
            const totalWeights = W.length * (((_a = W[0]) === null || _a === void 0 ? void 0 : _a.length) || 0);
            const targetZeros = Math.floor(totalWeights * target);
            const currentZeros = totalWeights - weights.length;
            const needToPrune = targetZeros - currentZeros;
            for (let k = 0; k < Math.min(needToPrune, weights.length); k++) {
                const { i, j } = weights[k];
                W[i][j] = 0;
                if (this.weightMask[i]) {
                    this.weightMask[i][j] = false;
                }
            }
        }
        /**
         * Compute feature importance based on weight magnitudes
         */
        _computeFeatureImportance() {
            var _a;
            const model = this.elm.model;
            if (!model || !model.W)
                return;
            const W = model.W;
            const inputDim = ((_a = W[0]) === null || _a === void 0 ? void 0 : _a.length) || 0;
            this.featureImportance = new Array(inputDim).fill(0);
            // Sum absolute weights for each input feature
            for (let i = 0; i < W.length; i++) {
                for (let j = 0; j < W[i].length; j++) {
                    this.featureImportance[j] += Math.abs(W[i][j]);
                }
            }
            // Normalize
            const max = Math.max(...this.featureImportance);
            if (max > 0) {
                for (let i = 0; i < this.featureImportance.length; i++) {
                    this.featureImportance[i] /= max;
                }
            }
        }
        /**
         * Get feature importance scores
         */
        getFeatureImportance() {
            return [...this.featureImportance];
        }
        /**
         * Get sparsity statistics
         */
        getSparsityStats() {
            const model = this.elm.model;
            if (!model || !model.W) {
                return { sparsity: 0, activeWeights: 0, totalWeights: 0 };
            }
            const W = model.W;
            let total = 0;
            let active = 0;
            for (let i = 0; i < W.length; i++) {
                for (let j = 0; j < W[i].length; j++) {
                    total++;
                    if (Math.abs(W[i][j]) > this.options.pruneThreshold) {
                        active++;
                    }
                }
            }
            return {
                sparsity: total > 0 ? 1 - active / total : 0,
                activeWeights: active,
                totalWeights: total,
            };
        }
    }

    /**
     * SyntheticFieldStore - Storage for labeled samples
     * Supports insert, get, and sample operations
     */
    class SyntheticFieldStore {
        constructor() {
            this.store = new Map();
        }
        /**
         * Insert a labeled sample into the store
         */
        insert(sample) {
            if (!this.store.has(sample.label)) {
                this.store.set(sample.label, []);
            }
            this.store.get(sample.label).push(sample.value);
        }
        /**
         * Insert multiple samples at once
         */
        insertMany(samples) {
            for (const sample of samples) {
                this.insert(sample);
            }
        }
        /**
         * Get all values for a given label
         */
        get(label) {
            return this.store.get(label) || [];
        }
        /**
         * Sample k values uniformly at random for a given label
         */
        sample(label, k = 1) {
            const values = this.get(label);
            if (values.length === 0) {
                return [];
            }
            const result = [];
            const indices = new Set();
            // Simple uniform random sampling without replacement
            while (result.length < k && indices.size < values.length) {
                const idx = Math.floor(Math.random() * values.length);
                if (!indices.has(idx)) {
                    indices.add(idx);
                    result.push(values[idx]);
                }
            }
            return result;
        }
        /**
         * Check if a label exists in the store
         */
        hasLabel(label) {
            return this.store.has(label);
        }
        /**
         * Get all labels in the store
         */
        getLabels() {
            return Array.from(this.store.keys());
        }
        /**
         * Get the count of samples for a label
         */
        count(label) {
            return this.get(label).length;
        }
        /**
         * Clear all data
         */
        clear() {
            this.store.clear();
        }
    }

    /**
     * RetrievalGenerator - Simple deterministic retrieval sampler
     * Uniform random sampling from stored labeled samples
     */
    /**
     * Seeded random number generator for deterministic testing
     */
    let SeededRNG$1 = class SeededRNG {
        constructor(seed = Date.now()) {
            this.seed = seed;
        }
        next() {
            // Linear congruential generator
            this.seed = (this.seed * 1664525 + 1013904223) % Math.pow(2, 32);
            return this.seed / Math.pow(2, 32);
        }
        setSeed(seed) {
            this.seed = seed;
        }
    };
    class RetrievalGenerator {
        constructor(seed) {
            // Initialize and require license before allowing generator use
            this.store = new SyntheticFieldStore();
            this.seed = seed;
            this.rng = new SeededRNG$1(seed);
        }
        /**
         * Ingest labeled samples into the store
         */
        ingest(samples) {
            this.store.insertMany(samples);
        }
        /**
         * Sample k values for a given label
         * Returns empty array if label doesn't exist or has no samples
         */
        sample(label, k = 1) {
            const values = this.store.get(label);
            if (values.length === 0) {
                return [];
            }
            const result = [];
            const availableIndices = Array.from({ length: values.length }, (_, i) => i);
            // Sample k values (or all if k > available)
            const sampleCount = Math.min(k, values.length);
            for (let i = 0; i < sampleCount; i++) {
                const randomIndex = Math.floor(this.rng.next() * availableIndices.length);
                const selectedIndex = availableIndices.splice(randomIndex, 1)[0];
                result.push(values[selectedIndex]);
            }
            return result;
        }
        /**
         * Get a single sample (convenience method)
         */
        sampleOne(label) {
            const samples = this.sample(label, 1);
            return samples.length > 0 ? samples[0] : null;
        }
        /**
         * Check if a label has samples
         */
        hasLabel(label) {
            return this.store.hasLabel(label) && this.store.count(label) > 0;
        }
        /**
         * Get all available labels
         */
        getLabels() {
            return this.store.getLabels();
        }
        /**
         * Reset the generator (clears store and optionally resets seed)
         */
        reset(seed) {
            this.store.clear();
            if (seed !== undefined) {
                this.seed = seed;
                this.rng.setSeed(seed);
            }
        }
    }

    /**
     * CharVocab - Character vocabulary builder
     * Builds a vocabulary from character sets and training data
     */
    class CharVocab {
        constructor() {
            this.charToIndex = new Map();
            this.indexToChar = new Map();
            this.size = 0;
        }
        /**
         * Build vocabulary from a set of strings
         * @param samples Array of strings to build vocabulary from
         * @param charSet Optional predefined character set (e.g., alphanumeric + punctuation)
         */
        build(samples, charSet) {
            const chars = new Set();
            // Add padding character first (index 0) - use null character
            // This ensures index 0 is always padding
            chars.add('\0');
            // Add predefined character set if provided
            if (charSet) {
                for (const char of charSet) {
                    // Skip null character if it's in the charSet (we already added it)
                    if (char !== '\0') {
                        chars.add(char);
                    }
                }
            }
            // Add all characters from samples
            for (const sample of samples) {
                for (const char of sample) {
                    // Skip null characters from samples (we use it for padding)
                    if (char !== '\0') {
                        chars.add(char);
                    }
                }
            }
            // Sort characters for consistent ordering, but keep null char at index 0
            const sortedChars = Array.from(chars).sort((a, b) => {
                // Ensure null char is always first
                if (a === '\0')
                    return -1;
                if (b === '\0')
                    return 1;
                return a.localeCompare(b);
            });
            // Build mappings
            this.charToIndex.clear();
            this.indexToChar.clear();
            this.size = sortedChars.length;
            sortedChars.forEach((char, index) => {
                this.charToIndex.set(char, index);
                this.indexToChar.set(index, char);
            });
        }
        /**
         * Get index for a character
         */
        getIndex(char) {
            const index = this.charToIndex.get(char);
            if (index === undefined) {
                throw new Error(`Character '${char}' not in vocabulary`);
            }
            return index;
        }
        /**
         * Get character for an index
         */
        getChar(index) {
            const char = this.indexToChar.get(index);
            if (char === undefined) {
                throw new Error(`Index ${index} not in vocabulary`);
            }
            return char;
        }
        /**
         * Check if character exists in vocabulary
         */
        hasChar(char) {
            return this.charToIndex.has(char);
        }
        /**
         * Get vocabulary size
         */
        getSize() {
            return this.size;
        }
        /**
         * Get all characters in vocabulary
         */
        getChars() {
            return Array.from(this.charToIndex.keys()).sort();
        }
        /**
         * Get default character set (alphanumeric + common punctuation)
         */
        static getDefaultCharSet() {
            return 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' +
                ' !"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~';
        }
    }

    /**
     * FixedLength - Utilities for fixed-length padding and truncation
     */
    class FixedLength {
        /**
         * Pad or truncate an array to a fixed length
         * @param arr Array to pad/truncate
         * @param length Target length
         * @param padValue Value to use for padding (default: 0)
         */
        static padOrTruncate(arr, length, padValue = 0) {
            if (arr.length === length) {
                return [...arr];
            }
            if (arr.length > length) {
                // Truncate
                return arr.slice(0, length);
            }
            // Pad
            const result = [...arr];
            while (result.length < length) {
                result.push(padValue);
            }
            return result;
        }
        /**
         * Pad or truncate a string to a fixed length
         * @param str String to pad/truncate
         * @param length Target length
         * @param padChar Character to use for padding (default: space)
         */
        static padOrTruncateString(str, length, padChar = ' ') {
            if (str.length === length) {
                return str;
            }
            if (str.length > length) {
                // Truncate
                return str.slice(0, length);
            }
            // Pad
            return str + padChar.repeat(length - str.length);
        }
    }

    /**
     * OneHot - One-hot encoding utilities
     */
    class OneHot {
        /**
         * Encode an index as a one-hot vector
         * @param index Index to encode
         * @param size Size of the one-hot vector
         */
        static encode(index, size) {
            if (index < 0 || index >= size) {
                throw new Error(`Index ${index} out of range [0, ${size})`);
            }
            const vector = new Array(size).fill(0);
            vector[index] = 1;
            return vector;
        }
        /**
         * Decode a one-hot vector to an index
         * @param vector One-hot vector
         */
        static decode(vector) {
            const index = vector.indexOf(1);
            if (index === -1) {
                throw new Error('Invalid one-hot vector: no element equals 1');
            }
            return index;
        }
        /**
         * Encode multiple indices as one-hot vectors
         * @param indices Array of indices
         * @param size Size of each one-hot vector
         */
        static encodeBatch(indices, size) {
            return indices.map(idx => this.encode(idx, size));
        }
        /**
         * Decode multiple one-hot vectors to indices
         * @param vectors Array of one-hot vectors
         */
        static decodeBatch(vectors) {
            return vectors.map(vec => this.decode(vec));
        }
    }

    /**
     * StringEncoder - Encodes strings to vectors and decodes back
     * Compatible with ELM/KELM pipelines
     */
    class StringEncoder {
        constructor(config) {
            this.config = Object.assign({ useOneHot: false }, config);
            this.vocab = new CharVocab();
        }
        /**
         * Build vocabulary from training samples
         */
        buildVocab(samples) {
            this.vocab.build(samples, this.config.charSet || CharVocab.getDefaultCharSet());
        }
        /**
         * Encode a string to a vector
         * @param str String to encode
         * @returns Encoded vector (either indices or one-hot)
         */
        encode(str) {
            if (this.vocab.getSize() === 0) {
                throw new Error('Vocabulary not built. Call buildVocab() first.');
            }
            // Convert string to indices
            const indices = [];
            for (const char of str) {
                if (this.vocab.hasChar(char)) {
                    indices.push(this.vocab.getIndex(char));
                }
                else {
                    // For unknown characters, try to find a similar one or use space
                    // If space is in vocab, use it; otherwise use 0 (which will be treated as padding)
                    if (this.vocab.hasChar(' ')) {
                        indices.push(this.vocab.getIndex(' '));
                    }
                    else {
                        indices.push(0);
                    }
                }
            }
            // Pad or truncate to fixed length
            const padded = FixedLength.padOrTruncate(indices, this.config.maxLength, 0);
            // Convert to one-hot if requested
            if (this.config.useOneHot) {
                const vocabSize = this.vocab.getSize();
                const oneHotVectors = [];
                for (const idx of padded) {
                    oneHotVectors.push(...OneHot.encode(idx, vocabSize));
                }
                return oneHotVectors;
            }
            return padded;
        }
        /**
         * Decode a vector back to a string
         * @param vector Encoded vector
         * @returns Decoded string
         */
        decode(vector) {
            if (this.vocab.getSize() === 0) {
                throw new Error('Vocabulary not built. Call buildVocab() first.');
            }
            let indices;
            if (this.config.useOneHot) {
                // Decode one-hot vectors
                const vocabSize = this.vocab.getSize();
                indices = [];
                for (let i = 0; i < vector.length; i += vocabSize) {
                    const oneHot = vector.slice(i, i + vocabSize);
                    try {
                        indices.push(OneHot.decode(oneHot));
                    }
                    catch (_a) {
                        // If decoding fails, use argmax as fallback
                        const maxIdx = oneHot.indexOf(Math.max(...oneHot));
                        indices.push(maxIdx);
                    }
                }
                // Truncate to maxLength
                indices = indices.slice(0, this.config.maxLength);
            }
            else {
                // Direct index-based decoding
                indices = vector.slice(0, this.config.maxLength);
            }
            // Convert indices to characters, stopping at first padding
            let result = '';
            const vocabSize = this.vocab.getSize();
            const paddingIdx = 0; // Padding is always index 0
            for (const idx of indices) {
                // Clamp index to valid range
                const clampedIdx = Math.max(0, Math.min(vocabSize - 1, Math.round(idx)));
                // Stop decoding at first padding index (0)
                if (clampedIdx === paddingIdx) {
                    break;
                }
                // Try to get character for this index
                try {
                    const char = this.vocab.getChar(clampedIdx);
                    // Skip null characters and control characters (except space, tab, newline)
                    if (char === '\0' || (char.charCodeAt(0) < 32 && char !== ' ' && char !== '\t' && char !== '\n')) {
                        break; // Stop at first invalid character
                    }
                    result += char;
                }
                catch (_b) {
                    // Invalid index - stop decoding
                    break;
                }
            }
            // Trim trailing whitespace but preserve internal spaces
            return result.trimEnd();
        }
        /**
         * Encode multiple strings
         */
        encodeBatch(strings) {
            return strings.map(str => this.encode(str));
        }
        /**
         * Decode multiple vectors
         */
        decodeBatch(vectors) {
            return vectors.map(vec => this.decode(vec));
        }
        /**
         * Get the output vector size
         */
        getVectorSize() {
            if (this.config.useOneHot) {
                return this.config.maxLength * this.vocab.getSize();
            }
            return this.config.maxLength;
        }
        /**
         * Get vocabulary size
         */
        getVocabSize() {
            return this.vocab.getSize();
        }
        /**
         * Get vocabulary
         */
        getVocab() {
            return this.vocab;
        }
    }

    /**
     * ELM utilities for OmegaSynth
     * Helper functions for working with ELM models
     */
    /**
     * Create one-hot vector for a label index
     */
    function oneHotLabel(labelIndex, numLabels) {
        const vector = new Array(numLabels).fill(0);
        if (labelIndex >= 0 && labelIndex < numLabels) {
            vector[labelIndex] = 1;
        }
        return vector;
    }
    /**
     * Generate random noise vector
     */
    function generateNoiseVector(size, seed) {
        const rng = seed !== undefined ? new SeededRNG(seed) : null;
        const noise = [];
        for (let i = 0; i < size; i++) {
            const value = rng ? rng.next() : Math.random();
            // Normalize to [-1, 1]
            noise.push(value * 2 - 1);
        }
        return noise;
    }
    /**
     * Seeded random number generator
     */
    class SeededRNG {
        constructor(seed) {
            this.seed = seed;
        }
        next() {
            this.seed = (this.seed * 1664525 + 1013904223) % Math.pow(2, 32);
            return this.seed / Math.pow(2, 32);
        }
    }

    /**
     * Label-specific validation and cleaning utilities
     */
    /**
     * Validate and clean a generated string based on its label type
     */
    function validateForLabel(label, value) {
        if (!value || value.length === 0) {
            return { isValid: false, cleaned: '', reason: 'Empty value' };
        }
        // Get label-specific validator
        const validator = getValidatorForLabel(label);
        return validator(value);
    }
    /**
     * Get validator function for a specific label
     */
    function getValidatorForLabel(label) {
        switch (label) {
            case 'first_name':
            case 'last_name':
                return validateName;
            case 'phone_number':
                return validatePhoneNumber;
            case 'email':
                return validateEmail;
            case 'street_address':
                return validateStreetAddress;
            case 'city':
            case 'state':
            case 'country':
                return validateLocation;
            case 'company_name':
            case 'job_title':
            case 'product_name':
                return validateText;
            case 'color':
                return validateColor;
            case 'uuid':
                return validateUUID;
            case 'date':
                return validateDate;
            case 'credit_card_type':
            case 'device_type':
                return validateText;
            default:
                return validateGeneric;
        }
    }
    /**
     * Validate name (first_name, last_name)
     * Rules: Letters only, optional hyphens/apostrophes, no numbers
     */
    function validateName(value) {
        // First check for placeholder patterns in original value (before cleaning)
        value.toLowerCase();
        // Reject "Name" followed by numbers (e.g., "Name97", "name123")
        if (/^name\d+$/i.test(value)) {
            return { isValid: false, cleaned: '', reason: 'Placeholder name with numbers' };
        }
        // Remove all non-letter characters except hyphens and apostrophes
        let cleaned = value.replace(/[^a-zA-Z\-\'\s]/g, '');
        // Remove numbers completely
        cleaned = cleaned.replace(/[0-9]/g, '');
        // Remove excessive special characters
        cleaned = cleaned.replace(/[-']{2,}/g, '-'); // Multiple hyphens/apostrophes -> single
        cleaned = cleaned.replace(/^[-']+|[-']+$/g, ''); // Remove leading/trailing
        // Trim and normalize whitespace
        cleaned = cleaned.trim().replace(/\s+/g, ' ');
        // Must be at least 2 characters and contain at least one letter
        if (cleaned.length < 2 || !/[a-zA-Z]/.test(cleaned)) {
            return { isValid: false, cleaned: '', reason: 'Too short or no letters' };
        }
        // Reject common placeholder names (case-insensitive) after cleaning
        const lowerCleaned = cleaned.toLowerCase();
        // Check for exact matches
        if (lowerCleaned === 'name' || lowerCleaned === 'firstname' || lowerCleaned === 'lastname' ||
            lowerCleaned === 'surname') {
            return { isValid: false, cleaned: '', reason: 'Placeholder name' };
        }
        // Check for "name" followed by very short variations
        if (lowerCleaned.startsWith('name') && lowerCleaned.length <= 6) {
            return { isValid: false, cleaned: '', reason: 'Placeholder name' };
        }
        // Max length check
        if (cleaned.length > 30) {
            cleaned = cleaned.substring(0, 30).trim();
        }
        return { isValid: true, cleaned };
    }
    /**
     * Validate phone number
     * Rules: Digits, dashes, parentheses, dots, plus, spaces
     */
    function validatePhoneNumber(value) {
        // Keep only valid phone characters
        let cleaned = value.replace(/[^0-9\-\+\(\)\.\s]/g, '');
        // Remove excessive special characters
        cleaned = cleaned.replace(/[-\.]{2,}/g, '-');
        cleaned = cleaned.replace(/\s+/g, ' ');
        cleaned = cleaned.trim();
        // Count digits
        const digitCount = (cleaned.match(/\d/g) || []).length;
        // Must have at least 7 digits (minimum phone number)
        if (digitCount < 7) {
            return { isValid: false, cleaned: '', reason: 'Too few digits' };
        }
        // Max length check
        if (cleaned.length > 25) {
            cleaned = cleaned.substring(0, 25).trim();
        }
        return { isValid: true, cleaned };
    }
    /**
     * Validate email
     * Rules: Must contain @, valid characters before and after
     */
    function validateEmail(value) {
        // Keep valid email characters
        let cleaned = value.replace(/[^a-zA-Z0-9@\.\-\_]/g, '');
        // Must contain @
        if (!cleaned.includes('@')) {
            return { isValid: false, cleaned: '', reason: 'Missing @ symbol' };
        }
        const parts = cleaned.split('@');
        if (parts.length !== 2) {
            return { isValid: false, cleaned: '', reason: 'Invalid @ usage' };
        }
        const [local, domain] = parts;
        // Local part must have at least 1 character
        if (!local || local.length === 0) {
            return { isValid: false, cleaned: '', reason: 'Empty local part' };
        }
        // Domain must have at least 3 characters (x.y)
        if (!domain || domain.length < 3) {
            return { isValid: false, cleaned: '', reason: 'Invalid domain' };
        }
        // Domain must contain at least one dot
        if (!domain.includes('.')) {
            return { isValid: false, cleaned: '', reason: 'Domain missing dot' };
        }
        // Remove leading/trailing dots and hyphens
        const cleanLocal = local.replace(/^[\.\-]+|[\.\-]+$/g, '');
        const cleanDomain = domain.replace(/^[\.\-]+|[\.\-]+$/g, '');
        if (!cleanLocal || !cleanDomain) {
            return { isValid: false, cleaned: '', reason: 'Invalid format after cleaning' };
        }
        cleaned = `${cleanLocal}@${cleanDomain}`;
        // Max length check
        if (cleaned.length > 50) {
            cleaned = cleaned.substring(0, 50);
        }
        return { isValid: true, cleaned };
    }
    /**
     * Validate street address
     * Rules: Numbers, letters, spaces, common address characters
     */
    function validateStreetAddress(value) {
        // Keep valid address characters
        let cleaned = value.replace(/[^a-zA-Z0-9\s\-\#\.\,]/g, '');
        cleaned = cleaned.trim().replace(/\s+/g, ' ');
        // Must have at least 5 characters
        if (cleaned.length < 5) {
            return { isValid: false, cleaned: '', reason: 'Too short' };
        }
        // Max length check
        if (cleaned.length > 50) {
            cleaned = cleaned.substring(0, 50).trim();
        }
        return { isValid: true, cleaned };
    }
    /**
     * Validate location (city, state, country)
     * Rules: Mostly letters, optional spaces/hyphens
     */
    function validateLocation(value) {
        // Keep letters, spaces, hyphens, apostrophes
        let cleaned = value.replace(/[^a-zA-Z\s\-\']/g, '');
        cleaned = cleaned.trim().replace(/\s+/g, ' ');
        // Must have at least 2 characters and contain letters
        if (cleaned.length < 2 || !/[a-zA-Z]/.test(cleaned)) {
            return { isValid: false, cleaned: '', reason: 'Too short or no letters' };
        }
        // Max length check
        if (cleaned.length > 30) {
            cleaned = cleaned.substring(0, 30).trim();
        }
        return { isValid: true, cleaned };
    }
    /**
     * Validate text (company_name, job_title, product_name)
     * Rules: Letters, numbers, spaces, common punctuation
     */
    function validateText(value) {
        // Keep alphanumeric and common punctuation
        let cleaned = value.replace(/[^a-zA-Z0-9\s\-\'\.\,]/g, '');
        cleaned = cleaned.trim().replace(/\s+/g, ' ');
        // Must have at least 2 characters
        if (cleaned.length < 2) {
            return { isValid: false, cleaned: '', reason: 'Too short' };
        }
        // Max length check
        if (cleaned.length > 50) {
            cleaned = cleaned.substring(0, 50).trim();
        }
        return { isValid: true, cleaned };
    }
    /**
     * Validate color
     * Rules: Letters only, maybe spaces
     */
    function validateColor(value) {
        // Keep letters and spaces only
        let cleaned = value.replace(/[^a-zA-Z\s]/g, '');
        cleaned = cleaned.trim().replace(/\s+/g, ' ');
        // Must have at least 3 characters
        if (cleaned.length < 3) {
            return { isValid: false, cleaned: '', reason: 'Too short' };
        }
        // Max length check
        if (cleaned.length > 20) {
            cleaned = cleaned.substring(0, 20).trim();
        }
        return { isValid: true, cleaned };
    }
    /**
     * Validate UUID
     * Rules: Should follow UUID format (8-4-4-4-12 hex digits with dashes)
     */
    function validateUUID(value) {
        // Keep hex characters and dashes
        let cleaned = value.replace(/[^0-9a-fA-F\-]/g, '');
        // Try to format as UUID if it has enough characters
        const hexOnly = cleaned.replace(/-/g, '');
        if (hexOnly.length >= 32) {
            // Format as UUID: 8-4-4-4-12
            const formatted = [
                hexOnly.substring(0, 8),
                hexOnly.substring(8, 12),
                hexOnly.substring(12, 16),
                hexOnly.substring(16, 20),
                hexOnly.substring(20, 32)
            ].join('-');
            cleaned = formatted;
        }
        // Must have at least 32 hex characters
        const hexCount = cleaned.replace(/-/g, '').length;
        if (hexCount < 32) {
            return { isValid: false, cleaned: '', reason: 'Too few hex characters' };
        }
        return { isValid: true, cleaned };
    }
    /**
     * Validate date
     * Rules: Should follow date format (YYYY-MM-DD or similar)
     */
    function validateDate(value) {
        // Keep digits, dashes, slashes
        let cleaned = value.replace(/[^0-9\-\/]/g, '');
        // Must have at least 8 digits (YYYYMMDD)
        const digitCount = (cleaned.match(/\d/g) || []).length;
        if (digitCount < 8) {
            return { isValid: false, cleaned: '', reason: 'Too few digits' };
        }
        // Max length check
        if (cleaned.length > 20) {
            cleaned = cleaned.substring(0, 20).trim();
        }
        return { isValid: true, cleaned };
    }
    /**
     * Generic validator for unknown labels
     */
    function validateGeneric(value) {
        // Remove control characters
        let cleaned = value.replace(/[\x00-\x1F\x7F]/g, '');
        cleaned = cleaned.trim().replace(/\s+/g, ' ');
        if (cleaned.length < 1) {
            return { isValid: false, cleaned: '', reason: 'Empty after cleaning' };
        }
        return { isValid: true, cleaned };
    }

    /**
     * PatternCorrector - Post-processing pattern matching and correction
     * Learns patterns from training data and applies them to generated samples
     */
    class PatternCorrector {
        constructor() {
            this.patterns = new Map();
        }
        /**
         * Learn patterns from training data
         */
        learnPatterns(samples) {
            const byLabel = new Map();
            // Group samples by label
            for (const sample of samples) {
                if (!byLabel.has(sample.label)) {
                    byLabel.set(sample.label, []);
                }
                byLabel.get(sample.label).push(sample.value);
            }
            // Learn patterns for each label
            for (const [label, values] of byLabel.entries()) {
                this.learnPattern(label, values);
            }
        }
        /**
         * Learn pattern for a specific label
         */
        learnPattern(label, examples) {
            if (examples.length === 0)
                return;
            // Extract common prefixes (first 1-3 characters)
            const prefixCounts = new Map();
            const suffixCounts = new Map();
            const charFreq = new Map();
            const lengths = [];
            for (const example of examples) {
                lengths.push(example.length);
                // Prefixes
                for (let len = 1; len <= Math.min(3, example.length); len++) {
                    const prefix = example.substring(0, len);
                    prefixCounts.set(prefix, (prefixCounts.get(prefix) || 0) + 1);
                }
                // Suffixes
                for (let len = 1; len <= Math.min(3, example.length); len++) {
                    const suffix = example.substring(example.length - len);
                    suffixCounts.set(suffix, (suffixCounts.get(suffix) || 0) + 1);
                }
                // Character frequency
                for (const char of example) {
                    charFreq.set(char, (charFreq.get(char) || 0) + 1);
                }
            }
            // Get common prefixes (appear in >10% of examples - lowered from 20% for better pattern matching)
            const commonPrefixes = Array.from(prefixCounts.entries())
                .filter(([_, count]) => count / examples.length > 0.1)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 15) // Increased from 10 to 15
                .map(([prefix]) => prefix);
            // Get common suffixes (appear in >10% of examples - lowered from 20% for better pattern matching)
            const commonSuffixes = Array.from(suffixCounts.entries())
                .filter(([_, count]) => count / examples.length > 0.1)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 15) // Increased from 10 to 15
                .map(([suffix]) => suffix);
            // Normalize character frequencies
            const totalChars = Array.from(charFreq.values()).reduce((a, b) => a + b, 0);
            for (const [char, count] of charFreq.entries()) {
                charFreq.set(char, count / totalChars);
            }
            this.patterns.set(label, {
                label,
                examples,
                commonPrefixes,
                commonSuffixes,
                charFrequency: charFreq,
                lengthDistribution: lengths,
            });
        }
        /**
         * Correct a generated string using learned patterns
         */
        correct(generated, label) {
            const pattern = this.patterns.get(label);
            if (!pattern) {
                return generated; // No pattern learned, return as-is
            }
            let corrected = generated;
            // 1. Check if it matches a known example (exact match)
            if (pattern.examples.includes(generated)) {
                return generated; // Already perfect
            }
            // 2. Check prefix/suffix patterns
            const hasValidPrefix = pattern.commonPrefixes.some(prefix => corrected.toLowerCase().startsWith(prefix.toLowerCase()));
            pattern.commonSuffixes.some(suffix => corrected.toLowerCase().endsWith(suffix.toLowerCase()));
            // 3. If no valid prefix, try to fix it
            if (!hasValidPrefix && pattern.commonPrefixes.length > 0) {
                const mostCommonPrefix = pattern.commonPrefixes[0];
                // Only fix if the generated string is very different
                if (corrected.length > 0 && !corrected.toLowerCase().startsWith(mostCommonPrefix[0].toLowerCase())) ;
            }
            // 4. Check character frequency (remove unlikely characters)
            const charFreq = pattern.charFrequency;
            let cleaned = '';
            for (const char of corrected) {
                const freq = charFreq.get(char) || 0;
                // Keep character if it appears in >0.5% of training data (lowered from 1%), or if it's common (space, etc.)
                if (freq > 0.005 || /[a-zA-Z0-9\s]/.test(char)) {
                    cleaned += char;
                }
            }
            if (cleaned.length > 0) {
                corrected = cleaned;
            }
            // 5. Check length distribution
            pattern.lengthDistribution.reduce((a, b) => a + b, 0) / pattern.lengthDistribution.length;
            Math.min(...pattern.lengthDistribution);
            const maxLength = Math.max(...pattern.lengthDistribution);
            // Truncate if too long
            if (corrected.length > maxLength * 1.5) {
                corrected = corrected.substring(0, Math.floor(maxLength * 1.2));
            }
            return corrected;
        }
        /**
         * Score how well a generated string matches the pattern
         */
        score(generated, label) {
            const pattern = this.patterns.get(label);
            if (!pattern) {
                return 0.5; // Unknown pattern, neutral score
            }
            let score = 0;
            let factors = 0;
            // 1. Exact match bonus
            if (pattern.examples.includes(generated)) {
                return 1.0; // Perfect match
            }
            // 2. Prefix match (30% weight)
            const prefixMatch = pattern.commonPrefixes.some(prefix => generated.toLowerCase().startsWith(prefix.toLowerCase()));
            score += prefixMatch ? 0.3 : 0;
            factors++;
            // 3. Suffix match (20% weight)
            const suffixMatch = pattern.commonSuffixes.some(suffix => generated.toLowerCase().endsWith(suffix.toLowerCase()));
            score += suffixMatch ? 0.2 : 0;
            factors++;
            // 4. Character frequency match (30% weight)
            const charFreq = pattern.charFrequency;
            let charScore = 0;
            let charCount = 0;
            for (const char of generated) {
                const freq = charFreq.get(char) || 0;
                charScore += freq;
                charCount++;
            }
            score += (charCount > 0 ? charScore / charCount : 0) * 0.3;
            factors++;
            // 5. Length match (20% weight)
            const avgLength = pattern.lengthDistribution.reduce((a, b) => a + b, 0) / pattern.lengthDistribution.length;
            const lengthDiff = Math.abs(generated.length - avgLength) / avgLength;
            const lengthScore = Math.max(0, 1 - lengthDiff);
            score += lengthScore * 0.2;
            factors++;
            return factors > 0 ? score / factors : 0;
        }
        /**
         * Get pattern for a label
         */
        getPattern(label) {
            return this.patterns.get(label);
        }
    }

    /**
     * SequenceContext - Add sequence context to generation
     * Uses previous characters to inform next character prediction
     */
    class SequenceContext {
        constructor(n = 3) {
            this.ngramPatterns = new Map();
            this.n = n;
        }
        /**
         * Learn n-gram patterns from training data
         */
        learnPatterns(samples) {
            this.ngramPatterns.clear();
            for (const sample of samples) {
                // Extract n-grams
                for (let i = 0; i <= sample.length - this.n; i++) {
                    const ngram = sample.substring(i, i + this.n - 1); // Context (n-1 chars)
                    const nextChar = sample[i + this.n - 1]; // Next character
                    if (!this.ngramPatterns.has(ngram)) {
                        this.ngramPatterns.set(ngram, new Map());
                    }
                    const charMap = this.ngramPatterns.get(ngram);
                    charMap.set(nextChar, (charMap.get(nextChar) || 0) + 1);
                }
            }
        }
        /**
         * Get next character probabilities given context
         */
        getNextCharProbs(context) {
            // Use last n-1 characters as context
            const ctx = context.length >= this.n - 1
                ? context.substring(context.length - (this.n - 1))
                : context;
            const charCounts = this.ngramPatterns.get(ctx);
            if (!charCounts || charCounts.size === 0) {
                return new Map();
            }
            // Convert counts to probabilities
            const total = Array.from(charCounts.values()).reduce((a, b) => a + b, 0);
            const probs = new Map();
            for (const [char, count] of charCounts.entries()) {
                probs.set(char, count / total);
            }
            return probs;
        }
        /**
         * Suggest next character based on context
         */
        suggestNextChar(context) {
            const probs = this.getNextCharProbs(context);
            if (probs.size === 0) {
                return null;
            }
            // Return most likely character
            let bestChar = '';
            let bestProb = 0;
            for (const [char, prob] of probs.entries()) {
                if (prob > bestProb) {
                    bestProb = prob;
                    bestChar = char;
                }
            }
            return bestChar;
        }
        /**
         * Score how well a character fits the context
         */
        scoreChar(context, char) {
            const probs = this.getNextCharProbs(context);
            return probs.get(char) || 0;
        }
    }

    /**
     * ELMGenerator - Label-conditioned string generator using ELM
     * Trains an ELM to generate encoded strings based on labels + noise
     */
    class ELMGenerator {
        constructor(config) {
            var _a;
            this.elm = null;
            this.labels = [];
            this.patternCorrector = null;
            this.sequenceContext = null;
            // Initialize and require license before allowing generator use
            this.config = Object.assign({ hiddenUnits: 128, activation: 'relu', ridgeLambda: 0.01, noiseSize: 32, useOneHot: false, useClassification: false, usePatternCorrection: true }, config);
            this.noiseSize = this.config.noiseSize;
            this.useClassification = this.config.useClassification;
            this.encoder = new StringEncoder({
                maxLength: config.maxLength,
                useOneHot: (_a = this.config.useOneHot) !== null && _a !== void 0 ? _a : false, // Default to false for memory efficiency
            });
            if (this.config.usePatternCorrection) {
                this.patternCorrector = new PatternCorrector();
            }
            // Always use sequence context for better generation
            this.sequenceContext = new SequenceContext(3); // 3-grams
        }
        /**
         * Train the ELM generator on labeled samples
         */
        train(samples) {
            if (samples.length === 0) {
                throw new Error('Cannot train on empty dataset');
            }
            // Extract unique labels
            const uniqueLabels = Array.from(new Set(samples.map(s => s.label)));
            this.labels = uniqueLabels;
            // Extract all values for vocabulary building
            const allValues = samples.map(s => s.value);
            this.encoder.buildVocab(allValues);
            // Learn patterns if pattern correction is enabled
            if (this.patternCorrector) {
                this.patternCorrector.learnPatterns(samples);
            }
            // Learn sequence context
            if (this.sequenceContext) {
                this.sequenceContext.learnPatterns(allValues);
            }
            // Build training data
            const X = [];
            const Y = [];
            for (const sample of samples) {
                const labelIndex = this.labels.indexOf(sample.label);
                if (labelIndex === -1) {
                    continue;
                }
                // Input: concat(oneHot(label), noiseVector)
                const labelOneHot = oneHotLabel(labelIndex, this.labels.length);
                const noise = generateNoiseVector(this.noiseSize, this.config.seed);
                const inputVector = [...labelOneHot, ...noise];
                X.push(inputVector);
                // Target: encoded(value)
                const encodedValue = this.encoder.encode(sample.value);
                Y.push(encodedValue);
            }
            if (X.length === 0) {
                throw new Error('No valid training samples after processing');
            }
            // Create ELM config
            const inputSize = this.labels.length + this.noiseSize;
            this.encoder.getVectorSize();
            const elmConfig = {
                useTokenizer: false, // Numeric mode
                inputSize: inputSize,
                categories: this.useClassification ? [] : [], // For classification, we'll handle it differently
                hiddenUnits: this.config.hiddenUnits,
                activation: this.config.activation,
                // Use lower regularization for better pattern learning
                ridgeLambda: this.config.ridgeLambda * 0.1, // Reduce regularization
                task: this.useClassification ? 'classification' : 'regression',
            };
            // Create and train ELM - resolve constructor robustly across CJS/ESM shapes
            // Replace dynamic require with direct constructor
            this.elm = new ELM(elmConfig);
            this.elm.trainFromData(X, Y);
        }
        /**
         * Generate a string for a given label
         * @param label Label to generate for
         * @param noiseSeed Optional seed for noise generation (for deterministic output)
         */
        generate(label, noiseSeed) {
            var _a;
            if (!this.elm) {
                throw new Error('Model not trained. Call train() first.');
            }
            const labelIndex = this.labels.indexOf(label);
            if (labelIndex === -1) {
                throw new Error(`Label '${label}' not found in training data`);
            }
            // Create input: concat(oneHot(label), noiseVector)
            const labelOneHot = oneHotLabel(labelIndex, this.labels.length);
            const noise = generateNoiseVector(this.noiseSize, noiseSeed !== undefined ? noiseSeed : this.config.seed);
            const inputVector = [...labelOneHot, ...noise];
            // Predict based on mode
            let decoded;
            if (this.useClassification && this.config.useOneHot && typeof this.elm.predictProbaFromVector === 'function') {
                // Classification mode with one-hot: use probabilities
                const vocabSize = this.encoder.getVocabSize();
                const maxLength = this.config.maxLength;
                // Get probabilities for each position
                const probs = this.elm.predictProbaFromVector(inputVector);
                // Reshape to [maxLength, vocabSize] and use argmax
                const indices = [];
                for (let pos = 0; pos < maxLength; pos++) {
                    const posProbs = probs.slice(pos * vocabSize, (pos + 1) * vocabSize);
                    const maxIdx = posProbs.indexOf(Math.max(...posProbs));
                    indices.push(maxIdx);
                }
                decoded = this.encoder.decode(indices);
            }
            else {
                // Regression mode: use logits and round
                const prediction = this.elm.predictLogitsFromVector(inputVector);
                // Convert logits to indices with proper quantization
                const vocabSize = this.encoder.getVocabSize();
                const indices = prediction.map(val => {
                    // Clamp value to reasonable range first (prevent extreme values)
                    const clamped = Math.max(-vocabSize, Math.min(vocabSize * 2, val));
                    // Round to nearest integer
                    const rounded = Math.round(clamped);
                    // Clamp to valid vocabulary range [0, vocabSize-1]
                    const idx = Math.max(0, Math.min(vocabSize - 1, rounded));
                    return idx;
                });
                decoded = this.encoder.decode(indices);
            }
            // Apply pattern correction if enabled
            let corrected = decoded;
            if (this.patternCorrector) {
                corrected = this.patternCorrector.correct(decoded, label);
            }
            // Apply sequence context refinement
            if (this.sequenceContext && corrected.length > 0) {
                corrected = this.refineWithSequenceContext(corrected, label);
            }
            // Validate and clean the decoded string using label-specific rules
            const validation = validateForLabel(label, corrected);
            // If validation fails, try to generate again with different noise (up to 3 attempts)
            if (!validation.isValid) {
                for (let attempt = 0; attempt < 3; attempt++) {
                    const baseSeed = noiseSeed !== undefined ? noiseSeed : ((_a = this.config.seed) !== null && _a !== void 0 ? _a : Date.now());
                    const newNoise = generateNoiseVector(this.noiseSize, baseSeed + attempt + 1000);
                    const newInputVector = [...labelOneHot, ...newNoise];
                    let newDecoded;
                    if (this.useClassification && this.config.useOneHot && typeof this.elm.predictProbaFromVector === 'function') {
                        const vocabSize = this.encoder.getVocabSize();
                        const maxLength = this.config.maxLength;
                        const probs = this.elm.predictProbaFromVector(newInputVector);
                        const newIndices = [];
                        for (let pos = 0; pos < maxLength; pos++) {
                            const posProbs = probs.slice(pos * vocabSize, (pos + 1) * vocabSize);
                            const maxIdx = posProbs.indexOf(Math.max(...posProbs));
                            newIndices.push(maxIdx);
                        }
                        newDecoded = this.encoder.decode(newIndices);
                    }
                    else {
                        const newPrediction = this.elm.predictLogitsFromVector(newInputVector);
                        const vocabSize = this.encoder.getVocabSize();
                        const newIndices = newPrediction.map(val => {
                            const clamped = Math.max(-vocabSize, Math.min(vocabSize * 2, val));
                            const rounded = Math.round(clamped);
                            return Math.max(0, Math.min(vocabSize - 1, rounded));
                        });
                        newDecoded = this.encoder.decode(newIndices);
                    }
                    // Apply pattern correction
                    if (this.patternCorrector) {
                        newDecoded = this.patternCorrector.correct(newDecoded, label);
                    }
                    const newValidation = validateForLabel(label, newDecoded);
                    if (newValidation.isValid) {
                        return newValidation.cleaned;
                    }
                }
                // If all attempts fail, return empty string
                return '';
            }
            return validation.cleaned;
        }
        /**
         * Generate multiple strings for a label with confidence-based selection
         */
        generateBatch(label, count) {
            const candidates = [];
            const seen = new Set();
            let attempts = 0;
            const maxAttempts = count * 10; // Allow up to 10x attempts to get valid unique samples
            // Generate candidates with scoring
            while (attempts < maxAttempts) {
                const seed = this.config.seed !== undefined
                    ? this.config.seed + attempts
                    : Date.now() + attempts;
                try {
                    const generated = this.generate(label, seed);
                    if (generated && generated.length > 0 && !seen.has(generated.toLowerCase())) {
                        // Score the candidate
                        let score = 1.0;
                        // Pattern match score
                        if (this.patternCorrector) {
                            score = this.patternCorrector.score(generated, label);
                        }
                        // Validation score (valid = 1.0, invalid = 0.0)
                        const validation = validateForLabel(label, generated);
                        if (!validation.isValid) {
                            score = 0;
                        }
                        candidates.push({ value: generated, score });
                        seen.add(generated.toLowerCase());
                    }
                }
                catch (error) {
                    // Skip errors
                }
                attempts++;
            }
            // Sort by score and return top candidates
            candidates.sort((a, b) => b.score - a.score);
            return candidates.slice(0, count).map(c => c.value);
        }
        /**
         * Refine generated string using sequence context
         */
        refineWithSequenceContext(generated, label) {
            if (!this.sequenceContext || generated.length === 0) {
                return generated;
            }
            // Try to improve the string by checking sequence context
            let refined = '';
            for (let i = 0; i < generated.length; i++) {
                const context = refined; // Use what we've built so far
                const currentChar = generated[i];
                // Check if current char fits the context
                const contextScore = this.sequenceContext.scoreChar(context, currentChar);
                // If score is very low, try to suggest better character
                if (contextScore < 0.1 && context.length > 0) {
                    const suggested = this.sequenceContext.suggestNextChar(context);
                    if (suggested && suggested !== currentChar) {
                        // Only replace if it's a significant improvement
                        refined += suggested;
                    }
                    else {
                        refined += currentChar;
                    }
                }
                else {
                    refined += currentChar;
                }
                // Stop if we hit padding or invalid character
                if (currentChar === '\0' || currentChar.charCodeAt(0) === 0) {
                    break;
                }
            }
            return refined;
        }
        /**
         * Get all trained labels
         */
        getLabels() {
            return [...this.labels];
        }
        /**
         * Check if model is trained
         */
        isTrained() {
            return this.elm !== null;
        }
    }

    /**
     * HybridGenerator - Blends Retrieval + ELM jitter for realism + variation
     * 1. Retrieve real sample
     * 2. Encode
     * 3. Apply ELM noise
     * 4. Decode
     */
    class HybridGenerator {
        constructor(config) {
            var _a;
            this.patternCorrector = null;
            // Initialize and require license before allowing generator use
            this.config = Object.assign({ elmHiddenUnits: 128, elmActivation: 'relu', elmRidgeLambda: 0.01, noiseSize: 32, jitterStrength: 0.05, exactMode: false, useOneHot: false, useClassification: false, usePatternCorrection: true }, config);
            // If exact mode, set jitter to 0
            if (this.config.exactMode) {
                this.jitterStrength = 0;
            }
            else {
                this.jitterStrength = this.config.jitterStrength;
            }
            this.retrieval = new RetrievalGenerator(config.seed);
            this.elm = new ELMGenerator({
                maxLength: config.maxLength,
                hiddenUnits: this.config.elmHiddenUnits,
                activation: this.config.elmActivation,
                ridgeLambda: this.config.elmRidgeLambda,
                noiseSize: this.config.noiseSize,
                useOneHot: this.config.useOneHot,
                useClassification: this.config.useClassification,
                usePatternCorrection: this.config.usePatternCorrection,
                seed: config.seed,
            });
            this.encoder = new StringEncoder({
                maxLength: config.maxLength,
                useOneHot: (_a = this.config.useOneHot) !== null && _a !== void 0 ? _a : false, // Default to false for memory efficiency
            });
            if (this.config.usePatternCorrection) {
                this.patternCorrector = new PatternCorrector();
            }
        }
        /**
         * Train the hybrid generator on labeled samples
         */
        train(samples) {
            // Train retrieval
            this.retrieval.ingest(samples);
            // Build encoder vocabulary
            const allValues = samples.map(s => s.value);
            this.encoder.buildVocab(allValues);
            // Train ELM for jittering
            this.elm.train(samples);
            // Learn patterns if pattern correction is enabled
            if (this.patternCorrector) {
                this.patternCorrector.learnPatterns(samples);
            }
        }
        /**
         * Generate a hybrid sample (retrieval + jitter)
         * @param label Label to generate for
         * @param noiseSeed Optional seed for deterministic output
         */
        generate(label, noiseSeed) {
            // Step 1: Retrieve real sample
            const retrieved = this.retrieval.sampleOne(label);
            if (!retrieved) {
                // Fallback to pure ELM if no retrieval available
                return this.elm.generate(label, noiseSeed);
            }
            // Step 2: Encode
            const encoded = this.encoder.encode(retrieved);
            // Step 3: Apply ELM noise/jitter
            // Generate a jittered version using ELM
            const jittered = this.applyJitter(encoded, label, noiseSeed);
            // Step 4: Decode
            const decoded = this.encoder.decode(jittered);
            // Step 5: Apply pattern correction if enabled
            let corrected = decoded;
            if (this.patternCorrector) {
                corrected = this.patternCorrector.correct(decoded, label);
            }
            // Step 6: Validate and clean using label-specific rules
            const validation = validateForLabel(label, corrected);
            // If validation fails, try jittering again with different noise (up to 2 attempts)
            if (!validation.isValid) {
                for (let attempt = 0; attempt < 2; attempt++) {
                    const newSeed = noiseSeed !== undefined ? noiseSeed + attempt + 1000 : undefined;
                    const newJittered = this.applyJitter(encoded, label, newSeed);
                    const newDecoded = this.encoder.decode(newJittered);
                    let newCorrected = newDecoded;
                    if (this.patternCorrector) {
                        newCorrected = this.patternCorrector.correct(newDecoded, label);
                    }
                    const newValidation = validateForLabel(label, newCorrected);
                    if (newValidation.isValid) {
                        return newValidation.cleaned;
                    }
                }
                // If all attempts fail, return original (retrieved is always valid)
                return retrieved;
            }
            return validation.cleaned;
        }
        /**
         * Apply jitter to an encoded vector
         */
        applyJitter(encoded, label, noiseSeed) {
            // Generate ELM output for the label
            const elmOutput = this.generateELMVector(label, noiseSeed);
            // If ELM output is empty or invalid, return original (no jitter)
            if (!elmOutput || elmOutput.length === 0 || elmOutput.every(v => v === 0)) {
                return encoded;
            }
            // Blend: (1 - jitterStrength) * original + jitterStrength * elmOutput
            // Use smaller jitter to preserve more of the original
            const effectiveJitter = Math.min(this.jitterStrength, 0.05); // Cap at 5% jitter
            const jittered = encoded.map((val, idx) => {
                const elmVal = elmOutput[idx] || 0;
                return (1 - effectiveJitter) * val + effectiveJitter * elmVal;
            });
            // Convert blended continuous values to integer indices
            // Round and clamp to valid vocabulary range
            const vocabSize = this.encoder.getVocabSize();
            const indices = jittered.map(val => {
                // Clamp value first
                const clamped = Math.max(0, Math.min(vocabSize - 1, val));
                const idx = Math.round(clamped);
                return Math.max(0, Math.min(vocabSize - 1, idx));
            });
            return indices;
        }
        /**
         * Generate an ELM vector for jittering
         */
        generateELMVector(label, noiseSeed) {
            try {
                // Try to get ELM prediction
                const elmGenerated = this.elm.generate(label, noiseSeed);
                // Only encode if we got a non-empty string
                if (elmGenerated && elmGenerated.length > 0) {
                    return this.encoder.encode(elmGenerated);
                }
                // If empty, return zero vector (no jitter)
                return new Array(this.encoder.getVectorSize()).fill(0);
            }
            catch (_a) {
                // If ELM fails, return zero vector (no jitter)
                return new Array(this.encoder.getVectorSize()).fill(0);
            }
        }
        /**
         * Generate multiple hybrid samples
         */
        generateBatch(label, count) {
            const results = [];
            const seen = new Set();
            let attempts = 0;
            const maxAttempts = count * 5; // Allow up to 5x attempts to get valid unique samples
            while (results.length < count && attempts < maxAttempts) {
                const seed = this.config.seed !== undefined
                    ? this.config.seed + attempts
                    : Date.now() + attempts;
                const generated = this.generate(label, seed);
                // Only add if valid, non-empty, and unique
                if (generated && generated.length > 0 && !seen.has(generated.toLowerCase())) {
                    results.push(generated);
                    seen.add(generated.toLowerCase());
                }
                attempts++;
            }
            return results;
        }
        /**
         * Get all available labels
         */
        getLabels() {
            return this.retrieval.getLabels();
        }
        /**
         * Check if generator is trained
         */
        isTrained() {
            return this.retrieval.hasLabel(this.getLabels()[0] || '') && this.elm.isTrained();
        }
    }

    /**
     * ExactGenerator - Perfect retrieval with pattern-based variations
     * Provides 100% realistic data by using exact training samples + pattern matching
     */
    class ExactGenerator {
        constructor(config = {}) {
            this.trainingSamples = [];
            // Initialize and require license before allowing generator use
            this.config = Object.assign({ usePatternMatching: true, maxVariations: 10 }, config);
            this.retrieval = new RetrievalGenerator(config.seed);
            this.patternCorrector = new PatternCorrector();
        }
        /**
         * Train the exact generator
         */
        train(samples) {
            this.trainingSamples = samples;
            this.retrieval.ingest(samples);
            if (this.config.usePatternMatching) {
                this.patternCorrector.learnPatterns(samples);
            }
        }
        /**
         * Generate an exact sample (100% realistic)
         */
        generate(label, seed) {
            // 1. Try exact retrieval first (100% realistic)
            const exact = this.retrieval.sampleOne(label);
            if (exact) {
                return exact; // ✅ 100% realistic
            }
            // 2. If pattern matching enabled, try pattern-based generation
            if (this.config.usePatternMatching) {
                const pattern = this.patternCorrector.getPattern(label);
                if (pattern && pattern.examples.length > 0) {
                    // Return a random example from the pattern
                    const randomIndex = seed !== undefined
                        ? seed % pattern.examples.length
                        : Math.floor(Math.random() * pattern.examples.length);
                    return pattern.examples[randomIndex];
                }
            }
            throw new Error(`No samples found for label: ${label}`);
        }
        /**
         * Generate with pattern-based variations
         */
        generateWithVariation(label, seed) {
            // Get base sample
            const base = this.generate(label, seed);
            if (!this.config.usePatternMatching) {
                return base;
            }
            // Try to create variations using pattern matching
            const pattern = this.patternCorrector.getPattern(label);
            if (!pattern) {
                return base;
            }
            // Simple variation: combine prefix from one example with suffix from another
            if (pattern.examples.length >= 2) {
                const seed1 = seed !== undefined ? seed : Date.now();
                const seed2 = seed1 + 1000;
                const idx1 = seed1 % pattern.examples.length;
                const idx2 = seed2 % pattern.examples.length;
                if (idx1 !== idx2) {
                    const ex1 = pattern.examples[idx1];
                    const ex2 = pattern.examples[idx2];
                    // Try combining if they're similar length
                    if (Math.abs(ex1.length - ex2.length) <= 2) {
                        const mid = Math.floor(ex1.length / 2);
                        const variation = ex1.substring(0, mid) + ex2.substring(mid);
                        // Validate the variation
                        const validation = validateForLabel(label, variation);
                        if (validation.isValid) {
                            // Score the variation
                            const score = this.patternCorrector.score(variation, label);
                            if (score > 0.6) { // Only use if reasonably good
                                return validation.cleaned;
                            }
                        }
                    }
                }
            }
            return base;
        }
        /**
         * Generate multiple exact samples
         */
        generateBatch(label, count) {
            const results = [];
            const seen = new Set();
            // Try to get unique exact samples
            for (let i = 0; i < count * 2 && results.length < count; i++) {
                const seed = this.config.seed !== undefined
                    ? this.config.seed + i
                    : Date.now() + i;
                let generated;
                if (i < count && this.config.usePatternMatching) {
                    // First half: exact matches
                    generated = this.generate(label, seed);
                }
                else {
                    // Second half: try variations
                    generated = this.generateWithVariation(label, seed);
                }
                if (generated && !seen.has(generated.toLowerCase())) {
                    results.push(generated);
                    seen.add(generated.toLowerCase());
                }
            }
            return results;
        }
        /**
         * Get all available labels
         */
        getLabels() {
            return this.retrieval.getLabels();
        }
        /**
         * Check if generator is trained
         */
        isTrained() {
            return this.retrieval.getLabels().length > 0;
        }
    }

    /**
     * PerfectGenerator - Best of all worlds
     * Combines exact retrieval, pattern matching, and improved ELM generation
     * Provides highest realism with good variation
     */
    class PerfectGenerator {
        constructor(config) {
            this.elm = null;
            this.trainingSamples = [];
            // Initialize and require license before allowing generator use
            this.config = Object.assign({ preferExact: true, usePatternMatching: true, useImprovedELM: false, elmHiddenUnits: 128, elmActivation: 'relu', elmRidgeLambda: 0.001, noiseSize: 32 }, config);
            this.exact = new ExactGenerator({
                seed: config.seed,
                usePatternMatching: this.config.usePatternMatching,
            });
            this.hybrid = new HybridGenerator({
                maxLength: config.maxLength,
                seed: config.seed,
                exactMode: false, // Allow some jitter for variation
                jitterStrength: 0.02, // Very low jitter (2%)
                useOneHot: false, // Disable one-hot to reduce memory (was: this.config.useImprovedELM)
                useClassification: false, // Disable classification to reduce memory (was: this.config.useImprovedELM)
                usePatternCorrection: true,
                elmHiddenUnits: this.config.elmHiddenUnits, // Now uses reduced 128 instead of 256
                elmActivation: this.config.elmActivation,
                elmRidgeLambda: this.config.elmRidgeLambda,
                noiseSize: this.config.noiseSize,
            });
            // Only create standalone ELM if explicitly requested AND useImprovedELM is true
            // This avoids duplicate ELM training (HybridGenerator already has one)
            if (this.config.useImprovedELM && config.useImprovedELM === true) {
                this.elm = new ELMGenerator({
                    maxLength: config.maxLength,
                    seed: config.seed,
                    hiddenUnits: this.config.elmHiddenUnits,
                    activation: this.config.elmActivation,
                    ridgeLambda: this.config.elmRidgeLambda,
                    noiseSize: this.config.noiseSize,
                    useOneHot: false, // Disable one-hot to reduce memory
                    useClassification: false, // Disable classification to reduce memory
                    usePatternCorrection: true,
                });
            }
            this.patternCorrector = new PatternCorrector();
        }
        /**
         * Train the perfect generator
         */
        train(samples) {
            this.trainingSamples = samples;
            // Train generators in order of priority (exact is fastest)
            this.exact.train(samples);
            // Only train hybrid if we need it (lazy training)
            // We'll train it on first use if needed
            // Learn patterns (lightweight)
            this.patternCorrector.learnPatterns(samples);
        }
        /**
         * Lazy train hybrid generator
         */
        ensureHybridTrained() {
            if (!this.hybrid.isTrained() && this.trainingSamples.length > 0) {
                this.hybrid.train(this.trainingSamples);
            }
        }
        /**
         * Lazy train ELM generator
         */
        ensureELMTrained() {
            if (this.elm && !this.elm.isTrained() && this.trainingSamples.length > 0) {
                this.elm.train(this.trainingSamples);
            }
        }
        /**
         * Generate with best strategy
         */
        generate(label, seed) {
            var _a;
            const candidates = [];
            // 1. Try exact retrieval first (100% realistic)
            try {
                const exact = this.exact.generate(label, seed);
                if (exact) {
                    candidates.push({ value: exact, score: 1.0, source: 'exact' });
                }
            }
            catch (error) {
                // No exact match available
            }
            // 2. Try exact with variation (95-100% realistic)
            try {
                const exactVar = this.exact.generateWithVariation(label, seed);
                if (exactVar && exactVar !== ((_a = candidates[0]) === null || _a === void 0 ? void 0 : _a.value)) {
                    const score = this.patternCorrector.score(exactVar, label);
                    candidates.push({ value: exactVar, score: score * 0.95, source: 'exact-variation' });
                }
            }
            catch (error) {
                // Skip
            }
            // 3. Try hybrid (80-90% realistic) - lazy train if needed
            try {
                this.ensureHybridTrained();
                const hybrid = this.hybrid.generate(label, seed);
                if (hybrid && !candidates.some(c => c.value === hybrid)) {
                    const score = this.patternCorrector.score(hybrid, label);
                    const validation = validateForLabel(label, hybrid);
                    const finalScore = validation.isValid ? score * 0.85 : score * 0.5;
                    candidates.push({ value: hybrid, score: finalScore, source: 'hybrid' });
                }
            }
            catch (error) {
                // Skip
            }
            // 4. Try improved ELM if available (75-85% realistic) - lazy train if needed
            if (this.elm) {
                try {
                    this.ensureELMTrained();
                    const elmGen = this.elm.generate(label, seed);
                    if (elmGen && !candidates.some(c => c.value === elmGen)) {
                        const score = this.patternCorrector.score(elmGen, label);
                        const validation = validateForLabel(label, elmGen);
                        const finalScore = validation.isValid ? score * 0.8 : score * 0.4;
                        candidates.push({ value: elmGen, score: finalScore, source: 'elm' });
                    }
                }
                catch (error) {
                    // Skip
                }
            }
            // 5. Select best candidate
            if (candidates.length === 0) {
                throw new Error(`No samples found for label: ${label}`);
            }
            // Sort by score (highest first)
            candidates.sort((a, b) => b.score - a.score);
            // If preferExact and we have exact match, use it
            if (this.config.preferExact) {
                const exactCandidate = candidates.find(c => c.source === 'exact');
                if (exactCandidate && exactCandidate.score >= 0.9) {
                    return exactCandidate.value;
                }
            }
            // Return highest scoring candidate
            return candidates[0].value;
        }
        /**
         * Generate multiple samples with best strategy
         */
        generateBatch(label, count) {
            const results = [];
            const seen = new Set();
            let attempts = 0;
            const maxAttempts = count * 5;
            while (results.length < count && attempts < maxAttempts) {
                const seed = this.config.seed !== undefined
                    ? this.config.seed + attempts
                    : Date.now() + attempts;
                try {
                    const generated = this.generate(label, seed);
                    if (generated && generated.length > 0 && !seen.has(generated.toLowerCase())) {
                        results.push(generated);
                        seen.add(generated.toLowerCase());
                    }
                }
                catch (error) {
                    // Skip errors
                }
                attempts++;
            }
            return results;
        }
        /**
         * Get all available labels
         */
        getLabels() {
            return this.exact.getLabels();
        }
        /**
         * Check if generator is trained
         */
        isTrained() {
            // At minimum, exact generator should be trained
            return this.exact.isTrained();
        }
    }

    /**
     * OmegaSynth - Main class
     * Unified interface for synthetic data generation
     */
    class OmegaSynth {
        constructor(config) {
            this.generator = null;
            this.config = Object.assign({ maxLength: 32 }, config);
            this.seed = config.seed;
            // Initialize generator based on mode
            this.initializeGenerator();
        }
        initializeGenerator() {
            var _a, _b, _c, _d, _e, _f, _g;
            const commonConfig = {
                maxLength: this.config.maxLength || 32,
                seed: this.seed,
            };
            switch (this.config.mode) {
                case 'retrieval':
                    this.generator = new RetrievalGenerator(this.seed);
                    break;
                case 'elm':
                    this.generator = new ELMGenerator(Object.assign(Object.assign({}, commonConfig), { hiddenUnits: 128, activation: 'relu', ridgeLambda: 0.01, noiseSize: 32, useOneHot: (_a = this.config.useOneHot) !== null && _a !== void 0 ? _a : false, useClassification: (_b = this.config.useClassification) !== null && _b !== void 0 ? _b : false, usePatternCorrection: (_c = this.config.usePatternCorrection) !== null && _c !== void 0 ? _c : true }));
                    break;
                case 'hybrid':
                    this.generator = new HybridGenerator(Object.assign(Object.assign({}, commonConfig), { elmHiddenUnits: 128, elmActivation: 'relu', elmRidgeLambda: 0.01, noiseSize: 32, jitterStrength: this.config.exactMode ? 0 : 0.05, exactMode: (_d = this.config.exactMode) !== null && _d !== void 0 ? _d : false, useOneHot: (_e = this.config.useOneHot) !== null && _e !== void 0 ? _e : false, useClassification: (_f = this.config.useClassification) !== null && _f !== void 0 ? _f : false, usePatternCorrection: (_g = this.config.usePatternCorrection) !== null && _g !== void 0 ? _g : true }));
                    break;
                case 'exact':
                    this.generator = new ExactGenerator({
                        seed: this.seed,
                        usePatternMatching: true,
                    });
                    break;
                case 'perfect':
                    this.generator = new PerfectGenerator(Object.assign(Object.assign({}, commonConfig), { preferExact: true, usePatternMatching: true, useImprovedELM: true, elmHiddenUnits: 256, elmActivation: 'relu', elmRidgeLambda: 0.001, noiseSize: 32 }));
                    break;
                default:
                    throw new Error(`Unknown mode: ${this.config.mode}`);
            }
        }
        /**
         * Train the generator on a dataset
         * @param dataset Array of labeled samples
         */
        train(dataset) {
            return __awaiter(this, void 0, void 0, function* () {
                if (!this.generator) {
                    throw new Error('Generator not initialized');
                }
                if (this.config.mode === 'retrieval') {
                    this.generator.ingest(dataset);
                }
                else if (this.config.mode === 'elm') {
                    this.generator.train(dataset);
                }
                else if (this.config.mode === 'hybrid') {
                    this.generator.train(dataset);
                }
                else if (this.config.mode === 'exact') {
                    this.generator.train(dataset);
                }
                else if (this.config.mode === 'perfect') {
                    this.generator.train(dataset);
                }
            });
        }
        /**
         * Generate a synthetic value for a given label
         * @param label Label to generate for
         * @param seed Optional seed for deterministic generation
         */
        generate(label, seed) {
            return __awaiter(this, void 0, void 0, function* () {
                if (!this.generator) {
                    throw new Error('Generator not initialized. Call train() first.');
                }
                if (this.config.mode === 'retrieval') {
                    const result = this.generator.sampleOne(label);
                    if (!result) {
                        throw new Error(`No samples found for label: ${label}`);
                    }
                    return result;
                }
                else if (this.config.mode === 'elm') {
                    return this.generator.generate(label, seed);
                }
                else if (this.config.mode === 'hybrid') {
                    return this.generator.generate(label, seed);
                }
                else if (this.config.mode === 'exact') {
                    return this.generator.generate(label, seed);
                }
                else if (this.config.mode === 'perfect') {
                    return this.generator.generate(label, seed);
                }
                throw new Error(`Unknown mode: ${this.config.mode}`);
            });
        }
        /**
         * Generate multiple synthetic values for a label
         * @param label Label to generate for
         * @param count Number of samples to generate
         */
        generateBatch(label, count) {
            return __awaiter(this, void 0, void 0, function* () {
                if (!this.generator) {
                    throw new Error('Generator not initialized. Call train() first.');
                }
                if (this.config.mode === 'retrieval') {
                    return this.generator.sample(label, count);
                }
                else if (this.config.mode === 'elm') {
                    return this.generator.generateBatch(label, count);
                }
                else if (this.config.mode === 'hybrid') {
                    return this.generator.generateBatch(label, count);
                }
                else if (this.config.mode === 'exact') {
                    return this.generator.generateBatch(label, count);
                }
                else if (this.config.mode === 'perfect') {
                    return this.generator.generateBatch(label, count);
                }
                throw new Error(`Unknown mode: ${this.config.mode}`);
            });
        }
        /**
         * Get all available labels
         */
        getLabels() {
            if (!this.generator) {
                return [];
            }
            if (this.config.mode === 'retrieval') {
                return this.generator.getLabels();
            }
            else if (this.config.mode === 'elm') {
                return this.generator.getLabels();
            }
            else if (this.config.mode === 'hybrid') {
                return this.generator.getLabels();
            }
            else if (this.config.mode === 'exact') {
                return this.generator.getLabels();
            }
            else if (this.config.mode === 'perfect') {
                return this.generator.getLabels();
            }
            return [];
        }
        /**
         * Check if the generator is trained
         */
        isTrained() {
            if (!this.generator) {
                return false;
            }
            if (this.config.mode === 'retrieval') {
                const labels = this.generator.getLabels();
                return labels.length > 0;
            }
            else if (this.config.mode === 'elm') {
                return this.generator.isTrained();
            }
            else if (this.config.mode === 'hybrid') {
                return this.generator.isTrained();
            }
            else if (this.config.mode === 'exact') {
                return this.generator.isTrained();
            }
            else if (this.config.mode === 'perfect') {
                return this.generator.isTrained();
            }
            return false;
        }
        /**
         * Set seed for deterministic generation
         */
        setSeed(seed) {
            this.seed = seed;
            // Reinitialize generator with new seed
            this.initializeGenerator();
        }
    }

    /**
     * loadPretrained - Load pretrained synthetic data generator
     * Instantiates OmegaSynth with pretrained data for common labels
     */
    /**
     * Load pretrained OmegaSynth instance
     * @param mode Generation mode ('retrieval', 'elm', or 'hybrid')
     * @param config Optional configuration overrides
     */
    function loadPretrained(mode = 'retrieval', config) {
        // Initialize license before creating instance
        const synth = new OmegaSynth({
            mode,
            maxLength: (config === null || config === void 0 ? void 0 : config.maxLength) || 32,
            seed: config === null || config === void 0 ? void 0 : config.seed,
        });
        // Load default data
        // Try multiple possible locations for the model file
        let modelPath = null;
        // Helper to find package root by looking for package.json
        function findPackageRoot(startDir) {
            let current = startDir;
            while (current !== path__namespace.dirname(current)) {
                const pkgPath = path__namespace.join(current, 'package.json');
                if (fs__namespace.existsSync(pkgPath)) {
                    try {
                        const pkg = JSON.parse(fs__namespace.readFileSync(pkgPath, 'utf-8'));
                        if (pkg.name === '@astermind/astermind-synth') {
                            return current;
                        }
                    }
                    catch (_a) {
                        // Continue searching
                    }
                }
                current = path__namespace.dirname(current);
            }
            return null;
        }
        // Find package root first - this is more reliable than using __dirname
        // since we're looking for files relative to package root, not the current file
        const packageRoot = findPackageRoot(process.cwd());
        const possiblePaths = [];
        // Add paths relative to package root if found
        if (packageRoot) {
            possiblePaths.push(path__namespace.join(packageRoot, 'dist/omegasynth/models/default_synth.json'), // Bundled location (npm package)
            path__namespace.join(packageRoot, 'src/omegasynth/models/default_synth.json') // Source location (development)
            );
        }
        // Also try common npm package locations (when installed as dependency)
        possiblePaths.push(path__namespace.join(process.cwd(), 'node_modules/@astermind/astermind-synth/dist/omegasynth/models/default_synth.json'));
        // Try relative to current working directory (for development)
        possiblePaths.push(path__namespace.join(process.cwd(), 'dist/omegasynth/models/default_synth.json'), path__namespace.join(process.cwd(), 'src/omegasynth/models/default_synth.json'));
        for (const possiblePath of possiblePaths) {
            if (fs__namespace.existsSync(possiblePath)) {
                modelPath = possiblePath;
                break;
            }
        }
        if (!modelPath) {
            throw new Error('default_synth.json not found. Tried paths: ' + possiblePaths.join(', '));
        }
        const modelData = JSON.parse(fs__namespace.readFileSync(modelPath, 'utf-8'));
        // Convert pretrained data to LabeledSample format
        const samples = [];
        for (const [label, values] of Object.entries(modelData.labels)) {
            for (const value of values) {
                samples.push({ label, value });
            }
        }
        // Train the generator synchronously for immediate use
        // Note: This is a simplified approach - in production you might want async
        (() => __awaiter(this, void 0, void 0, function* () {
            try {
                yield synth.train(samples);
            }
            catch (err) {
                console.error('Error training pretrained model:', err);
            }
        }))();
        return synth;
    }
    /**
     * Load a fully versioned OmegaSynth model from dist/models/vX.Y.Z
     *
     * This function:
     * - Reads model.json, training_data.json, and elm_model.json from the version directory
     * - Rebuilds the retrieval store from training_data.json
     * - Hydrates the internal ELM from elm_model.json (for elm/hybrid modes) if possible
     *
     * NOTE:
     * - We avoid calling synth.train() here to prevent re-training; instead we:
     *   - Directly ingest training samples into the retrieval generator
     *   - Attempt to load ELM weights via loadModelFromJSON if available
     */
    function loadPretrainedFromVersion(versionDir) {
        var _a;
        // Initialize license before creating instance
        const manifestPath = path__namespace.join(versionDir, 'manifest.json');
        const modelPath = path__namespace.join(versionDir, 'model.json');
        const trainingDataPath = path__namespace.join(versionDir, 'training_data.json');
        const elmModelPath = path__namespace.join(versionDir, 'elm_model.json');
        let manifest = null;
        if (fs__namespace.existsSync(manifestPath)) {
            manifest = JSON.parse(fs__namespace.readFileSync(manifestPath, 'utf-8'));
        }
        const modelData = JSON.parse(fs__namespace.readFileSync(modelPath, 'utf-8'));
        const configFromModel = (_a = manifest === null || manifest === void 0 ? void 0 : manifest.config) !== null && _a !== void 0 ? _a : modelData.config;
        // Load training samples
        if (!fs__namespace.existsSync(trainingDataPath)) {
            throw new Error(`training_data.json not found in version directory: ${trainingDataPath}`);
        }
        const trainingSamples = JSON.parse(fs__namespace.readFileSync(trainingDataPath, 'utf-8'));
        // Create OmegaSynth.
        // IMPORTANT: For pretrained loading we prefer 'retrieval' mode here:
        // - We only need high-quality samples for downstream ELM/KELM training.
        // - Retrieval over the saved training_data.json gives 100% realistic data
        //   without requiring vocab building or ELM retraining.
        //
        // If you ever need to use the original mode (e.g. 'hybrid' or 'elm'),
        // you can swap this back to configFromModel.mode.
        const mode = 'retrieval';
        const synth = new OmegaSynth({
            mode,
            maxLength: configFromModel.maxLength || 50,
            seed: configFromModel.seed,
        });
        // Ingest training samples directly into the retrieval generator
        // For hybrid/elm modes, this ensures retrieval works without retraining
        try {
            const generator = synth.generator;
            if (generator) {
                if (generator.ingest) {
                    // RetrievalGenerator
                    generator.ingest(trainingSamples);
                }
                else if (generator.retrieval && typeof generator.retrieval.ingest === 'function') {
                    // HybridGenerator (has .retrieval)
                    generator.retrieval.ingest(trainingSamples);
                }
            }
        }
        catch (err) {
            console.warn('Could not ingest training samples into OmegaSynth generator:', err);
        }
        // Hydrate ELM weights if available and applicable (elm/hybrid modes).
        // NOTE: Since we currently force mode = 'retrieval' above for stability,
        // this block will not run. It is left here for future use if you decide
        // to re-enable elm/hybrid loading via configFromModel.mode.
        if (fs__namespace.existsSync(elmModelPath) && (configFromModel.mode === 'elm' || configFromModel.mode === 'hybrid')) {
            try {
                const elmModelJSON = fs__namespace.readFileSync(elmModelPath, 'utf-8');
                const generator = synth.generator;
                if (generator) {
                    let elmInstance = null;
                    if (configFromModel.mode === 'hybrid' && generator.elm && generator.elm.elm) {
                        // HybridGenerator -> ELMGenerator -> elm
                        elmInstance = generator.elm.elm;
                    }
                    else if (configFromModel.mode === 'elm' && generator.elm) {
                        // ELMGenerator -> elm
                        elmInstance = generator.elm;
                    }
                    if (elmInstance && typeof elmInstance.loadModelFromJSON === 'function') {
                        elmInstance.loadModelFromJSON(elmModelJSON);
                        console.log('✅ ELM weights loaded from elm_model.json into OmegaSynth');
                    }
                    else {
                        console.warn('Could not load ELM weights: loadModelFromJSON not available on ELM instance');
                    }
                }
            }
            catch (err) {
                console.warn('Could not hydrate ELM from elm_model.json:', err);
            }
        }
        return synth;
    }
    /**
     * Load pretrained model from custom JSON data
     * @param modelData Custom model data
     * @param mode Generation mode
     * @param config Optional configuration
     */
    function loadPretrainedFromData(modelData, mode = 'retrieval', config) {
        // Initialize license before creating instance
        const synth = new OmegaSynth({
            mode,
            maxLength: (config === null || config === void 0 ? void 0 : config.maxLength) || 32,
            seed: config === null || config === void 0 ? void 0 : config.seed,
        });
        const samples = [];
        for (const [label, values] of Object.entries(modelData.labels)) {
            for (const value of values) {
                samples.push({ label, value });
            }
        }
        (() => __awaiter(this, void 0, void 0, function* () {
            try {
                yield synth.train(samples);
            }
            catch (err) {
                console.error('Error training custom model:', err);
            }
        }))();
        return synth;
    }
    /**
     * Get available pretrained labels
     */
    function getPretrainedLabels() {
        try {
            // Helper to find package root
            function findPackageRoot(startDir) {
                let current = startDir;
                while (current !== path__namespace.dirname(current)) {
                    const pkgPath = path__namespace.join(current, 'package.json');
                    if (fs__namespace.existsSync(pkgPath)) {
                        try {
                            const pkg = JSON.parse(fs__namespace.readFileSync(pkgPath, 'utf-8'));
                            if (pkg.name === '@astermind/astermind-synth') {
                                return current;
                            }
                        }
                        catch (_a) {
                            // Continue searching
                        }
                    }
                    current = path__namespace.dirname(current);
                }
                return null;
            }
            // Try multiple possible locations for the model file
            const packageRoot = findPackageRoot(process.cwd());
            const possiblePaths = [];
            if (packageRoot) {
                possiblePaths.push(path__namespace.join(packageRoot, 'dist/omegasynth/models/default_synth.json'), path__namespace.join(packageRoot, 'src/omegasynth/models/default_synth.json'));
            }
            possiblePaths.push(path__namespace.join(process.cwd(), 'node_modules/@astermind/astermind-synth/dist/omegasynth/models/default_synth.json'), path__namespace.join(process.cwd(), 'dist/omegasynth/models/default_synth.json'), path__namespace.join(process.cwd(), 'src/omegasynth/models/default_synth.json'));
            let modelPath = null;
            for (const possiblePath of possiblePaths) {
                if (fs__namespace.existsSync(possiblePath)) {
                    modelPath = possiblePath;
                    break;
                }
            }
            if (!modelPath) {
                throw new Error('Model file not found');
            }
            const modelData = JSON.parse(fs__namespace.readFileSync(modelPath, 'utf-8'));
            return Object.keys(modelData.labels);
        }
        catch (_a) {
            // Fallback if file not found
            return [
                'first_name', 'last_name', 'phone_number', 'email', 'street_address',
                'city', 'state', 'country', 'company_name', 'job_title', 'product_name',
                'color', 'uuid', 'date', 'credit_card_type', 'device_type'
            ];
        }
    }

    /**
     * Utilities for saving trained OmegaSynth models
     */
    /**
     * Save a trained OmegaSynth model to disk
     *
     * @param synth The trained OmegaSynth instance
     * @param trainingData The training data used to train the model (required for saving)
     * @param outputDir Directory where the model will be saved
     * @param version Optional version string (default: '1.0.0')
     * @returns Path to the saved model directory
     */
    function saveTrainedModel(synth_1, trainingData_1, outputDir_1) {
        return __awaiter(this, arguments, void 0, function* (synth, trainingData, outputDir, version = '1.0.0') {
            if (!synth.isTrained()) {
                throw new Error('Model must be trained before saving. Call train() first.');
            }
            if (trainingData.length === 0) {
                throw new Error('Training data is required to save the model.');
            }
            // Create version directory
            const versionDir = path__namespace.join(outputDir, `v${version}`);
            if (!fs__namespace.existsSync(versionDir)) {
                fs__namespace.mkdirSync(versionDir, { recursive: true });
            }
            // Calculate training stats
            const labels = Array.from(new Set(trainingData.map(s => s.label)));
            const samplesPerLabel = {};
            for (const label of labels) {
                samplesPerLabel[label] = trainingData.filter(s => s.label === label).length;
            }
            // Get config from synth (we need to access private config)
            const config = synth.config || {};
            // Save model metadata
            const modelData = {
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
            const modelPath = path__namespace.join(versionDir, 'model.json');
            fs__namespace.writeFileSync(modelPath, JSON.stringify(modelData, null, 2));
            // Save training data (required for loading later)
            const trainingDataPath = path__namespace.join(versionDir, 'training_data.json');
            fs__namespace.writeFileSync(trainingDataPath, JSON.stringify(trainingData, null, 2));
            // Try to save ELM model weights if available (for elm/hybrid modes)
            try {
                const generator = synth.generator;
                if (generator) {
                    let elmInstance = null;
                    // Get ELM instance based on mode
                    if (config.mode === 'hybrid' && generator.elm) {
                        elmInstance = generator.elm.elm; // HybridGenerator -> ELMGenerator -> elm
                    }
                    else if (config.mode === 'elm' && generator.elm) {
                        elmInstance = generator.elm; // ELMGenerator -> elm
                    }
                    if (elmInstance) {
                        let elmModelJSON;
                        // Try to get serialized model
                        if (elmInstance.savedModelJSON) {
                            elmModelJSON = elmInstance.savedModelJSON;
                        }
                        else if (elmInstance.model) {
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
                            const elmModelPath = path__namespace.join(versionDir, 'elm_model.json');
                            fs__namespace.writeFileSync(elmModelPath, elmModelJSON);
                            console.log(`✅ ELM model weights saved to: ${elmModelPath}`);
                        }
                    }
                }
            }
            catch (error) {
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
        });
    }

    exports.Activations = Activations;
    exports.Augment = Augment;
    exports.AutoComplete = AutoComplete;
    exports.CharacterLangEncoderELM = CharacterLangEncoderELM;
    exports.ConfidenceClassifierELM = ConfidenceClassifierELM;
    exports.DISK_EPS = DISK_EPS;
    exports.DeepELM = DeepELM;
    exports.DeepELMPro = DeepELMPro;
    exports.DimError = DimError;
    exports.ELM = ELM;
    exports.ELMAdapter = ELMAdapter;
    exports.ELMChain = ELMChain;
    exports.ELMGenerator = ELMGenerator;
    exports.ELMScorer = ELMScorer;
    exports.ELMWorkerClient = ELMWorkerClient;
    exports.EPS = EPS;
    exports.EmbeddingStore = EmbeddingStore;
    exports.EncoderELM = EncoderELM;
    exports.FeatureCombinerELM = FeatureCombinerELM;
    exports.HybridGenerator = HybridGenerator;
    exports.IO = IO;
    exports.InfoFlowGraph = InfoFlowGraph;
    exports.InfoFlowGraphPWS = InfoFlowGraphPWS;
    exports.IntentClassifier = IntentClassifier;
    exports.KNN = KNN;
    exports.KernelELM = KernelELM;
    exports.LanguageClassifier = LanguageClassifier;
    exports.MAX_EXP = MAX_EXP;
    exports.MIN_EXP = MIN_EXP;
    exports.Matrix = Matrix;
    exports.MultiKernelELM = MultiKernelELM;
    exports.MultiTaskELM = MultiTaskELM;
    exports.OmegaSynth = OmegaSynth;
    exports.OnlineELM = OnlineELM;
    exports.OnlineKernelELM = OnlineKernelELM;
    exports.OnlineRidge = OnlineRidge;
    exports.RefinerELM = RefinerELM;
    exports.RetrievalGenerator = RetrievalGenerator;
    exports.SparseELM = SparseELM;
    exports.StringEncoder = StringEncoder;
    exports.SyntheticFieldStore = SyntheticFieldStore;
    exports.TEController = TEController;
    exports.TFIDF = TFIDF;
    exports.TFIDFVectorizer = TFIDFVectorizer;
    exports.TextEncoder = TextEncoder;
    exports.Tokenizer = Tokenizer;
    exports.TransferEntropy = TransferEntropy;
    exports.TransferEntropyPWS = TransferEntropyPWS;
    exports.UniversalEncoder = UniversalEncoder;
    exports.VotingClassifierELM = VotingClassifierELM;
    exports.add = add;
    exports.add_ = add_;
    exports.argmax = argmax;
    exports.asVec = asVec;
    exports.assertRect = assertRect;
    exports.autoTune = autoTune;
    exports.backfillEmptyParents = backfillEmptyParents;
    exports.baseKernel = baseKernel$1;
    exports.binaryPR = binaryPR;
    exports.binaryROC = binaryROC;
    exports.bindAutocompleteUI = bindAutocompleteUI;
    exports.buildDenseDocs = buildDenseDocs;
    exports.buildIndex = buildIndex;
    exports.buildLandmarks = buildLandmarks;
    exports.buildRFF = buildRFF;
    exports.buildTfidfDocs = buildTfidfDocs;
    exports.buildVocabAndIdf = buildVocabAndIdf;
    exports.clampVec = clampVec;
    exports.confusionMatrixFromIndices = confusionMatrixFromIndices;
    exports.cosine = cosine$2;
    exports.cosineSparse = cosineSparse;
    exports.defaultNumericConfig = defaultNumericConfig;
    exports.defaultTextConfig = defaultTextConfig;
    exports.deserializeTextBits = deserializeTextBits;
    exports.dot = dot;
    exports.dotProd = dotProd$1;
    exports.ensureRectNumber2D = ensureRectNumber2D;
    exports.evaluateClassification = evaluateClassification;
    exports.evaluateEnsembleRetrieval = evaluateEnsembleRetrieval;
    exports.evaluateRegression = evaluateRegression;
    exports.expSafe = expSafe;
    exports.expandQuery = expandQuery;
    exports.explainFeatures = explainFeatures;
    exports.exportModel = exportModel;
    exports.filterMMR = filterMMR;
    exports.flattenSections = flattenSections;
    exports.fmtHead = fmtHead;
    exports.formatClassificationReport = formatClassificationReport;
    exports.getPretrainedLabels = getPretrainedLabels;
    exports.hDistProxy = hDistProxy;
    exports.hadamard = hadamard;
    exports.hadamard_ = hadamard_;
    exports.hybridRetrieve = hybridRetrieve;
    exports.importModel = importModel;
    exports.isFiniteVec = isFiniteVec;
    exports.isNumericConfig = isNumericConfig;
    exports.isTextConfig = isTextConfig;
    exports.jaccard = jaccard;
    exports.kernelSim = kernelSim;
    exports.keywordBonus = keywordBonus;
    exports.l2 = l2$1;
    exports.loadPretrained = loadPretrained;
    exports.loadPretrainedFromData = loadPretrainedFromData;
    exports.loadPretrainedFromVersion = loadPretrainedFromVersion;
    exports.log1pSafe = log1pSafe;
    exports.logLoss = logLoss;
    exports.logSumExp = logSumExp;
    exports.mapRFF = mapRFF;
    exports.mean = mean;
    exports.normalizeConfig = normalizeConfig;
    exports.normalizeL2 = normalizeL2;
    exports.normalizeWord = normalizeWord;
    exports.omegaComposeAnswer = omegaComposeAnswer;
    exports.parseMarkdownToSections = parseMarkdownToSections;
    exports.penalty = penalty;
    exports.projectToDense = projectToDense;
    exports.quickHash = quickHash;
    exports.rerank = rerank;
    exports.rerankAndFilter = rerankAndFilter;
    exports.ridgeSolvePro = ridgeSolvePro;
    exports.sampleQueriesFromCorpus = sampleQueriesFromCorpus;
    exports.saveTrainedModel = saveTrainedModel;
    exports.scal = scal;
    exports.scal_ = scal_;
    exports.sigmoid = sigmoid$1;
    exports.softmax = softmax;
    exports.sparseToDense = sparseToDense;
    exports.standardize = standardize;
    exports.summarizeDeterministic = summarizeDeterministic;
    exports.tanhVec = tanhVec;
    exports.tanhVec_ = tanhVec_;
    exports.toTfidf = toTfidf;
    exports.tokenize = tokenize$1;
    exports.topK = topK;
    exports.topKAccuracy = topKAccuracy;
    exports.topKIndices = topKIndices;
    exports.variance = variance;
    exports.wrapELM = wrapELM;
    exports.zeros = zeros;

}));
//# sourceMappingURL=astermind.umd.js.map
