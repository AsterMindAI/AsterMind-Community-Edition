// L01 — live demos
// ----------------------------------------------------------------------------
// One demo: typeCheckDemo. The learner toggles between three values pushed
// into a string[] array; the page renders what tsc would say. We don't run
// tsc — we render hand-coded responses that match the *shape* of real tsc
// output. The point is the *moment* of seeing the error appear, not literal
// compiler bytes.

(function () {
  const RESPONSES = {
    bird: {
      slot: '"bird"',
      ok: true,
      message: "✔ tsc: no errors",
    },
    "42": {
      slot: "42",
      ok: false,
      message:
        "✗ tsc: TS2345\n  Argument of type 'number' is not assignable to\n  parameter of type 'string'.",
    },
    undefined: {
      slot: "undefined",
      ok: false,
      message:
        "✗ tsc: TS2345\n  Argument of type 'undefined' is not assignable to\n  parameter of type 'string'.",
    },
  };

  /**
   * typeCheckDemo — wires the three toggle buttons on slide `live-types`
   * to a fake-but-shape-accurate type-checker output box.
   *
   * Wired via slides.json `demo: "typeCheckDemo"` on slide `live-types`.
   */
  function typeCheckDemo() {
    const slot = document.getElementById("tcSlot");
    const output = document.getElementById("tcOutput");
    const buttons = document.querySelectorAll(".typecheck-row .toggle");
    if (!slot || !output || !buttons.length) return;

    // Avoid double-binding when navigating back to this slide.
    const root = document.getElementById("live-types");
    if (root && root.dataset.bound === "1") return;
    if (root) root.dataset.bound = "1";

    function setActive(key) {
      const r = RESPONSES[key];
      if (!r) return;
      slot.textContent = r.slot;
      output.textContent = r.message;
      output.classList.toggle("ok", r.ok);
      output.classList.toggle("err", !r.ok);
      buttons.forEach((b) => {
        b.classList.toggle("active", b.dataset.tc === key);
      });
    }

    buttons.forEach((b) => {
      b.addEventListener("click", () => setActive(b.dataset.tc));
    });

    setActive("bird"); // initial state
  }

  window.Lesson.onSlide("live-types", typeCheckDemo);
})();
