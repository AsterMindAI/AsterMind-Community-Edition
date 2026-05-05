# NB-003 — v3.0.0 → v4.0.0 cleanup chronicle

**Date:** 2026-05-04 to 2026-05-05
**Tags:** release, cleanup, refactor, retrospective
**Outcome:** v4.0.0 shipped on 2026-05-05 with the public API trimmed of 26 untested variants, all 23 known CVEs cleared, 13 unused devDependencies removed, the README rewritten 3.3× shorter, and three new top-level docs (ARCHITECTURE / GLOSSARY / CONTRIBUTING) added. The repo went from "shipped but loose" to "demonstrably ready for new contributors."

---

## The premise

The cleanup followed [ADR-0001](../ADRs/ADR-0001-consolidate-repo-and-prepare-for-interns.md) and [IMPL-0001](../implementation-plans/IMPL-0001-consolidate-repo-and-prepare-for-interns.md). Audit findings in [NB-001](./NB-001-initial-codebase-audit.md). The plan was six phases:

| Phase | Scope | Status |
|------:|-------|--------|
| 0 | Preservation tag + archive branch | ✅ |
| 1 | Delete `src/elm/` (the 21 variants) | ✅ |
| 2 | Reconcile `src/pro/elm/` duplicates | ✅ |
| 3 | Fix broken README links | ✅ |
| 4 | Rewrite README + add ARCHITECTURE/CONTRIBUTING/GLOSSARY | ✅ |
| 5 | Test coverage backstop | ✅ |
| 6 | v4.0.0 release | ✅ |

Plus several side-quests that surfaced during execution and ended up bundled into the v4 cycle: dependency cleanup, license-token removal, stale-import repair.

---

## Chronicle

### Day 1 — 2026-05-04

#### Preservation first (Phase 0)

Before deleting anything, the v3.0.0 state was preserved on:

- **Tag:** `v3.0-with-variants` (annotated, points to commit `069ea66`).
- **Branch:** `archive/v3.0-with-21-variants` (pushed to origin).

Plus a new [`docs/HISTORY.md`](../../docs/HISTORY.md) explaining what would be retired, why, and how to recover it. Future-Julian wouldn't have to spelunk through git logs.

A small but learned-the-hard-way move: the tag and branch were created from `main` *without checking out the archive branch*, so my uncommitted lesson-scaffold work didn't accidentally end up frozen in the archive.

