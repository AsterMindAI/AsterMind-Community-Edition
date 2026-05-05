# Research Notebooks

Lab-style narratives for the AsterMind-Community repo. Each notebook captures **what we asked, what we found, what surprised us, and what we decided** — the story behind the commits, in the form a future contributor (or future-Julian after a long break) can pick up cold.

## How notebooks differ from ADRs and implementation plans

| Kind of doc | Answers | Tone | Lives in |
|-------------|---------|------|----------|
| **ADR** | *Why* did we make this decision? Which alternatives did we weigh? | Crisp, structured, decisive | [`../ADRs/`](../ADRs/) |
| **Implementation plan** | *How* do we execute this decision, in what order, with what validation? | Step-by-step, checklist-shaped | [`../implementation-plans/`](../implementation-plans/) |
| **Research notebook** | *What was the situation, what did we discover, what surprised us, what did we learn?* | Narrative, with evidence and observations | this directory |

The three pair naturally: a notebook documents the investigation that *led to* an ADR, the ADR records the decision, and the implementation plan executes it. Some notebooks document execution retrospectives instead.

## Convention

- **Numbering:** zero-padded, monotonic. `NB-001`, `NB-002`, …
- **Filename:** `NB-NNN-<short-slug>.md`
- **Header fields:** Date, Tags, Outcome (one-line summary).
- **Update policy:** Notebooks may be amended over time as understanding deepens — unlike ADRs, they're living. Add a `## Revisions` section if the change is substantive.

## Index

| # | Title | What it covers |
|---|-------|----------------|
| [NB-001](./NB-001-initial-codebase-audit.md) | **Initial codebase audit (v3.0.0)** | The first deep survey of the repo when the cleanup work began — what was there, what was loose, and the surprises that shaped the cleanup plan. |
| [NB-002](./NB-002-smart-pedagogy-research.md) | **SMART teaching-method literature review** | Disambiguating "SMART" in the education literature, the case for A-SMART + TSDR + Backward Design, sources cited. |
| [NB-003](./NB-003-v4-cleanup-chronicle.md) | **v3.0.0 → v4.0.0 cleanup chronicle** | The full narrative of the IMPL-0001 work across six phases: scoping, deletion, dependency cleanup, docs rewrite, test coverage, release. |
| [NB-004](./NB-004-lesson-curriculum-design.md) | **Lesson curriculum design and L00 refactor** | The decision to canonise the elm-explination demo, the lesson template scaffold (IMPL-0002 P0), the L00 refactor (IMPL-0002 P1), the path forward. |

## When to write a notebook

- **Before** an ADR, when you're investigating a question and want a record of what you found before deciding.
- **After** a substantial execution effort, as a retrospective — what actually happened, what surprised you, what would you do differently.
- **In parallel** with an implementation plan, capturing the discoveries and side-quests that didn't fit the plan's structure.

Skip notebooks for: small bug fixes, single-file refactors, work you'd remember without notes.

---

*Notebooks are read-and-write artefacts; the goal is to make the next person's first hour here productive instead of confused.*
