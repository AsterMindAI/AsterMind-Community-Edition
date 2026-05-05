# AsterMind Capstones — Summer 2026 Cohort

Each intern in the summer 2026 cohort owns one capstone. Capstones map onto the [July 24 final on-site presentation](../../claude-markdown-documents/implementation-plans/IMPL-0003-summer-2026-curriculum-execution.md#phase-5--final-week--on-site-presentation-july-20--july-24) and are the assessment artifact Sam Henry (RMC advisor) reports against.

## Lanes

| Intern | Capstone | Library surface | A-SMART measurable bar |
|--------|----------|-----------------|------------------------|
| **Thomas Addison** | [Adaptive Rock-Paper-Scissors with `OnlineELM`](./thomas-adaptive-game/STARTER.md) | `OnlineELM` | ≥10 percentage point win-rate gain between rounds 1–10 and 21–30 |
| **Jarrett Hartsoe** | [LOTL command classifier with `FeatureCombinerELM`](./jarrett-lotl-classifier/STARTER.md) | `FeatureCombinerELM` | ≥85% accuracy on a held-out test set of ≥30 commands |
| **Nolan Moore** | [Community infrastructure + RFF research notebook](./nolan-infrastructure/STARTER.md) | tooling + writing (`src/pro/math/`) | Three artifacts shipped: GitHub Discussions, `docs/PUBLISHING.md`, `NB-005-random-fourier-features.md` |

## Why three lanes, not one shared capstone

Three different strength profiles. Three different on-site presentations Sam reports on independently. One shared capstone forces the cohort to compete for the same scope; lanes let each intern play to type. Full rationale in [ADR-0003](../../claude-markdown-documents/ADRs/ADR-0003-summer-2026-curriculum-structure.md#why-this-and-not-something-else).

## Pedagogy alignment

Every capstone follows the conventions in [ADR-0002 § Lesson pedagogy](../../claude-markdown-documents/ADRs/ADR-0002-elm-explination-as-canonical-lesson-model.md#lesson-pedagogy):

- **A-SMART outcomes** — every STARTER.md leads with an Action-oriented, Specific, Measurable, Achievable, Relevant, Time-bound outcome.
- **Backward Design** — outcome and assessment are defined first; build steps follow.
- **TSDR for the final presentation** — the 5–10 minute on-site demo follows Tell → Show → Do → Review, even though the capstone code itself isn't a slide deck.

## How to read a STARTER.md

Each lane's STARTER.md has the same five sections:

1. **A-SMART outcome** — copied from ADR-0003. This is the contract.
2. **What we'll provide** — datasets, scaffold code, library APIs the intern can lean on.
3. **What you'll build** — concrete deliverable list.
4. **Acceptance checklist** — the measurable bar restated as binary checkboxes. When all are ticked, the capstone is done.
5. **Suggested approach** — non-binding pacing notes; the intern can deviate.

## Calendar

| Week | Phase | Capstone activity |
|------|-------|-------------------|
| W3 (Jun 1–5) | Phase 2 | Thomas onboarding (L01); no capstone work yet |
| W4 (Jun 8–12) | Phase 2 | Thomas onboarding (L02–L03); end-of-week capstone scoping conversation |
| W5 (Jun 15–19) | Phase 3 | Thomas: L04 + capstone scaffolding starts |
| W6 (Jun 22–26) | Phase 3 | Jarrett joins, onboarding L01; Thomas: capstone integration |
| W7 (Jun 29–Jul 3) | Phase 3 | Jarrett: L02–L03; Thomas: capstone polish; Nolan: PUBLISHING.md drafting |
| W8 (Jul 6–10) | Phase 4 | Jarrett: L05 + capstone scaffolding; Thomas: testing; Nolan: NB-005 drafting |
| W9 (Jul 13–17) | Phase 4 | All: hit measurable bar; dry-run presentations Friday |
| W10 (Jul 20–24) | Phase 5 | Rehearsals Mon–Tue; **on-site final presentations Fri Jul 24** |

See [IMPL-0003](../../claude-markdown-documents/implementation-plans/IMPL-0003-summer-2026-curriculum-execution.md) for full week-by-week detail.

## Code conventions

Capstone code lives at `examples/capstones/<lane>/` and is treated as first-class repo content:

- Code passes `npm run build` (no broken imports, no TS errors that escape the lesson scope).
- Non-rendering logic has vitest tests under `tests/capstones/<lane>/`.
- Runtime imports come only from the public AsterMind API (`window.astermind.*` for browser code, `import { ... } from '@astermind/astermind-community'` for any Node-side tools).
- A `README.md` at each capstone root explains how to run it cold — Sam should be able to clone, run two commands, and see the demo work.
