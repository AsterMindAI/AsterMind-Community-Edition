// L04 — live demo
// ----------------------------------------------------------------------------
// One demo: streamDemo. A 2D-point streaming classification with OnlineELM.
// Two canvases:
//   1) scatterCanvas — the points falling, coloured by true class
//   2) accCanvas     — cumulative + recent-window accuracy over time
//
// Controls: Start, Pause, Flip boundary (concept drift), Reset, λ slider.

(function () {
  // -------- Config --------
  const SCATTER_PX = 320;
  const ACC_PX = 320;
  const RECENT_WINDOW = 20;
  const TICK_MS = 150;
  const SEED_BATCH = [
    { xy: [0.2, 0.7], cls: 0 }, // upper-left → class 0
    { xy: [0.3, 0.85], cls: 0 },
    { xy: [0.7, 0.2], cls: 1 }, // lower-right → class 1
    { xy: [0.85, 0.15], cls: 1 },
  ];

  // -------- State --------
  let model = null;
  let lambda = 1.0;
  let driftFlipped = false; // when true, true-label is inverted
  let timer = null;
  let totalSeen = 0;
  let predHistory = []; // {pred, actual} entries
  let scatterPoints = []; // {x, y, cls, predCls}
  let accSeries = []; // [{n, cumAcc, recentAcc}]

  // -------- Helpers --------
  function rng() {
    return Math.random();
  }

  /** Generate a synthetic 2D labelled sample. Boundary: y > x → class 0, else 1. */
  function sample() {
    const x = rng();
    const y = rng();
    let trueCls = y > x ? 0 : 1;
    if (driftFlipped) trueCls = 1 - trueCls;
    return { xy: [x, y], cls: trueCls };
  }

  function oneHot(cls) {
    return cls === 0 ? [1, 0] : [0, 1];
  }
  function argmax(probs) {
    return probs[0] >= probs[1] ? 0 : 1;
  }

  function buildModel() {
    const { OnlineELM } = window.astermind || {};
    if (!OnlineELM) {
      console.error("[L04] window.astermind.OnlineELM missing");
      return null;
    }
    const m = new OnlineELM({
      inputDim: 2,
      outputDim: 2,
      hiddenUnits: 16,
      forgettingFactor: lambda,
    });
    const X = SEED_BATCH.map((s) => s.xy);
    const Y = SEED_BATCH.map((s) => oneHot(s.cls));
    m.init(X, Y);
    return m;
  }

  // -------- Drawing --------
  function drawScatter() {
    const c = document.getElementById("scatterCanvas");
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    // Boundary line (y = x or 1-x if flipped)
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    if (driftFlipped) {
      ctx.moveTo(0, 0); ctx.lineTo(c.width, c.height);
    } else {
      ctx.moveTo(0, c.height); ctx.lineTo(c.width, 0);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Points (most recent 80)
    const window = scatterPoints.slice(-80);
    for (const p of window) {
      const px = p.x * c.width;
      const py = (1 - p.y) * c.height; // flip y for canvas (origin top-left)
      const correct = p.cls === p.predCls;
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, 2 * Math.PI);
      ctx.fillStyle = p.cls === 0 ? "#ef4444" : "#3b82f6"; // red / blue by true class
      ctx.fill();
      // Outline if predicted wrong
      if (!correct) {
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }

  function drawAcc() {
    const c = document.getElementById("accCanvas");
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);

    // Grid lines at 0.5 and 1.0
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    [0.5, 1.0].forEach((v) => {
      const yy = c.height - v * c.height;
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(c.width, yy);
      ctx.stroke();
    });

    if (!accSeries.length) return;

    const N = Math.max(50, accSeries.length);

    // Cumulative line (gray)
    ctx.strokeStyle = "#9ca3af";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    accSeries.forEach((p, i) => {
      const x = (p.n / N) * c.width;
      const y = c.height - p.cumAcc * c.height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Recent line (orange)
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    accSeries.forEach((p, i) => {
      const x = (p.n / N) * c.width;
      const y = c.height - p.recentAcc * c.height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  function updateStats() {
    const last = accSeries[accSeries.length - 1];
    const cum = last ? last.cumAcc : null;
    const rec = last ? last.recentAcc : null;
    const set = (id, val, fmt) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val == null ? "—" : fmt(val);
    };
    set("statN", totalSeen, (n) => String(n));
    set("statCum", cum, (v) => `${(v * 100).toFixed(1)}%`);
    set("statRecent", rec, (v) => `${(v * 100).toFixed(1)}%`);
    set("statLambda", lambda, (v) => v.toFixed(2));
  }

  // -------- Main loop --------
  function tick() {
    if (!model) return;
    const s = sample();

    // Predict before update — that's the "honest" online accuracy measure.
    const probs = model.predictProbaFromVectors([s.xy]);
    const predCls = argmax(probs[0]);
    predHistory.push({ pred: predCls, actual: s.cls });

    // Update with the labelled sample.
    model.update([s.xy], [oneHot(s.cls)]);

    // Track for visualization.
    scatterPoints.push({ x: s.xy[0], y: s.xy[1], cls: s.cls, predCls });
    totalSeen += 1;

    // Compute accuracies.
    const cum = predHistory.filter((h) => h.pred === h.actual).length / predHistory.length;
    const recentSlice = predHistory.slice(-RECENT_WINDOW);
    const rec = recentSlice.filter((h) => h.pred === h.actual).length / recentSlice.length;
    accSeries.push({ n: totalSeen, cumAcc: cum, recentAcc: rec });

    drawScatter();
    drawAcc();
    updateStats();
  }

  // -------- Wiring --------
  function streamDemo() {
    const root = document.getElementById("live-stream");
    if (!root) return;
    if (root.dataset.bound === "1") return;
    root.dataset.bound = "1";

    const startBtn = document.getElementById("startBtn");
    const pauseBtn = document.getElementById("pauseBtn");
    const flipBtn = document.getElementById("flipBtn");
    const resetBtn = document.getElementById("resetBtn");
    const lambdaSlider = document.getElementById("lambdaSlider");
    const lambdaVal = document.getElementById("lambdaVal");

    function reset() {
      stop();
      totalSeen = 0;
      predHistory = [];
      scatterPoints = [];
      accSeries = [];
      driftFlipped = false;
      model = buildModel();
      drawScatter();
      drawAcc();
      updateStats();
      flipBtn && (flipBtn.disabled = true);
      pauseBtn && (pauseBtn.disabled = true);
      startBtn && (startBtn.disabled = false);
    }

    function start() {
      if (!model) model = buildModel();
      if (timer) return;
      timer = setInterval(tick, TICK_MS);
      startBtn && (startBtn.disabled = true);
      pauseBtn && (pauseBtn.disabled = false);
      flipBtn && (flipBtn.disabled = false);
    }

    function stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      startBtn && (startBtn.disabled = false);
      pauseBtn && (pauseBtn.disabled = true);
    }

    startBtn?.addEventListener("click", start);
    pauseBtn?.addEventListener("click", stop);
    flipBtn?.addEventListener("click", () => {
      driftFlipped = !driftFlipped;
      // Visual marker — clear the "old world" points so the audience sees the boundary swap clearly.
      scatterPoints = [];
      drawScatter();
    });
    resetBtn?.addEventListener("click", reset);

    lambdaSlider?.addEventListener("input", (e) => {
      lambda = parseFloat(e.target.value);
      lambdaVal && (lambdaVal.textContent = lambda.toFixed(2));
      // Changing λ requires rebuilding the model — RLS state is tied to the factor.
      reset();
    });

    reset(); // initial paint
  }

  window.Lesson.onSlide("live-stream", streamDemo);
})();
