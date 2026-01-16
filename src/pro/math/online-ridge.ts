// online_ridge.ts — maintain (Φ^T Φ + λI)^{-1} and β for linear ridge
export class OnlineRidge {
    readonly p: number;          // feature dimension
    readonly m: number;          // output dimension (heads stacked)
    lambda: number;
    Ainv: Float64Array;          // (p x p) inverse, packed row-major
    Beta: Float64Array;          // (p x m)

    constructor(p: number, m: number, lambda = 1e-4) {
        this.p = p; this.m = m; this.lambda = lambda;
        this.Ainv = new Float64Array(p * p);
        this.Beta = new Float64Array(p * m);
        // Ainv = (λ I)^-1 = (1/λ) I
        const inv = 1 / Math.max(1e-12, lambda);
        for (let i = 0; i < p; i++) this.Ainv[i * p + i] = inv;
    }

    // rank-1 update with a single sample (φ, y)
    update(phi: Float64Array, y: Float64Array) {
        const { p, m, Ainv, Beta } = this;
        // u = Ainv * phi
        const u = new Float64Array(p);
        for (let i = 0; i < p; i++) {
            let s = 0, row = i * p;
            for (let j = 0; j < p; j++) s += Ainv[row + j] * phi[j];
            u[i] = s;
        }
        // denom = 1 + phi^T u
        let denom = 1;
        for (let j = 0; j < p; j++) denom += phi[j] * u[j];
        denom = Math.max(denom, 1e-12);
        const scale = 1 / denom;

        // Ainv <- Ainv - (u u^T) * scale
        for (let i = 0; i < p; i++) {
            const ui = u[i] * scale;
            for (let j = 0; j < p; j++) Ainv[i * p + j] -= ui * u[j];
        }
        // Beta <- Beta + Ainv * (phi * y^T)
        // compute t = Ainv * phi  (reuse u after Ainv update)
        for (let i = 0; i < p; i++) {
            let s = 0, row = i * p;
            for (let j = 0; j < p; j++) s += Ainv[row + j] * phi[j];
            u[i] = s; // reuse u as t
        }
        // Beta += outer(u, y)
        for (let i = 0; i < p; i++) {
            const ui = u[i];
            for (let c = 0; c < m; c++) Beta[i * m + c] += ui * y[c];
        }
    }

    // yhat = φ^T Beta
    predict(phi: Float64Array): Float64Array {
        const { p, m, Beta } = this;
        const out = new Float64Array(m);
        for (let c = 0; c < m; c++) {
            let s = 0; for (let i = 0; i < p; i++) s += phi[i] * Beta[i * m + c];
            out[c] = s;
        }
        return out;
    }
}


