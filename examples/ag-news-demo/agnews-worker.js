/* eslint-disable no-undef */
/* global importScripts, fetch, TextDecoder, indexedDB, self, performance */

// ---------- script loader ----------
function resolve(url) { try { return new URL(url, self.location.href).toString(); } catch { return url; } }
importScripts(resolve('astermind.umd.js'));
const ast = self.astermind || {};
const {
    EncoderELM,
    LanguageClassifier,
    KernelELM
} = ast;

// ---------- idb cache ----------
const DB_NAME = 'astermind_models'; const STORE = 'models';
function idbOpen() { return new Promise((res, rej) => { const r = indexedDB.open(DB_NAME, 1); r.onupgradeneeded = () => r.result.createObjectStore(STORE); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function idbGet(key) { const db = await idbOpen(); return new Promise((res, rej) => { const tx = db.transaction(STORE, 'readonly'); const rq = tx.objectStore(STORE).get(key); rq.onsuccess = () => res(rq.result || null); rq.onerror = () => rej(rq.error); }); }
async function idbSet(key, val) { const db = await idbOpen(); return new Promise((res, rej) => { const tx = db.transaction(STORE, 'readwrite'); const rq = tx.objectStore(STORE).put(val, key); rq.onsuccess = () => res(); rq.onerror = () => rej(rq.error); }); }

// ---------- messages ----------
function post(type, obj = {}) { self.postMessage({ type, ...obj }); }
function log(s) { post('log', { text: s }); }
function prog(p) { post('progress', p); }

// ---------- CSV helpers ----------
function parseTwoColCSV(line) {
    const k = line.indexOf(','); if (k < 0) return null;
    const rawLabel = line.slice(0, k).trim().replace(/^"|"$/g, '');
    let text = line.slice(k + 1).trim();
    if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) text = text.slice(1, -1);
    return { label: rawLabel, text: text.toLowerCase() };
}
function normalizeLabel(rawLabel, cats) {
    if (/^\d+$/.test(rawLabel)) { const n = parseInt(rawLabel, 10); const idx = (n >= 1 && n <= 4) ? (n - 1) : n; return cats[idx] ?? rawLabel; }
    return rawLabel;
}
function oneHot(idx, K) { const v = new Array(K).fill(0); if (idx >= 0 && idx < K) v[idx] = 1; return v; }

async function streamCSV(url, onRow, { hasHeader = true, labelMap, meter } = {}) {
    url = resolve(url);
    const res = await fetch(url, { cache: 'no-store' });
    const total = Number(res.headers.get('Content-Length')) || 0;
    let loaded = 0, rows = 0;
    const reader = res.body ? res.body.getReader() : null;
    const [p0, p1] = [0, 60];

    if (!reader) {
        const text = await res.text();
        const lines = text.split(/\r?\n/);
        let started = !hasHeader;
        for (const ln of lines) {
            if (!ln.trim()) continue;
            if (!started) { started = true; continue; }
            const rec = parseTwoColCSV(ln); if (!rec) continue;
            if (labelMap) rec.label = normalizeLabel(rec.label, labelMap);
            onRow(rec); rows++;
            if (meter && rows % 200 === 0) meter(rows, loaded, total, p0, p1);
        }
        if (meter) meter(rows, loaded, total, p0, p1, true);
        return rows;
    }

    const dec = new TextDecoder('utf-8');
    let buf = '', started = !hasHeader;
    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        loaded += value.byteLength;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, i); buf = buf.slice(i + 1);
            if (!line.trim()) continue;
            if (!started) { started = true; continue; }
            const rec = parseTwoColCSV(line); if (!rec) continue;
            if (labelMap) rec.label = normalizeLabel(rec.label, labelMap);
            onRow(rec); rows++;
            if (meter && rows % 250 === 0) meter(rows, loaded, total, p0, p1);
        }
    }
    const tail = dec.decode(); if (tail) buf += tail;
    if (buf.trim() && started) { const rec = parseTwoColCSV(buf.trim()); if (rec) { if (labelMap) rec.label = normalizeLabel(rec.label, labelMap); onRow(rec); rows++; } }
    if (meter) meter(rows, loaded, total, p0, p1, true);
    return rows;
}

