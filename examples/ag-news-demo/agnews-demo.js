// © 2026 AsterMind AI Co. – All Rights Reserved.
// Patent Pending US 63/897,713
/* global window, document, Worker, Blob, URL, FileReader */

const DATA_URL = '/ag-news-classification-dataset/train.csv';
const WORKER_URL = '/agnews-worker.js';
const CATEGORIES = ['World', 'Sports', 'Business', 'Sci/Tech'];

const $ = (id) => document.getElementById(id);

function setFill(pct) { $('fill').style.width = `${Math.max(0, Math.min(100, pct))}%`; }
function logLine(s) {
    const el = $('log');
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
    el.textContent += (el.textContent ? '\n' : '') + s;
    if (atBottom) el.scrollTop = el.scrollHeight;
}
function setProbs(probMap) {
    const grid = $('probGrid'); grid.innerHTML = '';
    CATEGORIES.forEach(cat => {
        const label = document.createElement('div'); label.textContent = cat;
        const bar = document.createElement('div'); bar.className = 'probbar';
        const fill = document.createElement('div'); fill.className = 'probfill';
        const pct = Math.round((probMap[cat] || 0) * 100); fill.style.width = pct + '%';
        fill.style.background = ({
            World: 'linear-gradient(to right, teal, cyan)',
            Sports: 'linear-gradient(to right, green, lime)',
            Business: 'linear-gradient(to right, goldenrod, yellow)',
            'Sci/Tech': 'linear-gradient(to right, purple, magenta)'
        })[cat];
        bar.appendChild(fill); grid.appendChild(label); grid.appendChild(bar);
    });
}
const fmtMB = (mb) => `${(mb || 0).toFixed(1)} MB`;

