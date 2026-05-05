# NB-004 — Lesson curriculum design and L00 refactor

**Date:** 2026-05-04 to 2026-05-05
**Tags:** lessons, curriculum, template, L00, scaffolding
**Outcome:** Established the lesson template scaffold (IMPL-0002 P0), refactored the existing `examples/elm-explination/` slide deck into `examples/lessons/L00-elm-primer/` (IMPL-0002 P1), and set up the curriculum for L01–L10. The template is at [`examples/lessons/_template/`](../../examples/lessons/_template/); L00 is shipped; the path forward is documented.

---

## Question

Even after the v3.0.0 → v4.0.0 cleanup ([NB-003](./NB-003-v4-cleanup-chronicle.md)) made the codebase honest, *interns still need to learn the material*. The repo had:

- A working slide deck under `examples/elm-explination/` — 16 slides, real ELM intuition, live demos, speaker notes.
- A `examples/practical-examples/` directory of 5 working applications.
- No structured curriculum, no documented teaching format, no path from "what's a neuron" to "I shipped a demo."

How should the curriculum be structured? What form should each lesson take? And how do we avoid having every lesson reinvent the layout?

## Method

A two-layer plan, captured in [ADR-0002](../ADRs/ADR-0002-elm-explination-as-canonical-lesson-model.md) and [IMPL-0002](../implementation-plans/IMPL-0002-canonical-lesson-series.md):

- **Format layer** — canonise the existing `elm-explination` deck's shape (HTML + slides.json + JS demo + speaker notes + README) as the lesson template every L00–L10 follows.
- **Pedagogy layer** — adopt A-SMART learning outcomes + TSDR slide arc + Backward Design as the authoring conventions ([NB-002](./NB-002-smart-pedagogy-research.md)).

Execution proceeded in phases:

| IMPL-0002 phase | Scope | Status |
|----:|-------|--------|
| 0 | Build the template scaffold | ✅ |
| 1 | Refactor `elm-explination` → `L00-elm-primer` | ✅ |
| 2 | Lessons L01–L03 | ⏳ |
| 3 | Lessons L04–L09 | ⏳ |
| 4 | L10 capstone + curriculum index | ⏳ |
| 5 | Make it sustainable (CI guards, intern feedback) | ⏳ |

This notebook covers Phases 0 and 1 in narrative form. The remaining phases are referenced as future work.

---

## Phase 0 — the template scaffold

### What got built

- `examples/lessons/_shared/`
  - `lesson.css` (~210 lines) — design tokens, app shell, slide layout, demo + you-try blocks, speaker-notes panel, progress bar
  - `lesson-deck.js` (~110 lines) — slide nav (buttons + arrow keys), notes toggle (sessionStorage-persisted), `window.Lesson.onSlide(id, fn)` API for live demos to hook in, optional `slides.json` ordering with DOM-order fallback
  - `lessons-schema.json` — JSON Schema Draft-07 for `slides.json` (id, title, optional stage, body, demo, notes_id)
- `examples/lessons/_template/`
  - All five files (`index.html`, `slides.json`, `live-demo.js`, `speaker-notes.js`, `README.md`)
  - Three sample slides demonstrating the format
  - A working live demo (button counter) and an A-SMART-shaped you-try block
  - The README is itself the meta-lesson — copy-this-to-make-a-new-lesson instructions
- `examples/lessons/README.md` — curriculum index with status table for L00–L10
- `examples/lessons/index.html` — browser landing page (table of lessons with status)
- `tests/lessons-schema.test.ts` — auto-discovers every `examples/lessons/*/slides.json` and validates against the schema

### Bugs caught during the build

Two bugs surfaced when the template was first run in a browser. Both got fixed before Phase 0 was declared done:

1. **CSS path resolution.** The `<link href="../_shared/lesson.css">` in the template's `index.html` resolved to `http://localhost:5173/_shared/lesson.css` — but vite's serve root was `examples/lessons/_template/`, so the path went out of root and vite returned the SPA fallback HTML with `Content-Type: text/html`. The browser silently ignored the wrong-MIME response. **Curl returned 200**, which made the bug invisible to my smoke test.
   - **Fix:** moved vite root up to `examples/lessons/` so `../_shared/` resolves correctly. The npm scripts use `--open /<lesson-dir>/` to navigate to the specific lesson.
   - **Lesson:** for asset-loading bugs, *always* reproduce in the browser. Curl normalises differently and may silently mask the real failure.

