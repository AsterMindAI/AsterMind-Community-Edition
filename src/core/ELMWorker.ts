// © 2026 AsterMind AI Co. – All Rights Reserved.
// Patent Pending US 63/897,713
// src/core/ELMWorker.ts
/// <reference lib="webworker" />

// ✅ Runtime guard: only true inside a real Web Worker
const IN_WORKER =
    typeof self !== "undefined" &&
    typeof (self as any).postMessage === "function" &&
    typeof (self as any).addEventListener === "function";

// Types only (no runtime effect)
export { };
declare const self: DedicatedWorkerGlobalScope;

import type { ELMConfig, TrainOptions } from "../core/ELMConfig";

// Use core paths (not ./) – this file lives in src/workers/
import { ELM } from "../core/ELM";
import { OnlineELM, type OnlineELMJSON } from "../core/OnlineELM";
import { ensureRectNumber2D } from "../core/Matrix";

type ModelKind = "none" | "elm" | "online";

type Req<Action extends string = string, P = any> = {
    id: string;
    action: Action;
    payload?: P;
};

type Res =
    | { id: string; ok: true; result?: any }
    | { id: string; ok: false; error: string };

type Progress = {
    id: string;
    type: "progress";
    phase: "encode" | "formH" | "solve" | "done" | string;
    pct: number; // 0..1
    note?: string;
};

let kind: ModelKind = "none";
let elm: ELM | null = null;
let oelm: OnlineELM | null = null;

const ok = (id: string, result?: any): Res => ({ id, ok: true, result });
const err = (id: string, error: unknown): Res => ({
    id,
    ok: false,
    error: String((error as any)?.message ?? error),
});

const post = (m: any) => (self as any).postMessage?.(m);
const postProgress = (p: Progress) => post(p);

// -------- helpers --------
function coerce2D(M: any, width?: number, name = "matrix"): number[][] {
    return ensureRectNumber2D(M, width, name);
}
function hasXY(p: any): p is { X: any; Y?: any; y?: any; options?: any } {
    return p && p.X != null;
}
function isNumber2D(x: any): x is number[][] {
    return Array.isArray(x) && Array.isArray(x[0]) && typeof x[0][0] === "number";
}
function isNumber1D(x: any): x is number[] {
    return Array.isArray(x) && (x.length === 0 || typeof x[0] === "number");
}
function lower(s: any): string {
    return String(s ?? "").toLowerCase().trim();
}

async function routeTrain(id: string, action: string, payload: any): Promise<void> {
    const a = lower(action);
    const onProgress: TrainOptions["onProgress"] = (phase, pct) =>
        postProgress({ id, type: "progress", phase, pct });

    if (kind === "elm") {
        if (!elm) throw new Error("ELM not initialized");

        if (hasXY(payload)) {
            const { X, Y, y, options } = payload ?? {};
            const Xrect = coerce2D(X, undefined, "X");
            const targets = isNumber2D(Y) ? Y : isNumber1D(y) ? y : Y ?? y;
            elm.trainFromData(Xrect, targets, options);
            postProgress({ id, type: "progress", phase: "done", pct: 1 });
            post(ok(id, true));
            return;
        } else {
            const { augmentationOptions, weights } = payload ?? {};
            elm.train(augmentationOptions, weights);
            postProgress({ id, type: "progress", phase: "done", pct: 1 });
            post(ok(id, true));
            return;
        }
    }

    if (kind === "online") {
        if (!oelm) throw new Error("OnlineELM not initialized");
        const { X, Y } = payload ?? {};
        const Xrect = coerce2D(X, undefined, "X");
        const Yrect = coerce2D(Y, undefined, "Y");

        if (a === "fit" || a === "train" || a === "trainfromdata") {
            oelm.fit(Xrect, Yrect);
        } else if (a === "update") {
            oelm.update(Xrect, Yrect);
        } else {
            oelm.fit(Xrect, Yrect);
        }
        postProgress({ id, type: "progress", phase: "done", pct: 1 });
        post(ok(id, true));
        return;
    }

    throw new Error("No model initialized");
}

