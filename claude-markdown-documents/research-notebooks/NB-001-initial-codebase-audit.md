# NB-001 — Initial codebase audit (v3.0.0)

**Date:** 2026-05-04
**Tags:** audit, scaffolding, dependencies, scope-discovery
**Outcome:** Established that the `src/elm/` (21 variants) and `src/pro/elm/` (5 variants) surfaces were untested ChatGPT-shaped scaffolding, that the dependency tree had 23 known CVEs all coming from research-only devDeps, and that the README's claims diverged sharply from what the code actually did. Findings shaped [ADR-0001](../ADRs/ADR-0001-consolidate-repo-and-prepare-for-interns.md) and the six-phase IMPL-0001 plan.

---

## Question

The owner inherited his own codebase after a v3.0 consolidation merger that bundled four previously-separate AsterMind packages — ELM, Pro, Premium, Synth — into one MIT release. He asked: *"Get a really good context of this code. A lot of it I wrote when I was still learning ML, with ChatGPT's help. I want to know what is actually here because I'm going to have interns work on this repo."*

Translated: a fresh, honest audit, with the lens of *"is this safe for new ML/JS engineers to land on?"*

## Method

1. Top-level survey: `git log`, `package.json`, `README.md`, full src/ tree, file-type counts.
2. Dispatched an `Explore` subagent with a structured brief to map every directory and identify scaffolding-quality patterns.
3. Spot-verified the agent's most damaging claims by reading the flagged files directly (Quantum-Inspired ELM, String Kernel ELM).
4. Cross-checked README claims against `src/index.ts` exports.
5. Catalogued all references to retired-package names and license-token strings.

## What was found

### A. Surface metrics

- 129 TypeScript files, ~12,500 LOC across `src/`.
- Public API exports re-routed through `src/index.ts` via `export *` from `elm/`, `pro/`, `synth/`.
- Build: rollup → ESM/UMD; tsc → declarations. No runtime dependencies — the package is self-contained.
- Tests: 9 vitest files (~600 LOC), covering only utilities (Activations, Matrix, Tokenizer, IO, etc.) plus one integration test in `practical-examples.test.ts`. **Zero coverage** for the 21 variants, the 5 pro variants, OmegaSynth, or any of the 9 task wrappers.

### B. The 21 advanced ELM variants under `src/elm/`

All 21 followed an identical template: options interface → class → `train()` → `predict()` → defensive `(this.elm as any).method?.()` calls. The defensive optional-chaining suggested copy-paste from a template where the parent class API was unstable.

Several variants declared sophisticated math their code didn't actually do:

- **`quantum-inspired-elm.ts`** — DOES contain real Hadamard-flavored math (a simplified O(n²) Hadamard transform, rotation gates), but the "entanglement" step is `newState[i] = newState[i+1]` adjacent-pair swap. That's a permutation, not entanglement. The marketing language overstates the rigor.
- **`string-kernel-elm.ts`** — declares three kernel types (`ngram`, `subsequence`, `spectrum`); all three branches collapse to identical n-gram extraction. Passing `kernelType: 'spectrum'` does nothing different from `'ngram'`.
- **`graph-elm.ts`** — claims "graph convolution operations" but uses hand-rolled neighbor aggregation rather than standard GCN math (no learned aggregation weights, no spectral or spatial convolution).
- **`fuzzy-elm.ts`** and others likely similar (not all individually verified).

**Test coverage in TypeScript: zero.** Two large `.js` integration test files (`tests/premium-elm-variants.test.js`, `tests/all-premium-elm-variants.test.js`) existed, but they only verified *that the classes existed and could run* — they didn't verify the math the names claimed. Testing them would have locked in the cosmetic behavior.

### C. `src/pro/elm/` duplicates `src/elm/`

Five "Pro" variants (`DeepELMPro`, `MultiKernelELM`, `MultiTaskELM`, `OnlineKernelELM`, `SparseELM`) — leftover from the four-package merge. Some genuinely distinct from core (multi-task heads, online + kernel combo, L1 sparsity); some thin wraps of `DeepELM`. Zero consumers anywhere. Same `// License removed` and `// Premium feature - requires valid license` comments as Tim's other residue (see below).

### D. Tim's license-token residue

Three OmegaSynth example files under `src/synth/examples/` carried partially-removed license-token checks:

- `quickstart.ts`
- `trainELMFromSynth.ts`
- `evaluateGeneratedData.ts`

Two of the three had **literally broken syntax** from the partial removal: `if (...) {\n    await   }` — an `await` with nothing after it. The files were excluded from the rollup build path (`src/**/examples/**`), so the bug never surfaced; but anyone opening them would hit it immediately.

`trainELMFromSynth.ts` also had `import { ELM } from "../../core/ELM.js"';` — a stray trailing single quote ending the import line, parser-fatal if the file were ever compiled.

The same file had six `require('@astermind/astermind-elm')` calls referencing the deprecated standalone package, which wasn't even in `package.json` anymore.

### E. README divergence

