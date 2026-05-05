// Lesson template — live demos
// ----------------------------------------------------------------------------
// Each demo wires UI in this lesson's slides to behavior. Use the helpers
// exposed by the shared deck (window.Lesson.onSlide / onLeaving) to run code
// when a specific slide is shown. Keep demos small and self-contained — one
// concept per demo.

(function () {
  let count = 0;

  /**
   * helloDemo — the simplest possible live demo.
   * Wired to slide id "live-demo-example" via slides.json (`demo` field).
   */
  function helloDemo() {
    const button = document.getElementById("demoButton");
    const output = document.getElementById("demoOutput");
    if (!button || !output) return;

    // Avoid double-binding when the user navigates back to the slide.
    if (button.dataset.bound === "1") return;
    button.dataset.bound = "1";

    button.addEventListener("click", () => {
      count += 1;
      output.textContent = `You've clicked ${count} time${count === 1 ? "" : "s"}.`;
    });
  }

  // Run helloDemo when the live-demo-example slide is shown for the first time.
  window.Lesson.onSlide("live-demo-example", helloDemo);
})();