// ---------- math ----------
function softmax(arr) { const m = Math.max(...arr); const ex = arr.map(x => Math.exp(x - m)); const s = ex.reduce((a, b) => a + b, 0); return ex.map(e => e / s); }

// ---------- state ----------
let S = {
    enc: null,
    cls: null,        // Online path classifier
    clsTemp: null,    // Interim classifier used during KELM collection
    kelm: null,       // Final KELM model
    cats: [],
    paused: false,
    cancel: false,
    config: null,
    rowsSeen: 0,
    totalRows: 0,
    startTime: 0,
    valAcc: null,
    avgBytesPerRow: 0,
    lastMB: 0
};

// ---------- utilities ----------
function etaFrom(now, start, progress01) {
    if (!progress01 || progress01 <= 0) return '—';
    const elapsed = (now - start) / 1000;
    const total = elapsed / progress01;
    const left = Math.max(0, total - elapsed);
    const m = Math.floor(left / 60), s = Math.floor(left % 60);
    return `${m}m ${s}s`;
}
function modelJSON(model) { return (model && (model.elm?.savedModelJSON || model.savedModelJSON || model.toJSON?.())) || null; }
async function safeFetchJSON(url) {
    try {
        const res = await fetch(resolve(url), { cache: 'no-store' });
        if (!res.ok) return null;
        const txt = await res.text();
        const ct = (res.headers.get('content-type') || '').toLowerCase();
        if (!ct.includes('application/json') || txt.trim().startsWith('<')) return null;
        return txt;
    } catch { return null; }
}
function meterFn(phaseName) {
    S.startTime = S.startTime || performance.now();
    let lastRows = 0, lastTime = performance.now();
    return (rowsProcessed, loadedBytes, totalBytes, p0, p1, done = false) => {
        S.rowsSeen = rowsProcessed;
        if (rowsProcessed > 200 && totalBytes) {
            const bpr = loadedBytes / rowsProcessed;
            S.avgBytesPerRow = S.avgBytesPerRow ? (0.9 * S.avgBytesPerRow + 0.1 * bpr) : bpr;
            const est = Math.max(rowsProcessed, Math.round(totalBytes / S.avgBytesPerRow));
            if (Number.isFinite(est)) S.totalRows = est;
        }
        const now = performance.now();
        const dt = (now - lastTime) / 1000;
        const dr = rowsProcessed - lastRows;
        const rps = dt > 0 ? dr / dt : 0;
        lastRows = rowsProcessed; lastTime = now;
        const mb = loadedBytes / 1e6; S.lastMB = mb;
        const frac = totalBytes ? (loadedBytes / totalBytes) : (rowsProcessed / Math.max(1, S.totalRows));
        const pctScaled = p0 + (frac * (p1 - p0));
        const pct = done ? Math.max(pctScaled, p1) : Math.min(pctScaled, p1 - 0.5);
        prog({ phase: phaseName, pct, rps, mb, rowsProcessed, totalRows: S.totalRows || 0, eta: etaFrom(now, S.startTime, frac) });
    };
}

