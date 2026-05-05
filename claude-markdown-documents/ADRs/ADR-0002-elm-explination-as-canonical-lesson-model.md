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

6. **Adopt a defined pedagogy** — see the next section. The format alone isn't enough; we need explicit conventions for *what* goes in the slides and *how* outcomes are written.

## Lesson pedagogy

The format decision above leaves *what to teach in the slide arc* and *how to write outcomes* underspecified. After researching established educational practice (literature survey: 2026-05-05), we adopt three layered conventions.

### 1. A-SMART learning outcomes (objective-writing rubric)

Every lesson README opens with 1–3 outcomes written in the **A-SMART** form — **A**ction-oriented, **S**pecific, **M**easurable, **A**chievable, **R**elevant, **T**ime-bound — using the Johns Hopkins template:

> *"By [time], the [audience] will [observable action verb + performance] as measured by [assessment + criteria]."*

The leading **A** (from Khogali et al., [PMC11589412](https://pmc.ncbi.nlm.nih.gov/articles/PMC11589412/)) is non-negotiable: it forces a Bloom-aligned action verb (*apply, build, analyze, train, classify*) and bans non-observable verbs like *understand* or *be familiar with*. If a learner can't demonstrate the outcome to a peer, it's not A-SMART.

**Worked example for L02 (Your first classifier):**

> *"By the end of this 45-minute lesson, the intern will train an `ELM` classifier on the provided 10-example greeting dataset in the live demo, achieve ≥80% accuracy on a 3-example held-out set, and export the trained model as JSON."*

In this format:
- **Time-bound** anchors to *lesson length*, not a course deadline (so async learners aren't blocked).
- **Measurable** ties to the **You Try** exercise's pass condition (an accuracy number, expected console output, a downloadable artifact).
- **Action verb** comes from Bloom levels 2–4 (apply, analyze) — appropriate for beginners doing live demos. Avoid level-1 (remember) verbs except in glossary lessons.

### 2. TSDR slide arc (lesson structure)

The slide arc inside every lesson follows **TSDR — Tell, Show, Do, Review** — the well-supported direct-instruction shape (the I-do / We-do / You-do pattern, codified by [Maestro's Tell-Show-Do-Review](https://maestrolearning.com/blogs/tell-show-do-review/)):

| Beat | Slides | Purpose |
|------|--------|---------|
| **Tell** | 2–4 | Motivate the concept. What problem does it solve? Why should the learner care? |
| **Show** | 3–5 | Walk a worked example, narrated. Visual metaphors over equations (the elm-explination "city grid" / "GPS" approach). |
| **Do** | 1–2 + live demo | Learner runs the **You Try** exercise — the A-SMART outcome's assessment. Code editor open. |
| **Review** | 1–2 | "What did you observe? What surprised you? What would you change?" Reflection prompts, not summarization. |

**We explicitly reject SMART-as-a-lesson-cycle.** Variants like "Show, Model, Apply, Reflect, Test" appear in some folk practice but are not in the recognized education literature. Coining a homemade acronym would confuse anyone who already knows SMART (which is everyone in L&D). TSDR is established and unambiguous.

### 3. Backward Design as the authoring workflow

Lessons are written **outcome → assessment → exposition**, in that order — Wiggins & McTighe's *Understanding by Design*. The author's checklist:

1. **Write the A-SMART outcome first.** What can the learner do at the end?
2. **Design the You-Try exercise that proves it.** This is the assessment. If the outcome can't be assessed by a small browser exercise, the outcome is wrong.
3. **Then design the slide arc (Tell + Show)** that gets the learner ready to do the You-Try.
4. **Add the Review** prompts that surface what the learner noticed.

Combined with A-SMART, this is the workflow that produces lessons that *don't drift into "stuff I find interesting."* It is documented as the canonical pairing in the A-SMART paper.

### Critique we accept

- **SMART can flatten learning** when wielded mechanically (Skillshub, Scissortail, [Swann et al. 2022](https://www.tandfonline.com/doi/full/10.1080/17437199.2021.2023608)). Mitigation: the **Review** beat in TSDR exists precisely to surface meaning beyond what's measurable.
- **Self-paced learners lose the "Time" anchor** if it's tied to a presenter's pacing. Mitigation: every A-SMART outcome's time-bound clause anchors to *lesson length* (`30 min`, `45 min`), which the learner sees up front and can re-time themselves.

### Sources

Research brief that informed this section (2026-05-05):

- Johns Hopkins SPH CTL — [Writing SMART Learning Objectives](https://ctl.jhsph.edu/blog/posts/SMART-learning-objectives/)
- Khogali et al. — [A-SMART Learning Outcomes and Backward Design (PMC11589412)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11589412/)
- Chatterjee & Corral — [How to Write Well-Defined Learning Objectives (PMC5944406)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5944406/)
- Boston College CTE — [Learning Objectives](https://cteresources.bc.edu/documentation/learning-objectives/)
- University of Arkansas TIPS — [Bloom's Taxonomy for Objectives](https://tips.uark.edu/using-blooms-taxonomy/)
- Wiggins & McTighe, *Understanding by Design* (Backward Design)
- Anderson & Krathwohl 2001 — revised Bloom's Taxonomy
- Maestro Learning — [Tell, Show, Do, Review](https://maestrolearning.com/blogs/tell-show-do-review/)
- Swann et al. 2022 — [(Over)use of SMART Goals (Health Psychology Review)](https://www.tandfonline.com/doi/full/10.1080/17437199.2021.2023608)

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
- Each lesson README has 1–3 A-SMART outcomes that pass review (action verb is observable, measurability is explicit, time-bound matches the deck length).
- Each lesson's slide arc visibly follows TSDR — a reviewer can label which slides are Tell / Show / Do / Review without help.
- Speaker notes pass a "could a different person teach from this?" review.
- The first intern PR after onboarding cites a specific lesson as the source of their understanding.
- After 3 months, the lessons are referenced from at least one external blog post or talk.

## See also

- [ADR-0001](./ADR-0001-consolidate-repo-and-prepare-for-interns.md) — the cleanup that makes the lesson surface trustworthy.
- [IMPL-0002](../implementation-plans/IMPL-0002-canonical-lesson-series.md) — the lesson sequence and execution plan.
- The existing [`examples/elm-explination/`](../../examples/elm-explination/) — the artifact this ADR canonizes.

## Revisions

- **2026-05-05** — Added the "Lesson pedagogy" section establishing A-SMART outcomes, the TSDR slide arc, and Backward Design as the authoring workflow. Validation criteria expanded to require A-SMART outcomes and visible TSDR structure per lesson. Driven by research into established education practice; the homemade "SMART-as-lesson-cycle" interpretation was explicitly rejected.
