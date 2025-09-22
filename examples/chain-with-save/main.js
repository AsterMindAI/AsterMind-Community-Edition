/* ELM Showcase 2.0 — main thread
   - Orchestrates UI and a Web Worker that trains/evaluates
   - Requires window.astermind to be available globally
*/

/* ----------------------- DOM references ----------------------- */
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

// Optional UI bits (overlay + stage note + viz panes)
const helperEl = document.getElementById('helperText');
const stageNoteEl = document.getElementById('stageNote');
const overlayEl = document.getElementById('loadingOverlay');

const langViz = document.getElementById('viz-lang');
const combViz = document.getElementById('viz-comb');
const confViz = document.getElementById('viz-conf');

/* -------------------------- Config ---------------------------- */
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
    saveAfterTrain: false,      // gate exports to explicit click
    modelBasePath: '/models',   // where to load from if present
};

const WorkerMsg = {
    INIT: 'INIT',
    LOAD: 'LOAD',
    TRAIN: 'TRAIN',
    PREDICT: 'PREDICT',
    EXPORT_ALL: 'EXPORT_ALL',
    RESET: 'RESET'
};

/* ------------------------- Worker boot ------------------------ */
const worker = new Worker('./worker.js');

/* ----------------------- Small utilities ---------------------- */
function log(line, kind = 'info') {
    const prefix = kind === 'error' ? '❌' : kind === 'warn' ? '⚠️' : '•';
    logEl.textContent += `${prefix} ${line}\n`;
    logEl.scrollTop = logEl.scrollHeight;
}

function setInputEnabled(enabled, reason = '') {
    input.disabled = !enabled;
    if (!enabled) {
        input.placeholder = 'Loading models…';
        overlayEl && overlayEl.classList.remove('hidden');
        if (stageNoteEl) stageNoteEl.textContent = reason || 'Preparing pipeline…';
    } else {
        input.placeholder = 'Type a greeting… e.g., bonjour';
        overlayEl && overlayEl.classList.add('hidden');
        if (stageNoteEl) stageNoteEl.textContent = '';
    }
}

function bars(container, items) {
    if (!container) return;
    container.innerHTML = '';
    (items || []).forEach(({ label, prob }) => {
        const row = document.createElement('div');
        row.className = 'barrow';
        row.innerHTML = `
      <span class="barlabel">${label}</span>
      <div class="bartrack"><div class="barfill" style="width:${Math.round((prob || 0) * 100)}%"></div></div>
      <span class="barpct">${Math.round((prob || 0) * 100)}%</span>`;
        container.appendChild(row);
    });
}

/* ---------------------- Pipeline badges ----------------------- */
const HUMAN = {
    '—': 'pending',
    pending: 'pending',
    unloaded: 'unloaded',
    missing: 'missing',
    loading: 'loading',
    loaded: 'loaded',
    trained: 'trained',
    ready: 'ready',
    skipped: 'skipped',
};

function ensurePipelineScaffold() {
    if (pipelineEl.dataset.init === '1') return;
    pipelineEl.dataset.init = '1';

    const mk = (id, title) => {
        const div = document.createElement('div');
        div.className = 'stage-card';
        div.id = id;
        div.innerHTML = `<div class="title">${title}</div><div class="stage">pending</div>`;
        return div;
    };

    pipelineEl.innerHTML = '';
    pipelineEl.append(
        mk('stage-ac', 'AutoComplete'),
        mk('stage-encoder', 'EncoderELM'),
        mk('stage-lang', 'LanguageClassifier'),
        mk('stage-charenc', 'CharLangEncoder'),
        mk('stage-combiner', 'FeatureCombiner'),
        mk('stage-conf', 'ConfidenceClassifier'),
        mk('stage-refiner', 'Refiner'),
    );
}

function renderStage(cardId, state) {
    const el = document.getElementById(cardId);
    if (!el) return;
    const s = HUMAN[state?.status] || 'pending';
    el.setAttribute('data-stage', s);
    el.querySelector('.stage').textContent = s;
    el.classList.toggle('ok', !!state?.ok);
    el.classList.toggle('warn', s === 'missing' || s === 'skipped');
}

