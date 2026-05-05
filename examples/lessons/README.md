# AsterMind Lessons

The intern (and self-taught learner) curriculum for AsterMind. Each lesson is a self-contained, runnable slide deck with live demos. Work through them in order.

> **New here?** Start with **Lesson L00 — ELM Primer** as soon as it lands (currently being refactored from [`examples/elm-explination/`](../elm-explination/) per [IMPL-0002 Phase 1](../../claude-markdown-documents/implementation-plans/IMPL-0002-canonical-lesson-series.md)).

## Curriculum

> Status legend: ✅ shipped · 🚧 in progress · 🟡 planned

| # | Title | Status | Time | Concept |
|---|-------|--------|------|---------|
| L00 | ELM Primer | 🚧 (being refactored) | 45 min | What an ELM is and why it's clever |
| L01 | JavaScript & TypeScript for ML newcomers | 🟡 | 30 min | Just enough TS to read this codebase |
| L02 | Your first classifier | 🟡 | 45 min | Train, predict, evaluate |
| L03 | Embeddings — turning words into vectors | 🟡 | 45 min | What an embedding is, intuitively |
| L04 | Search with embeddings | 🟡 | 45 min | Cosine similarity, retrieval |
| L05 | When data keeps coming — Online ELM | 🟡 | 45 min | Streaming updates without retraining |
| L06 | The kernel trick — KernelELM | 🟡 | 60 min | Why kernels matter, Nyström intuition |
| L07 | Going deeper — DeepELM | 🟡 | 60 min | Stacking encoders |
| L08 | TF-IDF and hybrid retrieval | 🟡 | 45 min | Lexical + semantic search |
| L09 | Off the main thread — Web Workers | 🟡 | 45 min | Why training blocks the UI; how workers help |
| L10 | Build something real (capstone) | 🟡 | 1–3 hrs | Pick a template and ship |

## How to run a lesson

Once a lesson is shipped, run it with:

```bash
LESSON_DIR=L00-elm-primer npm run dev:lesson
```

Or use the per-lesson convenience script if one exists in `package.json`:

```bash
npm run dev:lesson:00
```

The deck opens at `http://localhost:5173`. Use the **Next / Back** buttons or arrow keys to navigate. Toggle **Notes** to see speaker notes alongside each slide.

## How to verify the template

The lesson template itself runs without any lesson-specific content:

```bash
npm run dev:lesson:template
```

If that works, the deck infrastructure is healthy. If it doesn't, something in [`_shared/`](./_shared/) is broken.

## How to add a new lesson

See the meta-instructions in [`_template/README.md`](./_template/README.md).

## Why these lessons exist

See [ADR-0002 — elm-explination as the canonical lesson model](../../claude-markdown-documents/ADRs/ADR-0002-elm-explination-as-canonical-lesson-model.md).
