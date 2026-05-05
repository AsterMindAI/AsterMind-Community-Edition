# IMPL-0002 — Canonical lesson series for interns

- **Linked ADR:** [ADR-0002](../ADRs/ADR-0002-elm-explination-as-canonical-lesson-model.md)
- **Depends on:** [IMPL-0001](./IMPL-0001-consolidate-repo-and-prepare-for-interns.md) Phase 1–2 (the cleanup) should land first so lessons don't reference retired classes.
- **Status:** **Phase 0–1 ✅ Implemented; Phases 2–5 superseded by [IMPL-0003](./IMPL-0003-summer-2026-curriculum-execution.md)** (2026-05-05) — once we knew the cohort and the fixed June 1 – July 24 program window, the 10-lesson sequential hypothesis no longer fit. The curriculum format and pedagogy from ADR-0002 still apply; only the lesson count, sequence, and capstone shape changed.
- **Owner:** Julian Wilkison-Duran (with intern co-authorship encouraged from L4 onward)
- **Estimated effort:** 8–12 lessons × 1–2 days each = ~3 weeks elapsed for a complete first pass; first 4 lessons in ~1 week.

## Goals

1. Take the existing [`examples/elm-explination/`](../../examples/elm-explination/) and **canonize its structure** as the lesson template.
2. Build a sequenced curriculum that takes a new intern from *"what's a neuron"* to *"I shipped a real demo"* without gaps.
3. Make lessons first-class citizens in the build (linted, runnable from npm scripts, break CI if they break).

## Non-goals

- A general ML course. We teach what AsterMind teaches; for everything else we link out.
- Backend or model-training-on-GPU material. AsterMind is browser-first; lessons stay browser-first.
- Localization or accessibility audits beyond what `elm-explination` already does.

## Lesson template (the format every lesson follows)

Every lesson lives at `examples/lessons/L<NN>-<slug>/` and contains exactly these five files. Anything else (images, datasets) goes under `assets/`.

```
examples/lessons/L01-what-is-a-neural-net/
├── README.md           # Short pitch, prerequisites, time estimate, learning outcomes
├── index.html          # Deck shell + styles (copy from L00 template, edit content)
├── slides.json         # Slide list as data (id, title, stage, body)
├── live-demo.js        # Interactive demo wired to specific slides
├── speaker-notes.js    # Per-slide notes; what to emphasize, where learners get stuck
└── assets/             # Images, datasets, downloaded models
```

### The `README.md` for each lesson must answer:

```markdown
# Lesson NN — <Title>

**Time budget:** 45 minutes
**Prerequisites:** Lesson NN-1 complete; `npm install` run in the repo root.

## Learning outcomes (A-SMART)

By the end of this lesson, the intern will:

1. **[Action verb]** [specific concept/artifact] in the live demo, achieving [measurable criterion], in under [time].
2. **[Action verb]** [second outcome].
3. (optional) **[Action verb]** [third outcome — keep to 1–3 total].

See [ADR-0002 § Lesson pedagogy](../../claude-markdown-documents/ADRs/ADR-0002-elm-explination-as-canonical-lesson-model.md) for the rationale and a worked example.

## Slide arc (TSDR)

Slides follow Tell → Show → Do → Review (per ADR-0002). The structure lives in the slides themselves; nothing more is needed here.

## Run it

```bash
npm run dev:lesson:NN
```

## You try

Each You-Try block maps 1:1 to a learning outcome above. Doing all of them is the assessment that proves the outcomes.
```

### The `slides.json` schema:

```json
[
  {
    "id": "slide01",
    "title": "What's a neuron, really?",
    "stage": "neuron",
    "body": "<paragraph in HTML>",
    "demo": "neuron-fire",
    "notes_id": "n01"
  }
]
```

`stage` triggers a layout/animation in `index.html`. `demo` is the name of a function exported by `live-demo.js`. `notes_id` keys into `speaker-notes.js`.

## Curriculum (proposed sequence)

This is the **starting hypothesis**. Validate against intern feedback after L0–L3 and revise.

