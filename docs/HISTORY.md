# AsterMind-Community — Project History

This document records what's been retired, where to find it, and why. It exists so that nobody — including future-Julian — has to spelunk through git logs to recover something that used to be here.

For active project decisions, see [`claude-markdown-documents/ADRs/`](../claude-markdown-documents/ADRs/).

---

## Retired surfaces

### v3.0.0 → v4.0.0 — The 21 advanced ELM variants

**Retired:** 2026-05 (in flight as of this writing)

**What was removed:** The 21 advanced ELM variants that lived under `src/elm/`:

- `adaptive-online-elm`, `forgetting-online-elm`
- `hierarchical-elm`, `attention-enhanced-elm`, `variational-elm`
- `time-series-elm`, `transfer-learning-elm`
- `graph-elm`, `graph-kernel-elm`
- `adaptive-kernel-elm`, `sparse-kernel-elm`, `ensemble-kernel-elm`, `deep-kernel-elm`, `robust-kernel-elm`
- `elm-kelm-cascade`
- `string-kernel-elm`, `convolutional-elm`, `recurrent-elm`
- `fuzzy-elm`, `quantum-inspired-elm`, `tensor-kernel-elm`

Plus their two `.js` integration test files under `tests/` (`premium-elm-variants.test.js`, `all-premium-elm-variants.test.js`).

**Why retired:** They were ChatGPT-shaped scaffolds — plausible interfaces, loose implementations. Several declared math their code didn't actually do (e.g., `string-kernel-elm`'s three "kernel types" all ran the same n-gram code path; `quantum-inspired-elm`'s "entanglement" was an adjacent-pair swap). Zero unit-test coverage in TypeScript. Hostile surface for new ML/JS interns who would trust class names.

Full reasoning in [ADR-0001 — Consolidate the repo and prepare it for interns](../claude-markdown-documents/ADRs/ADR-0001-consolidate-repo-and-prepare-for-interns.md).

**How to recover:**

| Recovery method | Use when |
|-----------------|----------|
| Tag `v3.0-with-variants` | You want a specific file from the v3.0 state — checkout the tag, copy what you need. |
| Branch `archive/v3.0-with-21-variants` (origin) | You want to develop on top of the variant code in isolation. |
| `git log src/elm/<name>.ts` (on archive branch) | You want the full edit history of one variant. |

```bash
# Inspect the v3.0 state without modifying main:
git checkout v3.0-with-variants

# Or check out the archive branch to work on it:
git checkout archive/v3.0-with-21-variants

# Or pull a single file out at the archive point without leaving main:
git checkout archive/v3.0-with-21-variants -- src/elm/hierarchical-elm.ts
```

**Path back into the API:**

A retired variant returns to the public API only if all three of these are true:

1. It implements the math its name implies (no cosmetic naming).
2. It has unit tests that exercise that math, not just smoke-test "the class can be constructed."
3. It has a short ADR justifying its inclusion (what does this offer that core ELM/KernelELM/OnlineELM/DeepELM doesn't?).

Candidates worth considering for a hardened return: `HierarchicalELM`, `TimeSeriesELM`, `ForgettingOnlineELM`. These have plausible distinct value if rewritten properly. Others may belong in a separate `@astermind/astermind-experimental` package, or stay archived.

---

### v3.0.0 → v4.0.0 — SBERT comparison experiments

**Retired:** 2026-05-05

**What was removed:**

- [`node_examples/agnews-two-stage-retrieval.ts`](../node_examples/) — used SBERT for two-stage retrieval over AG News
- [`node_examples/experiments/agnews-deepelm-on-sbert-grid.ts`](../node_examples/experiments/) — grid search with SBERT embeddings
- [`node_examples/experiments/agnews-elm-distill-sbert.ts`](../node_examples/experiments/) — ELM distillation from SBERT
- The `@xenova/transformers` dependency from [`node_examples/package.json`](../node_examples/package.json)

**Why retired:** All three files imported `pipeline` from `@xenova/transformers` to compute Sentence-BERT embeddings as a benchmark against ELM-based retrieval. The package dragged in `onnxruntime-web` → `onnx-proto` → `protobufjs`, all of which carried **CRITICAL**-severity CVEs. There is no v3+ of `@xenova/transformers` on npm (the project was renamed to `@huggingface/transformers`). Migrating would have been a non-trivial API change with no payoff for this repo's mission.

This is an ELM library; SBERT comparison is research, not lesson material or library feature. The other node_examples (`book-index-elm-tfidf`, `deepelm-kelm-retrieval`, `tfidf-elm-dense-retrieval`, plus `experiments/agnews-tfidf-elm-distillation`, `experiments/multiview-encoder-elm-fusion`, `experiments/weighted_hybrid_residual_rrf`) do not depend on transformers and remain.

**How to recover:** Tag `v3.0-with-variants` and branch `archive/v3.0-with-21-variants` preserve all three files. If a future SBERT comparison is genuinely needed, do it in a separate research repo using the maintained `@huggingface/transformers` v4+.

---

### v3.0.0 → v4.0.0 — The 5 src/pro/elm/ "Pro" variants

**Retired:** 2026-05-05 (IMPL-0001 Phase 2)

**What was removed:** All five "Pro" variants under `src/pro/elm/`:

- `deep-elm-pro.ts` (263 LOC) — claimed enhanced `DeepELM`
- `multi-kernel-elm.ts` (244 LOC) — multi-kernel mixture
- `multi-task-elm.ts` (222 LOC) — shared hidden, task-specific heads
- `online-kernel-elm.ts` (332 LOC) — online + kernel combination
- `sparse-elm.ts` (304 LOC) — L1/L2 with feature selection

Plus `src/pro/elm/index.ts` and the `export * from './elm/index.js'` line in `src/pro/index.ts`.

**Why retired:** Audit per IMPL-0001 Phase 2:

| File | LOC | Distinct shape from core? | Consumers in repo | Tests | Decision |
|------|-----|---------------------------|-------------------|-------|----------|
| `deep-elm-pro.ts` | 263 | thin wrap of `DeepELM` | 0 | 0 | delete |
| `multi-kernel-elm.ts` | 244 | yes, but cosmetic (`polynomial` silently maps to `rbf` on construction) | 0 | 0 | delete |
| `multi-task-elm.ts` | 222 | yes (genuinely distinct) | 0 | 0 | delete |
| `online-kernel-elm.ts` | 332 | yes (online + kernel combo) | 0 | 0 | delete |
| `sparse-elm.ts` | 304 | yes (L1 sparsity) | 0 | 0 | delete |

All five carry residue from the Premium-era license-gated build — every file has `// License removed - all features are now free!` at the top and `// License check removed // Premium feature - requires valid license` inside the constructor. Zero consumers across `src/`, `tests/`, `examples/`, `node_examples/`, and `public/`. Zero unit tests. No example usage. No documentation.

Even where the shape is distinct from core (`MultiTaskELM`, `OnlineKernelELM`, `SparseELM`), untested + unused scaffolding-quality code does not belong in the public API. Same bar as the 21 variants applies — see the path-back rules in the v3.0.0 → v4.0.0 entry above.

**How to recover:** Same as the 21 variants — `git checkout v3.0-with-variants -- src/pro/elm/<name>.ts` or work on `archive/v3.0-with-21-variants`.

**Path back into the API:** Three-rule bar from ADR-0001 (real math, real tests, ADR + at least one example/lesson). Most plausible candidates if revisited: `MultiTaskELM`, `OnlineKernelELM`, `SparseELM`.

---

## Conventions

- **Retired surfaces get an entry in this file** with: what was removed, when, why, where it lives now, and a recovery snippet.
- **Tags follow the format** `vX.Y-<descriptor>` for archive points (e.g., `v3.0-with-variants`).
- **Archive branches follow the format** `archive/vX.Y-<descriptor>` and live indefinitely on origin.
- **No squashing or rewriting archive branches.** They're frozen records, not active development branches.