function setPipelineStatus(state) {
    ensurePipelineScaffold();
    renderStage('stage-ac', state.ac || { status: 'pending', ok: null });
    renderStage('stage-encoder', state.encoder || { status: 'pending', ok: null });
    renderStage('stage-lang', state.classifier || { status: 'pending', ok: null });
    renderStage('stage-charenc', state.langEnc || { status: 'pending', ok: null });
    renderStage('stage-combiner', state.combiner || { status: 'pending', ok: null });
    renderStage('stage-conf', state.confidence || { status: 'pending', ok: null });
    renderStage('stage-refiner', state.refiner || { status: 'pending', ok: null });

    // Friendly stage note
    if (stageNoteEl) {
        const ordered = [
            ['Encoder', state.encoder],
            ['Language', state.classifier],
            ['CharEnc', state.langEnc],
            ['Combiner', state.combiner],
            ['Confidence', state.confidence],
            ['Refiner', state.refiner],
        ];
        const next = ordered.find(([, s]) => !s?.ok)?.[0];
        stageNoteEl.textContent = next ? `Warming up: ${next}…` : '';
    }
}

/* ------------------------- Metrics/Chart ----------------------- */
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

/* --------------------------- State ---------------------------- */
const state = {
    pipeline: {},
    metrics: {},
    confHistory: [],
    ready: false
};

/* ----------------------- Worker messages ---------------------- */
worker.onmessage = (ev) => {
    const { type, payload } = ev.data || {};

    if (type === 'LOG') {
        log(payload.line, payload.kind);

    } else if (type === 'READY') {
        state.ready = !!payload.ready;
        setInputEnabled(state.ready, state.ready ? '' : 'Warming up models…');

    } else if (type === 'PIPELINE') {
        state.pipeline = payload;
        setPipelineStatus(payload);

    } else if (type === 'METRICS') {
        state.metrics = payload;
        renderMetrics(payload);

    } else if (type === 'PREDICTION') {
        const {
            autocomplete, final, topComb, topLang, langTopK, combTopK, confTopK,
            uncertain, confidence, origin
        } = payload;

        // ghost completion + fill bar
        ghost.textContent = autocomplete || '';
        const pct = Math.round((final?.prob || 0) * 100);
        fill.style.width = `${pct}%`;
        fill.style.background = COLORS[final?.label] || 'linear-gradient(90deg,#64748b,#94a3b8)';

        // tags
        predTags.innerHTML = '';
        const mk = (text) => { const t = document.createElement('span'); t.className = 'tag'; t.textContent = text; return t; };
        if (topLang) predTags.append(mk(`Lang: ${topLang.label} (${Math.round(topLang.prob * 100)}%)`));
        if (topComb) predTags.append(mk(`Comb: ${topComb.label} (${Math.round(topComb.prob * 100)}%)`));
        if (uncertain) predTags.append(mk('Uncertain'));
        predTags.append(mk(`Final: ${final?.label ?? '—'} (${pct}%)`));
        if (origin) predTags.append(mk(`→ ${origin}`));

        // mini visualizations (if present)
        bars(langViz, langTopK);
        bars(combViz, combTopK);
        bars(confViz, (confTopK || []).map(d => ({ label: d.label, prob: d.prob })));

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

/* --------------------------- Boot ----------------------------- */
setInputEnabled(false, 'Bootstrapping…');
worker.postMessage({ type: WorkerMsg.INIT, payload: { SETTINGS, CATEGORIES } });

/* -------------------------- Controls -------------------------- */
btnLoad.onclick = () => worker.postMessage({ type: WorkerMsg.LOAD });
btnTrain.onclick = () => worker.postMessage({ type: WorkerMsg.TRAIN, payload: { saveAfterTrain: SETTINGS.saveAfterTrain } });
btnExport.onclick = () => worker.postMessage({ type: WorkerMsg.EXPORT_ALL });
btnReset.onclick = () => {
    log('Resetting session…');
    worker.postMessage({ type: WorkerMsg.RESET });
    state.confHistory = [];
    drawConfidenceHistory(state.confHistory);
    input.value = ''; ghost.textContent = ''; fill.style.width = '0%'; predTags.innerHTML = '';
    setInputEnabled(false, 'Resetting…');
};

/* ------------------------- Inference -------------------------- */
let lastSent = 0;
input.addEventListener('input', () => {
    if (!state.ready) return;                // hard block while loading
    const val = (input.value || '').trim().toLowerCase();
    const now = performance.now();
    if (now - lastSent < 50) return;        // debounce
    lastSent = now;
    worker.postMessage({ type: WorkerMsg.PREDICT, payload: { text: val } });
});