| # | Title | Concept | Library surface taught | Dataset |
|---|-------|---------|------------------------|---------|
| **L00** | ELM Primer (refactored from `elm-explination`) | What an ELM is and why it's clever | `ELM` (basic) | toy 2D classification |
| **L01** | JavaScript & TypeScript for ML newcomers | Just enough TS to read this codebase | none | — |
| **L02** | Your first classifier | Train, predict, evaluate | `ELM` + `Evaluation` | tiny language detection |
| **L03** | Embeddings — turning words into vectors | What an embedding is, intuitively | `UniversalEncoder`, `getEmbedding` | small text corpus |
| **L04** | Search with embeddings | Cosine similarity, retrieval | `EmbeddingStore`, `KNN` | recipe finder |
| **L05** | When data keeps coming — Online ELM | Streaming updates without full retraining | `OnlineELM` (RLS, forgetting) | live click stream |
| **L06** | The kernel trick — KernelELM | Why kernels matter, Nyström intuition | `KernelELM` (RBF, Nyström) | non-linear toy problem |
| **L07** | Going deeper — DeepELM | Stacking encoders | `DeepELM` | image-feature classifier |
| **L08** | TF-IDF and hybrid retrieval | Lexical + semantic search | `TFIDF`, `pro/retrieval` | document search |
| **L09** | Off the main thread — Web Workers | Why training blocks the UI; how workers help | `ELMWorkerClient` | retrain-on-feedback demo |
| **L10** | Build something real | Capstone: pick from 3 templates and ship | everything above | learner choice |

**Optional later lessons** (write only after demand):
- L11 — Synthetic data with OmegaSynth.
- L12 — Reranking and summarization (`pro/`).
- L13 — Transfer entropy and information flow (`pro/infoflow`).

## Phases

### Phase 0 — Build the lesson template (1 day)

**Why first:** Every later lesson copies this. Get it right once.

**Steps:**
1. Create `examples/lessons/_template/` with the five-file scaffold.
2. Extract the styling from `elm-explination/index.html` into a shared CSS file at `examples/lessons/_shared/lesson.css` (lessons import it).
3. Write a `_template/README.md` that explains the template itself (meta-lesson for whoever writes lesson NN+1).
4. Wire `npm run dev:lesson:NN` in `package.json` to run a lesson by number through vite.
5. Decide: does `slides.json` validate against a JSON schema? Recommend yes — add `lessons-schema.json` and a vitest test that loads each lesson's slides.json and asserts it conforms. **This is the "lessons break CI if broken" guarantee.**

**Done when:**
- [ ] `_template/` exists, copy-pasteable.
- [ ] Shared CSS extracted; `elm-explination` still renders identically using it.
- [ ] `npm run dev:lesson:_template` opens the template deck.
- [ ] `npm test` validates schema.

---

### Phase 1 — Refactor `elm-explination` into L00 (4 hours)

**Why second:** Prove the template works on a real lesson before we build new ones from it.