The README front-loaded the 21 variants as the headline feature. Of the documented links:

- `./QUICK-START-TUTORIAL.md` (404 — file is at `./docs/QUICK-START-TUTORIAL.md`)
- `./DATA-REQUIREMENTS.md` (404 — same pattern)
- `./LEGAL.md` (404 — same)
- `./docs/MIGRATION-FROM-ELM.md` (404 — file didn't exist anywhere)

Three of the four were path errors after the merger; the fourth was an aspirational link to a doc never written.

### F. Dependency vulnerabilities

`npm audit` reported 23 vulnerabilities (7 critical, 10 high, 4 moderate, 2 low). Root causes traced:

- **`@xenova/transformers`** (CRITICAL × 4) — drag chain via `onnxruntime-web` → `onnx-proto` → `protobufjs`. Used only in 3 SBERT-comparison experiment files in `node_examples/`.
- **`tsne-js`** (HIGH × multiple) — drag chain via `cwise`, `ndarray-unpack`, `quote-stream`, `static-module`, `static-eval`, `minimist`. **Zero usages** in the entire repo.
- **`rollup`, `vite`** (HIGH) — patchable by version bump.
- Six other devDeps (`plotly.js-dist`, `ml-pca`, `ml-matrix`, `umap-js`, `yargs`, `@types/yargs`) — also zero usages.

Crucially: **runtime `dependencies: {}` was empty** — every CVE was dev-side. Users installing the published npm package were unexposed; only the repo itself flagged in dependabot.

## What surprised us

1. **Honest math hidden behind cosmetic naming.** `quantum-inspired-elm.ts` had real math (rotations, simplified Hadamard) but the "entanglement" was a permutation. So it wasn't pure scaffolding — it was scaffolding *with real math nailed onto the wrong concepts*. Distinguishing those failure modes mattered for the deletion vs. hardening decision.

2. **Six dependencies drove zero imports.** `plotly.js-dist`, `ml-pca`, `ml-matrix`, `tsne-js`, `umap-js`, `yargs` — `grep -rn` returned zero matches across the entire repo. They were likely added during early experimentation and never removed. Catching dead deps with simple grep should be in every PR-template's checklist.

3. **The duplicate `src/pro/elm/` had genuinely-distinct code in places.** `MultiTaskELM`, `OnlineKernelELM`, `SparseELM` weren't drop-in duplicates of core — they implemented new things (multi-task heads, online + kernel combo, L1 sparsity). The decision to delete them anyway came down to *zero consumers + zero tests + same license-residue smell as the 21*. The bar for "is this in the public API?" should never be "this code does something different."

4. **`grep -rln` and the WHATWG URL spec disagreed about whether the CSS was reachable.** During the lesson-template debugging later, my smoke test `curl http://localhost:5173/../_shared/lesson.css` returned 200, suggesting the CSS was served. But the browser, applying URL normalization, requested `/_shared/lesson.css` (the `..` consumed against root), and vite returned the SPA fallback HTML with `Content-Type: text/html`. The 200 was misleading; the path-relative `<link href="../_shared/lesson.css">` was broken in browsers. Lesson: **always reproduce in the browser, not curl, for asset-loading bugs**.

## Decisions taken (links out)

- **[ADR-0001](../ADRs/ADR-0001-consolidate-repo-and-prepare-for-interns.md)** — retire the 21 + 5 variants, reconcile docs, prepare for interns.
- **[ADR-0002](../ADRs/ADR-0002-elm-explination-as-canonical-lesson-model.md)** — canonise `examples/elm-explination/` as the lesson model.
- **[IMPL-0001](../implementation-plans/IMPL-0001-consolidate-repo-and-prepare-for-interns.md)** — six-phase execution plan.
- **[IMPL-0002](../implementation-plans/IMPL-0002-canonical-lesson-series.md)** — lesson curriculum + template scaffold.

## Open questions / future work

- **Are any of the 21 variants worth hardening for re-entry?** The audit flagged `HierarchicalELM`, `TimeSeriesELM`, and `ForgettingOnlineELM` as having plausible distinct value if rewritten properly. [GitHub issue #4](https://github.com/AsterMindAI/AsterMind-Community-Edition/issues/4) tracks the roadmap. The four-rule bar in `CONTRIBUTING.md` (real math + real tests + ADR + example) gates re-entry.
- **Should `src/synth/examples/` be excluded from the published package altogether?** Currently they're in TS but rollup excludes them. They're orphaned reference material — nobody imports them, nobody tests them. Either lift them into proper `node_examples/` scripts or delete them; this notebook didn't make a recommendation.
- **What's the right metric for "intern-readiness"?** The cleanup proceeded on intuition — every footgun removed, every link working. A formal benchmark (e.g., "a new intern can ship a PR within 2 weeks") would be helpful for the next major refactor.

## See also

- [docs/HISTORY.md](../../docs/HISTORY.md) — formal retirement record with audit tables.
- [NB-003 — v4 cleanup chronicle](./NB-003-v4-cleanup-chronicle.md) — the execution narrative.