2. **Script load order.** `lesson-deck.js` was loaded last in `index.html`, but it sets `window.Lesson` at module top-level. `live-demo.js` calls `window.Lesson.onSlide()` at top-level too, so it ran before the API was defined and threw `Cannot read properties of undefined (reading 'onSlide')`.
   - **Fix:** load `lesson-deck.js` first.
   - **Lesson:** scripts that establish a global API must be ordered before scripts that consume it. The template's `index.html` now has a comment explaining this so future lesson-authors don't reorder them.

---

## Phase 1 — L00 refactor

### What moved

```
examples/elm-explination/             → examples/lessons/L00-elm-primer/
  elm-demo.js                         →   live-demo.js  (renamed for template convention)
  index.html, slides.json,
  speaker-notes.js, elm-worker.js,
  images/                             →   (kept as-is)
```

All 30 files moved via `git mv`, preserving per-file history. `git log --follow examples/lessons/L00-elm-primer/live-demo.js` reaches back to the original `elm-demo.js` commits.

### A new README written

[`examples/lessons/L00-elm-primer/README.md`](../../examples/lessons/L00-elm-primer/README.md) was written as the meta-lesson:

- Three **A-SMART learning outcomes** (explain ELM math, run live demo, modify hyperparameters and observe changes)
- A **TSDR slide-arc map** of the existing 16 slides — Tell beats are the about/intro/backprop pain slides, Show beats are the city-grid/GPS/random-projection narrative, Do beats are the live training and prediction demos, Review beats wrap with the CTA
- Three concrete **You-Try exercises** (vary hidden units, change activation, scale ridge λ — observe what changes and why)
- Pointer to L01 as the next lesson in the curriculum

### The notable design choice — L00 stays bespoke

The IMPL-0002 plan called for "extracting the styling from `elm-explination/index.html` into a shared CSS file." After examining the file (893 lines of inline CSS), this was deliberately deferred:

- The original `elm-demo.js` is ~2,144 lines of slide-stage-specific behaviour (parallax, minimap, worker-driven live training, hidden-layer visualisations, custom slide layouts for the city-grid / GPS metaphors). The shared `lesson-deck.js` is ~110 lines and doesn't replicate any of it.
- The 893-line CSS contains slide-stage-specific styles (`.stage-grid`, `.stage-gps`, hero parallax) that are tied to the bespoke narrative. Migrating them to shared CSS would mean either generalising them away (losing what makes the primer good) or polluting the shared CSS with one-off styles.
- The visual storytelling of the primer is what makes it work. Forcing it onto a generic deck would be net-negative for learners.

**Decision:** L00 stays bespoke. Future lessons (L01+) use the shared scaffold. The L00 README documents this explicitly in a "Lesson format note" section so authors don't get confused about which template to copy.

### Verification

- `npm run dev:elm` (and the equivalent `npm run dev:lesson:00`) opens L00 at `http://localhost:5173/L00-elm-primer/`. All 5 assets (live-demo.js, speaker-notes.js, elm-worker.js, slides.json, images) load 200.
- Curriculum landing at `/` still works.
- `npx vitest run`: **106/106 across 17 files** (was 105/105 — the auto-discovering schema test picked up `L00-elm-primer/slides.json` and validated cleanly).

### Side effects

- `package.json` scripts: `dev:elm` rewired to point at the new path; new `dev:lesson:00` alias added.
- `ARCHITECTURE.md`: removed the standalone `elm-explination/` line from the repo-tree diagram.
- `examples/lessons/README.md` (curriculum index): L00 status flipped 🚧 → ✅ shipped.
- `examples/lessons/index.html` (browser landing): same status flip.
- `.gitignore`: added `.claude/` (claude harness state) and `.DS_Store` (macOS noise) so future renames don't drag them in. Discovered when `git add -A` accidentally staged both during the L00 commit.

---

## What surprised us

1. **The lesson template's design pressure was greater than expected.** Building a scaffold that's *both* a working demo (so authors can copy it) *and* a meta-lesson (so authors learn how to use it) meant rewriting the `_template/README.md` four or five times. The version that shipped models the A-SMART + TSDR pedagogy *while explaining what those terms mean* in line. It's a teaching artefact about teaching.

