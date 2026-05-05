// L02 — live demo
// ----------------------------------------------------------------------------
// One demo: classifierDemo. Wires the four-panel UI on slide `live-classifier`
// to a real IntentClassifier from window.astermind.
//
// State (clf, dataset, last accuracy snapshot) is held in the closure. The
// demo binds once; navigating away and back doesn't rewire.

(function () {
  // -------- Datasets --------
  const ENGLISH_TRAIN = [
    "hello", "hi there", "good morning", "hey friend", "what's up",
    "good evening", "morning", "howdy", "good day", "hiya",
  ];
  const FRENCH_TRAIN = [
    "bonjour", "salut", "bonne matinée", "comment ça va", "coucou",
    "bonsoir mon ami", "ça va", "bonne journée", "allô", "comment vas tu",
  ];
  const ENGLISH_HOLDOUT = ["good night", "hi friend", "hey there"];
  const FRENCH_HOLDOUT = ["bonne nuit", "salut ami", "bonjour ami"];

  const SPANISH_TRAIN = [
    "hola", "buenos días", "buenas tardes", "qué tal", "hola amigo",
    "buenas noches", "qué pasa", "saludos", "cómo estás", "buen día",
  ];
  const SPANISH_HOLDOUT = ["hola amiga", "buenas", "qué onda"];

  /** Build {text, label} array from raw lists. */
  function asExamples(list, label) {
    return list.map((text) => ({ text, label }));
  }

  /** Compute exact-match top-1 accuracy on a labelled set. */
  function accuracy(clf, examples) {
    if (!examples.length) return 0;
    let correct = 0;
    for (const { text, label } of examples) {
      const pred = clf.predict(text, 1);
      if (pred && pred[0] && pred[0].label === label) correct += 1;
    }
    return correct / examples.length;
  }

  // -------- Demo state --------
  let clf = null;
  let categories = ["english", "french"];
  let trainSet = [];
  let holdoutSet = [];
  let lastAcc = { train: null, holdout: null };
  let trainedAt = null;

  function buildClassifier() {
    const { IntentClassifier } = window.astermind || {};
    if (!IntentClassifier) {
      console.error("[L02] window.astermind.IntentClassifier missing — is /astermind.umd.js loaded?");
      return null;
    }
    return new IntentClassifier({
      categories,
      hiddenUnits: 32,
      useTokenizer: true,
      activation: "relu",
    });
  }

  function setAccCells(trainAcc, holdoutAcc) {
    const tEl = document.getElementById("trainAcc");
    const hEl = document.getElementById("holdoutAcc");
    if (tEl) {
      tEl.textContent = trainAcc == null ? "—" : `${(trainAcc * 100).toFixed(0)}%`;
      tEl.classList.toggle("good", trainAcc != null && trainAcc >= 0.8);
      tEl.classList.toggle("warn", trainAcc != null && trainAcc < 0.8);
    }
    if (hEl) {
      hEl.textContent = holdoutAcc == null ? "—" : `${(holdoutAcc * 100).toFixed(0)}%`;
      hEl.classList.toggle("good", holdoutAcc != null && holdoutAcc >= 0.8);
      hEl.classList.toggle("warn", holdoutAcc != null && holdoutAcc < 0.8);
    }
  }

  function renderPredictBars(predictions) {
    const wrap = document.getElementById("predBars");
    if (!wrap) return;
    if (!predictions || !predictions.length) {
      wrap.innerHTML = "";
      return;
    }
    wrap.innerHTML = predictions
      .map(
        (p) => `
        <div class="pred-bar">
          <div class="name">${p.label}</div>
          <div class="track"><div class="fill" style="width: ${(p.prob * 100).toFixed(1)}%"></div></div>
          <div class="pct">${(p.prob * 100).toFixed(1)}%</div>
        </div>`,
      )
      .join("");
  }

  function trainCurrent() {
    clf = buildClassifier();
    if (!clf) return;
    clf.train(trainSet);
    lastAcc.train = accuracy(clf, trainSet);
    lastAcc.holdout = accuracy(clf, holdoutSet);
    trainedAt = new Date().toISOString();
    setAccCells(lastAcc.train, lastAcc.holdout);
  }

  // -------- Wiring --------
  function classifierDemo() {
    const root = document.getElementById("live-classifier");
    if (!root) return;
    if (root.dataset.bound === "1") return;
    root.dataset.bound = "1";

    const trainBtn = document.getElementById("trainBtn");
    const trainStatus = document.getElementById("trainStatus");
    const addSpanishBtn = document.getElementById("addSpanishBtn");
    const spanishStatus = document.getElementById("spanishStatus");
    const predictInput = document.getElementById("predictInput");
    const exportBtn = document.getElementById("exportBtn");
    const jsonOut = document.getElementById("jsonOut");

    // Initial dataset (English + French only).
    trainSet = [
      ...asExamples(ENGLISH_TRAIN, "english"),
      ...asExamples(FRENCH_TRAIN, "french"),
    ];
    holdoutSet = [
      ...asExamples(ENGLISH_HOLDOUT, "english"),
      ...asExamples(FRENCH_HOLDOUT, "french"),
    ];

    trainBtn?.addEventListener("click", () => {
      const t0 = performance.now();
      trainCurrent();
      const ms = performance.now() - t0;
      if (trainStatus) trainStatus.textContent = `trained in ${ms.toFixed(0)}ms`;
      addSpanishBtn && (addSpanishBtn.disabled = false);
      predictInput && (predictInput.disabled = false);
      exportBtn && (exportBtn.disabled = false);
    });

    addSpanishBtn?.addEventListener("click", () => {
      categories = ["english", "french", "spanish"];
      trainSet = trainSet.concat(asExamples(SPANISH_TRAIN, "spanish"));
      holdoutSet = holdoutSet.concat(asExamples(SPANISH_HOLDOUT, "spanish"));
      const t0 = performance.now();
      trainCurrent();
      const ms = performance.now() - t0;
      if (spanishStatus) spanishStatus.textContent = `+10 train, +3 held-out, retrained in ${ms.toFixed(0)}ms`;
      addSpanishBtn.disabled = true;
    });

    predictInput?.addEventListener("input", () => {
      const text = predictInput.value.trim();
      if (!clf || !text) {
        renderPredictBars([]);
        return;
      }
      const top = clf.predict(text, categories.length);
      renderPredictBars(top);
    });

    exportBtn?.addEventListener("click", () => {
      const snapshot = {
        categories,
        trainingSet: trainSet,
        heldOutSet: holdoutSet,
        accuracy: {
          training: lastAcc.train,
          heldOut: lastAcc.holdout,
        },
        config: { hiddenUnits: 32, useTokenizer: true, activation: "relu" },
        trainedAt,
      };
      if (jsonOut) jsonOut.value = JSON.stringify(snapshot, null, 2);
    });
  }

  window.Lesson.onSlide("live-classifier", classifierDemo);
})();
