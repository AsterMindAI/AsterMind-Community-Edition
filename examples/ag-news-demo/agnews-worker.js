/* eslint-disable no-undef */
/* global importScripts, fetch, TextDecoder, indexedDB, self, performance */

// ---------- Loader ----------
function resolve(url) { try { return new URL(url, self.location.href).toString(); } catch { return url; } }
importScripts(resolve('astermind.umd.js'));
const ast = self.astermind || {};
const { EncoderELM, LanguageClassifier } = ast;

// ---------- Config ----------
const WARMUP_ONLINE = 512;
const WARMUP_KELM = 1024;
const PRED_REFRESH_INTERVAL = 128; // rows between auto-refreshes

// ---------- IndexedDB ----------
const DB_NAME = 'astermind_models'; const STORE = 'models';
function idbOpen() { return new Promise((res, rej) => { const r = indexedDB.open(DB_NAME, 1); r.onupgradeneeded = () => r.result.createObjectStore(STORE); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function idbGet(key) { const db = await idbOpen(); return new Promise((res, rej) => { const tx = db.transaction(STORE, 'readonly'); const rq = tx.objectStore(STORE).get(key); rq.onsuccess = () => res(rq.result || null); rq.onerror = () => rej(rq.error); }); }
async function idbSet(key, val) { const db = await idbOpen(); return new Promise((res, rej) => { const tx = db.transaction(STORE, 'readwrite'); const rq = tx.objectStore(STORE).put(val, key); rq.onsuccess = () => res(); rq.onerror = () => rej(rq.error); }); }

// ---------- Safe JSON fetch ----------
async function safeFetchJSONText(path) {
    try {
        const res = await fetch(resolve(path), { cache: 'no-store' });
        if (!res.ok) return null;
        const ct = (res.headers.get('content-type') || '').toLowerCase();
        const txt = await res.text();
        const looksJSON = /^\s*[\{\[]/.test(txt);
        if (ct.includes('application/json') || looksJSON) return txt;
        return null;
    } catch { return null; }
}

// ---------- Messaging ----------
function post(type, obj = {}) { self.postMessage({ type, ...obj }); }
function log(s) { post('log', { text: s }); }
function prog(p) { post('progress', p); }
function state(paused, predictReady, warmSeen, warmTarget) { post('state', { paused: !!paused, predictReady: !!predictReady, warmSeen, warmTarget }); }
function signalPredictReady() { post('predict-ready', {}); }

// ---------- Pause gate & progress ----------
function makePauseGate() { return async () => { while (S.paused && !S.cancel) { await new Promise(r => setTimeout(r, 40)); } }; }
function etaFrom(now, start, p) { if (!p || p <= 0) return '—'; const el = (now - start) / 1000; const tot = el / p; const left = Math.max(0, tot - el); const m = Math.floor(left / 60), s = Math.floor(left % 60); return `${m}m ${s}s`; }
function meterFn(phase) {
    S.startTime = S.startTime || performance.now();
    let lastRows = 0, lastTime = performance.now();
    return (rows, loaded, total, p0, p1, done = false) => {
        S.rowsSeen = rows;
        if (rows > 200 && total) {
            const bpr = loaded / rows;
            S.avgBytesPerRow = S.avgBytesPerRow ? (0.9 * S.avgBytesPerRow + 0.1 * bpr) : bpr;
            const est = Math.max(rows, Math.round(total / S.avgBytesPerRow));
            if (Number.isFinite(est)) S.totalRows = est;
        }
        const now = performance.now(); const dt = (now - lastTime) / 1000; const rps = dt > 0 ? (rows - lastRows) / dt : 0;
        lastRows = rows; lastTime = now;
        const mb = loaded / 1e6; S.lastMB = mb;
        const frac = total ? (loaded / total) : (rows / Math.max(1, S.totalRows));
        const pctScaled = p0 + frac * (p1 - p0); const pct = done ? Math.max(pctScaled, p1) : Math.min(pctScaled, p1 - 0.5);
        prog({ phase, pct, rps, mb, rowsProcessed: rows, totalRows: S.totalRows || 0, eta: etaFrom(now, S.startTime, frac) });
    };
}

// ---------- CSV streaming ----------
function parseTwoColCSV(line) { const k = line.indexOf(','); if (k < 0) return null; const raw = line.slice(0, k).trim().replace(/^"|"$/g, ''); let text = line.slice(k + 1).trim(); if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) text = text.slice(1, -1); return { label: raw, text: text.toLowerCase() }; }
function normalizeLabel(raw, cats) { if (/^\d+$/.test(raw)) { const n = parseInt(raw, 10); const idx = (n >= 1 && n <= 4) ? (n - 1) : n; return cats[idx] ?? raw; } return raw; }
async function streamCSV(url, onRow, { hasHeader = true, labelMap, meter, pauseGate } = {}) {
    url = resolve(url);
    const res = await fetch(url, { cache: 'no-store' });
    post('log', { text: `fetch ${url} → ${res.status} ${res.statusText}` });
    if (!res.ok) { post('error', { error: `CSV fetch failed: ${res.status} ${res.statusText}` }); return 0; }
    const total = Number(res.headers.get('Content-Length')) || 0;
    let loaded = 0, rows = 0;
    const reader = res.body ? res.body.getReader() : null; const [p0, p1] = [0, 60];
    const gate = typeof pauseGate === 'function' ? pauseGate : async () => { };

    if (!reader) {
        const text = await res.text(); const lines = text.split(/\r?\n/); let started = !hasHeader;
        for (const ln of lines) {
            if (!ln.trim()) continue; if (!started) { started = true; continue; }
            await gate(); if (S.cancel) break;
            const rec = parseTwoColCSV(ln); if (!rec) continue;
            if (labelMap) rec.label = normalizeLabel(rec.label, labelMap);
            onRow(rec, ++rows);
            if (meter && rows % 200 === 0) meter(rows, loaded, total, p0, p1);
        }
        if (meter) meter(rows, loaded, total, p0, p1, true);
        return rows;
    }

    const dec = new TextDecoder('utf-8'); let buf = '', started = !hasHeader;
    while (true) {
        await gate(); if (S.cancel) break;
        const { value, done } = await reader.read();
        if (done) break;
        loaded += value.byteLength;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, i); buf = buf.slice(i + 1);
            if (!line.trim()) continue; if (!started) { started = true; continue; }
            await gate(); if (S.cancel) break;
            const rec = parseTwoColCSV(line); if (!rec) continue;
            if (labelMap) rec.label = normalizeLabel(rec.label, labelMap);
            onRow(rec, ++rows);
            if (meter && rows % 250 === 0) meter(rows, loaded, total, p0, p1);
        }
        if (S.cancel) break;
    }
    const tail = dec.decode(); if (tail) buf += tail;
    if (buf.trim() && started && !S.cancel) {
        await gate();
        const rec = parseTwoColCSV(buf.trim());
        if (rec) { if (labelMap) rec.label = normalizeLabel(rec.label, labelMap); onRow(rec, ++rows); }
    }
    if (meter) meter(rows, loaded, total, p0, p1, true);
    return rows;
}

// ---------- Math ----------
function softmax(arr) {
    const a = arr.map(v => (Number.isFinite(v) ? v : 0));
    const m = Math.max(...a);
    const ex = a.map(x => Math.exp(x - m));
    const s = ex.reduce((p, c) => p + c, 0);
    if (!Number.isFinite(s) || s <= 0) {
        const k = a.length || 1;
        return new Array(k).fill(1 / k);
    }
    return ex.map(e => e / s);
}
function dot(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }

// ---------- Global state ----------
let S = {
    enc: null, cls: null,
    kelm: null,   // final { L,KLLinv,W,kernel,gamma,categories }
    kpred: null,  // interim { L,KLLinv,kernel,gamma,B }
    cats: [],
    paused: false, cancel: false, config: null,
    rowsSeen: 0, totalRows: 0, startTime: 0, valAcc: null, avgBytesPerRow: 0, lastMB: 0,
    lastPredictText: null
};

// ---------- Autosave ----------
function modelJSON(m) { return (m && (m.elm?.savedModelJSON || m.savedModelJSON || m.toJSON?.())) || null; }
function makeAutosaver() { let last = 0; return async (name, model) => { const now = performance.now(); if (now - last < 15000) return; last = now; const j = modelJSON(model); if (j) { await idbSet(name, j); log(`💾 autosaved ${name}`); } }; }
const autosave = makeAutosaver();
async function saveNow(name, model) { const j = modelJSON(model); if (j) { await idbSet(name, j); log(`💾 saved ${name}`); } }

// ---------- Encoder load/bootstrap ----------
async function makeOrLoadEncoder(files, hidden, activation, categories) {
    const enc = new EncoderELM({
        charSet: 'abcdefghijklmnopqrstuvwxyz0123456789 ,.;:\'"!?()-',
        maxLen: 50, hiddenUnits: hidden, activation,
        useTokenizer: true, tokenizerDelimiter: /\s+/,
        exportFileName: files.encoder, categories
    });

    const cached = await idbGet(files.encoder);
    if (cached) { try { enc.loadModelFromJSON(cached); log('Encoder: loaded from cache'); return enc; } catch { log('⚠️ Encoder cache invalid, bootstrapping.'); } }

    const remote = await safeFetchJSONText(`models/${files.encoder}`);
    if (remote) { try { enc.loadModelFromJSON(remote); log('Encoder: loaded from /models'); return enc; } catch { log('⚠️ Encoder /models JSON invalid, bootstrapping.'); } }

    log('ℹ️ No encoder JSON found in /models (or not JSON) — bootstrapping.');
    const probe = 'probe';
    const x0 = enc.elm.encoder.normalize(enc.elm.encoder.encode(probe));
    const dim = x0.length;
    enc.beginOnline({ inputDim: dim, outputDim: dim, hiddenUnits: hidden, lambda: 1e-2, activation });
    return enc;
}

function encVec(txt) {
    if (!S.enc) throw new Error('EncoderELM not ready.');
    if (typeof S.enc.encode === 'function') { try { return S.enc.encode(String(txt)); } catch { } }
    const low = S.enc.elm && S.enc.elm.encoder;
    if (low && typeof low.encode === 'function' && typeof low.normalize === 'function') {
        const raw = low.encode(String(txt));
        return low.normalize(raw);
    }
    throw new Error('EncoderELM not ready.');
}

// ---------- Prediction (centralized) ----------
function predictProbsFromVector(v) {
    const K = S.cats.length || 4;

    if (S.kelm) {
        const { L, KLLinv, W, kernel, gamma } = S.kelm;
        const kx = L.map(li => {
            if (kernel === 'linear') return dot(v, li);
            if (kernel === 'laplacian') { let s = 0; for (let i = 0; i < v.length; i++) s += Math.abs(v[i] - li[i]); return Math.exp(-(gamma || 1) * s); }
            if (kernel === 'poly') { return Math.pow(1 * dot(v, li) + 1, 2); }
            let s = 0; for (let i = 0; i < v.length; i++) { const d = v[i] - li[i]; s += d * d; } return Math.exp(-(gamma || 1) * s);
        });
        const z = new Array(L.length).fill(0);
        for (let i = 0; i < L.length; i++) { let s = 0; for (let j = 0; j < L.length; j++) s += kx[j] * KLLinv[j][i]; z[i] = s; }
        const logits = new Array(W[0].length).fill(0);
        for (let i = 0; i < W.length; i++) { const zi = z[i]; for (let k = 0; k < logits.length; k++) logits[k] += zi * W[i][k]; }
        return softmax(logits);
    }

    if (S.kpred && S.kpred.B) {
        const { L, KLLinv, kernel, gamma, B } = S.kpred;
        const kx = L.map(li => {
            if (kernel === 'linear') return dot(v, li);
            if (kernel === 'laplacian') { let s = 0; for (let i = 0; i < v.length; i++) s += Math.abs(v[i] - li[i]); return Math.exp(-(gamma || 1) * s); }
            if (kernel === 'poly') { return Math.pow(1 * dot(v, li) + 1, 2); }
            let s = 0; for (let i = 0; i < v.length; i++) { const d = v[i] - li[i]; s += d * d; } return Math.exp(-(gamma || 1) * s);
        });
        const z = new Array(L.length).fill(0);
        for (let i = 0; i < L.length; i++) { let s = 0; for (let j = 0; j < L.length; j++) s += kx[j] * KLLinv[j][i]; z[i] = s; }
        const logits = new Array(B[0].length).fill(0);
        for (let i = 0; i < L.length; i++) { const zi = z[i]; for (let k = 0; k < logits.length; k++) logits[k] += zi * B[i][k]; }
        return softmax(logits);
    }

    if (S.cls) {
        const res = S.cls.predictFromVector(v, 4);
        const p = res.map(r => r.prob || 0);
        return p.every(x => Number.isFinite(x) && x > 0 && x < 1) ? p : softmax(p);
    }

    // fallback
    return new Array(K).fill(1 / K);
}

function postProbsForText(text) {
    if (!S.enc) return;
    const v = encVec(String(text || '').toLowerCase());
    const probs = predictProbsFromVector(v);
    const map = {};
    for (let k = 0; k < Math.min(probs.length, S.cats.length); k++) map[S.cats[k]] = probs[k];
    post('probabilities', { map });
}

// ---------- Online ELM ----------
async function trainOnline(payload) {
    const { dataUrl, batch, categories, files, encoderHidden, classifierHidden, activation, earlyStop } = payload;
    S.cats = categories.slice(); S.enc = await makeOrLoadEncoder(files, encoderHidden, activation, categories);

    if (S.enc.elm?.onlineActive) {
        let b = [];
        await streamCSV(dataUrl, ({ text }, rowNo) => {
            const x = encVec(text); b.push({ x, y: x });
            if (b.length >= batch) { S.enc.partialTrainOnlineVectors(b); b = []; autosave(files.encoder, S.enc); }
            if (S.lastPredictText && rowNo % PRED_REFRESH_INTERVAL === 0) postProbsForText(S.lastPredictText);
        }, { hasHeader: true, meter: meterFn('encoder'), pauseGate: makePauseGate() });
        if (b.length) { S.enc.partialTrainOnlineVectors(b); }
        S.enc.endOnline(); await saveNow(files.encoder, S.enc);
    }

    S.cls = new LanguageClassifier({
        charSet: 'abcdefghijklmnopqrstuvwxyz0123456789 ,.;:\'"!?()-', maxLen: 50,
        hiddenUnits: classifierHidden, activation, useTokenizer: true, tokenizerDelimiter: /\s+/,
        exportFileName: files.classifier, categories
    });

    const clsRemote = await safeFetchJSONText(`models/${files.classifier}`);
    if (clsRemote) { try { S.cls.loadModelFromJSON(clsRemote); signalPredictReady(); state(S.paused, true, WARMUP_ONLINE, WARMUP_ONLINE); log('Classifier: loaded from /models'); } catch { } }
    const clsCached = await idbGet(files.classifier);
    if (!S.cls.elm && clsCached) { try { S.cls.loadModelFromJSON(clsCached); signalPredictReady(); state(S.paused, true, WARMUP_ONLINE, WARMUP_ONLINE); log('Classifier: loaded from cache'); } catch { } }

    let seen = 0, target = WARMUP_ONLINE, ready = !!S.cls.elm;
    const dim = encVec('probe').length;
    if (!ready) S.cls.beginOnline({ categories, inputDim: dim, hiddenUnits: classifierHidden, lambda: 1e-2, activation });
    state(S.paused, ready, 0, target);

    const win = Math.max(200, Number(earlyStop?.window || 2000));
    const thr = Math.min(0.999, Math.max(0.5, Number(earlyStop?.threshold || 0.98)));
    const ring = new Array(win); let rp = 0, counts = Object.create(null), hits = Object.create(null); let classesSeen = new Set();

    const meter = meterFn('classifier');
    await streamCSV(dataUrl, ({ label, text }, rowNo) => {
        const y = normalizeLabel(label, categories); const v = encVec(text);
        if (!ready) { S.cls.partialTrainVectorsOnline([{ vector: v, label: y }]); autosave(files.classifier, S.cls); }
        seen++; classesSeen.add(y);

        const pred = (S.cls.elm ? S.cls.predictFromVector(v, 1)[0]?.label : null) || '';
        const old = ring[rp]; ring[rp] = { y, hit: Number(pred === y) }; rp = (rp + 1) % win;
        if (old) { counts[old.y] = (counts[old.y] || 0) - 1; hits[old.y] = (hits[old.y] || 0) - old.hit; }
        counts[y] = (counts[y] || 0) + 1; hits[y] = (hits[y] || 0) + Number(pred === y);

        if (!ready && seen >= target) { ready = true; signalPredictReady(); state(S.paused, true, seen, target); }
        if (S.lastPredictText && rowNo % PRED_REFRESH_INTERVAL === 0) postProbsForText(S.lastPredictText);

        if (seen >= win && classesSeen.size === categories.length && S.cls.elm) {
            const ok = categories.every(c => (hits[c] || 0) / Math.max(1, (counts[c] || 0)) >= thr);
            if (ok) { post('early-stop', { reason: `all classes ≥ ${(thr * 100).toFixed(0)}% on last ${win} rows` }); throw { _earlyStop: true }; }
        }
    }, { hasHeader: true, labelMap: categories, pauseGate: makePauseGate(), meter });

    if (!S.cls.elm) { S.cls.endOnline(); await saveNow(files.classifier, S.cls); }
    prog({ phase: 'done', pct: 100 }); post('ready');
}

// ---------- KELM helpers ----------
function makeKernel(opts) {
    const type = (opts?.type) || 'rbf';
    if (type === 'linear') return (a, b) => dot(a, b);
    if (type === 'laplacian') { const g = opts.gamma || 1; return (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return Math.exp(-g * s); }; }
    if (type === 'poly') { const g = opts.gamma || 1, c = opts.coef0 || 1, d = Math.max(1, Math.round(opts.degree || 2)); return (a, b) => Math.pow(g * dot(a, b) + c, d); }
    const g = opts.gamma || 1; return (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; } return Math.exp(-g * s); };
}
function solveRidge(A, B, lambda) {
    const ML = A.length, K = B[0].length;
    const W = Array.from({ length: ML }, () => Array(K).fill(0));
    const base = A.map((row, i) => row.map((v, j) => v + (i === j ? lambda : 0)));
    for (let k = 0; k < K; k++) {
        const aug = base.map((row, i) => row.concat(B[i][k]));
        for (let i = 0; i < ML; i++) {
            let piv = i; for (let r = i + 1; r < ML; r++) if (Math.abs(aug[r][i]) > Math.abs(aug[piv][i])) piv = r;
            if (piv !== i) { const t = aug[i]; aug[i] = aug[piv]; aug[piv] = t; }
            const div = aug[i][i] || 1e-12; for (let j = i; j <= ML; j++) aug[i][j] /= div;
            for (let r = 0; r < ML; r++) { if (r === i) continue; const f = aug[r][i]; for (let j = i; j <= ML; j++) aug[r][j] -= f * aug[i][j]; }
        }
        for (let i = 0; i < ML; i++) W[i][k] = aug[i][ML];
    }
    return W;
}
function kernelMat(V, ker) { const m = V.length; const KLL = Array.from({ length: m }, () => Array(m).fill(0)); for (let i = 0; i < m; i++) for (let j = i; j < m; j++) { const val = ker(V[i], V[j]); KLL[i][j] = KLL[j][i] = val; } return KLL; }
function pinvSym(KLL, eps = 1e-6) {
    const m = KLL.length; const A = KLL.map((r, i) => r.map((v, j) => v + (i === j ? eps : 0)));
    const aug = A.map((row, i) => row.concat(...Array.from({ length: m }, (_, j) => i === j ? 1 : 0)));
    for (let i = 0; i < m; i++) {
        let p = i; for (let r = i + 1; r < m; r++) if (Math.abs(aug[r][i]) > Math.abs(aug[p][i])) p = r;
        if (p !== i) { const t = aug[i]; aug[i] = aug[p]; aug[p] = t; }
        const div = aug[i][i] || 1e-12; for (let j = i; j < 2 * m; j++) aug[i][j] /= div;
        for (let r = 0; r < m; r++) { if (r === i) continue; const f = aug[r][i]; for (let j = i; j < 2 * m; j++) aug[r][j] -= f * aug[i][j]; }
    }
    const inv = Array.from({ length: m }, () => Array(m).fill(0));
    for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) inv[i][j] = aug[i][m + j];
    return inv;
}

