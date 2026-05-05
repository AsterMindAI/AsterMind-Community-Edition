# Claude Markdown Documents

Planning and narrative artifacts for the AsterMind-Community repository. Three kinds of documents live here:

- **ADRs** (Architecture Decision Records) — *why* a decision was made, what alternatives were weighed, and the tradeoffs we accepted. Stored in [`ADRs/`](./ADRs/).
- **Implementation Plans** — *how* we execute a decision: phases, file lists, checklists, validation steps. Stored in [`implementation-plans/`](./implementation-plans/).
- **Research Notebooks** — lab-style narratives capturing *what we asked, what we found, what surprised us, and what we decided*. The story behind the commits. Stored in [`research-notebooks/`](./research-notebooks/).

> ADRs answer **"why?"**, plans answer **"how, in what order, and how do we know it worked?"**, notebooks answer **"what was the situation, and what did we learn?"**. Pair them: one ADR usually has one plan, and notebooks document the investigation that led to an ADR or the retrospective after execution.

## Current artifacts

### Decisions and plans

| # | ADR | Plan | Topic |
|---|-----|------|-------|
| 0001 | [Consolidate repo and prepare for interns](./ADRs/ADR-0001-consolidate-repo-and-prepare-for-interns.md) | [Plan 0001](./implementation-plans/IMPL-0001-consolidate-repo-and-prepare-for-interns.md) | Drop the 21 variant scaffolds, reconcile /pro/elm/ duplicates, rewrite docs for newcomers |
| 0002 | [elm-explination as the canonical lesson model](./ADRs/ADR-0002-elm-explination-as-canonical-lesson-model.md) | [Plan 0002](./implementation-plans/IMPL-0002-canonical-lesson-series.md) | Build a beginner intern curriculum modelled on the existing slide-deck demo |

### Research notebooks

| # | Title | Topic |
|---|-------|-------|
| [NB-001](./research-notebooks/NB-001-initial-codebase-audit.md) | Initial codebase audit (v3.0.0) | Investigation that surfaced the scaffolding-quality variants, dependency chain, and link rot |
| [NB-002](./research-notebooks/NB-002-smart-pedagogy-research.md) | SMART teaching-method literature review | The disambiguation and case for A-SMART + TSDR + Backward Design |
| [NB-003](./research-notebooks/NB-003-v4-cleanup-chronicle.md) | v3.0.0 → v4.0.0 cleanup chronicle | Six-phase IMPL-0001 execution narrative, metrics, and lessons learned |
| [NB-004](./research-notebooks/NB-004-lesson-curriculum-design.md) | Lesson curriculum design and L00 refactor | Template scaffold + L00 refactor; curriculum status; the "L00 stays bespoke" decision |

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