window.addEventListener('DOMContentLoaded', () => {
    const mode = $('mode'), activation = $('activation'), encHidden = $('encHidden'), clsHidden = $('clsHidden'), batch = $('batch'),
        kernel = $('kernel'), landmarks = $('landmarks'), gamma = $('gamma');

    const btnStart = $('btnStart'), btnPause = $('btnPause'), btnResume = $('btnResume'), btnCancel = $('btnCancel'),
        btnExportEnc = $('btnExportEnc'), btnExportCls = $('btnExportCls'), btnPredict = $('btnPredict'),
        fileImport = $('fileImport'), btnRecover = $('btnRecover');

    const phase = $('phase'), rps = $('rps'), eta = $('eta'), dl = $('dl'), rows = $('rows'),
        batchChip = $('batchChip'), acc = $('acc'), earlyStop = $('earlyStop'), predictChip = $('predictChip'),
        input = $('headlineInput');

    batchChip.textContent = `batch: ${batch.value}`;

    let worker = null, predictReady = false, trainingActive = false, paused = false;

    function setPredictReady(ready, warm = null, target = null) {
        predictReady = !!ready;
        btnPredict.disabled = !predictReady;
        input.disabled = !predictReady && trainingActive && !paused;
        if (ready) { predictChip.textContent = 'predict: ready'; input.placeholder = 'Type a headline…'; }
        else {
            predictChip.textContent = (warm != null && target != null) ? `predict: warming ${Math.min(warm, target)} / ${target}` : 'predict: —';
            if (trainingActive && !paused) input.placeholder = 'Training…';
        }
    }
    function setPauseUI() { btnPause.disabled = paused; btnResume.disabled = !paused; input.disabled = !predictReady && trainingActive && !paused; }

    function ensureWorker() {
        if (worker) return;
        worker = new Worker(WORKER_URL);
        worker.onmessage = (e) => {
            const msg = e.data || {};
            switch (msg.type) {
                case 'log': logLine(msg.text); break;
                case 'progress':
                    setFill(msg.pct || 0);
                    if (msg.phase) phase.textContent = msg.phase;
                    if (msg.rps != null) rps.textContent = (msg.rps || 0).toFixed(1);
                    if (msg.eta) eta.textContent = msg.eta;
                    if (msg.mb != null) dl.textContent = fmtMB(msg.mb);
                    if (msg.rowsProcessed != null) {
                        const total = msg.totalRows && msg.totalRows > 0 ? ` / ~${msg.totalRows} rows` : ' / 0 rows';
                        rows.textContent = `${msg.rowsProcessed}${total}`;
                    }
                    if (msg.valAcc != null) acc.textContent = `val acc: ${(msg.valAcc * 100).toFixed(1)}%`;
                    break;

                case 'state':
                    paused = !!msg.paused;
                    setPredictReady(!!msg.predictReady, msg.warmSeen ?? null, msg.warmTarget ?? null);
                    setPauseUI();
                    break;

                case 'predict-warm':
                    setPredictReady(predictReady, msg.warmSeen, msg.warmTarget);
                    break;

                case 'predict-ready':
                    setPredictReady(true);
                    break;

                case 'predict-ack':
                    logLine('↪︎ predicting…');
                    break;

                case 'early-stop':
                    earlyStop.textContent = `early stop: ${msg.reason || '—'}`;
                    logLine(`⏹️ Early stop — ${msg.reason || ''}`);
                    break;

                case 'ready':
                    trainingActive = false; setPredictReady(true); setPauseUI(); logLine('✅ Models ready.'); break;

                case 'probabilities':
                    setProbs(msg.map || {}); break;

                case 'model-json': {
                    const { name, json } = msg; const blob = new Blob([json], { type: 'application/json' });
                    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href);
                    logLine(`⬇️ Exported ${name}`); break;
                }

                case 'error': logLine('❌ ' + msg.error); break;
            }
        };
    }

    // Start / Pause / Resume / Cancel
    btnStart.onclick = () => {
        ensureWorker();
        trainingActive = true; paused = false;
        setProbs({}); setFill(0);
        earlyStop.textContent = 'early stop: —';
        acc.textContent = 'val acc: —';
        predictChip.textContent = 'predict: —';
        setPredictReady(false); setPauseUI();
        logLine('▶️ Start requested.');

        const kelmMode = mode.value === 'kelm';
        worker.postMessage({
            type: 'init',
            payload: {
                dataUrl: DATA_URL, categories: CATEGORIES, batch: Number(batch.value),
                encoderHidden: Number(encHidden.value), classifierHidden: Number(clsHidden.value), activation: activation.value,
                mode: kelmMode ? 'kelm' : 'online',
                kelm: { kernel: kernel.value, landmarks: Number(landmarks.value), gamma: Number(gamma.value), whiten: true, ridgeLambda: 1e-2 },
                files: { encoder: 'agnews_encoder.json', classifier: kelmMode ? 'agnews_kelm.json' : 'agnews_classifier.json' },
                earlyStop: { window: 2000, threshold: 0.985 }
            }
        });
    };
    btnPause.onclick = () => { if (worker) { worker.postMessage({ type: 'pause' }); paused = true; setPauseUI(); } };
    btnResume.onclick = () => { if (worker) { worker.postMessage({ type: 'resume' }); paused = false; setPauseUI(); } };
    btnCancel.onclick = () => { if (worker) { worker.postMessage({ type: 'cancel' }); trainingActive = false; } };

    // Export/Import/Recover
    btnExportEnc.onclick = () => worker && worker.postMessage({ type: 'export', which: 'encoder' });
    btnExportCls.onclick = () => worker && worker.postMessage({ type: 'export', which: 'classifier' });
    btnRecover.onclick = () => worker && worker.postMessage({ type: 'export-cached', which: 'classifier' });
    fileImport.addEventListener('change', () => {
        const f = fileImport.files && fileImport.files[0]; if (!f) return;
        const r = new FileReader(); r.onload = () => {
            const txt = String(r.result || ''); worker && worker.postMessage({ type: 'import-model-json', json: txt, filename: f.name });
            logLine(`📤 Import requested: ${f.name}`);
        }; r.readAsText(f);
    });

    // Prediction
    function sendPredict(txt) {
        const t = String(txt || '').trim(); if (!t) return;
        if (!predictReady) { logLine('ℹ️ Predict ignored — not ready yet.'); return; }
        logLine('→ predict: "' + t.slice(0, 120) + '"');
        worker && worker.postMessage({ type: 'predict', text: t });
    }
    $('headlineInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); sendPredict($('headlineInput').value); } });
    let tDeb = 0; $('headlineInput').addEventListener('input', () => { clearTimeout(tDeb); const val = $('headlineInput').value; tDeb = setTimeout(() => sendPredict(val), 180); });
    btnPredict.onclick = () => sendPredict($('headlineInput').value);

    batch.addEventListener('input', () => (batchChip.textContent = `batch: ${batch.value}`));
});
