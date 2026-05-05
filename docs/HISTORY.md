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

## Conventions

- **Retired surfaces get an entry in this file** with: what was removed, when, why, where it lives now, and a recovery snippet.
- **Tags follow the format** `vX.Y-<descriptor>` for archive points (e.g., `v3.0-with-variants`).
- **Archive branches follow the format** `archive/vX.Y-<descriptor>` and live indefinitely on origin.
- **No squashing or rewriting archive branches.** They're frozen records, not active development branches.
