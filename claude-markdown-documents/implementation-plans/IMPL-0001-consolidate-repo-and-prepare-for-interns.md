# IMPL-0001 — Consolidate the repo and prepare it for interns

- **Linked ADR:** [ADR-0001](../ADRs/ADR-0001-consolidate-repo-and-prepare-for-interns.md)
- **Status:** Proposed
- **Owner:** Julian Wilkison-Duran
- **Estimated effort:** 1–2 focused days for code surgery; ~1 week elapsed for docs rewrite (can run in parallel with intern onboarding)

## Goals

1. Remove the 21 ELM variants from the public API while preserving them in git history.
2. Reconcile `src/pro/elm/` duplicates.
3. Rewrite the intern-facing documentation surface (README + 3 new docs).
4. Land all of the above behind a single coherent release (v3.1.0 or v4.0.0 — see Phase 6).

## Non-goals

- Hardening any variant for re-entry into the API.
- Building the intern lesson curriculum (that's [IMPL-0002](./IMPL-0002-canonical-lesson-series.md)).
- Performance work or refactoring of `src/core/`.
- Touching `OmegaSynth` (`src/synth/`).

## Phases

Each phase ends in a state where the repo still builds and tests pass. We do not stack changes that leave `main` broken.

---

### Phase 0 — Preserve the work (30 minutes)

**Why first:** Before we delete anything, we make damn sure it's recoverable. If anyone ever wants the 21 variants back, this is where they'll come looking.

**Steps:**
1. Create an annotated tag on the current `main`:
   ```bash
   git tag -a v3.0-with-variants -m "Final state of v3.0 before 21-variant retirement (ADR-0001)"
   ```
2. Create a permanent branch:
   ```bash
   git checkout -b archive/v3.0-with-21-variants
   git push -u origin archive/v3.0-with-21-variants
   ```
3. Add a section to [`docs/LEGAL.md`](../../docs/LEGAL.md) or a new `docs/HISTORY.md` noting where the variants live and the ADR that retired them. Future-you will not remember.

**Done when:**
- [ ] Tag exists locally and on origin.
- [ ] Archive branch exists locally and on origin.
- [ ] `docs/HISTORY.md` exists with a "Retired surfaces" section linking to ADR-0001.

---

### Phase 1 — Code removal (2–3 hours)

**Why second:** Smallest, most reversible code change. Get it in, run tests, prove the core still works.

**Files to delete:**
- All 21 files under [`src/elm/`](../../src/elm/) (the kebab-cased `.ts` files).
- [`src/elm/index.ts`](../../src/elm/index.ts).
- The directory itself.
- [`tests/premium-elm-variants.test.js`](../../tests/premium-elm-variants.test.js).
- [`tests/all-premium-elm-variants.test.js`](../../tests/all-premium-elm-variants.test.js).

**Files to edit:**
- [`src/index.ts`](../../src/index.ts) — remove the line `export * from "./elm/index";` (currently around line 67).
- [`README.md`](../../README.md) — strip references to the 21 variants in the feature list and "What's new in v3.0.0" section. (Full rewrite happens in Phase 4 — Phase 1 just makes claims accurate so the build doesn't lie.)

**Validation:**
```bash
npm run clean && npm run build
npm test
grep -rn "from.*['\"].*elm/quantum\|elm/string-kernel\|elm/graph-elm" src/ tests/
# should return zero matches
```

**Done when:**
- [ ] `src/elm/` directory removed.
- [ ] Two `.js` test files removed.
- [ ] `src/index.ts` no longer references `./elm/index`.
- [ ] `npm run build` succeeds.
- [ ] `npm test` passes.
- [ ] No dangling references in `README.md` to deleted classes (smoke check).

**Rollback:** `git checkout archive/v3.0-with-21-variants -- src/elm/ tests/`. Five seconds.

---

### Phase 2 — Reconcile `src/pro/elm/` (4–6 hours)

**Why third:** This requires judgment, not just deletion. We do it after Phase 1 so the variant question is settled before we tackle the duplicates.

**Audit step:** For each of the 5 files in [`src/pro/elm/`](../../src/pro/elm/), answer these questions in a short markdown table (add to `docs/HISTORY.md`):

| File | LOC | Distinct from core? | Used in tests/examples? | Decision |
|------|-----|---------------------|--------------------------|----------|
| `deep-elm-pro.ts` | 263 | ? | ? | merge / keep / delete |
| `multi-kernel-elm.ts` | 244 | ? | ? | merge / keep / delete |
| `multi-task-elm.ts` | 222 | ? | ? | merge / keep / delete |
| `online-kernel-elm.ts` | 332 | ? | ? | merge / keep / delete |
| `sparse-elm.ts` | 304 | ? | ? | merge / keep / delete |

**Decision rules:**
- If a Pro variant is functionally identical to something in `src/core/` → **delete the Pro version**, leave the core one.
- If a Pro variant adds genuine capability that's well-implemented and tested → **promote to `src/core/`** (keep the better implementation, fold improvements in).
- If unclear → leave for a follow-up ADR rather than guessing.

**Edit:** Update [`src/pro/index.ts`](../../src/pro/index.ts) line 60 (`export * from './elm/index.js';`) to reflect whatever survives. If nothing survives, delete `src/pro/elm/` and the export line.

**Validation:**
```bash
npm run build
npm test
```

**Done when:**
- [ ] Audit table filled in and committed to `docs/HISTORY.md`.
- [ ] `src/pro/elm/` either reduced to genuinely-distinct variants or deleted.
- [ ] `src/pro/index.ts` updated accordingly.
- [ ] Build + tests green.

---

### Phase 3 — Reconcile `docs/` and root paths (1 hour)

**Why fourth:** Quick win that unblocks the README rewrite.

**The problem:** README links like `./QUICK-START-TUTORIAL.md` and `./DATA-REQUIREMENTS.md` 404 because those files are under `./docs/`.

**Fix:** Audit every link in [`README.md`](../../README.md). For each broken one, either:
- Update the link to point to `./docs/...` where the file actually lives, or
- Move the file to root if it's truly top-level (`LICENSE`, `CONTRIBUTING.md`, `CHANGELOG.md` belong at root by convention).

**Done when:**
- [ ] `find . -maxdepth 2 -name "*.md"` matches what README references.
- [ ] No 404s when a human clicks links from a fresh GitHub view of `main`.

---

### Phase 4 — Rewrite the docs surface (3–5 days, can run in parallel with Phase 5)

**Why fifth:** Biggest write-time, but no functional risk. Can land in pieces.

**4a. Rewrite [`README.md`](../../README.md).** New structure:

1. **One-paragraph what + why.** Plain language, no bullet point salads.
2. **"I'm new to ML — start here"** → links to ADR-0002's lesson series and to the existing `examples/elm-explination/`.
3. **"I want to use this in my app — start here"** → 30-line working example: install, import `ELM`, train on toy data, predict.
4. **What's actually in the box** — honest list: ELM, KernelELM, OnlineELM, DeepELM, ELMChain, EmbeddingStore, Web Worker, plus Pro features (RAG/reranking/summarization) and OmegaSynth.
5. **Documentation map** — table linking to GLOSSARY, ARCHITECTURE, CONTRIBUTING, lesson series.
6. **License + patent notice.**

**Length target:** under 250 lines. The current 661 lines is hostile.

**4b. Write [`CONTRIBUTING.md`](../../CONTRIBUTING.md).** Cover:
- Local setup (`npm install`, Node version, browser version assumptions).
- How to run tests (`npm test`), build (`npm run build`), and dev demos (`npm run dev:*`).
- The "What's a good PR look like" section: small, tested, has a doc update if it touches the public API.
- Where new features go (`src/core/` vs. `src/extensions/` vs. nowhere yet).
- The "before adding a new ELM variant" checklist: real math + real tests + an ADR.

**4c. Write [`GLOSSARY.md`](../../GLOSSARY.md).** Every ML term used in the repo, defined for someone who hasn't taken an ML class:
- Closed-form solve, ridge regression, pseudoinverse, hidden layer, activation, embedding, kernel, Nyström approximation, RLS, forgetting factor, TF-IDF, KNN, RAG, transfer entropy, etc.
- One sentence each. Link to a paper or Wikipedia for depth.

**4d. Write [`ARCHITECTURE.md`](../../ARCHITECTURE.md).** A 1-page guided tour of `src/`:
- What `core/` contains and why each file is there.
- How `tasks/` builds on `core/`.
- How `pro/` extends `core/` (after Phase 2 reconciliation).
- How `synth/` plugs in.
- The build pipeline: TypeScript → rollup → ESM/UMD → published.
- Diagram (ASCII or SVG).

**Done when:**
- [ ] README under 250 lines, all links resolve, no references to deleted classes.
- [ ] `CONTRIBUTING.md` exists at root.
- [ ] `GLOSSARY.md` exists at root with every term used in README defined.
- [ ] `ARCHITECTURE.md` exists at root with current src/ tree and roles.

---

### Phase 5 — Test coverage backstop (1 day)

**Why fifth (parallel with Phase 4):** Removing the JS test files removes (shallow) coverage. We replace it with proper vitest tests on the surviving public API.

**Add vitest tests for:**
- `src/core/ELM.ts` — train + predict on tiny dataset, JSON round-trip, edge cases (empty input, single class).
- `src/core/KernelELM.ts` — exact and Nyström modes both work, RBF kernel sanity check.
- `src/core/OnlineELM.ts` — `init` + `update` produces consistent shape.
- `src/core/DeepELM.ts` — autoencoder fit + classifier head + JSON round-trip.
- `src/core/EmbeddingStore.ts` — add, query, capacity behavior.
- `src/tasks/IntentClassifier.ts` — at least a smoke test.
- `src/tasks/LanguageClassifier.ts` — at least a smoke test.

**Coverage target:** Not a percentage — a list. Every class in the public API should have at least one test that does the obvious thing and asserts the obvious result.

**Done when:**
- [ ] Each file above has a `.test.ts` neighbor.
- [ ] `npm test` runs them all and they pass.
- [ ] CI (if one is added later) can be told these are the canonical tests.

---

### Phase 6 — Release (1 hour)

**Decision: v3.1.0 vs v4.0.0?**

Removing public API exports is a breaking change under semver, so this is **v4.0.0** territory. Recommend going there to be honest. v3.0.0's "free Premium features" is also a marketing milestone we shouldn't dilute.

**Steps:**
1. Bump `package.json` to `4.0.0`.
2. Write `CHANGELOG.md` entry:
   - **Removed:** 21 ELM variants from `src/elm/` (preserved on `archive/v3.0-with-21-variants`). See ADR-0001.
   - **Removed:** Duplicate `src/pro/elm/` variants (where applicable). See Phase 2 audit.
   - **Added:** `CONTRIBUTING.md`, `GLOSSARY.md`, `ARCHITECTURE.md`.
   - **Changed:** README rewritten for newcomer audience.
3. Tag `v4.0.0` and publish.
4. Open a GitHub issue titled "Roadmap: hardening retired ELM variants for re-entry" linking to the archive branch, so anyone interested has a single place to start.

**Done when:**
- [ ] `package.json` version updated.
- [ ] `CHANGELOG.md` exists at root with the migration notes.
- [ ] Tag pushed.
- [ ] (Optional) NPM publish.

---

## Risks and how we mitigate them

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| External user pinned to a variant | Low | Tag + archive branch; CHANGELOG with import-equivalents where possible. |
| Lesson curriculum (ADR-0002) blocked by this work | Medium | Phases 0–3 unblock most lessons; Phase 4 docs can ship after lesson 1. |
| README rewrite balloons in scope | High | Time-box to 1 day; if it spills, ship v4.0.0 with current README + a banner pointing to ADR-0001 and finish docs in 4.0.1. |
| Phase 2 audit reveals genuine pro variants worth keeping | Medium | That's the point of the audit; not a risk, just slower. |

## When to revisit

- If we ever ship `@astermind/astermind-experimental`, this ADR's "preserved on archive branch" promise becomes the migration source.
- If hardened versions of specific variants land in `src/core/`, that's a new ADR (proper math, proper tests).
- After interns ship their first PRs, review this plan against actual onboarding friction and patch the docs.