// ✅ Only attach handlers if we’re actually in a Worker
if (IN_WORKER) {
    self.onmessage = async (ev: MessageEvent<Req>) => {
        const { id, action, payload } = ev.data || {};
        try {
            switch (action) {
                // ---------- lifecycle ----------
                case "init":
                case "initELM": {
                    elm = new ELM(payload as ELMConfig);
                    oelm = null;
                    kind = "elm";
                    post(ok(id, { kind }));
                    break;
                }
                case "initOnlineELM":
                case "initOnline": {
                    oelm = new OnlineELM(payload);
                    elm = null;
                    kind = "online";
                    post(ok(id, { kind }));
                    break;
                }
                case "dispose": {
                    elm = null;
                    oelm = null;
                    kind = "none";
                    post(ok(id, { kind }));
                    break;
                }
                case "getKind": {
                    post(ok(id, { kind }));
                    break;
                }
                case "setVerbose": {
                    const v = !!payload?.verbose;
                    if (kind === "elm" && elm) (elm as any).verbose = v;
                    if (kind === "online" && oelm) (oelm as any).verbose = v;
                    post(ok(id));
                    break;
                }

                // ---------- tolerant generic actions (aliases) ----------
                case "train":
                case "fit":
                case "update":
                case "trainFromData": {
                    await routeTrain(id, action, payload);
                    break;
                }
                case "predict":
                case "predictLogits":
                case "predictlogits": {
                    if (kind === "elm") {
                        if (!elm) throw new Error("ELM not initialized");
                        if (payload?.text != null) {
                            const { text, topK } = payload;
                            const r = elm.predict(String(text), topK ?? 5);
                            post(ok(id, r));
                        } else {
                            const { X } = payload ?? {};
                            const Xrect = coerce2D(X, undefined, "X");
                            const r = elm.predictLogitsFromVectors(Xrect);
                            post(ok(id, r));
                        }
                        break;
                    }
                    if (kind === "online") {
                        if (!oelm) throw new Error("OnlineELM not initialized");
                        const { X } = payload ?? {};
                        const Xrect = coerce2D(X, undefined, "X");
                        const r = oelm.predictLogitsFromVectors(Xrect);
                        post(ok(id, r));
                        break;
                    }
                    throw new Error("No model initialized");
                }

                // ---------- explicit ELM routes (back-compat) ----------
                case "elm.train": {
                    if (!elm) throw new Error("ELM not initialized");
                    const { augmentationOptions, weights } = payload ?? {};
                    const onProgress: TrainOptions["onProgress"] = (phase, pct) =>
                        postProgress({ id, type: "progress", phase, pct });
                    elm.train(augmentationOptions, weights);
                    postProgress({ id, type: "progress", phase: "done", pct: 1 });
                    post(ok(id));
                    break;
                }
                case "elm.trainFromData": {
                    if (!elm) throw new Error("ELM not initialized");
                    const { X, Y, y, options } = payload ?? {};
                    const Xrect = coerce2D(X, undefined, "X");
                    const targets = isNumber2D(Y) ? Y : isNumber1D(y) ? y : Y ?? y;
                    elm.trainFromData(Xrect, targets, options);
                    postProgress({ id, type: "progress", phase: "done", pct: 1 });
                    post(ok(id));
                    break;
                }
                case "elm.predict": {
                    if (!elm) throw new Error("ELM not initialized");
                    const { text, topK } = payload ?? {};
                    const r = elm.predict(String(text), topK ?? 5);
                    post(ok(id, r));
                    break;
                }
                case "elm.predictFromVector": {
                    if (!elm) throw new Error("ELM not initialized");
                    const { X, topK } = payload ?? {};
                    const r = elm.predictFromVector(coerce2D(X, undefined, "X"), topK ?? 5);
                    post(ok(id, r));
                    break;
                }
                case "elm.getEmbedding": {
                    if (!elm) throw new Error("ELM not initialized");
                    const { X } = payload ?? {};
                    const r = elm.getEmbedding(coerce2D(X, undefined, "X"));
                    post(ok(id, r));
                    break;
                }
                case "elm.toJSON": {
                    if (!elm) throw new Error("ELM not initialized");
                    const json = (elm as any).savedModelJSON ?? JSON.stringify((elm as any).model);
                    post(ok(id, json));
                    break;
                }
                case "elm.loadJSON": {
                    if (!elm) throw new Error("ELM not initialized");
                    elm.loadModelFromJSON(String(payload?.json ?? ""));
                    post(ok(id));
                    break;
                }

                // ---------- explicit OnlineELM routes (back-compat) ----------
                case "oelm.init": {
                    if (!oelm) throw new Error("OnlineELM not initialized");
                    const { X0, Y0 } = payload ?? {};
                    oelm.init(coerce2D(X0, undefined, "X0"), coerce2D(Y0, undefined, "Y0"));
                    post(ok(id));
                    break;
                }
                case "oelm.fit": {
                    if (!oelm) throw new Error("OnlineELM not initialized");
                    const { X, Y } = payload ?? {};
                    oelm.fit(coerce2D(X, undefined, "X"), coerce2D(Y, undefined, "Y"));
                    post(ok(id));
                    break;
                }
                case "oelm.update": {
                    if (!oelm) throw new Error("OnlineELM not initialized");
                    const { X, Y } = payload ?? {};
                    oelm.update(coerce2D(X, undefined, "X"), coerce2D(Y, undefined, "Y"));
                    post(ok(id));
                    break;
                }
                case "oelm.logits": {
                    if (!oelm) throw new Error("OnlineELM not initialized");
                    const { X } = payload ?? {};
                    const r = oelm.predictLogitsFromVectors(coerce2D(X, undefined, "X"));
                    post(ok(id, r));
                    break;
                }
                case "oelm.toJSON": {
                    if (!oelm) throw new Error("OnlineELM not initialized");
                    const json: OnlineELMJSON = oelm.toJSON(true);
                    post(ok(id, json));
                    break;
                }
                case "oelm.loadJSON": {
                    if (!oelm) throw new Error("OnlineELM not initialized");
                    oelm.loadFromJSON(payload?.json);
                    post(ok(id));
                    break;
                }

                default: {
                    const a = lower(action);
                    if (a === "initelm" || a === "init") {
                        elm = new ELM(payload as ELMConfig);
                        oelm = null;
                        kind = "elm";
                        post(ok(id, { kind }));
                        break;
                    }
                    if (a === "initonline" || a === "initonlineelm") {
                        oelm = new OnlineELM(payload);
                        elm = null;
                        kind = "online";
                        post(ok(id, { kind }));
                        break;
                    }
                    post(err(id, `Unknown action: ${action}`));
                }
            }
        } catch (e) {
            post(err(id, e));
        }
    };
}

// Optional helper for apps to check environment
export function isELMWorkerRuntime() {
    return IN_WORKER;
}
