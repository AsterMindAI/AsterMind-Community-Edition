/* ELM Showcase 2.0 — worker
   - Owns all ELM instances; trains/evaluates off the main thread
   - Provides load → train → predict → export with schema migration
*/
/* global self, window */

/* worker.js — classic worker header */

// 1) Load the UMD build INSIDE the worker
//    Change path if needed (e.g., '/vendor/astermind.umd.js')
const ASTERMINd_URL = '/astermind.umd.js';
try { importScripts(ASTERMINd_URL); }
catch (e) {
    self.postMessage({ type: 'LOG', payload: { line: `Failed to importScripts(${ASTERMINd_URL}): ${e.message}`, kind: 'error' } });
}

// 2) Pull classes off the worker global (self), not window
const ast = self.astermind || {};
const {
    EncoderELM,
    CharacterLangEncoderELM,
    FeatureCombinerELM,
    RefinerELM,
    ConfidenceClassifierELM,
    LanguageClassifier
} = ast;

/* ------------------------------------------------------------------ */
/* The rest of your worker file continues below…                      */
/* ------------------------------------------------------------------ */

if (!ast) {
    postLog('AsterMind not found on worker global. Make sure astermind.umd.js is loaded before main.js.', 'error');
}

function createInstances() {
    if (!SETTINGS || !CATEGORIES) return;

    if (!ENC && EncoderELM) {
        ENC = new EncoderELM({
            charSet: SETTINGS.charSet, maxLen: SETTINGS.maxLen,
            hiddenUnits: 96, activation: 'gelu', useTokenizer: true,
            log: { verbose: false, name: 'EncoderELM' }
        });
        disableDownloadsFor(ENC);
    }

    if (!LANG && LanguageClassifier) {
        LANG = new LanguageClassifier({
            charSet: SETTINGS.charSet, maxLen: SETTINGS.maxLen,
            hiddenUnits: 128, activation: 'gelu', useTokenizer: true,
            categories: CATEGORIES, log: { verbose: false, name: 'LanguageClassifier' }
        });
        disableDownloadsFor(LANG);
    }

    if (!CHENC && CharacterLangEncoderELM) {
        CHENC = new CharacterLangEncoderELM({
            charSet: SETTINGS.charSet, maxLen: SETTINGS.maxLen,
            hiddenUnits: 192, activation: 'gelu', useTokenizer: true,
            categories: CATEGORIES, log: { verbose: false, name: 'CharLangEncoder' }
        });
        disableDownloadsFor(CHENC);
    }

    // ⛔️ Do NOT create COMB / CONF / REF here. We’ll size them later once we know vecLen.
}

function ensureVectorHeads(vecLen, metaLen = 4) {
    const inputSize = (vecLen | 0) + (metaLen | 0);
    if (!inputSize) return;

    if (!COMB && FeatureCombinerELM) {
        COMB = new FeatureCombinerELM({
            useTokenizer: false,
            inputSize,
            hiddenUnits: 128,
            activation: 'gelu',
            log: { verbose: false, name: 'Combiner' }
        });
        disableDownloadsFor(COMB);
    }

    if (!CONF && ConfidenceClassifierELM) {
        CONF = new ConfidenceClassifierELM({
            useTokenizer: false,
            inputSize,
            hiddenUnits: 64,
            activation: 'gelu',
            log: { verbose: false, name: 'Confidence' }
        });
        disableDownloadsFor(CONF);
    }

    if (!REF && RefinerELM) {
        REF = new RefinerELM({
            useTokenizer: false,
            inputSize,
            hiddenUnits: 64,
            activation: 'gelu',
            log: { verbose: false, name: 'Refiner' }
        });
        disableDownloadsFor(REF);
    }
}

function ensureRefinerByLengths(vecLen, metaLen = 4) {
    const inputSize = (vecLen | 0) + (metaLen | 0);
    if (!RefinerELM) return;
    if (!inputSize) return;     // wait until we know sizes
    if (self.REF) return;       // already created

    self.REF = new RefinerELM({
        charSet: SETTINGS.charSet,
        maxLen: SETTINGS.maxLen,
        hiddenUnits: 64,
        activation: 'gelu',
        useTokenizer: false,
        inputSize,
        log: { verbose: false, name: 'Refiner' }
    });
    disableDownloadsFor(self.REF); // <- important in worker context
}

