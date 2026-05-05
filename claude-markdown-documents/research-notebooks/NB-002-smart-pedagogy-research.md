# NB-002 — SMART teaching-method literature review

**Date:** 2026-05-05
**Tags:** pedagogy, lessons, A-SMART, TSDR, Backward-Design
**Outcome:** Established that "SMART" in the education literature is overwhelmingly an **objective-writing rubric** (not a lesson-cycle acronym), recommended **A-SMART** for outcomes paired with **TSDR (Tell-Show-Do-Review)** for lesson structure and **Backward Design** for authoring workflow. Decision landed in [ADR-0002](../ADRs/ADR-0002-elm-explination-as-canonical-lesson-model.md).

---

## Question

After agreeing on the lesson template format (slide deck + live demo + speaker notes + you-try block), the owner asked the assistant to "use the SMART teaching method." The phrase has at least two distinct meanings in education circles, and applying the wrong one would have meant rewriting a lot of lesson scaffolding once more authoritative literature surfaced.

Specifically, *which interpretation* of SMART should the AsterMind intern curriculum adopt?

## Method

A research subagent (general-purpose with web access) was dispatched with these directives:

1. Disambiguate the dominant interpretations of "SMART" in modern education and corporate L&D.
2. Find concrete templates and worked examples in technical / programming education contexts.
3. Surface known critiques and weaknesses, especially those relevant to self-paced asynchronous learning.
4. Identify complementary frameworks (Bloom, backward design, direct instruction).
5. Make a concrete recommendation tailored to: slide-deck lessons, beginner audience, both self-paced and presenter-led, ~30–60 min per lesson, code-heavy "you try" exercises.

Output: a structured ~600–900 word brief with inline citations linking to actual sources (no fabrication).

## What we found

### A. Two interpretations of "SMART"

| Interpretation | What SMART stands for | Where it lives |
|----------------|-----------------------|----------------|
| **A. Objective-writing rubric** (dominant) | **S**pecific, **M**easurable, **A**chievable, **R**elevant, **T**ime-bound (Doran, 1981) | University course-design guides, peer-reviewed medical-ed literature, corporate L&D publications |
| **B. Lesson-cycle acronym** (folklore) | "Show, Model, Apply, Reflect, Test" or similar reinterpretations | Some practitioner blogs; **does not appear in any peer-reviewed source surveyed** |

The agent surveyed Johns Hopkins School of Public Health Center for Teaching and Learning, Boston College CTE Resources, the University of Arkansas TIPS center, *Health Psychology Review* (Swann et al. 2022), Skillshub, Maestro Learning, SC Training, Scissortail, and the SMART criteria Wikipedia article. **Every reputable source treated SMART as A.** The closest established analogue to (B) was Maestro's well-supported "Tell-Show-Do-Review" structure — different acronym, different concept.

**Conclusion: any homemade "SMART-as-lesson-cycle" framing would confuse anyone who already knows SMART.**

### B. The A-SMART variant

