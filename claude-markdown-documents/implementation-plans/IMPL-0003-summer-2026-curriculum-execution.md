# IMPL-0003 — Summer 2026 internship curriculum execution

- **Linked ADR:** [ADR-0003](../ADRs/ADR-0003-summer-2026-curriculum-structure.md)
- **Depends on:** [IMPL-0001](./IMPL-0001-consolidate-repo-and-prepare-for-interns.md) ✅ complete; [IMPL-0002 Phase 0–1](./IMPL-0002-canonical-lesson-series.md) ✅ complete (template scaffold + L00 shipped)
- **Supersedes:** [IMPL-0002 Phases 2–5](./IMPL-0002-canonical-lesson-series.md) — different curriculum shape, fixed calendar.
- **Status:** Proposed
- **Owner:** Julian Wilkison-Duran (Chief Scientist); Nolan Moore as cohort lead.
- **Total elapsed:** 2026-05-05 → 2026-07-28 (12 weeks; 8-week program window + 4 weeks of pre/post).

## Goals

1. Land all three RMC-track interns (Thomas, Jarrett) and the VCU-track lead (Nolan) on a successful July 24 final presentation.
2. Each intern hits the A-SMART capstone bar from [ADR-0003](../ADRs/ADR-0003-summer-2026-curriculum-structure.md).
3. The repo gains real new artifacts (capstone code, infrastructure, NB-005) — not just consumed-curriculum.
4. Sam Henry receives a credible performance report for each RMC student by 2026-07-28.

## Non-goals

- Authoring L07–L09 (DeepELM, retrieval, Web Workers) this cohort.
- Public GitHub Pages publication of lessons (deferred; possible Nolan stretch goal).
- Hiring decisions / extending interns past July 24 (separate, post-cohort).

## Calendar at a glance

```
                         2026
       Mon         Tue         Wed         Thu         Fri
W-1   May 5       May 6       May 7       May 8       May 9          ← Phase 0: prep starts (L01 draft)
 0    May 12      May 13      May 14      May 15      May 16         ← Phase 1: Nolan onboards as pilot
 1    May 19      May 20      May 21      May 22      May 23         ← Phase 1: Nolan + L01-L03 polish
 2    May 26      May 27      May 28      May 29      May 30         ← Phase 1: L04-L06 drafts; capstone briefs
═══════════════════ PROGRAM WINDOW ═══════════════════
 3    Jun 1       Jun 2       Jun 3       Jun 4       Jun 5          ← Phase 2: Thomas day 1 — L01
 4    Jun 8       Jun 9       Jun 10      Jun 11      Jun 12         ← Phase 2: Thomas L02-L03; demo Fri
 5    Jun 15      Jun 16      Jun 17      Jun 18      Jun 19         ← Phase 3: Thomas L04 + capstone scope
 6    Jun 22      Jun 23      Jun 24      Jun 25      Jun 26         ← Phase 3: Jarrett day 1 — L01; Thomas builds
 7    Jun 29      Jun 30      Jul 1       Jul 2       Jul 3          ← Phase 3: Jarrett L02-L03; Thomas L06 (opt)
 8    Jul 6       Jul 7       Jul 8       Jul 9       Jul 10         ← Phase 4: Capstone build; Jarrett L05
 9    Jul 13      Jul 14      Jul 15      Jul 16      Jul 17         ← Phase 4: Capstone build, code review
 10   Jul 20      Jul 21      Jul 22      Jul 23      Jul 24         ← Phase 5: Rehearsal; FINAL PRESENTATION
═══════════════════ END WINDOW ═══════════════════
 11   Jul 27      Jul 28      Jul 29      Jul 30      Jul 31         ← Phase 6: Reports to Sam; retro
```

## Phases

### Phase 0 — Pre-cohort prep (May 5 – May 11; ~6 days)

**Why first:** Lesson content has to exist before interns arrive. Solo Julian work.

