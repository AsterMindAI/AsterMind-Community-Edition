// TEController.ts — TE-PWS closed-loop tuner for Ω

// License removed - all features are now free!

export type ControllerParams = {
    // targets (bits); set as *bands*, not single points
    targets: {
        q2score: [number, number];     // desired band for Retriever:Q->Score
        feat2score: [number, number];  // desired band for OmegaRR:Feat->Score
        kept2sum: [number, number];    // desired band for Omega:Kept->Summary
        loopMax?: number;              // optional upper bound for recurrent/loop TE
    };
    // knobs we’re allowed to move + limits
    limits: Record<KnobName, [number, number]>;
    step: Record<KnobName, number>;  // maximum single-step changes per knob
    cooldown: number;                // queries between adjustments
    maxPerSessionAdjusts: number;    // hard cap
    trustMinSamples: number;         // need at least this many TE samples
};

export type Knobs = {
    alpha: number;
    sigma: number;
    ridge: number;
    probThresh: number;
    mmrLambda: number;
    budgetChars: number;
};

export type KnobName = keyof Knobs;

export type ControllerState = {
    lastAdjustAt: number;
    totalAdjusts: number;
    ema: Record<string, number>;     // TE EMAs by channel
    history: { param: KnobName; oldVal: number; newVal: number; why: string }[];
};

/* ------------------------ utils ------------------------ */

function clampNumber(x: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, x));
}

function withinBand(v: number, band: [number, number]): boolean {
    return v >= band[0] && v <= band[1];
}

/* ------------------------ controller ------------------------ */

export class TEController {
    private p: ControllerParams;
    private s: ControllerState;
    private qCount = 0;
    private emaBeta = 0.2; // EMA smoothing for TE

    constructor(params: Partial<ControllerParams> = {}) {
        // License check removed // Premium feature - requires valid license
        const defaultLimits: ControllerParams["limits"] = {
            alpha: [0.4, 0.98],
            sigma: [0.12, 1.0],
            ridge: [0.01, 0.2],
            probThresh: [0.3, 0.7],
            mmrLambda: [0.4, 0.9],
            budgetChars: [600, 2400],
        };
        const defaultStep: ControllerParams["step"] = {
            alpha: 0.03,
            sigma: 0.04,
            ridge: 0.01,
            probThresh: 0.03,
            mmrLambda: 0.05,
            budgetChars: 120,
        };

        const defaults: ControllerParams = {
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

        this.p = {
            ...defaults,
            ...params,
            targets: { ...defaults.targets, ...(params.targets || {}) },
            limits: { ...defaultLimits, ...(params.limits || {}) },
            step: { ...defaultStep, ...(params.step || {}) },
        };

        this.s = { lastAdjustAt: -999, totalAdjusts: 0, ema: {}, history: [] };
    }

    /** Update EMA from a TE snapshot. */
    pushTE(teSnap: Record<string, number>) {
        this.qCount++;
        for (const [k, v] of Object.entries(teSnap || {})) {
            const prev = this.s.ema[k] ?? v;
            this.s.ema[k] = prev + this.emaBeta * (v - prev);
        }
    }

    /** Try one adjustment; returns {knobs?, note?}. Only adjusts if safe. */
    maybeAdjust(current: Knobs): { knobs?: Knobs; note?: string } {
        if (this.qCount < this.p.trustMinSamples) return {};
        if (this.s.totalAdjusts >= this.p.maxPerSessionAdjusts) return {};
        if (this.qCount - this.s.lastAdjustAt < this.p.cooldown) return {};

        const te = this.s.ema;
        const { q2score, feat2score, kept2sum, loopMax } = this.p.targets;

        const out: Knobs = { ...current };
        let changed: { param: KnobName; delta: number; why: string } | null = null;

        const pick = (cand: { param: KnobName; delta: number; why: string }) => {
            if (!changed) changed = cand; // single-knob change per step
        };

        const tQS = te['Retriever:Q->Score'] ?? 0;
        const tFS = te['OmegaRR:Feat->Score'] ?? 0;
        const tKS = te['Omega:Kept->Summary'] ?? 0;
        const tLoop = te['Reservoir:Loop'] ?? 0; // optional if you wire it

        // 1) Retrieval signal shaping
        if (!withinBand(tQS, q2score)) {
            if (tQS < q2score[0]) {
                pick({ param: 'alpha', delta: +this.p.step.alpha, why: `Q→Score low (${tQS.toFixed(3)} < ${q2score[0]})` });
                if (!changed) pick({ param: 'sigma', delta: -this.p.step.sigma, why: `Q→Score low, sharpen σ` });
            } else {
                pick({ param: 'sigma', delta: +this.p.step.sigma, why: `Q→Score high (${tQS.toFixed(3)} > ${q2score[1]})` });
                if (!changed) pick({ param: 'alpha', delta: -this.p.step.alpha, why: `Q→Score high, blend TF-IDF more` });
            }
        }

        // 2) Reranker feature effectiveness via ridge
        if (!changed && !withinBand(tFS, feat2score)) {
            if (tFS < feat2score[0]) {
                pick({ param: 'ridge', delta: -this.p.step.ridge, why: `Feat→Score low (${tFS.toFixed(3)}): loosen λ` });
            } else {
                pick({ param: 'ridge', delta: +this.p.step.ridge, why: `Feat→Score high (${tFS.toFixed(3)}): stabilize λ` });
            }
        }

        // 3) Grounding strength into summary via kept set
        if (!changed && !withinBand(tKS, kept2sum)) {
            if (tKS < kept2sum[0]) {
                pick({ param: 'probThresh', delta: -this.p.step.probThresh, why: `Kept→Summary low (${tKS.toFixed(3)}): expand kept` });
                if (!changed) pick({ param: 'budgetChars', delta: +this.p.step.budgetChars, why: `Kept→Summary low: widen budget` });
            } else {
                pick({ param: 'probThresh', delta: +this.p.step.probThresh, why: `Kept→Summary high: tighten kept` });
            }
        }

        // 4) Optional loop stability guard
        if (!changed && loopMax != null && tLoop > loopMax) {
            pick({ param: 'ridge', delta: +this.p.step.ridge, why: `Loop TE ${tLoop.toFixed(3)} > ${loopMax}: damp` });
            if (!changed) pick({ param: 'alpha', delta: -this.p.step.alpha, why: `Loop TE high: reduce dense gain` });
        }

        if (!changed) return {}; // nothing to do

        // ---- APPLY CHANGE (narrowed & typed) ----
        const change = changed as { param: KnobName; delta: number; why: string }; // non-null

        const limitsTuple = this.p.limits[change.param] as [number, number];
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

    getHistory() { return this.s.history.slice(-8); }  // recent changes

    reset() {
        this.s = { lastAdjustAt: -999, totalAdjusts: 0, ema: {}, history: [] };
        this.qCount = 0;
    }
}