// ---------- ONLINE (streaming) ----------
async function trainOnline(payload) {
    const { dataUrl, batch, categories, files, encoderHidden, classifierHidden, activation } = payload;
    S.cats = categories.slice();
    S.rowsSeen = 0; S.valAcc = null;

    prog({ phase: 'init', pct: 0, status: 'Loading models…' });

    // Encoder
    S.enc = new EncoderELM({
        charSet: 'abcdefghijklmnopqrstuvwxyz0123456789 ,.;:\'"!?()-',
        maxLen: 50, hiddenUnits: encoderHidden, activation,
        useTokenizer: true, tokenizerDelimiter: /\s+/,
        exportFileName: files.encoder,
        categories, log: { verbose: false, modelName: 'agnews_encoder' }
    });

    let encLoaded = false;
    const encRemote = await safeFetchJSON(`models/${files.encoder}`);
    if (encRemote) { S.enc.loadModelFromJSON(encRemote); encLoaded = true; log('Encoder: loaded from /models.'); }
    else {
        const encLocal = await idbGet(files.encoder);
        if (encLocal) { S.enc.loadModelFromJSON(encLocal); encLoaded = true; log('Encoder: loaded from IndexedDB.'); }
    }

    if (!encLoaded) {
        log('Encoder: begin online identity training…');
        const probe = 'probe';
        const x0 = S.enc.elm.encoder.normalize(S.enc.elm.encoder.encode(probe));
        const dim = x0.length;
        S.enc.beginOnline({ inputDim: dim, outputDim: dim, hiddenUnits: encoderHidden, lambda: 1e-2, activation });

        let batchArr = [];
        await streamCSV(dataUrl, ({ text }) => {
            if (S.cancel || S.paused) return;
            const x = S.enc.elm.encoder.normalize(S.enc.elm.encoder.encode(text));
            batchArr.push({ x, y: x });
            S.rowsSeen++;
            if (batchArr.length >= batch) {
                S.enc.partialTrainOnlineVectors(batchArr);
                batchArr = [];
            }
        }, { hasHeader: true, meter: meterFn('encoder') });

        if (batchArr.length) S.enc.partialTrainOnlineVectors(batchArr);
        S.enc.endOnline();

        const j = modelJSON(S.enc); if (j) { await idbSet(files.encoder, j); post('model-json', { name: files.encoder, json: j }); }
        log('Encoder: trained and cached.');
    }

    // Classifier
    S.cls = new LanguageClassifier({
        charSet: 'abcdefghijklmnopqrstuvwxyz0123456789 ,.;:\'"!?()-',
        maxLen: 50, hiddenUnits: classifierHidden, activation,
        useTokenizer: true, tokenizerDelimiter: /\s+/,
        exportFileName: files.classifier, categories,
        log: { verbose: false, modelName: 'agnews_classifier' },
        metrics: { accuracy: 0.80 }
    });

    let clsLoaded = false;
    const clsRemote = await safeFetchJSON(`models/${files.classifier}`);
    if (clsRemote) { S.cls.loadModelFromJSON(clsRemote); clsLoaded = true; log('Classifier: loaded from /models.'); }
    else {
        const clsLocal = await idbGet(files.classifier);
        if (clsLocal) { S.cls.loadModelFromJSON(clsLocal); clsLoaded = true; log('Classifier: loaded from IndexedDB.'); }
    }

    if (!clsLoaded) {
        log('Classifier: begin online training…');
        const val = [];
        const VAL_SIZE = 2000;
        const encodedProbe = S.enc.encode('probe');
        S.cls.beginOnline({ categories, inputDim: encodedProbe.length, hiddenUnits: classifierHidden, lambda: 1e-2, activation });

        let batchArr = [];
        await streamCSV(payload.dataUrl, ({ label, text }) => {
            if (S.cancel || S.paused) return;
            const y = normalizeLabel(label, categories);
            const v = S.enc.encode(text);
            if (val.length < VAL_SIZE) { val.push({ v, y }); }
            else {
                batchArr.push({ vector: v, label: y });
                if (batchArr.length >= batch) {
                    S.cls.partialTrainVectorsOnline(batchArr);
                    batchArr = [];
                    // quick rolling acc (optional)
                }
            }
        }, { hasHeader: true, labelMap: categories, meter: meterFn('classifier') });

        if (batchArr.length) S.cls.partialTrainVectorsOnline(batchArr);
        S.cls.endOnline();

        const j = modelJSON(S.cls); if (j) { await idbSet(files.classifier, j); post('model-json', { name: files.classifier, json: j }); }
        log('Classifier: trained and cached.');
    }

    prog({ phase: 'done', pct: 100 });
    post('ready');
}

