// © 2026 AsterMind AI Co. – MIT License
/**
 * AsterMind Lesson Deck — Shared deck navigation
 * --------------------------------------------------
 * Reusable slide-deck logic for every lesson under examples/lessons/L*.
 *
 * Loads slides.json, renders nav, handles keyboard/button navigation, and
 * exposes a tiny API for live demos:
 *
 *   window.Lesson.onSlide(id, fn)   // run fn() each time slide `id` is shown
 *   window.Lesson.onLeaving(id, fn) // run fn() when leaving slide `id`
 *
 * Speaker notes live in a separate file (speaker-notes.js) and assign their
 * NOTES object to window.Notes; this deck reads from there if present.
 */

(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const handlers = { enter: {}, leave: {} };

  window.Lesson = {
    onSlide(id, fn) {
      (handlers.enter[id] ||= []).push(fn);
    },
    onLeaving(id, fn) {
      (handlers.leave[id] ||= []).push(fn);
    },
  };

  document.addEventListener("DOMContentLoaded", async () => {
    const prevBtn = $("#prevBtn");
    const nextBtn = $("#nextBtn");
    const slideLabel = $("#slideLabel");
    const notesToggle = $("#notesToggle");
    const progressBar = $("#progressBar");

    /* ---- Auto-inject "back to lessons" home link --------------------- */
    // Idempotent: only inserts if not already present in the markup.
    const navEl = $(".nav");
    if (navEl && !$(".home-link", navEl)) {
      const home = document.createElement("a");
      home.className = "home-link";
      home.href = "../";
      home.title = "Back to all lessons";
      home.textContent = "↩ Lessons";
      navEl.insertBefore(home, navEl.firstChild);
    }

    let SLIDE_META = [];
    try {
      const r = await fetch("./slides.json");
      if (r.ok) SLIDE_META = await r.json();
    } catch (_) {
      /* slides.json optional; deck still works from DOM order */
    }

    const slideEls = $$("section.slide");
    if (!slideEls.length) {
      console.warn("[lesson-deck] no .slide elements found");
      return;
    }

    // Order slides by SLIDE_META if provided; else use DOM order.
    const slides = SLIDE_META.length
      ? SLIDE_META.map((m) => slideEls.find((el) => el.id === m.id)).filter(Boolean)
      : slideEls;

    let idx = 0;

    /* ---- Notes injection ------------------------------------------- */
    function injectNotes() {
      const NOTES = window.Notes || {};
      slides.forEach((el) => {
        const meta = SLIDE_META.find((m) => m.id === el.id);
        const noteKey = (meta && meta.notes_id) || el.id;
        const note = NOTES[noteKey];
        if (!note || $(".notes", el)) return;

        const block = document.createElement("aside");
        block.className = "notes";
        const left = note.left ? `<div><h3>What to say</h3>${note.left}</div>` : "";
        const right = note.right ? `<div><h3>Talking cues</h3>${note.right}</div>` : "";
        block.innerHTML = `<div class="notes-grid">${left}${right}</div>`;
        el.appendChild(block);
      });
    }
    injectNotes();

    /* ---- Show / hide ----------------------------------------------- */
    function show(i) {
      const clamped = Math.max(0, Math.min(slides.length - 1, i));
      const leaving = slides[idx];
      const entering = slides[clamped];

      if (leaving && leaving !== entering) {
        leaving.classList.remove("active");
        (handlers.leave[leaving.id] || []).forEach((fn) => safe(fn));
      }
      entering.classList.add("active");
      (handlers.enter[entering.id] || []).forEach((fn) => safe(fn));

      idx = clamped;
      slideLabel && (slideLabel.textContent = `Slide ${idx + 1} / ${slides.length}`);
      if (progressBar) {
        progressBar.style.width = `${((idx + 1) / slides.length) * 100}%`;
      }
      prevBtn && (prevBtn.disabled = idx === 0);
      nextBtn && (nextBtn.disabled = idx === slides.length - 1);
    }

    function safe(fn) {
      try {
        fn();
      } catch (e) {
        console.error("[lesson-deck] handler error:", e);
      }
    }

    /* ---- Navigation ------------------------------------------------ */
    prevBtn?.addEventListener("click", () => show(idx - 1));
    nextBtn?.addEventListener("click", () => show(idx + 1));

    document.addEventListener("keydown", (e) => {
      if (e.target.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        show(idx + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        show(idx - 1);
      }
    });

    /* ---- Speaker notes toggle (persisted) -------------------------- */
    const NOTES_KEY = "lesson_show_notes";
    if (sessionStorage.getItem(NOTES_KEY) === "1") {
      document.body.classList.add("show-notes");
    }
    notesToggle?.addEventListener("click", () => {
      document.body.classList.toggle("show-notes");
      sessionStorage.setItem(
        NOTES_KEY,
        document.body.classList.contains("show-notes") ? "1" : "0",
      );
    });

    /* ---- Boot ------------------------------------------------------ */
    show(0);
  });
})();