Khogali et al. (2024, [PMC11589412](https://pmc.ncbi.nlm.nih.gov/articles/PMC11589412/)) propose prepending **A** for **Action-oriented**:

> *"By [time], the [audience] will [observable action verb + performance] as measured by [assessment + criteria]."*

The leading **A** is non-negotiable in their framing because plain SMART tolerates non-observable verbs like *understand* or *be familiar with*. The Action-oriented prefix forces a Bloom-aligned action verb (apply, build, train, classify, analyze) and bans the unobservable ones. For a code-heavy curriculum where every outcome should be demonstrable in a browser exercise, A-SMART maps better than plain SMART.

### C. The companion frameworks

- **Bloom's Taxonomy** (Anderson & Krathwohl 2001 revision) — the verb ladder: remember → understand → apply → analyze → evaluate → create. Every reputable course-design guide pairs Bloom + SMART explicitly.
- **Backward Design** (Wiggins & McTighe, *Understanding by Design*) — outcomes → assessments → activities, in that order. Khogali et al. explicitly position A-SMART as the Stage-1 artefact for backward design.
- **TSDR (Tell, Show, Do, Review)** — the well-supported direct-instruction shape. Maestro Learning publishes this as a stand-alone framework; it's the analogue of "I-do / We-do / You-do" used widely in K-12 and professional training.

### D. Known critiques

- **SMART can flatten learning** when wielded mechanically (Skillshub, Scissortail). Mitigation: include a Reflection beat in the lesson cycle to surface what's meaningful beyond what's measurable.
- **Weak theoretical grounding** ([Swann et al. 2022](https://www.tandfonline.com/doi/full/10.1080/17437199.2021.2023608) in *Health Psychology Review*) — SMART is a heuristic with limited empirical support; it's a *rubric*, not a theory.
- **Verbs like "understand" sneak in** unless the rubric is enforced. A-SMART addresses this directly.
- **Self-paced gap:** the literature does not name an asynchronous-specific critique; the transferable concern is that "Time-bound" loses meaning without a presenter, so the time anchor must shift to *lesson length* rather than *course deadline*.

## Decision

Adopt all three layered conventions (in [ADR-0002](../ADRs/ADR-0002-elm-explination-as-canonical-lesson-model.md)):

1. **A-SMART for learning outcomes.** Action-oriented prefix non-negotiable. Hopkins template:
   > *"By [time], the [audience] will [observable action verb + performance] as measured by [assessment + criteria]."*
2. **TSDR for slide arc.** Tell → Show → Do → Review.
3. **Backward Design for authoring.** Outcome → Assessment → Exposition → Review.

**Explicitly rejected:** the SMART-as-lesson-cycle interpretation. Documented in ADR-0002 so a future reader sees why we didn't adopt the homemade acronym.

In our context:
- **Time-bound** anchors to *lesson length* (30 / 45 / 60 min), not a course deadline. Async learners aren't blocked.
- **Measurable** ties to the **You-Try exercise's pass condition** (an accuracy number, expected console output, a downloadable artefact). Code-native.
- **Action verbs** drawn from Bloom levels 2–4 (apply, analyze) for beginner audiences.

## What surprised us

1. **The agent could not find a published SMART outcome for "train a classifier" specifically.** The closest match required adapting Khogali et al.'s skill-acquisition example. This was useful evidence: the AsterMind curriculum will likely *generate* the canonical examples for ML-newcomer-targeted SMART outcomes, not adopt them. Our worked examples may end up cited.

2. **Every reputable source uses SMART for *objectives*, not *cycles*.** The lesson-cycle interpretation that crept into the original "use SMART" prompt was folk practice, not literature. Worth flagging to anyone else who hears the phrase: the burden of proof is on the lesson-cycle camp.

3. **A-SMART is recent enough (2024) that calling it out by name has signal value.** The "A" makes the difference for code-heavy work; without it, lesson outcomes drift into "*understand* the kernel trick" territory and become unverifiable.

## Sources cited

- [Hopkins SPH CTL — Writing SMART Learning Objectives](https://ctl.jhsph.edu/blog/posts/SMART-learning-objectives/)
- [Khogali et al., A-SMART Learning Outcomes and Backward Design (PMC11589412)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11589412/)
- [Chatterjee & Corral, How to Write Well-Defined Learning Objectives (PMC5944406)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5944406/)
- [Boston College CTE — Learning Objectives](https://cteresources.bc.edu/documentation/learning-objectives/)
- [University of Arkansas TIPS — Bloom's Taxonomy for Objectives](https://tips.uark.edu/using-blooms-taxonomy/)
- Wiggins & McTighe, *Understanding by Design*
- Anderson & Krathwohl 2001 — revised Bloom's Taxonomy
- [Maestro Learning — Tell, Show, Do, Review](https://maestrolearning.com/blogs/tell-show-do-review/)
- [Swann et al. 2022 — (Over)use of SMART Goals (Health Psychology Review)](https://www.tandfonline.com/doi/full/10.1080/17437199.2021.2023608)
- [Skillshub — Writing SMART Learning Objectives](https://www.skillshub.com/blog/write-smart-learning-objectives/)
- [Scissortail — When SMART Objectives Lead to Stupid Training](https://scissortailcs.com/when-smart-objectives-lead-to-stupid-training/)
- [SMART criteria — Wikipedia](https://en.wikipedia.org/wiki/SMART_criteria)

## Where it landed

- **[ADR-0002 § Lesson pedagogy](../ADRs/ADR-0002-elm-explination-as-canonical-lesson-model.md)** — the formal decision with rationale and rejection of the lesson-cycle interpretation.
- **[IMPL-0002 § README schema](../implementation-plans/IMPL-0002-canonical-lesson-series.md)** — every lesson README must open with A-SMART outcomes; slide arc must follow TSDR.
- **[`examples/lessons/_template/README.md`](../../examples/lessons/_template/README.md)** — meta-lesson modelling the format with a worked example.
- **[`examples/lessons/L00-elm-primer/README.md`](../../examples/lessons/L00-elm-primer/README.md)** — first real application, with three A-SMART outcomes for the 45-minute primer.
- **[`GLOSSARY.md`](../../GLOSSARY.md)** — A-SMART, TSDR, Backward Design, Bloom's Taxonomy entries.

## Open questions / future work

- **Should the schema validator enforce A-SMART format in lesson READMEs?** Currently `tests/lessons-schema.test.ts` validates `slides.json` shape. Extending it to lint the README's outcomes block (e.g., reject "*understand*" verbs) would make the convention machine-enforced.
- **Where do "Reflection" prompts live?** TSDR puts Review last, but A-SMART's measurable bias might bury reflection. The L00 README handles this informally in the You-Try block; future lessons might formalise it as a named slide.
- **Cross-lesson coherence.** Each lesson has its own A-SMART outcomes, but how do we verify the *curriculum-level* outcome (a learner finishing L00–L10 can ship a real demo)? An end-of-curriculum capstone evaluation isn't yet specified.