2. **`git mv` on a directory does the right thing.** A single `git mv examples/elm-explination examples/lessons/L00-elm-primer` moved 30 files at once and preserved history per file. No loops, no manual juggling. Worth knowing for future big restructurings.

3. **Auto-discovering tests is a high-leverage pattern.** `tests/lessons-schema.test.ts` discovers every lesson and validates its `slides.json` without requiring per-lesson test files. New lessons get coverage for free. The same pattern could be extended to validate other lesson contracts (README has A-SMART outcomes, slide IDs match between HTML and JSON, etc.) — see "Open questions" below.

4. **Bespoke can be the right answer.** The original instinct was to migrate L00's CSS and JS to the shared scaffold. After reading the actual files, the right call was to leave them alone. *The template is a default, not a mandate.* This needed to be documented (in the L00 README's format note) because the template's existence is a tacit pressure to conform.

---

## Curriculum status (2026-05-05)

| # | Title | Status | Time | Concept |
|---|-------|--------|------|---------|
| **L00** | **ELM Primer** | **✅ shipped** | 45 min | What an ELM is and why it's clever |
| L01 | JavaScript & TypeScript for ML newcomers | 🟡 planned | 30 min | Just enough TS to read this codebase |
| L02 | Your first classifier | 🟡 planned | 45 min | Train, predict, evaluate |
| L03 | Embeddings — turning words into vectors | 🟡 planned | 45 min | What an embedding is, intuitively |
| L04 | Search with embeddings | 🟡 planned | 45 min | Cosine similarity, retrieval |
| L05 | When data keeps coming — Online ELM | 🟡 planned | 45 min | Streaming updates without retraining |
| L06 | The kernel trick — KernelELM | 🟡 planned | 60 min | Why kernels matter, Nyström intuition |
| L07 | Going deeper — DeepELM | 🟡 planned | 60 min | Stacking encoders |
| L08 | TF-IDF and hybrid retrieval | 🟡 planned | 45 min | Lexical + semantic search |
| L09 | Off the main thread — Web Workers | 🟡 planned | 45 min | Why training blocks UI; how workers help |
| L10 | Build something real (capstone) | 🟡 planned | 1–3 hrs | Pick a template and ship |

---

## Open questions / future work

- **Pedagogy enforcement.** The schema validator only checks `slides.json` shape. Extending it to lint lesson README files (e.g. require an "## Outcomes" heading with at least one A-SMART-shaped bullet, reject "*understand*"/"be familiar with*" verbs) would make the convention machine-enforced — see [NB-002](./NB-002-smart-pedagogy-research.md) for the rationale.

- **Co-authoring with interns.** IMPL-0002 anticipates that L04+ get drafted by interns, with the L00–L03 sequence written by the project owner. The handoff hasn't happened yet; when it does, the template's clarity will get its real test.

- **Cross-lesson coherence.** Each lesson has its own A-SMART outcomes; the curriculum-level outcome (a learner finishing L00–L10 can ship a real demo to the capstone) isn't yet specified as a measurable outcome. The L10 capstone is meant to be that, but the assessment criteria need definition.

- **The L00 bespoke / shared distinction.** L00 uses none of the shared scaffold; the template uses all of it. If future lessons need to fall somewhere in between (e.g., L06 wants the shared deck nav but custom CSS for kernel visualisations), where does that line get drawn? Worth revisiting once L01–L03 are done and the friction shows.

- **Lesson distribution.** The lessons are version-controlled but not yet hosted as a static site. Publishing to GitHub Pages would let the curriculum URL live independently of `localhost:5173`. Not blocking; flag for after L03.

---

## See also

- [ADR-0002](../ADRs/ADR-0002-elm-explination-as-canonical-lesson-model.md) — the decision to canonise the lesson model.
- [IMPL-0002](../implementation-plans/IMPL-0002-canonical-lesson-series.md) — the plan.
- [NB-002 — SMART pedagogy research](./NB-002-smart-pedagogy-research.md) — the literature work that informed the conventions.
- [`examples/lessons/_template/README.md`](../../examples/lessons/_template/README.md) — the meta-lesson.
- [`examples/lessons/L00-elm-primer/README.md`](../../examples/lessons/L00-elm-primer/README.md) — the first real application.