// ---------- KELM (with interim classifier) ----------
async function trainKELM(payload) {
    if (!KernelELM) return trainOnline(payload);

    const { dataUrl, categories, files, encoderHidden, activation, kelm, maxRowsForKELM } = payload;
    const { kernel, landmarks, gamma, whiten = true, ridgeLambda = 1e-2 } = kelm || {};
    S.cats = categories.slice(); S.rowsSeen = 0;

    // Encoder
    prog({ phase: 'init', pct: 0, status: 'Preparing encoder…' });
    S.enc = new EncoderELM({
        charSet: 'abcdefghijklmnopqrstuvwxyz0123456789 ,.;:\'"!?()-',
        maxLen: 50, hiddenUnits: encoderHidden, activation,
        useTokenizer: true, tokenizerDelimiter: /\s+/,
        exportFileName: files.encoder,
        categories, log: { verbose: false, modelName: 'agnews_encoder' }
    });

    let encLoaded = false;
    const encRemote = await safeFetchJSON(`models/${files.encoder}`);
    if (encRemote) { S.enc.loadModelFromJSON(encRemote); encLoaded = true; log('Encoder: loaded from /models.'); }
    else {
        const encLocal = await idbGet(files.encoder);
        if (encLocal) { S.enc.loadModelFromJSON(encLocal); encLoaded = true; log('Encoder: loaded from IndexedDB.'); }
    }
    if (!encLoaded) {
        log('Encoder: quick bootstrap (identity)…');
        const probe = 'probe';
        const x0 = S.enc.elm.encoder.normalize(S.enc.elm.encoder.encode(probe));
        const dim = x0.length;
        S.enc.beginOnline({ inputDim: dim, outputDim: dim, hiddenUnits: encoderHidden, lambda: 1e-2, activation });
        let count = 0;
        await streamCSV(dataUrl, ({ text }) => {
            if (S.cancel || S.paused) return;
            const x = S.enc.elm.encoder.normalize(S.enc.elm.encoder.encode(text));
            S.enc.partialTrainOnlineVectors([{ x, y: x }]);
            if (++count >= 2000) return;
        }, { hasHeader: true, meter: meterFn('encoder') });
        S.enc.endOnline();
        const j = modelJSON(S.enc); if (j) { await idbSet(files.encoder, j); post('model-json', { name: files.encoder, json: j }); }
        log('Encoder: bootstrapped and cached.');
    }

    // Interim ONLINE classifier to support predictions while paused
    const encodedProbe = S.enc.encode('probe');
    S.clsTemp = new LanguageClassifier({
        charSet: 'abcdefghijklmnopqrstuvwxyz0123456789 ,.;:\'"!?()-',
        maxLen: 50,
        hiddenUnits: 512,                     // lighter than final cls
        activation,
        useTokenizer: true, tokenizerDelimiter: /\s+/,
        exportFileName: 'agnews_interim.json',
        categories,
        log: { verbose: false, modelName: 'agnews_interim' }
    });
    S.clsTemp.beginOnline({ categories, inputDim: encodedProbe.length, hiddenUnits: 512, lambda: 1e-2, activation });

    // Collect vectors for KELM (bounded) and train interim classifier at the same time
    const X = []; const yIdx = [];
    const K = categories.length;
    const cap = Math.max(4000, Number(maxRowsForKELM || 25000));
    prog({ phase: 'kelm:collect', pct: 10, status: 'Vectorizing rows…' });

    let batchArr = [];
    await streamCSV(dataUrl, ({ label, text }) => {
        if (S.cancel || S.paused) return; // pause stops stream (but predictions work via clsTemp)
        const v = S.enc.encode(text);
        const idx = categories.indexOf(normalizeLabel(label, categories));
        if (idx >= 0) {
            // feed interim classifier
            batchArr.push({ vector: v, label: categories[idx] });
            if (batchArr.length >= 256) {
                S.clsTemp.partialTrainVectorsOnline(batchArr);
                batchArr = [];
            }
            // stash for KELM
            X.push(v); yIdx.push(idx);
            if (X.length >= cap) return;
        }
    }, { hasHeader: true, labelMap: categories, meter: meterFn('kelm:collect') });

    if (batchArr.length) S.clsTemp.partialTrainVectorsOnline(batchArr);
    S.clsTemp.endOnline();  // keep for prediction until KELM ready

    if (!X.length) throw new Error('KELM: no data collected.');
    log(`KELM: collected ${X.length} vectors (cap=${cap}).`);

    const Y = yIdx.map(i => oneHot(i, K));

    // Configure & fit KernelELM
    prog({ phase: 'kelm:fit', pct: 70, status: 'Fitting kernel ridge…' });
    S.kelm = new KernelELM({
        outputDim: K,
        kernel: kernel === 'poly'
            ? { type: 'poly', degree: Math.max(1, Math.round(gamma || 2)), gamma: 1.0, coef0: 1.0 }
            : kernel === 'laplacian'
                ? { type: 'laplacian', gamma: gamma || 1.0 }
                : kernel === 'linear'
                    ? { type: 'linear' }
                    : { type: 'rbf', gamma: gamma || 1.0 },
        ridgeLambda: ridgeLambda,
        task: 'classification',
        mode: 'nystrom',
        nystrom: {
            m: Math.max(64, Number(landmarks || 512)),
            strategy: 'kmeans++',
            seed: 1337,
            whiten: Boolean(whiten),
            jitter: 1e-10
        },
        log: { modelName: 'KELM(AGNews)', verbose: false }
    });

    const t0 = performance.now();
    let hb = true;
    setTimeout(() => hb && prog({ phase: 'kelm:fit', pct: 78 }), 200);
    setTimeout(() => hb && prog({ phase: 'kelm:fit', pct: 86 }), 600);
    setTimeout(() => hb && prog({ phase: 'kelm:fit', pct: 93 }), 1200);

    S.kelm.fit(X, Y);

    hb = false;
    const t1 = performance.now();
    log(`KELM: fit complete in ${(t1 - t0).toFixed(0)} ms.`);

    // Persist and mark ready
    const j = S.kelm.toJSON ? JSON.stringify(S.kelm.toJSON()) : modelJSON(S.kelm);
    if (j) { await idbSet(files.classifier, j); post('model-json', { name: files.classifier, json: j }); }
    prog({ phase: 'done', pct: 100 });
    post('ready');
}

