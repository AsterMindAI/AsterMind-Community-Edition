# ADR-0002 — `elm-explination` as the canonical lesson model

- **Status:** Proposed
- **Date:** 2026-05-04
- **Authors:** Julian Wilkison-Duran (with planning support from Claude)
- **Depends on:** [ADR-0001](./ADR-0001-consolidate-repo-and-prepare-for-interns.md) (the cleanup) — should land first or in parallel.

## Context

We're onboarding interns who are new to **both** machine learning and JavaScript/TypeScript. The standard "read the README + run the examples" path won't work for them — the README is a reference, not a teacher, and the examples vary widely in quality and assumed background.

Inside this repo there is already a piece of teaching material that is **strikingly good** for this audience: [`examples/elm-explination/`](../../examples/elm-explination/).

What makes it work:

- **Narrative arc.** Sixteen slides progressing from *"who I am"* → *neural net basics* → *the pain of backpropagation* → *Huang's bold question* → *random projection (visualized as a city grid seen from above)* → *the pseudoinverse (visualized as a GPS finding the best route)* → *one-shot solve* → *prediction* → *call to action*. By the end, a learner understands not just *what* an ELM does but *why it's a clever idea*.
- **Live demo integrated with explanation.** [`elm-demo.js`](../../examples/elm-explination/elm-demo.js) (~2,144 lines) runs in the same page as the slides — a learner can flip from "here's the concept" to "here's it actually working" without context-switching.
- **Speaker notes.** [`speaker-notes.js`](../../examples/elm-explination/speaker-notes.js) (~495 lines) captures the *why this matters* and *what to emphasize*, which means it works both for self-paced study and for a presenter walking interns through it live.
- **Visual metaphors.** Real diagrams (neuron, vectors, backpropagation loops, random projection grid, GPS, ELM diagram) instead of equations-first. This is exactly right for a learner who needs to build mental models before they can absorb formal definitions.
- **Production-quality polish.** Dark theme, responsive layout, reduced-motion respect, deck-style navigation. It signals "this matters" without saying so.

The rest of the [`examples/`](../../examples/) directory is much more uneven. Several demos are working applications but assume the learner already understands the underlying ML; others are unfinished or thin.

## Decision

We will **establish `elm-explination` as the canonical model for AsterMind teaching material** and build a complete intern lesson curriculum following the same structure.

Concretely:

1. **Standardize the lesson format.** Every lesson is a self-contained directory under `examples/lessons/L<NN>-<slug>/` with the same five-asset shape:
   - `index.html` — the slide deck shell + styles.
   - `slides.json` — slide content as data, easy to edit without touching layout.
   - `live-demo.js` (or `.ts`) — the runnable demo wired into specific slides.
   - `speaker-notes.js` — what to emphasize per slide. Doubles as a self-study commentary track.
   - `README.md` — short pitch + prerequisites + estimated time + "what you'll know after this lesson".

2. **Sequence the lessons** as a curriculum, not a pile. A learner who works through them in order goes from "what is a neural network?" to "I just shipped a real demo" without ever hitting a slide that assumes more than the previous lessons covered.

3. **Add a `you-try` exercise to every lesson.** Two or three small questions or tasks the learner does in the live demo (change this parameter, retrain, observe the effect). Without doing, they don't learn.

4. **Refactor the existing `elm-explination` to fit the format** — minimal changes, mostly renaming and adding a README + `you-try` block — so it becomes the literal first lesson rather than a one-off.

5. **Treat lesson code as first-class citizens.** Lessons live in version control, get linted, are runnable from `npm run dev:lesson:<NN>`, and break the build if the underlying library API drifts. They are not throwaway docs.

## Why this and not something else

We considered four alternatives:

**A. Text-only tutorials in `docs/TUTORIALS/`.** Rejected. The current QUICK-START-TUTORIAL.md takes this approach and it's fine for someone who already knows ML; it's not enough for the audience we have. Reading code is harder than running it.

**B. Jupyter-style notebooks.** JavaScript doesn't have great notebooks. Observable comes closest but locks us into their hosting. HTML decks are the closest equivalent that we already have working.

**C. A separate video course.** Out of scope for this repo. Could be layered on top later (each lesson HTML deck → a screencast).

**D. Just clean up the existing `examples/` directory and call it good.** Rejected. The existing examples are *applications*, not *lessons*. They demonstrate a finished thing rather than build understanding step by step. We need both — examples for "look what's possible", lessons for "now you understand why".

**E. Use a third-party teaching framework (Reveal.js, MDX, Storybook).** Tempting but adds a dependency and a build-tool footprint. The bespoke deck in `elm-explination` already works, is small, and doesn't pull in new packages. Stay with it.

## Consequences

### Positive

- A new intern can sit down with a laptop, no prior ML knowledge, and walk a clear path from "what's a neuron" to "I shipped a demo to GitHub Pages."
- The lesson format is reusable: future contributors can add lessons without re-inventing the structure each time.
- The teaching material becomes a marketing asset (good lessons get linked from blog posts, conference talks, courses).
- Self-paced learners and presenter-led sessions both work — same material.
- Finding bugs in the library is easier when each lesson exercises one feature in isolation.

### Negative

- Real time investment — see [IMPL-0002](../implementation-plans/IMPL-0002-canonical-lesson-series.md) for the breakdown. Probably 8–12 lessons at ~1–2 days each for a complete first pass, plus iteration after intern feedback.
- Lessons are now part of the maintenance surface. If `ELM.ts` changes its API, lessons may need to update. We commit to that.
- `dist/` size grows slightly because the lesson demos pull in the library; this is fine for a teaching repo but worth flagging.

### Neutral

- We choose not to dictate exactly how many lessons there are upfront — the implementation plan starts with a strong default (10 lessons) but treats it as a hypothesis to validate as interns work through them.

## Out of scope (for this ADR)

- The specific lesson order (that's in the plan, and is expected to evolve).
- Whether lessons get hosted as a static site (e.g., GitHub Pages) — separate decision.
- Localization. English-only for now.
- Assessments / quizzes / certificates. The "you-try" blocks are the only formal interaction.

## Validation / how we'll know it worked

- A new intern who has never trained a model successfully completes lessons L0–L3 in their first three days, unaided.
- Each lesson runs in the browser via `npm run dev:lesson:<NN>` with no console errors.
- Speaker notes pass a "could a different person teach from this?" review.
- The first intern PR after onboarding cites a specific lesson as the source of their understanding.
- After 3 months, the lessons are referenced from at least one external blog post or talk.

## See also

- [ADR-0001](./ADR-0001-consolidate-repo-and-prepare-for-interns.md) — the cleanup that makes the lesson surface trustworthy.
- [IMPL-0002](../implementation-plans/IMPL-0002-canonical-lesson-series.md) — the lesson sequence and execution plan.
- The existing [`examples/elm-explination/`](../../examples/elm-explination/) — the artifact this ADR canonizes.