function modelsReadyForPredict() {
    // minimally need encoder + char encoder + combiner + classifier to make a good prediction
    const encOK = !!ENC && typeof ENC.encode === 'function' && status.encoder.ok;
    const chOK = !!CHENC && typeof CHENC.encode === 'function' && status.langEnc.ok;
    const combOK = !!COMB && typeof COMB.predict === 'function' && status.combiner.ok;
    const clsOK = !!LANG && (typeof LANG.predictFromVector === 'function' || typeof LANG.predict === 'function') && status.classifier.ok;
    return encOK && chOK && combOK && clsOK;
}

const Msg = {
    INIT: 'INIT',
    LOAD: 'LOAD',
    TRAIN: 'TRAIN',
    PREDICT: 'PREDICT',
    EXPORT_ALL: 'EXPORT_ALL',
    RESET: 'RESET'
};

let SETTINGS = null;
let CATEGORIES = null;

// Data
let greetings = [];
let labels = [];

// Models
let AC, ENC, LANG, CHENC, COMB, CONF, REF;

// State flags
const status = {
    ac: { status: '—', ok: null },
    encoder: { status: '—', ok: null },
    classifier: { status: '—', ok: null },
    langEnc: { status: '—', ok: null },
    combiner: { status: '—', ok: null },
    confidence: { status: '—', ok: null },
    refiner: { status: '—', ok: null },
};

// Helpers
function post(type, payload) { self.postMessage({ type, payload }); }
function postLog(line, kind = 'info') { post('LOG', { line, kind }); }
function disableDownloadsFor(m) {
    if (!m) return;
    // No-op top-level saver
    if (typeof m.saveModelAsJSONFile === 'function') {
        m.saveModelAsJSONFile = () => postLog('saveModelAsJSONFile() skipped in worker');
    }
    // No-op nested ELM saver (many classes hang methods on .elm)
    if (m.elm && typeof m.elm.saveModelAsJSONFile === 'function') {
        m.elm.saveModelAsJSONFile = () => postLog('elm.saveModelAsJSONFile() skipped in worker');
    }
}
function postPipe() { post('PIPELINE', status); }
function postMetrics(m) { post('METRICS', m); }

// ---- v2-safe migration: ensure top-level { config } exists -------------
function normalizeSerializedJSON(raw, hint = { useTokenizer: true }) {
    let obj;
    try { obj = JSON.parse(raw); } catch { return raw; }

    // Already v2+ with config?
    if (obj && obj.config && typeof obj.config.useTokenizer === 'boolean') {
        // normalize delimiter to a string & attach inputSize if provided
        if (obj.config.tokenizerDelimiter && typeof obj.config.tokenizerDelimiter !== 'string') {
            obj.config.tokenizerDelimiter = '\\s+';
        }
        if (typeof hint.inputSize === 'number' && hint.inputSize > 0) {
            obj.config.inputSize = hint.inputSize; // 🔧 critical for numeric heads
        }
        return JSON.stringify(obj);
    }

    // Build a minimal v2 config
    const cfg = {
        useTokenizer: !!hint.useTokenizer,
        maxLen: (SETTINGS && SETTINGS.maxLen) || 48,
        charSet: (SETTINGS && SETTINGS.charSet) ||
            'abcdefghijklmnopqrstuvwxyzçàâêëéèîïôœùûüñáíóúü¿¡ ’-.,!?;:()[]{}"\'\t ',
        tokenizerDelimiter: '\\s+',
        hiddenUnits: (typeof hint.hiddenUnits === 'number' ? hint.hiddenUnits : undefined),
        activation: hint.activation || 'relu',
        ridgeLambda: typeof hint.ridgeLambda === 'number' ? hint.ridgeLambda : 1e-2,
        weightInit: hint.weightInit || 'xavier',
        categories: (Array.isArray(hint.categories) ? hint.categories : undefined),
        inputSize: (typeof hint.inputSize === 'number' && hint.inputSize > 0) ? hint.inputSize : undefined
    };

    obj = obj || {};
    obj.config = { ...cfg, ...(obj.config || {}) };
    return JSON.stringify(obj);
}

