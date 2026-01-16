// rff.ts — Random Fourier Features for RBF kernels
export type RFF = {
    W: Float64Array;  // (D * d) packed row-major
    b: Float64Array;  // D
    D: number;        // features per cos/sin block (final Φ has 2D dims)
    d: number;        // input dimension
    sigma: number;    // kernel bandwidth
};

export function buildRFF(d: number, D: number, sigma = 1.0, rng = Math.random): RFF {
    const W = new Float64Array(D * d);
    const b = new Float64Array(D);
    const s = 1 / Math.max(1e-12, sigma); // N(0, 1/sigma^2)
    for (let i = 0; i < D * d; i++) W[i] = gauss(rng) * s;
    for (let i = 0; i < D; i++) b[i] = rng() * 2 * Math.PI;
    return { W, b, D, d, sigma };
}

export function mapRFF(rff: RFF, x: Float64Array): Float64Array {
    const { W, b, D, d } = rff;
    const z = new Float64Array(2 * D);
    for (let k = 0; k < D; k++) {
        let dot = b[k];
        const off = k * d;
        for (let j = 0; j < d; j++) dot += W[off + j] * (x[j] || 0);
        z[k] = Math.cos(dot);
        z[D + k] = Math.sin(dot);
    }
    // L2 normalize block to keep ridge well-conditioned
    let s = 0; for (let i = 0; i < z.length; i++) s += z[i] * z[i];
    const inv = 1 / Math.sqrt(Math.max(s, 1e-12));
    for (let i = 0; i < z.length; i++) z[i] *= inv;
    return z;
}

// Box-Muller
function gauss(rng: () => number) {
    let u = 0, v = 0; while (u === 0) u = rng(); while (v === 0) v = rng();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}