**Steps:**
1. **Communicate program dates to the cohort.** Email Thomas + Jarrett: program runs **June 1 – July 24, 2026** per RMC's window (Prof. Sam Henry). These dates are fixed; interns adjust their schedules to fit, not the other way around. Confirm with Sam the on-site final-presentation slot in the week of July 20–24.
2. **Draft `examples/lessons/L01-js-ts-in-this-repo/`** following the template. A-SMART outcome focuses on a one-line PR shipped to a `lesson-pr-target` branch with a green CI check.
3. **Draft `examples/lessons/L02-first-classifier/`**. A-SMART outcome: train an `IntentClassifier` on a 2-class greeting set, achieve ≥80% accuracy on a 3-example holdout.
4. **Draft `examples/lessons/L03-embeddings-similarity/`**. A-SMART outcome: build an `EmbeddingStore` with 10 phrases, query with a typed phrase, return top-3 by cosine.
5. **Stub `examples/capstones/`** directory with a README explaining the lane model + the three lane subdirectories with empty `STARTER.md` files.

**Done when:**
- [ ] Dates confirmed (or mismatch flagged) with all three interns + Sam.
- [ ] L01–L03 each has all five files; runs via `npm run dev:lessons`.
- [ ] Each L01–L03 README has 1–3 A-SMART outcomes (action verb + measurable + time-bound).
- [ ] Each L01–L03 slide arc is labeled TSDR — a reviewer can name which slides are Tell/Show/Do/Review.
- [ ] `examples/capstones/{thomas-adaptive-game,jarrett-lotl-classifier,nolan-infrastructure}/STARTER.md` exist.

---

### Phase 1 — Nolan pilot + L04-L06 drafting (May 12 – May 31; ~3 weeks)

**Why second:** Nolan walks L01–L03 first as the pilot test. His feedback drives revisions before Thomas arrives. In parallel, draft the capability lessons.

**Steps:**
1. **Onboard Nolan.** SSH access (he has Claude/Copilot already). Repo clone. Walk him through CONTRIBUTING.md.
2. **Nolan walks L01 → L02 → L03**, taking notes on confusion points, broken steps, missing context. Target: 1 lesson per ~3 days at his pace alongside school.
3. **Patch L01–L03** based on Nolan's notes. Common patches expected: prerequisite gaps, install steps that assume Mac, Bloom-verb drift in outcomes.
4. **Draft `examples/lessons/L04-online-elm/`** (Thomas-lane primary). A-SMART outcome: train an `OnlineELM` on a streaming source, observe accuracy improving across batches.
5. **Draft `examples/lessons/L05-classification-confidence/`** (Jarrett-lane primary). A-SMART outcome: build a classifier with a tunable confidence threshold; produce a 3-point precision/recall table.
6. **Draft `examples/lessons/L06-kernels-nystrom/`** (Nolan-lane primary). A-SMART outcome: train a `KernelELM` with RBF + Nyström on a non-linear toy problem; show the decision boundary; explain Nyström's role in your own words.
7. **Nolan begins his lane work in parallel:** GitHub Discussions categories drafted, issue templates drafted, NPM publishing checklist research started.
8. **Curate Jarrett's LOTL dataset (Julian-owned).** Bundle ~200–500 commands at `examples/capstones/jarrett-lotl-classifier/data/lotl-commands.json`, balanced ~50/50:
   - *Malicious side:* MITRE Atomic Red Team atomics (vetted by ATT&CK technique mapping), LolBAS abuse examples, Mordor / Open Threat Research labeled telemetry. Verify each license permits redistribution; cite source per row.
   - *Benign side:* GitHub admin-script corpora (MIT/Apache-licensed only), Linux distro maintainer scripts, common DBA / DevOps snippets.
   - Schema: `{ command: string, label: "benign" | "malicious", source: string, technique?: string, license: string }`.
   - **Owned by Julian, not Jarrett** — if this isn't ready by June 22, Jarrett loses a week of his already-tight schedule on data wrangling. This is the riskiest single dependency in the plan.
9. **Capstone briefs published.** Each `examples/capstones/<lane>/STARTER.md` gets:
   - The A-SMART outcome from ADR-0003.
   - "What we'll provide" (datasets, scaffold code).
   - "What you'll build" (concrete deliverable list).
   - "How you'll know you're done" (the measurable bar restated as a checklist).

**Done when:**
- [ ] Nolan has completed L01–L03 you-try blocks.
- [ ] L01–L03 patched per Nolan's feedback; revision notes captured in `claude-markdown-documents/research-notebooks/NB-005+` (Nolan-authored or co-authored).
- [ ] L04–L06 drafts exist (slides + speaker notes + you-try); polish can continue into Phase 3.
- [ ] **`examples/capstones/jarrett-lotl-classifier/data/lotl-commands.json` exists with ≥200 balanced, license-attributed entries.**
- [ ] All three capstone STARTER.md files complete with criteria.
- [ ] Nolan has filed at least one PR (could be lesson patches).