async function loadJSON(name) {
    try {
        const res = await fetch(`${SETTINGS.modelBasePath}/${name}.json`, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const txt = await res.text();
        if (!txt || txt.trim().startsWith('<!DOCTYPE')) throw new Error('HTML instead of JSON');
        return txt;
    } catch (e) {
        throw new Error(`Load ${name}.json failed: ${e.message}`);
    }
}

function tryLoadModel(model, raw, hint) {
    if (!model) throw new Error('loadModelFromJSON: model instance not available');

    const load = (jsonStr) => {
        if (typeof model.loadModelFromJSON === 'function') {
            model.loadModelFromJSON(jsonStr);
        } else if (model.elm?.loadModelFromJSON) {
            model.elm.loadModelFromJSON(jsonStr);
        } else {
            throw new Error('No loadModelFromJSON');
        }
    };

    // Pre-normalize (adds {config: {useTokenizer, maxLen, charSet, …}})
    let j = normalizeSerializedJSON(raw, hint);

    try {
        load(j);
    } catch (e1) {
        // One extra normalization pass, then rethrow
        try {
            const forced = normalizeSerializedJSON(j, hint);
            if (forced !== j) {
                load(forced);
                return;
            }
        } catch { /* ignore */ }
        throw e1;
    }
}

async function loadAll() {
    createInstances();           // ENC, LANG, CHENC only for now

    // Helper to load with migration + hinting
    const loadWithHint = async (name, model, hint) => {
        const raw = await loadJSON(name);
        tryLoadModel(model, raw, hint);
        disableDownloadsFor(model);
    };

    // 1) EncoderELM
    try {
        await loadWithHint('encoder_model', ENC, {
            useTokenizer: true, hiddenUnits: 96, activation: 'gelu', ridgeLambda: 1e-2, weightInit: 'xavier'
        });
        status.encoder = { status: 'loaded', ok: true };
    } catch (e) { status.encoder = { status: 'missing', ok: null }; postLog(e.message, 'warn'); }

    // 2) Language classifier (text/vector tolerant)
    try {
        await loadWithHint('lang_model', LANG, {
            useTokenizer: true, hiddenUnits: 128, activation: 'gelu', categories: CATEGORIES, ridgeLambda: 1e-2, weightInit: 'xavier'
        });
        status.classifier = { status: 'loaded', ok: true };
    } catch (e) { status.classifier = { status: 'missing', ok: null }; postLog(e.message, 'warn'); }

    // 3) Char encoder
    let vecLen = 0;
    try {
        await loadWithHint('langEncoder_model', CHENC, {
            useTokenizer: true, hiddenUnits: 192, activation: 'gelu', categories: CATEGORIES, ridgeLambda: 1e-2, weightInit: 'xavier'
        });
        status.langEnc = { status: 'loaded', ok: true };

        // Probe dimensionality
        const probe = (greetings && greetings[0]) || 'bonjour';
        const v = CHENC.encode(probe);
        if (Array.isArray(v)) vecLen = v.length;
    } catch (e) { status.langEnc = { status: 'missing', ok: null }; postLog(e.message, 'warn'); }

    // 4) Now that we know vecLen, size numeric heads and load them
    const metaLen = 4;
    if (vecLen) ensureVectorHeads(vecLen, metaLen);

    // Combiner
    if (COMB) {
        try {
            await loadWithHint('combiner_model', COMB, {
                useTokenizer: false, inputSize: (vecLen + metaLen), hiddenUnits: 128, activation: 'gelu'
            });
            status.combiner = { status: 'loaded', ok: true };
        } catch (e) { status.combiner = { status: 'missing', ok: null }; postLog(e.message, 'warn'); }
    }

    // Confidence
    if (CONF) {
        try {
            await loadWithHint('conf_model', CONF, {
                useTokenizer: false, inputSize: (vecLen + metaLen), hiddenUnits: 64, activation: 'gelu'
            });
            status.confidence = { status: 'loaded', ok: true };
        } catch (e) { status.confidence = { status: 'missing', ok: null }; postLog(e.message, 'warn'); }
    }

    // Refiner (same input size)
    if (REF) {
        try {
            await loadWithHint('refiner_model', REF, {
                useTokenizer: false, inputSize: (vecLen + metaLen), hiddenUnits: 64, activation: 'gelu'
            });
            status.refiner = { status: 'loaded', ok: true };
        } catch (e) { status.refiner = { status: 'missing', ok: null }; postLog(e.message, 'warn'); }
    }

    postPipe();
}

async function fetchCSV() {
    const res = await fetch('/language_greetings_1500.csv', { cache: 'no-cache' });
    const text = await res.text();
    const lines = text.split('\n').map(s => s.trim()).filter(Boolean).slice(1);
    const pairs = [];
    for (const line of lines) {
        const i = line.lastIndexOf(',');
        if (i <= 0 || i >= line.length - 1) continue;
        const t = line.slice(0, i).replace(/^"|"$/g, '').toLowerCase();
        const l = line.slice(i + 1).replace(/^"|"$/g, '');
        if (t && l) pairs.push([t, l]);
    }
    greetings = pairs.map(p => p[0]); labels = pairs.map(p => p[1]);
    buildAutocompleteIndex(greetings);
    status.ac = { status: 'ready', ok: true };  // mark AC badge as ready (index built)
    postPipe();
}

function normVec(v) {
    const s = Math.sqrt(v.reduce((a, x) => a + x * x, 0)) || 1;
    return v.map(x => x / s);
}

// --- Simple worker-side autocomplete (DOM-free) ---
let AC_INDEX = null;
function buildAutocompleteIndex(gs) {
    // unique + sorted (optional)
    const seen = new Set();
    AC_INDEX = [];
    for (const g of gs) if (!seen.has(g)) { seen.add(g); AC_INDEX.push(g); }
    AC_INDEX.sort(); // lexicographic
}

// returns the first greeting that starts with the prefix; else best "contains"; else ''
function autocomplete(prefix) {
    if (!prefix || !AC_INDEX) return '';
    const p = prefix.toLowerCase();
    const starts = AC_INDEX.find(g => g.startsWith(p));
    if (starts) return starts;
    const contains = AC_INDEX.find(g => g.includes(p));
    return contains || '';
}

function combineFeatures(vec, meta) { return FeatureCombinerELM.combineFeatures(vec, meta); }
function metaFor(text) {
    const len = text.length || 1;
    return [
        len / SETTINGS.maxLen,
        (new Set(text).size) / len,
        (text.match(/[aeiou]/g) || []).length / len,
        (text.match(/[.,!?]/g) || []).length / len
    ];
}

async function trainIfNeeded() {
    try {
        createInstances();
        if (!greetings?.length || !labels?.length) {
            await fetchCSV();
            postPipe();
        }

        // 1) Encoder
        if (!status.encoder?.ok) {
            const dim = 16;
            const idxBy = new Map();
            const targets = greetings.map((_, i) => {
                const lab = labels[i];
                if (!idxBy.has(lab)) idxBy.set(lab, idxBy.size);
                const idx = idxBy.get(lab) % dim;
                const v = new Array(dim).fill(0); v[idx] = 1; return v;
            });
            await ENC.train(greetings, targets, { epochs: 2, batchSize: 128 });
            status.encoder = { status: 'trained', ok: true };
            postLog('EncoderELM trained.');
            postPipe();
        }

        // 2) Language classifier
        if (!status.classifier?.ok) {
            const data = greetings.map((g, i) => ({ vector: ENC.encode(g), label: labels[i] }));
            if (typeof LANG.trainVectors === 'function') {
                await LANG.trainVectors(data);
            } else if (typeof LANG.trainFromData === 'function') {
                const cats = Array.from(new Set(labels));
                await LANG.trainFromData(greetings, labels.map(l => cats.indexOf(l)), { epochs: 2, batchSize: 128, ridgeLambda: 1e-2 });
            } else {
                await LANG.train(data);
            }
            status.classifier = { status: 'trained', ok: true };
            postLog('LanguageClassifier trained.');
            postPipe();
        }

        // 3) Character encoder
        if (!status.langEnc?.ok) {
            await CHENC.train(greetings, labels, { epochs: 4, batchSize: 128 });
            status.langEnc = { status: 'trained', ok: true };
            postLog('CharacterLangEncoder trained.');
            postPipe();
        }

        // Precompute vectors & metas and size vector heads
        const vecs = greetings.map(g => normVec(CHENC.encode(g)));
        const metas = greetings.map(g => metaFor(g));
        ensureVectorHeads(vecs[0]?.length || 0, metas[0]?.length || 0);

        // 4) Combiner
        if (!status.combiner?.ok) {
            await COMB.train(vecs, metas, labels);
            status.combiner = { status: 'trained', ok: true };
            postLog('FeatureCombiner trained.');
            postPipe();
        }

        // 5) Confidence classifier
        if (!status.confidence?.ok) {
            const comb = vecs.map((v, i) => COMB.predict(v, metas[i])[0]);
            const confY = comb.map((r, i) => (r.label !== labels[i] || r.prob < 0.8) ? 'low' : 'high');
            await CONF.train(vecs, metas, confY);
            status.confidence = { status: 'trained', ok: true };
            postLog('ConfidenceClassifier trained.');
            postPipe();
        }

        // 6) Refiner (low-confidence subset)
        if (REF) {
            const comb = vecs.map((v, i) => COMB.predict(v, metas[i])[0]);
            const combined = vecs.map((v, i) => FeatureCombinerELM.combineFeatures(v, metas[i]));
            const lowSet = comb.map((r, i) => ({ vec: combined[i], y: labels[i], bad: r.label !== labels[i], p: r.prob }))
                .filter(x => x.bad || x.p < 0.8);
            if (lowSet.length) {
                await REF.train(lowSet.map(x => x.vec), lowSet.map(x => x.y));
                status.refiner = { status: 'trained', ok: true };
                postLog(`Refiner trained on ${lowSet.length} low-confidence examples.`);
            } else {
                status.refiner = { status: 'skipped', ok: null };
                postLog('Refiner skipped (no low-confidence examples).', 'warn');
            }
            postPipe();
        } else {
            status.refiner = { status: 'skipped', ok: null };
            postLog('Refiner skipped (inputSize unknown).', 'warn');
            postPipe();
        }

        await evaluateAll();
        postLog('Training finished.');
    } catch (err) {
        postLog(`trainIfNeeded() failed: ${err?.message || err}`, 'error');
        postPipe();
    }
}

async function evaluateAll() {
    // Language accuracy (sparse)
    let correct = 0, total = 0;
    for (let i = 0; i < greetings.length; i += 17) {
        const g = greetings[i];
        const v = ENC.encode(g);
        const [pred] = (LANG.predictFromVector ? LANG.predictFromVector(v) : LANG.predict(g, 1));
        if (pred?.label === labels[i]) correct++;
        total++;
    }
    const langAcc = total ? +(correct / total).toFixed(3) : null;

    // Centroid separation for CHENC
    const by = { English: [], French: [], Spanish: [] };
    for (let i = 0; i < greetings.length; i += 23) {
        const g = greetings[i], lab = labels[i];
        by[lab]?.push(normVec(CHENC.encode(g)));
    }
    const centroid = (arr) => {
        if (!arr.length) return [];
        const d = arr[0].length, c = new Array(d).fill(0);
        for (const v of arr) for (let i = 0; i < d; i++) c[i] += v[i];
        for (let i = 0; i < d; i++) c[i] /= arr.length;
        return c;
    };
    const dot = (a, b) => a.reduce((s, x, i) => s + x * (b[i] || 0), 0);
    const sep = (a, b) => 1 - dot(normVec(a), normVec(b));
    const cE = centroid(by.English), cF = centroid(by.French), cS = centroid(by.Spanish);
    const langSep = Math.min(sep(cE, cF), sep(cE, cS), sep(cF, cS));
    const langSepF = Number.isFinite(langSep) ? +langSep.toFixed(3) : null;

    // F1 for low confidence
    const vecs = greetings.map(g => normVec(CHENC.encode(g)));
    const metas = greetings.map(g => metaFor(g));
    let tp = 0, fp = 0, fn = 0;
    for (let i = 0; i < vecs.length; i += 17) {
        const [pred] = CONF.predict(vecs[i], metas[i]);
        const comb = COMB.predict(vecs[i], metas[i])[0];
        const truth = (comb.label !== labels[i]) || (comb.prob < 0.8);
        const guess = pred?.label === 'low';
        if (guess && truth) tp++;
        else if (guess && !truth) fp++;
        else if (!guess && truth) fn++;
    }
    const prec = tp ? tp / (tp + fp) : 0;
    const rec = tp ? tp / (tp + fn) : 0;
    const f1 = (prec + rec) ? (2 * prec * rec) / (prec + rec) : 0;
    const confF1 = +f1.toFixed(3);

    // No AutoComplete in worker → acCE = null
    postMetrics({ langAcc, acCE: null, langSep: langSepF, confF1 });
}

function blendFinal(lang, comb, refined, uncertain) {
    // Strategy:
    // - If refined exists and (uncertain || comb.prob < 0.6) → use refined
    // - Else, if lang.label == comb.label → average probs
    // - Else default to comb
    if (refined && (uncertain || (comb?.prob ?? 0) < 0.6)) return refined;
    if (lang && comb && lang.label === comb.label) {
        return { label: lang.label, prob: Math.min(1, (lang.prob + comb.prob) / 2) };
    }
    return comb || lang || { label: 'Unknown', prob: 0 };
}

function predict(text) {
    try {
        // Ensure instances exist even if user types early
        createInstances();

        const raw = (text || '').trim().toLowerCase();

        // Empty input → clear UI
        if (!raw) {
            post('PREDICTION', {
                autocomplete: '',
                final: { label: '—', prob: 0 },
                topComb: null,
                topLang: null,
                uncertain: false,
                confidence: 0
            });
            return;
        }

        // Fast, DOM-free autocomplete built from the CSV index
        const autocompleteText = autocomplete(raw); // may be ''
        const target = autocompleteText || raw;

        // If core models aren’t ready yet, return a harmless placeholder
        if (!modelsReadyForPredict()) {
            post('PREDICTION', {
                autocomplete: autocompleteText,
                final: { label: '—', prob: 0 },
                topComb: null,
                topLang: null,
                uncertain: true,
                confidence: 0
            });
            return;
        }

        // --- 1) Language from encoder → classifier
        let topLang = null;
        try {
            const encV = ENC.encode(target);
            topLang = (typeof LANG.predictFromVector === 'function')
                ? (LANG.predictFromVector(encV)[0] || null)
                : (LANG.predict(target, 1)[0] || null);
        } catch (_) {
            topLang = null;
        }

        // --- 2) Char encoder + meta → combiner
        let topComb = null, chV = null, meta = null;
        try {
            chV = normVec(CHENC.encode(target));
            meta = metaFor(raw);
            topComb = (COMB.predict(chV, meta)[0] || null);
        } catch (_) {
            topComb = null;
        }

        // --- 3) Confidence and optional refiner
        let isUncertain = true;
        try {
            const confPred = CONF.predict(chV, meta)[0];
            isUncertain = confPred ? (confPred.label === 'low') : true;
        } catch (_) {
            isUncertain = true;
        }

        let refined = null;
        try {
            if (self.REF) {
                const combined = combineFeatures(chV, meta);
                refined = REF.predict(combined)[0] || null;
            }
        } catch { }

        // --- 4) Blend & publish
        const final = blendFinal(topLang, topComb, refined, isUncertain);
        const confidence = Math.max(0, Math.min(1, final?.prob ?? 0));

        post('PREDICTION', {
            autocomplete: autocompleteText,
            final,
            topComb,
            topLang,
            uncertain: isUncertain,
            confidence
        });
    } catch (err) {
        // Absolute last-resort safety: never crash the worker
        post('PREDICTION', {
            autocomplete: '',
            final: { label: '—', prob: 0 },
            topComb: null,
            topLang: null,
            uncertain: true,
            confidence: 0
        });
        post('LOG', { line: `predict() failed: ${err && err.message ? err.message : err}`, kind: 'error' });
    }
}

async function exportAll() {
    const items = [
        ['encoder_model', ENC],
        ['lang_model', LANG],
        ['langEncoder_model', CHENC],
        ['combiner_model', COMB],
        ['conf_model', CONF],
        ['refiner_model', REF],
    ];
    const out = [];
    for (const [name, m] of items) {
        if (!m) continue;
        const json = (m.elm?.savedModelJSON) || m.savedModelJSON || (m.toJSON?.(true) ?? null);
        if (!json) continue;
        out.push({ name, json: typeof json === 'string' ? json : JSON.stringify(json) });
    }
    post('BULK_EXPORT', out);
}


/* ---------------------------- Message loop --------------------------- */

self.onmessage = async (ev) => {
    const { type, payload } = ev.data || {};
    if (type === Msg.INIT) {
        SETTINGS = payload.SETTINGS;
        CATEGORIES = payload.CATEGORIES;
        createInstances();
        postLog('Worker init.');
        postPipe();

        await fetchCSV();          // builds autocomplete index & marks ac=ready
        await loadAll();           // try to load from /models
        await trainIfNeeded();     // then train anything missing
        postLog('Bootstrap finished.');
    } else if (type === Msg.LOAD) {
        postLog('Loading models from /models …');
        await loadAll();
    } else if (type === Msg.TRAIN) {
        postLog('Training / updating pipeline …');
        await trainIfNeeded();
        postLog('Training finished.');
    } else if (type === Msg.PREDICT) {
        predict(payload.text);
    } else if (type === Msg.EXPORT_ALL) {
        await exportAll();
    } else if (type === Msg.RESET) {
        Object.keys(status).forEach(k => status[k] = { status: '—', ok: null });
        AC = ENC = LANG = CHENC = COMB = CONF = REF = null;   // make sure REF is nulled
        greetings = []; labels = [];
        await fetchCSV();
        postPipe();
        postMetrics({});
        postLog('Reset complete.');
    }
};
