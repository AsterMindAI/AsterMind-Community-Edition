# ADR-0001 — Consolidate the repo and prepare it for interns

- **Status:** Proposed
- **Date:** 2026-05-04
- **Authors:** Julian Wilkison-Duran (with planning support from Claude)
- **Supersedes:** —
- **Superseded by:** —

## Context

AsterMind-Community v3.0.0 is a merger of four previously-separate packages — `astermind-elm`, `astermind-pro`, `astermind-premium`, `astermind-synthetic-data` — into one MIT-licensed release. The merger was useful (one place, free for everyone) but the codebase carries scars from being assembled quickly.

We're about to onboard interns who are **new to both machine learning and JavaScript**. Before they touch the repo, we owe them a codebase that doesn't punish them for not yet knowing what's load-bearing and what's scaffolding.

A focused audit of `src/` surfaced three concrete problems:

### 1. The 21 advanced ELM variants under `src/elm/` are scaffolding-quality

All 21 files (kebab-case, ~180–330 LOC each) follow an identical template: options interface → class → `train()` → `predict()` → defensive `(this.elm as any).method?.()` calls. Several of them claim sophisticated math that they don't actually implement:

- [`src/elm/quantum-inspired-elm.ts`](../../src/elm/quantum-inspired-elm.ts) has Hadamard-flavored math, but its "entanglement" step is `newState[i] = newState[i+1]` adjacent-pair swap — a permutation, not entanglement.
- [`src/elm/string-kernel-elm.ts`](../../src/elm/string-kernel-elm.ts) declares three kernel types (`ngram`/`subsequence`/`spectrum`); all three branches collapse to identical n-gram extraction.
- [`src/elm/graph-elm.ts`](../../src/elm/graph-elm.ts) uses hand-rolled neighbor aggregation rather than standard graph-convolution math.
- The remaining 18 are plausibly-shaped wrappers around the base ELM with naming dressing.

**Test coverage for the 21 variants is zero in TypeScript.** Two large `.js` test files (`tests/premium-elm-variants.test.js`, `tests/all-premium-elm-variants.test.js`) exist but they only verify *that the classes exist and can run* — they don't verify the math claimed in the names.

### 2. `src/pro/elm/` duplicates `src/elm/`

`src/pro/elm/` exposes 5 variants (`DeepELMPro`, `MultiKernelELM`, `MultiTaskELM`, `OnlineKernelELM`, `SparseELM`) that overlap conceptually with community variants. This is leftover from the four-package merge. Two surfaces, one purpose, no clear distinction.

### 3. The intern-facing surface is hostile

- The README is 661 lines, marketing-heavy, and front-loads the 21 variants as the headline.
- Documentation referenced from the README (`./QUICK-START-TUTORIAL.md`, `./DATA-REQUIREMENTS.md`) lives under `./docs/` — broken links.
- There's no `CONTRIBUTING.md`, no `GLOSSARY.md`, no `ARCHITECTURE.md`.
- No "start here" path for someone who's never trained a classifier before.

## Decision

We will:

1. **Remove `src/elm/` entirely** in the next minor release. Code is preserved in git history and on a permanent archive branch (`archive/v3.0-with-21-variants`); we can resurrect any specific variant later, properly, if it earns its place. We are not deleting the work — we are retiring it from the public API until it's hardened.

2. **Consolidate `src/pro/elm/`** by moving its surviving variants into `src/core/` (or a new `src/extensions/`) and deleting `src/pro/elm/`. The "Pro" naming was a marketing artifact; everything is free now, so the directory split serves no one.

3. **Treat the README as a teaching document, not a marketing page.** Rewrite it around three audiences (curious newcomer, intern starting the curriculum, integrator embedding the library) with explicit "start here" paths.

4. **Add three new top-level docs:**
   - `CONTRIBUTING.md` — how to set up, run tests, propose changes, and what's expected in a PR.
   - `GLOSSARY.md` — every ML term used in the repo, defined for someone who hasn't studied ML.
   - `ARCHITECTURE.md` — what lives where, how the pieces fit, and why.

5. **Reconcile the docs/ vs root mismatch** so every link in the README resolves.

6. **Establish a canonical lesson format** (see [ADR-0002](./ADR-0002-elm-explination-as-canonical-lesson-model.md)) so future intern-facing material has a consistent shape.

## Why this and not something else

We considered three alternatives:

**A. Keep the variants but mark them `experimental`.** Rejected. Newcomers don't read tags before they trip; they read auto-complete and trust what compiles. A class that exports cleanly and trains without errors will be used in production within a week of an intern landing on it.

**B. Add tests for all 21 variants and harden in place.** Rejected. Several variants don't implement the math their names imply. Writing tests for them just locks in the cosmetic behavior — we'd be testing that `string-kernel-elm`'s three kernel types behave identically, which is the bug, not the fix. Hardening properly means rewriting most of them, which is a research project, not a cleanup.

**C. Move them to a separate `@astermind/astermind-experimental` package.** Viable for the future. Parked, not rejected. If interns want to revive a specific variant with proper math + tests, that's the right home.

We chose the deletion path because the cost of keeping is paid every time someone new opens the repo, and the cost of removing is paid once.

## Consequences

### Positive

- The public API shrinks to what's actually load-bearing and tested.
- Interns land in a codebase where every exported class does what its name says.
- Maintenance surface drops by ~5,000 LOC.
- The README becomes honest about scope.
- Future variant work has a clear bar: "if you want this in the public API, here's the standard" (real math, real tests, real docs).

### Negative

- This is a **breaking change** for any external user importing from the variant exports. We bump to v3.1.0 (or v4.0.0 — see plan) and document loudly.
- Two `.js` integration tests under `tests/` need to be removed; this drops a (shallow) layer of "the build doesn't crash" coverage we'll need to replace with real unit tests on the core.
- Some of the variants have plausible educational value (HierarchicalELM, TimeSeriesELM, ForgettingOnlineELM) — those are candidates for **proper rewrites** in a future release, not lost forever.

### Neutral

- The README rewrite is significant work but has to happen for the intern program regardless.
- `docs/` and root link cleanup is unrelated to the variant question but bundled here because it's the same audience.

## Out of scope (for this ADR)

- Building the intern lesson curriculum itself — that's [ADR-0002](./ADR-0002-elm-explination-as-canonical-lesson-model.md).
- Hardening any specific variant for re-entry into the API.
- Performance work on the core (Matrix.ts, EmbeddingStore.ts).
- Publishing strategy for npm releases.
- Any change to OmegaSynth — it stays as-is for now.

## Validation / how we'll know it worked

- `npm run build` succeeds with no `src/elm/` references.
- `npm test` passes (vitest only; the JS variant tests are removed).
- A new intern can clone the repo, follow `README.md` → `CONTRIBUTING.md`, and run a working example within 15 minutes.
- Every link in the README resolves.
- `git log archive/v3.0-with-21-variants` shows the variants are recoverable.

## See also

- [Implementation Plan IMPL-0001](../implementation-plans/IMPL-0001-consolidate-repo-and-prepare-for-interns.md) — the step-by-step execution.
- [ADR-0002](./ADR-0002-elm-explination-as-canonical-lesson-model.md) — the lesson model that depends on this cleanup landing first.
