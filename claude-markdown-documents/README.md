# Claude Markdown Documents

Planning artifacts for the AsterMind-Community repository. Two kinds of documents live here:

- **ADRs** (Architecture Decision Records) — *why* a decision was made, what alternatives were weighed, and the tradeoffs we accepted. Stored in [`ADRs/`](./ADRs/).
- **Implementation Plans** — *how* we execute a decision: phases, file lists, checklists, validation steps. Stored in [`implementation-plans/`](./implementation-plans/).

> ADRs answer **"why?"**, plans answer **"how, in what order, and how do we know it worked?"**. Pair them: one ADR usually has one plan.

## Current artifacts

| # | ADR | Plan | Topic |
|---|-----|------|-------|
| 0001 | [Consolidate repo and prepare for interns](./ADRs/ADR-0001-consolidate-repo-and-prepare-for-interns.md) | [Plan 0001](./implementation-plans/IMPL-0001-consolidate-repo-and-prepare-for-interns.md) | Drop the 21 variant scaffolds, reconcile /pro/elm/ duplicates, rewrite docs for newcomers |
| 0002 | [elm-explination as the canonical lesson model](./ADRs/ADR-0002-elm-explination-as-canonical-lesson-model.md) | [Plan 0002](./implementation-plans/IMPL-0002-canonical-lesson-series.md) | Build a beginner intern curriculum modelled on the existing slide-deck demo |

## Conventions

- **Numbering**: zero-padded, monotonic across both folders so an ADR and its plan share a number (`ADR-0001` ↔ `IMPL-0001`).
- **Status fields** on ADRs: `Proposed` → `Accepted` → `Implemented` → optionally `Superseded by ADR-NNNN`.
- **Plans** are living documents until the work ships; they get archived (not deleted) when the linked ADR moves to `Implemented`.
- **Don't edit accepted ADRs in place** — supersede them with a new ADR. The history matters.

## When to add a new ADR

You're proposing a change that:
- Removes or renames part of the public API.
- Changes how a major subsystem works.
- Establishes a project-wide convention (testing, docs, lesson format, etc.).
- Has a non-obvious tradeoff someone might second-guess in six months.

Tiny refactors and bug fixes don't need ADRs.