---

### Phase 2 — Thomas onboarding (June 1 – June 14; ~2 weeks, ~80 hrs)

**Why third:** Thomas arrives with the most hours and the longest runway. Get him to "I shipped a thing" by end of week 4.

**Steps:**
1. **Day 1 (Mon June 1):** kickoff call with Julian + Nolan. Repo setup, env check, first commit on a `thomas-onboarding` branch.
2. **Days 2–5:** Thomas works through L01 (JS/TS in this repo). You-try is shipping a one-line PR.
3. **Days 6–10:** Thomas works through L02 (first classifier) and L03 (embeddings).
4. **Friday demos** end of weeks 3 and 4: Thomas presents his you-try outputs in a deck-format mini-presentation (5 min each). This is rehearsal for July 24.
5. **End of Phase 2 (Fri June 12):** capstone scoping conversation with Julian. Thomas confirms or adjusts the rock-paper-scissors default; if he picks an alternative game, document the alternative + why.

**Done when:**
- [ ] Thomas has merged ≥1 PR.
- [ ] L01–L03 you-try blocks completed and logged.
- [ ] Capstone game decision recorded in `examples/capstones/thomas-adaptive-game/STARTER.md`.
- [ ] Two Friday demos delivered.

---

### Phase 3 — Thomas capability + Jarrett onboarding (June 15 – July 5; ~3 weeks)

**Why fourth:** Two parallel tracks. Thomas is past L01–L03 and starts capstone capability work. Jarrett joins June 22 and walks the same L01–L03 path Thomas just did.

**Steps:**
1. **Week 5 (Jun 15–19) — Thomas only:**
   - L04 (Online ELM) — required for his lane.
   - Begin capstone scaffolding: build the game shell (HTML + game loop), no learning yet.
2. **Week 6 (Jun 22–26) — Jarrett day 1:**
   - Mon Jun 22: kickoff call with Julian. Thomas pairs with Jarrett on Tuesday afternoon for a "JS basics walkthrough" (Thomas's first teaching, only one week ahead — that's fine; teaching cements learning).
   - Jarrett works through L01 across the week.
   - Thomas continues capstone build: integrate `OnlineELM`, see first online updates.
3. **Week 7 (Jun 29 – Jul 3):**
   - Jarrett: L02 + L03.
   - Thomas: L06 (kernels) optional pick or capstone polish; first capstone end-to-end demo (rough).
4. **Friday demo each week.**

**Done when:**
- [ ] Thomas has L04 complete and capstone has visible online learning.
- [ ] Jarrett has L01–L03 complete by end of week 7.
- [ ] Three more Friday demos delivered.

---

### Phase 4 — Capstone build + Jarrett capability (July 6 – July 17; ~2 weeks)

**Why fifth:** Final build window. Capstone code stabilizes, tests get written, presentations get drafted.

**Steps:**
1. **Week 8 (Jul 6–10):**
   - Jarrett: L05 (classification with confidence) — his lane's required capability lesson.
   - Jarrett: capstone scaffolding — load the pre-curated LOTL dataset from Phase 1, wire feature extraction (token encoder + engineered numeric features into `FeatureCombinerELM`), classifier wiring, threshold UI.
   - Thomas: capstone polish — accuracy tuning, UI, write the test suite for non-render logic.
   - Nolan: NB-005 (RFF derivation) drafting; Discussions go-live.
2. **Week 9 (Jul 13–17):**
   - All three: capstone code review with Julian. Address the Sam-Henry "first job" angle — *is the README clear enough that Sam could open it cold and understand?*
   - Jarrett: capstone integration; hit the ≥85% accuracy bar.
   - Thomas: hit the ≥10 pp win-rate-improvement bar.
   - Nolan: PUBLISHING.md complete; Discussions has ≥5 starter threads.
3. **Friday Jul 17:** dry-run presentations (full deck, full demo). Brutal feedback acceptable.

**Done when:**
- [ ] All three capstones meet their A-SMART measurable bar in a recorded demo.
- [ ] All three capstones have a `README.md` Sam could read cold.
- [ ] All capstone code passes `npm test` and `npm run build`.
- [ ] Dry-run presentations delivered on Jul 17.

