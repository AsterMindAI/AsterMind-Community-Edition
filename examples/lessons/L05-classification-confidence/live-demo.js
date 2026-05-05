// L05 — live demo
// ----------------------------------------------------------------------------
// One demo: thresholdDemo. Wires the four-panel UI on slide `live-threshold`
// to a real IntentClassifier from window.astermind.
//
// Step 1: train, populate held-out grid with confidences.
// Step 2: threshold slider moves; precision/recall + confusion matrix update.
// Step 3: live predict input; shows confidence + accept/reject under current τ.
// Step 4: notes textarea (no validation; soft-enforce thinking).

(function () {
  // -------- Datasets --------
  const TRAIN_LOW = [
    "What's the price of the pro plan",
    "Is there a free trial available",
    "Where can I find the API documentation",
    "How do I change my email address",
    "Can I export my data to CSV",
    "Where is the user guide",
    "Question about my billing cycle",
    "How do I invite team members",
    "Where can I see invoice history",
    "What payment methods do you accept",
  ];
  const TRAIN_URGENT = [
    "Production database is completely down",
    "Customer data may have leaked",
    "All users locked out of the system",
    "Authentication system is broken",
    "Security breach detected",
    "Service is offline for everyone",
    "Data corruption in the production database",
    "Critical bug crashing the application",
    "Payment processing failed for all customers",
    "Site is returning 500 errors",
  ];

  const HOLDOUT = [
    { text: "How do I change my password", truth: "low" },
    { text: "Where is the help page",     truth: "low" },
    { text: "What's the difference between plans", truth: "low" },
    { text: "Can I add multiple users",   truth: "low" },
    { text: "Is the sale still on",       truth: "low" },
    { text: "Server has been down for hours now",  truth: "urgent" },
    { text: "Cannot login to anything at all",     truth: "urgent" },
    { text: "Database is returning errors everywhere", truth: "urgent" },
    { text: "API completely unresponsive across regions", truth: "urgent" },
    { text: "Customer info appearing in wrong account",   truth: "urgent" },
  ];

  // -------- State --------
  let clf = null;
  let holdoutPredictions = []; // [{ text, truth, predLabel, prob }]
  let threshold = 0.5;

  function buildAndTrain() {
    const { IntentClassifier } = window.astermind || {};
    if (!IntentClassifier) {
      console.error("[L05] window.astermind.IntentClassifier missing");
      return null;
    }
    const c = new IntentClassifier({
      categories: ["low", "urgent"],
      hiddenUnits: 32,
      useTokenizer: true,
      activation: "relu",
    });
    const train = [
      ...TRAIN_LOW.map((t) => ({ text: t, label: "low" })),
      ...TRAIN_URGENT.map((t) => ({ text: t, label: "urgent" })),
    ];
    c.train(train);
    return c;
  }

  function predictHoldout(c) {
    return HOLDOUT.map(({ text, truth }) => {
      const r = c.predict(text, 2);
      const top = r[0];
      return { text, truth, predLabel: top.label, prob: top.prob };
    });
  }

  /** With current threshold, what does each held-out row decide? */
  function decideAt(row, tau) {
    if (row.predLabel === "urgent" && row.prob >= tau) return "urgent";
    return "low";
  }

  function metricsAt(tau) {
    let tp = 0, fp = 0, tn = 0, fn = 0;
    for (const row of holdoutPredictions) {
      const decision = decideAt(row, tau);
      if (decision === "urgent" && row.truth === "urgent") tp++;
      else if (decision === "urgent" && row.truth === "low") fp++;
      else if (decision === "low" && row.truth === "low") tn++;
      else if (decision === "low" && row.truth === "urgent") fn++;
    }
    const precision = tp + fp === 0 ? null : tp / (tp + fp);
    const recall = tp + fn === 0 ? null : tp / (tp + fn);
    return { tp, fp, tn, fn, precision, recall };
  }

  // -------- Rendering --------
  function renderHoldout() {
    const out = document.getElementById("holdoutList");
    if (!out) return;
    if (!holdoutPredictions.length) {
      out.innerHTML = `<div class="subtle" style="padding: 0.5rem;">(click Train to populate)</div>`;
      return;
    }
    out.innerHTML = holdoutPredictions
      .map((row) => {
        const decision = decideAt(row, threshold);
        const correct = decision === row.truth;
        return `
          <div class="holdout-row ${correct ? "correct" : "incorrect"}">
            <div class="text" title="${escapeHtml(row.text)}">${escapeHtml(row.text)}</div>
            <div class="truth"><span class="badge ${row.truth}">${row.truth}</span></div>
            <div class="pred"><span class="badge ${row.predLabel}">${row.predLabel}</span></div>
            <div class="conf">${row.prob.toFixed(2)} <span class="${decision === "urgent" ? "accept" : "reject"}">[${decision === "urgent" ? "alert" : "drop"}]</span></div>
          </div>`;
      })
      .join("");
  }

  function renderMetrics() {
    const m = metricsAt(threshold);
    const set = (id, value, fmt) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value == null ? "—" : fmt(value);
    };
    set("precVal", m.precision, (v) => `${(v * 100).toFixed(0)}%`);
    set("recVal", m.recall, (v) => `${(v * 100).toFixed(0)}%`);
    set("tpVal", m.tp, String);
    set("fpVal", m.fp, String);
    set("tnVal", m.tn, String);
    set("fnVal", m.fn, String);

    const colorize = (id, v, goodAt) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.remove("good", "warn", "bad");
      if (v == null) return;
      if (v >= goodAt) el.classList.add("good");
      else if (v >= 0.5) el.classList.add("warn");
      else el.classList.add("bad");
    };
    colorize("precVal", m.precision, 0.85);
    colorize("recVal", m.recall, 0.5);
  }

  function renderLivePred() {
    const wrap = document.getElementById("livePred");
    const inp = document.getElementById("liveInput");
    if (!wrap || !inp) return;
    const text = inp.value.trim();
    if (!clf || !text) {
      wrap.innerHTML = "";
      return;
    }
    const r = clf.predict(text, 2);
    const top = r[0];
    const decision = top.label === "urgent" && top.prob >= threshold ? "alert" : "drop";
    const color = decision === "alert" ? "#22c55e" : "#6b7280";
    wrap.innerHTML = `
      <div>top label: <strong>${top.label}</strong> &nbsp; conf: <strong>${top.prob.toFixed(3)}</strong></div>
      <div>at τ=${threshold.toFixed(2)} → decision: <strong style="color: ${color}">${decision}</strong></div>
    `;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  // -------- Wiring --------
  function thresholdDemo() {
    const root = document.getElementById("live-threshold");
    if (!root) return;
    if (root.dataset.bound === "1") return;
    root.dataset.bound = "1";

    const trainBtn = document.getElementById("trainBtn");
    const trainStatus = document.getElementById("trainStatus");
    const slider = document.getElementById("thresholdSlider");
    const sliderVal = document.getElementById("thresholdVal");
    const liveInput = document.getElementById("liveInput");

    trainBtn?.addEventListener("click", () => {
      const t0 = performance.now();
      clf = buildAndTrain();
      if (!clf) return;
      holdoutPredictions = predictHoldout(clf);
      const ms = performance.now() - t0;
      if (trainStatus) trainStatus.textContent = `trained in ${ms.toFixed(0)}ms`;
      slider && (slider.disabled = false);
      liveInput && (liveInput.disabled = false);
      renderHoldout();
      renderMetrics();
    });

    slider?.addEventListener("input", (e) => {
      threshold = parseFloat(e.target.value);
      sliderVal && (sliderVal.textContent = threshold.toFixed(2));
      renderHoldout();
      renderMetrics();
      renderLivePred();
    });

    liveInput?.addEventListener("input", renderLivePred);
  }

  window.Lesson.onSlide("live-threshold", thresholdDemo);
})();
