/* global window, document, Worker, Blob, URL */

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
    const grid = $('probGrid');
    grid.innerHTML = '';
    CATEGORIES.forEach(cat => {
        const label = document.createElement('div'); label.textContent = cat;
        const bar = document.createElement('div'); bar.className = 'probbar';
        const fill = document.createElement('div'); fill.className = 'probfill';
        const pct = Math.round((probMap[cat] || 0) * 100);
        fill.style.width = pct + '%';
        fill.style.background = ({
            World: 'linear-gradient(to right, teal, cyan)',
            Sports: 'linear-gradient(to right, green, lime)',
            Business: 'linear-gradient(to right, goldenrod, yellow)',
            'Sci/Tech': 'linear-gradient(to right, purple, magenta)'
        })[cat] || 'linear-gradient(to right,#5a7,#9df)';
        bar.appendChild(fill);
        grid.appendChild(label); grid.appendChild(bar);
    });
}

window.addEventListener('DOMContentLoaded', () => {
    const mode = $('mode');
    const activation = $('activation');
    const encHidden = $('encHidden');
    const clsHidden = $('clsHidden');
    const batch = $('batch');
    const kernel = $('kernel');
    const landmarks = $('landmarks');
    const gamma = $('gamma');

    const btnStart = $('btnStart');
    const btnPause = $('btnPause');
    const btnResume = $('btnResume');
    const btnCancel = $('btnCancel');
    const btnExportEnc = $('btnExportEnc');
    const btnExportCls = $('btnExportCls');

    const phase = $('phase');
    const rps = $('rps');
    const eta = $('eta');
    const dl = $('dl');
    const rows = $('rows');
    const batchChip = $('batchChip');
    const acc = $('acc');
    const input = $('headlineInput');

    batchChip.textContent = `batch: ${batch.value}`;

    let worker = null;
    let modelsReady = false;     // true after final model ready
    let trainingActive = false;  // true between Start and Ready

    function ensureWorker() {
        if (worker) return;
        worker = new Worker(WORKER_URL);
        worker.onmessage = (e) => {
            const msg = e.data || {};
            switch (msg.type) {
                case 'log':
                    logLine(msg.text);
                    if (msg.text === 'Paused.') {
                        btnPause.disabled = true; btnResume.disabled = false;
                        // allow predictions while paused
                        input.disabled = false;
                        if (!modelsReady) input.placeholder = 'Paused — try a headline…';
                    }
                    if (msg.text === 'Resumed.') {
                        btnPause.disabled = false; btnResume.disabled = true;
                        // disable input again if training not finished
                        if (trainingActive && !modelsReady) {
                            input.disabled = true;
                            input.placeholder = 'Training…';
                        }
                    }
                    break;
                case 'progress':
                    setFill(msg.pct || 0);
                    if (msg.phase) phase.textContent = msg.phase;
                    if (msg.rps != null) rps.textContent = msg.rps.toFixed(1);
                    if (msg.eta) eta.textContent = msg.eta;
                    if (msg.mb != null) dl.textContent = `${msg.mb.toFixed(1)} MB`;
                    if (msg.rowsProcessed != null) {
                        const total = msg.totalRows && msg.totalRows > 0 ? ` / ~${msg.totalRows} rows` : ' / 0 rows';
                        rows.textContent = `${msg.rowsProcessed}${total}`;
                    }
                    if (msg.valAcc != null) {
                        acc.textContent = `val acc: ${(msg.valAcc * 100).toFixed(1)}%`;
                    }
                    break;
                case 'ready':
                    modelsReady = true;
                    trainingActive = false;
                    input.disabled = false;
                    input.placeholder = 'Type a headline…';
                    btnPause.disabled = false;
                    btnResume.disabled = true;
                    logLine('✅ Models ready.');
                    break;
                case 'probabilities':
                    setProbs(msg.map || {});
                    break;
                case 'model-json': {
                    const { name, json } = msg;
                    const blob = new Blob([json], { type: 'application/json' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = name;
                    a.click();
                    URL.revokeObjectURL(a.href);
                    break;
                }
                case 'error':
                    logLine('❌ ' + msg.error);
                    break;
            }
        };
    }

    btnStart.onclick = () => {
        ensureWorker();
        modelsReady = false;
        trainingActive = true;
        input.disabled = true;
        input.placeholder = 'Training…';
        acc.textContent = 'val acc: —';
        $('probGrid').innerHTML = '';
        setFill(0);
        btnResume.disabled = true;
        btnPause.disabled = false;
        logLine('▶️ Start requested.');
        const kelmMode = mode.value === 'kelm';
        worker.postMessage({
            type: 'init',
            payload: {
                dataUrl: DATA_URL,
                categories: CATEGORIES,
                batch: Number(batch.value),
                encoderHidden: Number(encHidden.value),
                classifierHidden: Number(clsHidden.value),
                activation: activation.value,
                mode: mode.value, // 'kelm' | 'online'
                kelm: {
                    kernel: kernel.value,
                    landmarks: Number(landmarks.value),
                    gamma: Number(gamma.value),
                    whiten: true,
                    ridgeLambda: 1e-2
                },
                files: {
                    encoder: 'agnews_encoder.json',
                    classifier: kelmMode ? 'agnews_kelm.json' : 'agnews_classifier.json'
                },
                maxRowsForKELM: 25000
            }
        });
    };

    btnPause.onclick = () => worker && worker.postMessage({ type: 'pause' });
    btnResume.onclick = () => worker && worker.postMessage({ type: 'resume' });
    btnCancel.onclick = () => worker && worker.postMessage({ type: 'cancel' });

    btnExportEnc.onclick = () => worker && worker.postMessage({ type: 'export', which: 'encoder' });
    btnExportCls.onclick = () => worker && worker.postMessage({ type: 'export', which: 'classifier' });

    // Debounced predict
    let t = 0;
    const debouncedPredict = (txt) => {
        clearTimeout(t);
        t = setTimeout(() => {
            if (!txt.trim()) return;
            // allow predictions either when fully ready OR paused with interim model
            if (modelsReady || !trainingActive) {
                worker.postMessage({ type: 'predict', text: txt });
            } else {
                // paused interim predictions are handled too; just send
                worker.postMessage({ type: 'predict', text: txt });
            }
        }, 150);
    };
    $('headlineInput').addEventListener('input', () => debouncedPredict($('headlineInput').value.toLowerCase()));
});