**Steps:**
1. Create `examples/lessons/L00-elm-primer/`.
2. Move (don't copy — keep git history) the contents of `examples/elm-explination/` into it.
3. Add a `README.md` following the template — pitch, prerequisites (none), time (45 min), learning outcomes.
4. Add a `you try` block at the end: three tasks like "Change the number of hidden units from 256 to 16. Retrain. What happens to accuracy? Why?"
5. Update `index.html` to import the shared CSS instead of inlining it.
6. Update `package.json` `dev:elm` script to point at the new path.
7. Update [`README.md`](../../README.md) (root) to link to the lesson series.

**Done when:**
- [ ] `examples/lessons/L00-elm-primer/` exists with all five files + README.
- [ ] `npm run dev:lesson:00` (or `npm run dev:elm`) opens the deck.
- [ ] Lesson renders identically to before the move.
- [ ] You-try block present.
- [ ] Old `examples/elm-explination/` removed (or aliased).

---

### Phase 2 — Lessons L01–L03 (1 week)

**Why third:** This is the minimum surface that lets a new intern get from zero to "I trained a thing." Ship these before later lessons.

For each:
1. Outline the slides (storyboard in markdown — title + one-line per slide).
2. Sketch the live demo (what does the learner click, what do they see).
3. Write speaker notes alongside the slides.
4. Write the README + you-try block last.

**L01 — JavaScript & TypeScript for ML newcomers**
- Audience: knows basic programming, hasn't written TS.
- 8–10 slides: types, interfaces, async/await, modules, npm, the `dist/` story.
- Live demo: a typed function that wraps an `ELM` constructor — learner adds a property and watches the type error appear in real time.

**L02 — Your first classifier**
- 12 slides: data → train → predict → evaluate.
- Live demo: train a 2-class classifier on hand-typed examples ("English" vs "French" greetings), evaluate accuracy live.
- You-try: add a third class. Add 5 more training examples. See how accuracy changes.

**L03 — Embeddings**
- 14 slides: words as numbers, why a vector, what cosine similarity means visually.
- Live demo: type two phrases, see their cosine similarity update live.
- You-try: find the most similar phrase in a small corpus.

**Done when:**
- [ ] L01–L03 each has all 5 files.
- [ ] Each runs via `npm run dev:lesson:NN`.
- [ ] Each has a working you-try block.
- [ ] First intern (or test learner) walks all three in under 3 hours, unaided.

---

### Phase 3 — Lessons L04–L09 (2 weeks)

By this point the format is proven and we know what works. Interns can co-author from here on — pair an intern with the lesson model and let them write a draft, then review.

Each lesson follows the same outline:slides → demo → speaker notes → README → you-try.

**Pacing tip:** Don't write more than 2 lessons in a row without an intern walking through one. Real friction shows up in real learners.

**Done when:**
- [ ] L04–L09 each has all 5 files.
- [ ] Each runs via `npm run dev:lesson:NN`.
- [ ] At least one intern has walked the full L00–L09 sequence and given written feedback.

---

### Phase 4 — L10 capstone + curriculum index (3 days)

**L10 — Build something real**
- No slides. Just three project templates the learner picks from:
  1. **Browser autocomplete** — finish a partial implementation; ship to GitHub Pages.
  2. **In-page search** — RAG-style retrieval over the AsterMind docs themselves.
  3. **Interactive ML game** — a small game where the model learns from the player's clicks (Online ELM).
- Each template has a `STARTER.md` with the gap to fill and a `SOLUTION/` directory the learner doesn't peek at until they're done.

**Curriculum index:** `examples/lessons/README.md` — table of all lessons with time + prerequisite chain + outcome statements. This is the "where do I start?" page intern day-1 lands on.

**Done when:**
- [ ] L10 with three working starter templates and three reference solutions.
- [ ] `examples/lessons/README.md` exists with curriculum table.
- [ ] Root `README.md` and `CONTRIBUTING.md` link to `examples/lessons/README.md` as the intern entry point.

---

### Phase 5 — Make it sustainable (ongoing)

**Once the curriculum exists:**
1. **CI guard.** Add a vitest test that loads every lesson's `slides.json` and validates it. Add a build step that confirms each lesson's `live-demo.js` imports a valid public API symbol (catches drift when the library evolves).
2. **Update protocol.** When someone changes a public API method, the PR template asks: "Does this break any lesson?" with a checkbox.
3. **Intern feedback loop.** After each intern cohort, file an issue per lesson with what was confusing. Patch in the next quarter's update.
4. **Lesson contribution guide.** A short section in `CONTRIBUTING.md` (added in IMPL-0001) explaining how to add a new lesson — copy the template, follow the format, propose the sequence position in a PR.

## Risks and how we mitigate them

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Lessons go stale as the library evolves | High | Phase 5 CI guard catches API drift; intern feedback catches conceptual drift. |
| Lesson scope creeps (we try to teach everything) | High | The 10-lesson target is a hard cap for v1; everything else is "later". |
| Authoring is more work than expected | Medium | Phase 1 (refactor L00) gives us a real time signal early; if it takes >1 day, downsize the curriculum. |
| Interns find the lessons patronizing or too slow | Medium | Each lesson opens with "skip if you already know X" pointers. The you-try blocks have an "advanced" tier for fast learners. |
| Live demos are buggier than the library proper | Low | Demos use only the public API; if a demo bug surfaces a real library bug, that's a win. |

## Validation / how we'll know it worked

- A new intern, day 1, lands on `examples/lessons/README.md` and walks L00 → L03 in the first ~3 hours without asking the team a question.
- Within 2 weeks, the same intern has shipped a PR that cites a specific lesson as where they learned the relevant concept.
- The first external contributor (non-employee, non-intern) opens an issue or PR referencing a lesson by number.

## See also

- [ADR-0002](../ADRs/ADR-0002-elm-explination-as-canonical-lesson-model.md) — the why.
- [IMPL-0001](./IMPL-0001-consolidate-repo-and-prepare-for-interns.md) — the cleanup that needs to land first or in parallel.
- The existing [`examples/elm-explination/`](../../examples/elm-explination/) — the artifact we're canonizing.