// ---------- messages ----------
self.onmessage = async (e) => {
    const { type, payload, which, text } = e.data || {};
    try {
        if (type === 'init') {
            S.cancel = false; S.paused = false; S.config = payload || {};
            S.totalRows = 0; S.rowsSeen = 0; S.startTime = performance.now();
            S.avgBytesPerRow = 0; S.lastMB = 0;
            S.cls = null; S.kelm = null; S.clsTemp = null;
            log('Initializing…');
            const mode = (payload.mode || '').toLowerCase();
            if (mode === 'kelm') await trainKELM(payload);
            else await trainOnline(payload);
        }
        else if (type === 'pause') { S.paused = true; log('Paused.'); }
        else if (type === 'resume') { S.paused = false; log('Resumed.'); }
        else if (type === 'cancel') { S.cancel = true; log('Canceled.'); }
        else if (type === 'export') {
            const name = which === 'encoder' ? (S.config?.files?.encoder) : (S.config?.files?.classifier);
            const json = (which === 'encoder')
                ? modelJSON(S.enc)
                : (S.kelm ? (S.kelm.toJSON ? JSON.stringify(S.kelm.toJSON()) : modelJSON(S.kelm))
                    : (S.cls ? modelJSON(S.cls) : (S.clsTemp ? modelJSON(S.clsTemp) : null)));
            if (name && json) post('model-json', { name, json });
        }
        else if (type === 'predict') {
            if (!S.enc) { post('error', { error: 'Models not ready yet.' }); return; }
            const v = S.enc.encode(String(text || '').toLowerCase());
            let map = {};
            if (S.kelm) {
                const P = S.kelm.predictProbaFromVectors([v])[0] || [];
                for (let i = 0; i < Math.min(P.length, S.cats.length); i++) map[S.cats[i]] = P[i] || 0;
            } else if (S.cls) {
                const res = S.cls.predictFromVector(v, 4);
                const p = res.map(r => r.prob || 0);
                const probs = p.every(x => Number.isFinite(x) && x > 0 && x < 1) ? p : softmax(p);
                for (let i = 0; i < Math.min(res.length, 4); i++) map[res[i]?.label || S.cats[i] || ('C' + i)] = probs[i] || 0;
            } else if (S.clsTemp) {
                const res = S.clsTemp.predictFromVector(v, 4);
                const p = res.map(r => r.prob || 0);
                const probs = p.every(x => Number.isFinite(x) && x > 0 && x < 1) ? p : softmax(p);
                for (let i = 0; i < Math.min(res.length, 4); i++) map[res[i]?.label || S.cats[i] || ('C' + i)] = probs[i] || 0;
            } else {
                post('error', { error: 'No classifier available yet (encoder-only).' }); return;
            }
            post('probabilities', { map });
        }
    } catch (err) {
        post('error', { error: String(err && err.message || err) });
    }
};