---

### Phase 5 — Final week + on-site presentation (July 20 – July 24; 1 week)

**Why sixth:** The assessment artifact week. Sam attends or reviews recordings.

**Steps:**
1. **Mon Jul 20:** presentation rehearsals. Slides finalized.
2. **Tue Jul 21:** rehearsal #2; Q&A practice (Julian + Nolan as audience).
3. **Wed/Thu Jul 22–23:** buffer + last-minute polish + retro prep.
4. **Fri Jul 24:** **on-site final presentations.** 5 min Thomas, 5 min Jarrett, 10 min Nolan, 10 min Q&A combined. Sam attends.
5. Cohort retro after the presentations: what worked, what didn't, what should change for the next cohort.

**Done when:**
- [ ] All three presentations delivered.
- [ ] Sam acknowledges receipt + sets a date for performance-report return.
- [ ] Cohort retro notes captured in `claude-markdown-documents/research-notebooks/NB-006-summer-2026-cohort-retro.md`.

---

### Phase 6 — Wrap-up (July 27 – July 31)

**Why seventh:** Loose ends, performance reports, repo state-of-the-union.

**Steps:**
1. Performance reports written and sent to Sam by Tue Jul 28.
2. Capstone PRs merged to `main` (or a `cohort-2026-summer/` archive branch if not main-quality).
3. Repo's root `README.md` updated with a "Built by the Summer 2026 cohort" callout linking to capstones.
4. Issue filed for the next-cohort plan with lessons-learned from NB-006.

**Done when:**
- [ ] Two performance reports submitted to Sam.
- [ ] Capstone code in `main` or archived appropriately.
- [ ] Next-cohort issue filed.

## Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Jarrett misses 130-hr minimum due to part-time | Med | High (RMC credit risk) | Track hours weekly from June 22; flag at week 6 if behind; offer Saturday hours |
| Thomas's capstone game doesn't show ≥10 pp learning gain | Med | Med | RPS default is well-bounded; have a fallback "predict the next button" minigame in case RPS doesn't surface signal |
| Jarrett's LOTL classifier doesn't hit ≥85% | Low-Med | Med | Documented narrower fallback: scope down to encoded-PowerShell detection (T1059.001 only) — same A-SMART bar, smaller surface |
| LOTL dataset isn't pre-curated by June 22 | Med | High | Phase 1 step 8 owned by Julian; treat as P0 if slipping at end of May |
| L04–L06 drafts don't get polished before they're needed | Med | Med | Polish in-flight during Phase 3 is acceptable — Nolan can co-edit |
| Final presentation tech fails on-site | Low | High | All capstones run from a static HTML + dist bundle; demo from a single laptop with offline copy |
| One intern's pace blocks another | Low | Low | Self-paced model + lane-isolation already mitigates |
| Nolan's school workload overwhelms his pre-June time | Med | Low | Phase 1 scope is "pilot + drafts", not "ship everything"; slip is absorbable |
| Intern requests to extend past July 24 | Med | Low | Out of scope for this plan; handle as a separate post-cohort arrangement if it comes up |

## Validation / how we'll know it worked

- All three capstones meet their A-SMART measurable bar (recorded in the dry-run on Jul 17).
- Sam's performance reports for Thomas + Jarrett come back without "this student wasn't ready" or "scope was unclear" notes.
- Nolan files at least 5 PRs (lessons patches + infrastructure + NB-005) by Jul 24.
- The repo gains: 3 capstone directories, NB-005 (RFF), NB-006 (cohort retro), `docs/PUBLISHING.md`, GitHub Discussions live.
- One of the three interns expresses interest in returning (next cohort, contractor, or referral).

## See also

- [ADR-0003](../ADRs/ADR-0003-summer-2026-curriculum-structure.md) — the curriculum decision.
- [ADR-0002 § Lesson pedagogy](../ADRs/ADR-0002-elm-explination-as-canonical-lesson-model.md#lesson-pedagogy) — A-SMART + TSDR + Backward Design (applied to every lesson and capstone in this plan).
- [IMPL-0002](./IMPL-0002-canonical-lesson-series.md) — Phases 0–1 (template + L00) are the foundation this builds on.
- [NB-004](../research-notebooks/NB-004-lesson-curriculum-design.md) — original curriculum hypothesis.
