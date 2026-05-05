// L03 — live demo
// ----------------------------------------------------------------------------
// One demo: similarityDemo. Wires the three-panel UI on slide `live-similarity`
// to a real UniversalEncoder + EmbeddingStore from window.astermind.
//
// Step 1: clicking a phrase chip encodes it and renders the first 16 dims.
// Step 2: typing in the search input encodes the query and shows top-3 by cosine.
// Step 3: free-form observation textarea + word counter.

(function () {
  const CORPUS = [
    { id: "g1", text: "hello there", lang: "en" },
    { id: "g2", text: "good morning", lang: "en" },
    { id: "g3", text: "good evening", lang: "en" },
    { id: "g4", text: "hi friend", lang: "en" },
    { id: "g5", text: "bonjour mon ami", lang: "fr" },
    { id: "g6", text: "salut tout le monde", lang: "fr" },
    { id: "g7", text: "comment ça va", lang: "fr" },
    { id: "g8", text: "bonne journée", lang: "fr" },
    { id: "g9", text: "hola amigo", lang: "es" },
    { id: "g10", text: "buenos días", lang: "es" },
  ];

  let encoder = null;
  let store = null;

  function buildEncoderAndStore() {
    const { UniversalEncoder, EmbeddingStore } = window.astermind || {};
    if (!UniversalEncoder || !EmbeddingStore) {
      console.error("[L03] window.astermind missing UniversalEncoder/EmbeddingStore");
      return false;
    }
    encoder = new UniversalEncoder({
      mode: "char",
      charSet: "abcdefghijklmnopqrstuvwxyzáéíóúçâêîôûàèùëïü ",
      maxLen: 30,
    });
    store = new EmbeddingStore(encoder.getVectorSize());
    for (const item of CORPUS) {
      store.add({
        id: item.id,
        vec: encoder.encode(item.text),
        meta: { text: item.text, lang: item.lang },
      });
    }
    return true;
  }

  function renderChips(container) {
    container.innerHTML = "";
    for (const item of CORPUS) {
      const btn = document.createElement("button");
      btn.className = "phrase-chip";
      btn.textContent = item.text;
      btn.dataset.id = item.id;
      btn.addEventListener("click", () => onChipClick(item, btn, container));
      container.appendChild(btn);
    }
  }

  function onChipClick(item, btn, container) {
    Array.from(container.children).forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    if (!encoder) return;
    const vec = encoder.encode(item.text);
    renderVecBars(item.text, vec);
  }

  function renderVecBars(label, vec) {
    const dimLabel = document.getElementById("vecDimLabel");
    const bars = document.getElementById("vecBars");
    if (!dimLabel || !bars) return;

    dimLabel.textContent = `"${label}" → vector of length ${vec.length} (showing first 16):`;

    const slice = vec.slice(0, 16);
    const max = Math.max(...slice, 0.001);
    bars.innerHTML = slice
      .map((v) => {
        const h = Math.max(2, (v / max) * 76);
        return `<div class="vec-bar" style="height: ${h}px" title="${v.toFixed(3)}"></div>`;
      })
      .join("");
  }

  function renderResults(query) {
    const out = document.getElementById("searchResults");
    if (!out) return;
    if (!query.trim() || !encoder || !store) {
      out.innerHTML = "";
      return;
    }
    const qVec = encoder.encode(query);
    let hits;
    try {
      hits = store.query(qVec, 3, { metric: "cosine" });
    } catch (e) {
      console.error("[L03] query failed:", e);
      out.innerHTML = "";
      return;
    }

    out.innerHTML = hits
      .map((hit, i) => {
        const text = (hit.meta && hit.meta.text) || hit.id;
        const score = typeof hit.score === "number" ? hit.score : 0;
        const pct = Math.max(0, Math.min(1, score)) * 100;
        return `
          <div class="result-row">
            <div class="rank">#${i + 1}</div>
            <div class="text">${escapeHtml(text)}</div>
            <div class="bar-track"><div class="bar-fill" style="width: ${pct}%"></div></div>
            <div class="score">${score.toFixed(3)}</div>
          </div>`;
      })
      .join("");
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function wireObserveArea() {
    const ta = document.getElementById("observeArea");
    const wc = document.getElementById("wordCount");
    if (!ta || !wc) return;
    ta.addEventListener("input", () => {
      const words = ta.value.trim().split(/\s+/).filter(Boolean).length;
      wc.textContent = `${words} word${words === 1 ? "" : "s"} (need ≥15)`;
      wc.classList.toggle("good", words >= 15);
    });
  }

  function similarityDemo() {
    const root = document.getElementById("live-similarity");
    if (!root) return;
    if (root.dataset.bound === "1") return;
    root.dataset.bound = "1";

    if (!buildEncoderAndStore()) return;

    const chipsRoot = document.getElementById("phraseChips");
    if (chipsRoot) renderChips(chipsRoot);

    const searchInput = document.getElementById("searchInput");
    searchInput?.addEventListener("input", (e) => renderResults(e.target.value));

    wireObserveArea();
  }

  window.Lesson.onSlide("live-similarity", similarityDemo);
})();
