/* ELM Showcase 2.0 — main thread
   - Orchestrates UI, ModelManager, and a Web Worker that trains/evaluates
   - Requires window.astermind to be available globally
*/
const logEl = document.getElementById('log');
const pipelineEl = document.getElementById('pipeline');
const metricsEl = document.getElementById('metrics');
const chartEl = document.getElementById('chart');
const input = document.getElementById('userInput');
const ghost = document.getElementById('autoGhost');
const fill = document.getElementById('langFill');
const predTags = document.getElementById('predTags');

const btnLoad = document.getElementById('btn-load');
const btnTrain = document.getElementById('btn-train');
const btnExport = document.getElementById('btn-export');
const btnReset = document.getElementById('btn-reset');

const CATEGORIES = ['English', 'French', 'Spanish'];
const COLORS = {
    English: 'linear-gradient(90deg,#22c55e,#a3e635)',
    French: 'linear-gradient(90deg,#3b82f6,#22d3ee)',
    Spanish: 'linear-gradient(90deg,#ef4444,#f97316)'
};

const SETTINGS = {
    charSet:
        'abcdefghijklmnopqrstuvwxyzçàâêëéèîïôœùûüñáíóúü¿¡ ’-.,!?;:()[]{}"\'\t ',
    maxLen: 48,
    saveAfterTrain: false, // gate exports to explicit click
    modelBasePath: '/models', // where to load from if present
};

const WorkerMsg = {
    INIT: 'INIT',
    LOAD: 'LOAD',
    TRAIN: 'TRAIN',
    PREDICT: 'PREDICT',
    EXPORT_ALL: 'EXPORT_ALL',
    RESET: 'RESET'
};

const worker = new Worker('./worker.js');

function log(line, kind = 'info') {
    const prefix = kind === 'error' ? '❌' : kind === 'warn' ? '⚠️' : '•';
    logEl.textContent += `${prefix} ${line}\n`;
    logEl.scrollTop = logEl.scrollHeight;
}

function badge({ title, status = '—', ok = true }) {
    const div = document.createElement('div');
    div.className = `badge ${ok === true ? 'ok' : ok === false ? 'err' : 'warn'}`;
    div.innerHTML = `<div class="title">${title}</div><div class="status">${status}</div>`;
    return div;
}

function setPipelineStatus(state) {
    pipelineEl.innerHTML = '';
    pipelineEl.append(
        badge({ title: 'AutoComplete', status: state.ac?.status || 'unloaded', ok: state.ac?.ok }),
        badge({ title: 'EncoderELM', status: state.encoder?.status || 'unloaded', ok: state.encoder?.ok }),
        badge({ title: 'LanguageClassifier', status: state.classifier?.status || 'unloaded', ok: state.classifier?.ok }),
        badge({ title: 'CharLangEncoder', status: state.langEnc?.status || 'unloaded', ok: state.langEnc?.ok }),
        badge({ title: 'FeatureCombiner', status: state.combiner?.status || 'unloaded', ok: state.combiner?.ok }),
        badge({ title: 'ConfidenceClassifier', status: state.confidence?.status || 'unloaded', ok: state.confidence?.ok }),
        badge({ title: 'Refiner', status: state.refiner?.status || 'unloaded', ok: state.refiner?.ok }),
    );
}

function renderMetrics(m) {
    metricsEl.innerHTML = '';
    const items = [
        ['Top-1 Acc (Lang)', m?.langAcc],
        ['Cross-Entropy (AC)', m?.acCE],
        ['Centroid Sep (Enc)', m?.langSep],
        ['F1(low) (Conf)', m?.confF1],
    ];
    for (const [k, v] of items) {
        const card = document.createElement('div');
        card.className = 'metric';
        card.innerHTML = `<div class="k">${k}</div><div class="v">${v == null ? '—' : v}</div>`;
        metricsEl.append(card);
    }
}

function drawConfidenceHistory(series) {
    const ctx = chartEl.getContext('2d');
    const W = chartEl.width, H = chartEl.height;
    ctx.clearRect(0, 0, W, H);
    // frame
    ctx.strokeStyle = '#2a325b'; ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
    if (!series?.length) return;
    const maxN = Math.min(series.length, 120);
    const windowed = series.slice(-maxN);
    const step = (W - 20) / Math.max(1, windowed.length - 1);
    ctx.beginPath();
    ctx.moveTo(10, H - 10 - windowed[0] * (H - 20));
    for (let i = 1; i < windowed.length; i++) {
        const x = 10 + i * step;
        const y = H - 10 - windowed[i] * (H - 20);
        ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#7c9cff';
    ctx.lineWidth = 2;
    ctx.stroke();
}

const state = {
    pipeline: {},
    metrics: {},
    confHistory: [],
};

worker.onmessage = (ev) => {
    const { type, payload } = ev.data || {};
    if (type === 'LOG') {
        log(payload.line, payload.kind);
    } else if (type === 'PIPELINE') {
        state.pipeline = payload;
        setPipelineStatus(payload);
    } else if (type === 'METRICS') {
        state.metrics = payload;
        renderMetrics(payload);
    } else if (type === 'PREDICTION') {
        const { autocomplete, final, topComb, topLang, uncertain, confidence } = payload;
        ghost.textContent = autocomplete || '';
        const pct = Math.round((final?.prob || 0) * 100);
        fill.style.width = `${pct}%`;
        fill.style.background = COLORS[final?.label] || 'linear-gradient(90deg,#64748b,#94a3b8)';
        predTags.innerHTML = '';
        const mk = (text) => { const t = document.createElement('span'); t.className = 'tag'; t.textContent = text; return t; };
        if (topLang) predTags.append(mk(`Lang: ${topLang.label} (${Math.round(topLang.prob * 100)}%)`));
        if (topComb) predTags.append(mk(`Comb: ${topComb.label} (${Math.round(topComb.prob * 100)}%)`));
        if (uncertain) predTags.append(mk('Uncertain'));
        predTags.append(mk(`Final: ${final?.label ?? '—'} (${pct}%)`));
        // chart
        state.confHistory.push(confidence ?? (final?.prob || 0));
        drawConfidenceHistory(state.confHistory);
    } else if (type === 'BULK_EXPORT') {
        // trigger downloads
        payload.forEach(({ name, json }) => {
            const blob = new Blob([json], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${name}.json`;
            a.click();
            URL.revokeObjectURL(a.href);
        });
    }
};

// Boot
worker.postMessage({ type: WorkerMsg.INIT, payload: { SETTINGS, CATEGORIES } });

// Controls
btnLoad.onclick = () => worker.postMessage({ type: WorkerMsg.LOAD });
btnTrain.onclick = () => worker.postMessage({ type: WorkerMsg.TRAIN, payload: { saveAfterTrain: SETTINGS.saveAfterTrain } });
btnExport.onclick = () => worker.postMessage({ type: WorkerMsg.EXPORT_ALL });
btnReset.onclick = () => {
    log('Resetting session…');
    worker.postMessage({ type: WorkerMsg.RESET });
    state.confHistory = [];
    drawConfidenceHistory(state.confHistory);
    input.value = ''; ghost.textContent = ''; fill.style.width = '0%'; predTags.innerHTML = '';
};

// Inference
let lastSent = 0;
input.addEventListener('input', () => {
    const val = (input.value || '').trim().toLowerCase();
    const now = performance.now();
    if (now - lastSent < 50) return; // debounce
    lastSent = now;
    worker.postMessage({ type: WorkerMsg.PREDICT, payload: { text: val } });
});
