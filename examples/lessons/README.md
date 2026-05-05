# AsterMind Lessons

The intern (and self-taught learner) curriculum for AsterMind. Each lesson is a self-contained, runnable slide deck with live demos. Work through them in order.

> **New here?** Start with [Lesson L00 — ELM Primer](./L00-elm-primer/). Run `npm run dev:elm` from the repo root and click through.

> **Curriculum scope.** This is the **summer 2026 cohort curriculum** (L00–L06 + per-intern capstones), as defined in [ADR-0003](../../claude-markdown-documents/ADRs/ADR-0003-summer-2026-curriculum-structure.md). Lessons L07–L09 from the original IMPL-0002 hypothesis are deferred to a future cohort.

## Curriculum

> Status legend: ✅ shipped · 🚧 in progress · 🟡 planned

| # | Title | Status | Time | Concept |
|---|-------|--------|------|---------|
| [L00](./L00-elm-primer/) | ELM Primer | ✅ shipped | 45 min | What an ELM is and why it's clever |
| [L01](./L01-js-ts-in-this-repo/) | JavaScript & TypeScript in this repo | ✅ shipped | 45 min | Run tests, edit a line, ship a one-line PR |
| [L02](./L02-first-classifier/) | Your first classifier | ✅ shipped | 45 min | Train an `IntentClassifier`; reach ≥80% on a held-out set; export a snapshot |
| [L03](./L03-embeddings-similarity/) | Embeddings + similarity | ✅ shipped | 45 min | Encode text to vectors; query an `EmbeddingStore` by cosine; spot the lexical-vs-semantic limit |
| [L04](./L04-online-learning/) | Online learning with `OnlineELM` | ✅ shipped | 45 min | RLS + forgetting factor; live 2D streaming demo with concept drift (Thomas-lane required) |
| [L05](./L05-classification-confidence/) | Classification with confidence | ✅ shipped | 45 min | Threshold tuning + live precision/recall + confusion matrix on a binary support-ticket dataset (Jarrett-lane required) |
| L06 | Kernels and the Nyström approximation | 🟡 (Phase 1) | 60 min | RBF, Nyström, when kernels help (Nolan-lane primary) |

### Capstones (per-intern lanes)

| Lane | Owner | Library surface | Bar |
|------|-------|------------------|-----|
| [Adaptive Rock-Paper-Scissors](../capstones/thomas-adaptive-game/STARTER.md) | Thomas Addison | `OnlineELM` | ≥10 pp win-rate gain rounds 1–10 vs 21–30 |
| [LOTL command classifier](../capstones/jarrett-lotl-classifier/STARTER.md) | Jarrett Hartsoe | `FeatureCombinerELM` | ≥85% held-out accuracy on ≥30 commands |
| [Community infrastructure + RFF notebook](../capstones/nolan-infrastructure/STARTER.md) | Nolan Moore | tooling + writing | Three artifacts shipped (Discussions, PUBLISHING.md, NB-005) |

## How to run a lesson

Run a shipped lesson with its per-lesson script:

```bash
npm run dev:lesson:00       # L00 — ELM Primer (also: npm run dev:elm)
npm run dev:lesson:01       # L01 — JS/TS in this repo
npm run dev:lesson:02       # L02 — Your first classifier
npm run dev:lesson:03       # L03 — Embeddings + similarity
npm run dev:lesson:04       # L04 — Online learning
npm run dev:lesson:05       # L05 — Classification with confidence
npm run dev:lesson:template # the empty template (verify the deck infra)
```

Or use the generic script with a lesson directory:

```bash
LESSON_DIR=L02-first-classifier npm run dev:lesson
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

## Why these lessons exist (and how they're written)

- [ADR-0002 — elm-explination as the canonical lesson model](../../claude-markdown-documents/ADRs/ADR-0002-elm-explination-as-canonical-lesson-model.md) — lesson format and pedagogy (A-SMART + TSDR + Backward Design).
- [ADR-0003 — Summer 2026 curriculum structure](../../claude-markdown-documents/ADRs/ADR-0003-summer-2026-curriculum-structure.md) — why 7 lessons + 3 capstones (and not 10 sequential lessons).
- [IMPL-0003 — Execution plan](../../claude-markdown-documents/implementation-plans/IMPL-0003-summer-2026-curriculum-execution.md) — the 8-week calendar.