// ---------- KELM (Nyström streaming) ----------
async function trainKELM_streaming(payload) {
    const { dataUrl, categories, files, encoderHidden, activation, kelm, earlyStop } = payload;
    const { kernel, landmarks, gamma, ridgeLambda = 1e-2 } = kelm || {};

    S.cats = categories.slice();
    S.enc = await makeOrLoadEncoder(files, encoderHidden, activation, categories);

    // Quick encoder bootstrap
    if (S.enc.elm?.onlineActive) {
        let b = [], count = 0;
        await streamCSV(
            dataUrl,
            ({ text }, rowNo) => {
                const x = encVec(text);
                b.push({ x, y: x });
                count++;
                if (b.length >= 256) { S.enc.partialTrainOnlineVectors(b); b = []; autosave(files.encoder, S.enc); }
                if (S.lastPredictText && rowNo % PRED_REFRESH_INTERVAL === 0) postProbsForText(S.lastPredictText);
                if (count >= 2000) return;
            },
            { hasHeader: true, meter: meterFn('encoder'), pauseGate: makePauseGate() }
        );
        if (b.length) S.enc.partialTrainOnlineVectors(b);
        S.enc.endOnline();
        await saveNow(files.encoder, S.enc);
    }

    // 1) Landmarks
    const M = Math.max(64, Math.min(Number(landmarks || 512), 1024));
    const ker = makeKernel(
        kernel === 'poly' ? { type: 'poly', degree: Math.max(1, Math.round(gamma || 2)), gamma: 1, coef0: 1 }
            : kernel === 'laplacian' ? { type: 'laplacian', gamma: gamma || 1 }
                : kernel === 'linear' ? { type: 'linear' }
                    : { type: 'rbf', gamma: gamma || 1 }
    );
    const L = [];
    function kppPick(v) {
        if (L.length === 0) { L.push(v); return; }
        if (L.length < M) {
            let dmin = Infinity;
            for (let i = 0; i < L.length; i++) { const d = 1 - ker(v, L[i]); if (d < dmin) dmin = d; }
            const p = dmin; if (Math.random() < p) L.push(v);
        }
    }
    const meter1 = meterFn('kelm:landmarks');
    await streamCSV(dataUrl, ({ text }, rowNo) => {
        const v = encVec(text);
        kppPick(v);
        if (S.lastPredictText && rowNo % PRED_REFRESH_INTERVAL === 0) postProbsForText(S.lastPredictText);
    }, { hasHeader: true, pauseGate: makePauseGate(), meter: meter1 });
    log(`📌 Landmarks selected: L=${L.length}`);

    // 2) Precompute KLL^{-1} + interim predictor shell
    const KLL = kernelMat(L, ker);
    const KLLinv = pinvSym(KLL, 1e-6);

    const ML = L.length;
    const K = categories.length;
    const A = Array.from({ length: ML }, () => Array(ML).fill(0));
    const B = Array.from({ length: ML }, () => Array(K).fill(0));

    S.kpred = { L, KLLinv, kernel: (kernel || 'rbf'), gamma: (gamma || 1), B };

    function zFeat(x) {
        const kx = L.map(li => ker(x, li));
        const z = new Array(L.length).fill(0);
        for (let i = 0; i < L.length; i++) { let s = 0; for (let j = 0; j < L.length; j++) s += kx[j] * KLLinv[j][i]; z[i] = s; }
        return z;
    }

    // Warm-up counters
    let warmSeen = 0, warmTarget = WARMUP_KELM, ready = false;
    state(S.paused, false, 0, warmTarget);

    // 3) Accumulate + auto-predict refresh
    const win = Math.max(200, Number(earlyStop?.window || 2000));
    const thr = Math.min(0.999, Math.max(0.5, Number(earlyStop?.threshold || 0.98)));
    const ring = new Array(win); let rp = 0, counts = Object.create(null), hits = Object.create(null); let classesSeen = new Set();
    const meter2 = meterFn('kelm:accumulate');

    await streamCSV(dataUrl, ({ label, text }, rowNo) => {
        const yLab = normalizeLabel(label, categories); const yIdx = categories.indexOf(yLab);
        if (yIdx < 0) return;
        const v = encVec(text); const z = zFeat(v);

        // Update A, B
        for (let i = 0; i < ML; i++) {
            const zi = z[i];
            for (let j = 0; j < ML; j++) A[i][j] += zi * z[j];
            B[i][yIdx] += zi;
        }

        // Warm-up → allow predictions
        warmSeen++;
        if (!ready && warmSeen >= warmTarget) { ready = true; signalPredictReady(); }
        state(S.paused, ready, warmSeen, warmTarget);

        // Proxy classification
        const logits = new Array(K).fill(0);
        for (let i = 0; i < ML; i++) { const zi = z[i]; for (let k = 0; k < K; k++) logits[k] += zi * B[i][k]; }
        const probs = softmax(logits);
        let arg = 0, mx = -1e9; for (let k = 0; k < K; k++) { if (probs[k] > mx) { mx = probs[k]; arg = k; } }
        const predLab = categories[arg] || '';
        const old = ring[rp]; ring[rp] = { y: yLab, hit: Number(predLab === yLab) }; rp = (rp + 1) % win;
        if (old) { counts[old.y] = (counts[old.y] || 0) - 1; hits[old.y] = (hits[old.y] || 0) - old.hit; }
        counts[yLab] = (counts[yLab] || 0) + 1; hits[yLab] = (hits[yLab] || 0) + Number(predLab === yLab);
        classesSeen.add(yLab);

        // Auto-refresh prediction for current input periodically
        if (S.lastPredictText && rowNo % PRED_REFRESH_INTERVAL === 0) postProbsForText(S.lastPredictText);

        if (warmSeen >= win && classesSeen.size === categories.length) {
            const ok = categories.every(c => (hits[c] || 0) / Math.max(1, (counts[c] || 0)) >= thr);
            if (ok) { post('early-stop', { reason: `all classes ≥ ${(thr * 100).toFixed(0)}% on last ${win} rows` }); throw { _earlyStop: true }; }
        }
    }, { hasHeader: true, labelMap: categories, pauseGate: makePauseGate(), meter: meter2 });

    log('➕ Accumulated A,B — solving…');

    // 4) Solve W; finalize model
    const W = solveRidge(A, B, ridgeLambda || 1e-2);
    S.kelm = { L, KLLinv, W, kernel: (kernel || 'rbf'), gamma: (gamma || 1), categories };
    S.kpred = null;

    await idbSet(files.classifier, JSON.stringify({ type: 'kelm-nystrom-stream', ...S.kelm }));
    log('💾 saved KELM (streaming)');
    prog({ phase: 'done', pct: 100 }); post('ready');
}