**First push attempt failed**: SSH authenticated as `infiniteCrank` (the owner's personal account) but the remote was `AsterMindAI/AsterMind-Community-Edition.git`. After a quick survey of `~/.ssh/config`, an `astermind` host alias was found and the remote URL switched to `git@github.com-astermind:AsterMindAI/AsterMind-Community-Edition.git`. Saved as a memory so future sessions don't trip the same wire.

#### The 21 variants gone (Phase 1)

`rm -rf src/elm` plus deleting the two `.js` "variant exists and runs" tests. `src/index.ts` lost its `export * from "./elm/index"` line. README lost three blocks claiming the variants. The build dropped ~50 KB.

Verification: `grep -rn "from.*['\"].*elm/quantum\|elm/string-kernel\|elm/graph-elm" src/ tests/` returned zero. `npm test` stayed green.

Bundle was rebuilt; `public/astermind.umd.js` updated as the dev-page-included copy.

### Day 2 — 2026-05-05

#### Dependency cleanup (side-quest, Phase 1.5)

Dependabot was reporting 20 vulnerabilities post-Phase-1; `npm audit` showed 23 (slight scanner divergence). Tracing root causes:

- `@xenova/transformers` (CRITICAL × 4 via the `onnxruntime-web` chain) — only used in 3 SBERT-comparison files in `node_examples/`.
- `tsne-js` (HIGH × multiple) — zero usages anywhere.
- Six other devDeps (`plotly.js-dist`, `ml-pca`, `ml-matrix`, `umap-js`, `yargs`, `@types/yargs`, `ts-node`, `eslint`, `prettier`) — zero usages in the repo, no eslint/prettier config files anywhere.

The cleanup ran in three waves:

1. **Phase A** — `npm uninstall` for the ten unused devDeps. Vulnerabilities 23 → 11.
2. **Phase B** — moved `@xenova/transformers` and `csv-parse` to `node_examples/package.json` where the only consumers lived. Then deleted the SBERT experiment files entirely (the owner's call: "this is an ELM library, kill it"). Vulnerabilities 11 → 6.
3. **Phase C** — `npm audit fix` patched the residual rollup/vite/transitive issues. Bumped `rollup-plugin-typescript2` 0.36 → 0.37 to keep up with rollup 4.60's stricter pre-plugin TS parsing (the 0.36 plugin was choking on `export type {...}`). Vulnerabilities 6 → 0.

**Final state: 0 npm audit vulnerabilities, main devDeps 23 → 10, runtime deps still 0.**

#### `src/pro/elm/` deletion (Phase 2)

Audit of the 5 Pro variants confirmed: zero consumers anywhere in the repo, zero unit tests, every file carrying `// License removed - all features are now free!` and `// License check removed // Premium feature - requires valid license`. Even where shape was distinct from core (multi-task heads, online + kernel combo, L1 sparsity), untested + unused scaffolding doesn't belong in the public API. `rm -rf src/pro/elm` + dropped the export line from `src/pro/index.ts`.

#### Tim's license-token residue (side-quest)

Three files in `src/synth/examples/` had partially-removed license-token logic. Two had **literally broken syntax** (`if (...) {\n    await   }` — `await` with nothing after it), masked because `src/**/examples/**` is excluded from the rollup build path. Removed the orphaned imports, the dead `setupLicense()` function, the env-var checks, and seven lines of stale comments.

A **separate** problem in the same files: `import { ELM } from "../../core/ELM.js"';` — a stray trailing single quote that would fatally break the parser. Tim's edits had been a search-and-replace gone wrong. Fixed and added static imports for `KernelELM`, `DeepELM`, `ELMChain`, `wrapELM` to replace six `require('@astermind/astermind-elm')` calls scattered through `trainELMFromSynth.ts`.

#### Phase 3 — README link rot

Of the relative `.md` links in the README:

- `./QUICK-START-TUTORIAL.md` → fixed to `./docs/QUICK-START-TUTORIAL.md`
- `./DATA-REQUIREMENTS.md` → fixed to `./docs/DATA-REQUIREMENTS.md`
- `./LEGAL.md` → fixed to `./docs/LEGAL.md`
- `./docs/MIGRATION-FROM-ELM.md` → file didn't exist; replaced the link with an inline migration table

Every internal link now resolves. Verified by a small bash loop in Phase 5.

#### Phase 4 — README rewrite + new docs

The README went from 661 lines to 199. Reorganised around three explicit landing paths from ADR-0001:

1. **🎓 New to ML and want to learn** → curriculum + L00 primer
2. **🛠️ Want to drop this into my app** → 5-line working classifier
3. **📦 What's in the box** → honest post-cleanup feature list

Plus three new top-level docs:

- **`ARCHITECTURE.md`** (141 lines) — repo layout, role of every `src/core/` file, how a training run flows.
- **`GLOSSARY.md`** (135 lines) — every ML term defined for non-ML readers, alphabetical with cross-refs.
- **`CONTRIBUTING.md`** (112 lines) — local setup, conventions, the **four-rule bar** for new ELM variants (real math + real tests + ADR + example) — the hard-won lesson from this whole effort.

#### Phase 5 — test coverage backstop

The two `.js` variant tests removed in Phase 1 had given shallow coverage; replaced with proper vitest tests on the surviving public API:

- `tests/ELM.test.ts` (4 tests)
- `tests/KernelELM.test.ts` (3 tests)
- `tests/OnlineELM.test.ts` (4 tests)
- `tests/DeepELM.test.ts` (3 tests)
- `tests/EmbeddingStore.test.ts` (6 tests)
- `tests/IntentClassifier.test.ts` (3 tests)
- `tests/LanguageClassifier.test.ts` (2 tests)

Total: 25 new tests. Suite went from **80 across 10 files** to **105 across 17 files**. One test failed first run (`IntentClassifier` constructor requires explicit `activation`); fixed in a one-line edit.

#### Phase 6 — release v4.0.0

- `package.json` version bumped 3.0.0 → 4.0.0.
- `repository.url`, `bugs.url`, `homepage` corrected to `AsterMindAI/AsterMind-Community-Edition` (had been pointing at `infiniteCrank/AsterMind-Community` since the merger — wrong both org and repo name).
- `description` rewritten honestly (no more "21+ advanced variants" claim).
- New `CHANGELOG.md` with full v4.0.0 entry: Removed / Added / Changed / Fixed / Security / Migration sections.
- Annotated tag `v4.0.0` pushed.
- [GitHub issue #4](https://github.com/AsterMindAI/AsterMind-Community-Edition/issues/4) opened to track variant re-entry under the four-rule bar.

`npm publish` was deliberately *not* run — the user wanted to gate that decision separately.

---

## Final-state metrics

| Metric | v3.0.0 | v4.0.0 |
|--------|--------|--------|
| `npm audit` vulnerabilities | 23 (7 critical, 10 high) | **0** |
| GitHub dependabot open alerts | 20 | **0** |
| Main devDependencies | 23 | 10 |
| Runtime dependencies | 0 | 0 |
| Tests (files / cases) | 9 / ~50 | 17 / **106** |
| Public API variant scaffolds | 26 | **0** |
| Top-level docs | README only | README + ARCHITECTURE + CONTRIBUTING + GLOSSARY + CHANGELOG + HISTORY |
| Lessons | none formalised | scaffolded (L00 ✅ shipped, L01–L10 planned) |
| ADR/IMPL convention | not established | 2 ADRs + 2 implementation plans + 4 notebooks |
| README length | 661 lines | 199 lines |

---

## What surprised us

1. **Every CVE was dev-side.** The `dependencies: {}` was empty, so users of the published npm package were never exposed. Dependabot's loud red banner panicked; the actual user-facing risk was zero. This is a useful pattern for evaluating future security alerts on this repo: *check whether the vulnerable dep is in `dependencies`, `peerDependencies`, or `devDependencies` first*.

2. **`npm audit fix` can break the build.** Bumping rollup to 4.60 changed when the parser runs relative to plugins, breaking `rollup-plugin-typescript2@0.36` on `export type {...}` syntax. The lesson: `npm audit fix` is *not* zero-risk; always run the full build + test suite after, and have a rollback path.

3. **Tim left the building. The license-token cleanup was so partial that the files it touched literally wouldn't compile.** This was an instance of a more general phenomenon: *a half-finished refactor that's hidden by an exclude rule in the build is worse than no refactor at all*, because nobody notices until they touch the file. The `tsconfig.json` exclude list grew during this cleanup precisely because the rule was hiding bugs.

4. **The build pipeline had no CI guard against regressions.** The schema-validation test for lessons (`tests/lessons-schema.test.ts`) is the only thing that catches "you broke a contract." Adding more such auto-discovering validation tests is a good investment.

5. **Some retired-variant code was non-trivially distinct from core.** `MultiTaskELM` (shared hidden + task-specific heads) and `OnlineKernelELM` (online + kernel combo) were *real shapes*, not duplicates. The decision to retire anyway was hard but right: untested + unused + Tim-shaped scaffolding is a public API liability regardless of underlying creativity. The four-rule bar in CONTRIBUTING.md exists to let those genuinely-distinct shapes come back through the front door.

6. **The cleanup worked because preservation was Phase 0.** Tag + archive branch on origin meant every deletion was reversible. Future destructive cleanups should put preservation first as a non-negotiable.

---

## Lessons (general)

- **Audit before plan, plan before execute.** [NB-001](./NB-001-initial-codebase-audit.md) → ADR-0001 → IMPL-0001 → execution. Skipping any of those steps would have produced worse decisions.
- **Phase commits, not big-bang commits.** Each of the six phases was a separate commit (or commit pair). `git log` reads like a story.
- **A single broken link is a smoke signal.** The README had four broken links; fixing them surfaced the deeper docs/path mismatch and the missing migration guide. Cheap forensic value.
- **Test coverage, not test percentage.** The Phase 5 brief was "every public class has at least one test that does the obvious thing." That's a finite, verifiable target. Coverage percentages would have either been too easy (Activations.ts had 100% before any work) or too hard (the variants had 0% deserved-zero).

---

## See also

- [ADR-0001](../ADRs/ADR-0001-consolidate-repo-and-prepare-for-interns.md) — the decision.
- [IMPL-0001](../implementation-plans/IMPL-0001-consolidate-repo-and-prepare-for-interns.md) — the plan.
- [NB-001](./NB-001-initial-codebase-audit.md) — the audit that started it.
- [docs/HISTORY.md](../../docs/HISTORY.md) — the formal retirement record.
- [CHANGELOG.md](../../CHANGELOG.md) — v4.0.0 entry.
