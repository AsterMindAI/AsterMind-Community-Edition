# Changelog

All notable changes to AsterMind-Community land here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

For the longer narrative on *why* a thing was retired or restructured, see [`docs/HISTORY.md`](./docs/HISTORY.md) and the ADRs under [`claude-markdown-documents/ADRs/`](./claude-markdown-documents/ADRs/).

---

## [4.0.0] — 2026-05-05

A foundation cleanup release. The public API is now smaller, every exported class is tested, every dependency is patched, and the documentation surface tells the truth about what's in the box. **This is a breaking change** because the 21 advanced ELM variants and the 5 `pro/elm/` "Pro" variants are no longer exported.

### Removed

- **The 21 advanced ELM variants** under `src/elm/` (`AdaptiveOnlineELM`, `ForgettingOnlineELM`, `HierarchicalELM`, `AttentionEnhancedELM`, `VariationalELM`, `TimeSeriesELM`, `TransferLearningELM`, `GraphELM`, `GraphKernelELM`, `AdaptiveKernelELM`, `SparseKernelELM`, `EnsembleKernelELM`, `DeepKernelELM`, `RobustKernelELM`, `ELMKELMCascade`, `StringKernelELM`, `ConvolutionalELM`, `RecurrentELM`, `FuzzyELM`, `QuantumInspiredELM`, `TensorKernelELM`). They were ChatGPT-shaped scaffolds with cosmetic naming and zero unit tests; full reasoning in [ADR-0001](./claude-markdown-documents/ADRs/ADR-0001-consolidate-repo-and-prepare-for-interns.md). **Recoverable** from tag `v3.0-with-variants` and branch `archive/v3.0-with-21-variants`.
- **The 5 `src/pro/elm/` "Pro" variants** (`DeepELMPro`, `MultiKernelELM`, `MultiTaskELM`, `OnlineKernelELM`, `SparseELM`). Audit found zero consumers anywhere in the repo and identical Tim-era license-residue scaffolding. Same recovery paths.
- **SBERT comparison experiments** (3 files in `node_examples/` that depended on `@xenova/transformers`). The dep was the dominant source of the 7 critical CVEs in v3.0.0.
- **10 unused devDependencies** from the main `package.json` (`plotly.js-dist`, `ml-pca`, `ml-matrix`, `tsne-js`, `umap-js`, `yargs`, `@types/yargs`, `ts-node`, `eslint`, `prettier`).
- **Vestigial license-token code** in `src/synth/examples/quickstart.ts`, `trainELMFromSynth.ts`, and `evaluateGeneratedData.ts` (orphaned from when OmegaSynth was a paid package; included literally broken syntax that had been masked by the file's exclusion from the build).
- **Stale `@astermind/astermind-elm` `require()` calls** in `src/synth/examples/trainELMFromSynth.ts` (the package was consolidated into this one in v3.0.0; classes are now local).
- **The two `.js` variant test files** (`tests/premium-elm-variants.test.js`, `tests/all-premium-elm-variants.test.js`) — they only verified that classes existed and could run, not the math their names implied.

### Added

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — repo layout, role of every `src/core/` file, how a typical training run flows, build pipeline, test setup.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — local setup, project conventions, the **four-rule bar for adding new ELM variants** (real math, real tests, ADR, at least one example), git workflow, lesson-contribution flow.
- [`GLOSSARY.md`](./GLOSSARY.md) — every ML and library term used in the repo, defined for non-ML readers, with cross-references and links into `src/`.
- [`docs/HISTORY.md`](./docs/HISTORY.md) — project retirement log with full audit tables and recovery recipes for the variants and the SBERT experiments.
- [`claude-markdown-documents/`](./claude-markdown-documents/) — ADRs and implementation plans (ADR-0001, ADR-0002, IMPL-0001, IMPL-0002).
- [`examples/lessons/`](./examples/lessons/) — lesson template scaffold (shared CSS + deck JS + JSON schema), curriculum index, and a vitest test that auto-validates every lesson's `slides.json`.
- 25 new vitest smoke tests for the surviving public API: `ELM`, `KernelELM`, `OnlineELM`, `DeepELM`, `EmbeddingStore`, `IntentClassifier`, `LanguageClassifier`. The full suite is now 105 tests across 17 files.

### Changed

- **Rewrote the README** for the intern audience: 661 lines → 199 lines, reorganised around three explicit landing paths (newcomer / integrator / curious), every internal link verified to resolve.
- **Bumped build tooling** for security: `rollup` 4.43 → 4.60, `rollup-plugin-typescript2` 0.36 → 0.37, plus auto-applied transitives via `npm audit fix`.
- **Moved research-only deps to `node_examples/package.json`**: `csv-parse` (and previously `@xenova/transformers` before its removal). The main package's runtime deps remain at zero.
- **Updated `repository.url`, `bugs.url`, and `homepage`** in `package.json` to point at `AsterMindAI/AsterMind-Community-Edition` (was the wrong organisation).
- **Repaired three broken README links** that pointed at root paths but the files were under `docs/` (`./QUICK-START-TUTORIAL.md`, `./DATA-REQUIREMENTS.md`, `./LEGAL.md`); replaced the missing `./docs/MIGRATION-FROM-ELM.md` link with an inline migration table.

### Fixed

- **Broken `import { ELM } from "../../core/ELM.js"';`** in `src/synth/examples/trainELMFromSynth.ts` (stray trailing single quote left over from a previous edit). The file was excluded from the build path so the syntax error never surfaced.
- **`npm audit` vulnerabilities: 23 → 0** across the main package and `node_examples/`. GitHub dependabot alerts: 20 open → 0 open.

### Security

- Removed the `@xenova/transformers` chain (`onnxruntime-web` → `onnx-proto` → `protobufjs`) which contributed 4 critical CVEs in v3.0.0.
- Removed `tsne-js` which contributed multiple high-severity transitive CVEs (`quote-stream`, `static-module`, `static-eval`, `cwise`, `ndarray-unpack`, `minimist`).

### Migration

If you were importing any of the retired classes from v3.0.0, your code will fail to build against v4.0.0. Three options:

1. **Best:** rewrite to use the surviving core classes (`ELM`, `KernelELM`, `OnlineELM`, `DeepELM`). For most retired variants this is a small change; the math underlying them was always one of these four anyway.
2. **Recover the file:** `git checkout v3.0-with-variants -- src/elm/<name>.ts` (or pull from `archive/v3.0-with-21-variants`) and vendor it into your own codebase. Note the variants ship as-is, untested.
3. **Pin to v3.0.0** if you need an upgrade path with no code changes today.

A "Roadmap: hardening retired ELM variants for re-entry" issue tracks any variants that get rewritten properly and rejoin the public API. The bar is documented in [`CONTRIBUTING.md`](./CONTRIBUTING.md): real math + real tests + an ADR + at least one example or lesson.

---

## [3.0.0] — 2026-04 (historical, retroactive entry)

The original "all features now free" consolidation that merged four packages (`@astermind/astermind-elm`, `@astermind/astermind-pro`, `@astermind/astermind-premium`, `@astermind/astermind-synthetic-data`) into `@astermind/astermind-community` under MIT.

This release shipped the 21 advanced ELM variants and the 5 `pro/elm/` variants that v4.0.0 retired; see the **Removed** section above and [`docs/HISTORY.md`](./docs/HISTORY.md) for the full retirement record. Earlier history of the four predecessor packages is not tracked here.