// ---------- Message router ----------
self.onmessage = async (e) => {
    const { type, payload, which, text, json, filename } = e.data || {};
    try {
        if (type === 'init') {
            S.cancel = false; S.paused = false; S.config = payload || {};
            S.totalRows = 0; S.rowsSeen = 0; S.startTime = performance.now();
            S.avgBytesPerRow = 0; S.lastMB = 0; S.lastPredictText = null;
            S.enc = null; S.cls = null; S.kelm = null; S.kpred = null;
            state(false, false, 0, 0);
            const mode = (payload.mode || '').toLowerCase();
            if (mode === 'kelm') await trainKELM_streaming(payload);
            else await trainOnline(payload);
        }
        else if (type === 'pause') { S.paused = true; state(true, !!(S.kelm || S.cls || S.kpred)); log('⏸️ Paused'); }
        else if (type === 'resume') { S.paused = false; state(false, !!(S.kelm || S.cls || S.kpred)); log('▶️ Resumed'); }
        else if (type === 'cancel') { S.cancel = true; log('Canceled'); }

        else if (type === 'export') {
            const name = which === 'encoder' ? (S.config?.files?.encoder) : (S.config?.files?.classifier);
            let jsonOut = null;
            if (which === 'encoder') jsonOut = modelJSON(S.enc);
            else jsonOut = S.kelm ? JSON.stringify({ type: 'kelm-nystrom-stream', ...S.kelm })
                : S.kpred ? JSON.stringify({ type: 'kelm-nystrom-stream-interim', ...S.kpred })
                    : modelJSON(S.cls);
            if (name && jsonOut) post('model-json', { name, json: jsonOut });
            else post('error', { error: 'No in-memory model to export. Use Recover autosave.' });
        }

        else if (type === 'export-cached') {
            const name = which === 'encoder' ? (S.config?.files?.encoder) : (S.config?.files?.classifier);
            const cached = name ? await idbGet(name) : null;
            if (name && cached) post('model-json', { name, json: cached });
            else post('error', { error: 'No autosave found for ' + (name || which) });
        }

        else if (type === 'import-model-json') {
            if (!json) { post('error', { error: 'No JSON provided' }); return; }
            const parsed = String(json);
            try {
                const obj = JSON.parse(parsed);
                if (obj?.type === 'kelm-nystrom-stream' || obj?.type === 'kelm-nystrom-stream-interim') {
                    if (obj.type === 'kelm-nystrom-stream') {
                        S.kelm = { L: obj.L, KLLinv: obj.KLLinv, W: obj.W, kernel: obj.kernel, gamma: obj.gamma, categories: obj.categories || S.cats };
                        S.kpred = null;
                    } else {
                        S.kpred = { L: obj.L, KLLinv: obj.KLLinv, kernel: obj.kernel, gamma: obj.gamma, B: obj.B, categories: obj.categories || S.cats };
                        S.kelm = null;
                    }
                    await idbSet(S.config?.files?.classifier || 'agnews_kelm.json', parsed);
                    log('✅ Imported KELM model'); signalPredictReady(); post('ready');
                } else {
                    const name = (filename || '').toLowerCase();
                    if (name.includes('encoder')) {
                        if (!S.enc) S.enc = new EncoderELM({});
                        S.enc.loadModelFromJSON(parsed); await idbSet(S.config?.files?.encoder || 'agnews_encoder.json', parsed);
                        log('✅ Imported encoder');
                    } else {
                        if (!S.cls) S.cls = new LanguageClassifier({});
                        S.cls.loadModelFromJSON(parsed); await idbSet(S.config?.files?.classifier || 'agnews_classifier.json', parsed);
                        log('✅ Imported classifier'); signalPredictReady(); post('ready');
                    }
                }
            } catch (err) { post('error', { error: 'Import parse error: ' + (err?.message || err) }); }
        }

        else if (type === 'predict') {
            S.lastPredictText = String(text || '').trim();
            if (!S.lastPredictText) { return; }
            if (!S.enc) { post('error', { error: 'Encoder not ready yet.' }); return; }
            postProbsForText(S.lastPredictText);
        }
    } catch (err) {
        if (err && err._earlyStop) { prog({ phase: 'done', pct: 100 }); post('ready'); return; }
        post('error', { error: String(err && err.message || err) });
    }
};
