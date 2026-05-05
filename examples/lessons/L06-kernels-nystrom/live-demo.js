// L06 — live demo
// ----------------------------------------------------------------------------
// One demo: kernelDemo. Trains KernelELM in three modes (linear, RBF exact,
// RBF Nyström) on a 2D concentric-rings dataset and visualizes the decision
// boundary by sampling on a 60×60 grid.

(function () {
  // -------- Config --------
  const N_TRAIN = 160;
  const N_HOLDOUT = 60;
  const NOISE = 0.025;
  const GAMMA = 12; // RBF bandwidth — tuned for unit-square rings
  const RIDGE = 1e-2;
  const GRID_RES = 60;

  // -------- State --------
  let trainSet = []; // {xy, cls}
  let holdoutSet = [];
  let m = 20;
  let runs = []; // history
  let lastBoundary = null; // 2D array of grid predictions (0/1)

  // -------- Data generation --------
  function genRings(n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const cls = i % 2;
      const angle = Math.random() * 2 * Math.PI;
      const r = cls === 0 ? 0.18 : 0.38;
      const x = 0.5 + r * Math.cos(angle) + (Math.random() - 0.5) * NOISE * 2;
      const y = 0.5 + r * Math.sin(angle) + (Math.random() - 0.5) * NOISE * 2;
      out.push({ xy: [x, y], cls });
    }
    return out;
  }

  function rebuildData() {
    trainSet = genRings(N_TRAIN);
    holdoutSet = genRings(N_HOLDOUT);
    lastBoundary = null;
  }

  function oneHot(c) {
    return c === 0 ? [1, 0] : [0, 1];
  }
  function argmax(p) {
    return p[0] >= p[1] ? 0 : 1;
  }

  // -------- Training wrappers --------
  function trainKernelELM(kind, opts) {
    const { KernelELM } = window.astermind || {};
    if (!KernelELM) {
      console.error("[L06] window.astermind.KernelELM missing");
      return null;
    }

    let cfg;
    if (kind === "linear") {
      cfg = { outputDim: 2, kernel: { type: "linear" }, mode: "exact", ridgeLambda: RIDGE };
    } else if (kind === "rbf-exact") {
      cfg = { outputDim: 2, kernel: { type: "rbf", gamma: GAMMA }, mode: "exact", ridgeLambda: RIDGE };
    } else if (kind === "rbf-nystrom") {
      cfg = {
        outputDim: 2,
        kernel: { type: "rbf", gamma: GAMMA },
        mode: "nystrom",
        nystrom: { m: opts.m, strategy: "uniform", whiten: true },
        ridgeLambda: RIDGE,
      };
    } else {
      throw new Error(`unknown kind: ${kind}`);
    }

    const k = new KernelELM(cfg);
    const X = trainSet.map((s) => s.xy);
    const Y = trainSet.map((s) => oneHot(s.cls));
    const t0 = performance.now();
    k.fit(X, Y);
    const ms = performance.now() - t0;
    return { model: k, ms };
  }

  function evaluate(model) {
    const X = holdoutSet.map((s) => s.xy);
    const probs = model.predictProbaFromVectors(X);
    let correct = 0;
    for (let i = 0; i < holdoutSet.length; i++) {
      if (argmax(probs[i]) === holdoutSet[i].cls) correct++;
    }
    return correct / holdoutSet.length;
  }

  function computeBoundary(model) {
    const out = [];
    const cells = [];
    for (let r = 0; r < GRID_RES; r++) {
      for (let c = 0; c < GRID_RES; c++) {
        cells.push([(c + 0.5) / GRID_RES, 1 - (r + 0.5) / GRID_RES]);
      }
    }
    const probs = model.predictProbaFromVectors(cells);
    for (let r = 0; r < GRID_RES; r++) {
      const row = [];
      for (let c = 0; c < GRID_RES; c++) {
        const idx = r * GRID_RES + c;
        row.push(argmax(probs[idx]));
      }
      out.push(row);
    }
    return out;
  }

  // -------- Drawing --------
  function drawData() {
    const c = document.getElementById("dataCanvas");
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, c.width, c.height);
    for (const p of trainSet) {
      const px = p.xy[0] * c.width;
      const py = (1 - p.xy[1]) * c.height;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, 2 * Math.PI);
      ctx.fillStyle = p.cls === 0 ? "#ef4444" : "#3b82f6";
      ctx.fill();
    }
  }

  function drawBoundary() {
    const c = document.getElementById("boundaryCanvas");
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);

    if (!lastBoundary) {
      ctx.fillStyle = "#0b1220";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "12px ui-monospace, SFMono-Regular, Consolas, monospace";
      ctx.fillText("(train a model to see the boundary)", 30, c.height / 2);
      return;
    }

    const cellW = c.width / GRID_RES;
    const cellH = c.height / GRID_RES;
    for (let r = 0; r < GRID_RES; r++) {
      for (let col = 0; col < GRID_RES; col++) {
        const cls = lastBoundary[r][col];
        ctx.fillStyle = cls === 0 ? "rgba(239, 68, 68, 0.35)" : "rgba(59, 130, 246, 0.35)";
        ctx.fillRect(col * cellW, r * cellH, cellW + 0.5, cellH + 0.5);
      }
    }

    // Overlay training points so we can see them on top of the boundary.
    for (const p of trainSet) {
      const px = p.xy[0] * c.width;
      const py = (1 - p.xy[1]) * c.height;
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, 2 * Math.PI);
      ctx.fillStyle = p.cls === 0 ? "#fef2f2" : "#eff6ff";
      ctx.strokeStyle = p.cls === 0 ? "#7f1d1d" : "#1e3a8a";
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();
    }
  }

  function setStat(id, val, fmt, classify) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = val == null ? "—" : fmt(val);
    el.classList.remove("good", "warn", "bad");
    if (classify && val != null) classify(el, val);
  }

  function classifyAcc(el, v) {
    if (v >= 0.85) el.classList.add("good");
    else if (v >= 0.65) el.classList.add("warn");
    else el.classList.add("bad");
  }

  function renderStats(latest) {
    if (!latest) {
      setStat("statKind", null, () => "");
      setStat("statAcc", null, () => "");
      setStat("statMs", null, () => "");
      return;
    }
    setStat("statKind", latest.kind, (v) => v);
    setStat("statAcc", latest.acc, (v) => `${(v * 100).toFixed(0)}%`, classifyAcc);
    setStat("statMs", latest.ms, (v) => `${v.toFixed(1)}ms`);
  }

  function renderRuns() {
    const wrap = document.getElementById("runRows");
    if (!wrap) return;
    if (!runs.length) {
      wrap.innerHTML = `<div class="run-row" style="opacity:0.5;"><div>—</div><div>(no runs yet)</div><div>—</div><div>—</div></div>`;
      return;
    }
    wrap.innerHTML = runs
      .slice(-12)
      .reverse()
      .map(
        (r) => `
          <div class="run-row">
            <div>${r.kind}</div>
            <div>${r.params}</div>
            <div class="acc">${(r.acc * 100).toFixed(0)}%</div>
            <div>${r.ms.toFixed(1)}</div>
          </div>`,
      )
      .join("");
  }

  // -------- Wiring --------
  function trainAndRender(kind, params) {
    const opts = kind === "rbf-nystrom" ? { m } : {};
    const r = trainKernelELM(kind, opts);
    if (!r) return;
    const acc = evaluate(r.model);
    lastBoundary = computeBoundary(r.model);
    drawBoundary();
    const entry = { kind, params, acc, ms: r.ms };
    runs.push(entry);
    renderStats(entry);
    renderRuns();
  }

  function kernelDemo() {
    const root = document.getElementById("live-kernels");
    if (!root) return;
    if (root.dataset.bound === "1") return;
    root.dataset.bound = "1";

    rebuildData();
    drawData();
    drawBoundary(); // empty placeholder

    const mSlider = document.getElementById("mSlider");
    const mVal = document.getElementById("mVal");
    const mLabel = document.getElementById("mLabel");

    mSlider?.addEventListener("input", (e) => {
      m = parseInt(e.target.value, 10);
      mVal && (mVal.textContent = String(m));
      mLabel && (mLabel.textContent = String(m));
    });

    document.getElementById("trainLinearBtn")?.addEventListener("click", () => {
      trainAndRender("linear", "—");
    });
    document.getElementById("trainRbfBtn")?.addEventListener("click", () => {
      trainAndRender("rbf-exact", `γ=${GAMMA}`);
    });
    document.getElementById("trainNystromBtn")?.addEventListener("click", () => {
      trainAndRender("rbf-nystrom", `γ=${GAMMA}, m=${m}`);
    });
    document.getElementById("resampleBtn")?.addEventListener("click", () => {
      rebuildData();
      runs = [];
      drawData();
      drawBoundary();
      renderStats(null);
      renderRuns();
    });
  }

  window.Lesson.onSlide("live-kernels", kernelDemo);
})();
