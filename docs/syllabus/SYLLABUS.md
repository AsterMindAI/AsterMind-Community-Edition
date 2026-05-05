---
title: "AsterMind Summer 2026 Internship — Syllabus"
subtitle: "Browser-First Machine Learning with Extreme Learning Machines"
author:
  - Julian Wilkison-Duran, CTO — AsterMind AI Co.
date: "Prepared 2026-05-05"
documentclass: article
geometry: margin=1in
fontsize: 11pt
linkcolor: blue
urlcolor: blue
---

# AsterMind Summer 2026 Internship Syllabus

**Employer:** AsterMind AI Co.
**Site / Mode:** Remote (with on-site final presentation in Richmond, VA)
**Program window:** **June 1, 2026 – July 24, 2026** (8 weeks)
**Industry mentor / Author:** Julian Wilkison-Duran, CTO
**Academic advisor (RMC):** Sam Henry, Asst. Prof., Computer Science, Randolph-Macon College
**Document version:** 2026-05-05 (rev 1) — for Prof. Henry's review prior to the program start.

---

## 1. Program description

AsterMind is a small machine-learning company building **Extreme Learning Machines (ELMs)** — a class of fast, browser-runnable neural networks that solve in closed form rather than via backpropagation. Our open-source library (`@astermind/astermind-community`, MIT-licensed) is the focus of the summer 2026 internship.

The program is designed for students who are **new to both machine learning and JavaScript / TypeScript** but have written code before in some other language (Python, C/C++, GDScript, etc.). It is not a research internship in the academic sense; it is a *practitioner* internship — students will ship real, reviewable code to a public open-source project, write technical artifacts, and present their work to a live audience.

The program runs for **8 weeks (June 1 – July 24)** and is structured around:

- **Seven lessons** (L00 – L06) that build foundational skills in roughly the first three weeks.
- **Per-intern capstone projects** that occupy the remaining five weeks and culminate in an **on-site final presentation in the week of July 20 – 24**.

Each student completes a **minimum of 130 hours** (160 recommended) per the RMC internship requirements.

---

## 2. Program-level learning outcomes

By the end of the 8-week program, every intern will:

1. **Ship at least one reviewed pull request** to a public open-source TypeScript repository, with a green CI check.
2. **Train, evaluate, and present** a working machine-learning model (per the capstone lane outcomes in §6 below) inside a browser, with no backend, on a real dataset.
3. **Articulate the difference** between training accuracy and held-out accuracy, and between lexical and semantic similarity, using their own examples.
4. **Deliver a live on-site presentation** of their capstone work to a mixed audience (academic + industry), within a fixed time budget, including a runnable demo and a measurable result.

Outcomes 1–3 are technical. Outcome 4 is professional — it is, for most of these students, their first such presentation. We treat it as a deliverable, not an afterthought.

---

## 3. Pedagogical approach

Curriculum follows three established conventions (citations in §11):

### A-SMART learning outcomes

Every lesson and every capstone leads with one to three **A-SMART** outcomes — Action-oriented, Specific, Measurable, Achievable, Relevant, Time-bound — using the Johns Hopkins template:

> *"By [time], the [audience] will [observable action verb + performance] as measured by [assessment + criteria]."*

The leading "A" (Khogali et al., 2024) bans non-observable verbs ("understand", "be familiar with", "learn about") and forces a Bloom-aligned action verb (apply, build, train, classify, analyze). Worked example for L02:

> *"By the end of this 45-minute lesson, the intern will train an `IntentClassifier` on the bundled 20-example greeting dataset, achieve ≥80% accuracy on a 6-example held-out set, and export the trained snapshot as JSON — all in the live demo, in under 20 minutes."*

This is observable, measurable, achievable, and time-bounded against the lesson's runtime budget.

### TSDR slide arc

Every lesson's slide deck follows **Tell → Show → Do → Review** (Maestro Learning), the well-supported direct-instruction shape:

| Beat | Slides | Purpose |
|------|--------|---------|
| **Tell** | 2–4 | Motivate the concept. What problem does it solve? |
| **Show** | 3–5 | Walk a worked example. Visual metaphors over equations. |
| **Do** | 1–2 + live demo | The You-Try — the assessment that proves the outcome. |
| **Review** | 1–2 | "What did you observe? What surprised you?" Reflection prompts. |

Decks render in a static-HTML browser deck (no proprietary tooling); speaker notes are toggleable for self-paced study.

### Backward Design authoring

Lessons are written **outcome → assessment → exposition**, in that order — Wiggins & McTighe's *Understanding by Design*. The sequence:

1. Write the A-SMART outcome.
2. Design the You-Try exercise that proves it.
3. *Then* design the Tell + Show slides that prepare the learner.
4. Add the Review prompts.

This forces the assessment-outcome alignment that ad-hoc curriculum design typically loses.

> **Note on terminology.** We deliberately do **not** use "SMART" as a lesson cycle (e.g. "Show, Model, Apply, Reflect, Test"). That coinage is not in the recognized education literature and would conflict with the Johns Hopkins / A-SMART use of "SMART" for outcomes. We use TSDR as the slide-cycle term and reserve A-SMART for the outcome-writing rubric.

The full pedagogical decision and source list lives in [ADR-0002](../../claude-markdown-documents/ADRs/ADR-0002-elm-explination-as-canonical-lesson-model.md#lesson-pedagogy).

---

## 4. Cohort

| Name | School / Program | Start | End | Hours/wk | Specialty lane |
|------|-------------------|-------|-----|----------|----------------|
| **Nolan Moore** | VCU CS, Junior | May 12, 2026 | Jul 24, 2026 | flexible | **Lead-track**: community infrastructure + math research notebook |
| **Thomas Addison** | RMC CS, May '27 grad | Jun 1, 2026 | Jul 24, 2026 | 40 (full-time) | **Adaptive game** — `OnlineELM` |
| **Jarrett Hartsoe** | RMC Cybersecurity, Dec '26 grad | Jun 22, 2026 | Jul 24, 2026 | 25–30 | **LOTL command classifier** — `FeatureCombinerELM` |

Nolan's window is longer because he serves as the cohort's **lead intern** — he pilots each lesson before the RMC interns arrive, mentors them on JS basics, and runs the community-infrastructure work that is parallel to the lesson sequence.

---

## 5. Curriculum (Lessons L00 – L06)

Each lesson is a self-contained, runnable browser-deck with live interactive demos. The full lesson code lives at `examples/lessons/L<NN>-<slug>/` in the public repository.

| # | Title | Time | A-SMART outcome (abbreviated) |
|---|-------|------|-------------------------------|
| **L00** | ELM Primer | 45 min | Articulate why ELMs solve in closed form vs backpropagation, identify the random-projection step, and run the live demo to convergence — by end of deck. |
| **L01** | JS/TS in this repo | 45 min | Clone, install, run 106+ tests green, edit one line, observe a test failure, ship a draft PR with green CI — in 45 min. |
| **L02** | Your first classifier | 45 min | Train an `IntentClassifier` on a 20-example greeting set, hit ≥80% on a 6-example held-out, add a third class and retrain, export the snapshot as JSON — all in the live demo, in 45 min. |
| **L03** | Embeddings + similarity | 45 min | Encode 10 phrases via `UniversalEncoder`, query the `EmbeddingStore` with a typed phrase to get top-3 by cosine, identify and write down one limitation of character-level lexical similarity — in 45 min. |
| **L04** | Online learning (`OnlineELM`) | 45 min | Train an `OnlineELM` on a streaming source, observe accuracy improving across batches, tune the forgetting factor and explain its effect — in 45 min. *(Required for Thomas; optional for others.)* |
| **L05** | Classification with confidence | 45 min | Build a classifier with a tunable confidence threshold, produce a 3-row precision/recall table, and explain the precision-recall tradeoff verbally — in 45 min. *(Required for Jarrett; optional for others.)* |
| **L06** | Kernels and Nyström approximation | 60 min | Train a `KernelELM` with RBF + Nyström on a non-linear toy problem, plot the decision boundary, and explain Nyström's role in their own words — in 60 min. *(Required for Nolan; optional for others.)* |

Each lesson README has the full A-SMART outcome statement, slide arc map, and You-Try pass conditions. PDFs of L00–L03 are attached to this packet for review.

---

## 6. Capstones (Weeks 5 – 9)

Each intern owns **one capstone project** in their lane. Capstones are designed so each presentation is **independently assessable** — Sam will evaluate Thomas and Jarrett separately based on their respective deliverables.

### 6.1 Thomas Addison — Adaptive Rock-Paper-Scissors

> *"By July 24, 2026, Thomas will ship a static-HTML browser game (zero server) that uses `OnlineELM` to predict the player's next move across ≥30 consecutive rounds, achieving a measurable improvement in agent win rate of ≥10 percentage points between rounds 1–10 (untrained baseline) and rounds 21–30 (after online learning), and present it live in a 5-minute on-site demo during the final program week."*

The agent learns the player's behavioral pattern in real time using `OnlineELM`'s recursive-least-squares update. The visible artifact is a live win-rate chart that climbs as the model adapts. The audience plays a few rounds during the demo.

Plays directly to Thomas's strengths (Godot game design, custom-systems thinking demonstrated in his bio's "reflection shield" anecdote).

### 6.2 Jarrett Hartsoe — Living-Off-The-Land Command Classifier

> *"By July 24, 2026, Jarrett will ship a browser-based Living-Off-The-Land (LOTL) command classifier that distinguishes benign system-admin commands from malicious LOTL invocations on a curated dataset of ≥200 examples (50/50 balanced, drawn from MITRE Atomic Red Team and public admin-script corpora), achieving ≥85% accuracy on a held-out test set of ≥30 commands, with a confidence-threshold UI that exposes the precision/recall tradeoff visibly, and present it live in a 5-minute on-site demo during the final program week."*

LOTL attacks (MITRE ATT&CK T1059, T1218, T1197) involve adversaries misusing legitimate pre-installed binaries — `powershell.exe`, `certutil.exe`, etc. — to evade signature-based detection. The classification problem is non-trivial because benign and malicious uses share the same binaries; the signal is in argument shape.

Plays directly to Jarrett's cybersecurity major and pen-testing interest. Dataset is pre-curated by AsterMind before Jarrett's start date to protect his (tighter) hours.

### 6.3 Nolan Moore — Community Infrastructure + Random Fourier Features Notebook

> *"By July 24, 2026, Nolan will publish: (a) a configured GitHub Discussions space with ≥3 categories and ≥5 seeded starter threads, (b) `docs/PUBLISHING.md` documenting an end-to-end NPM publish dry-run with provenance + 2FA, (c) a research notebook deriving Random Fourier Features from scratch with a runnable worked example, and present a 10-minute on-site walkthrough during the final program week."*

Three concrete deliverables matched to Nolan's lead-track scope. The math notebook is a portfolio piece — Nolan begins his AI/ML coursework at VCU in fall 2026, and deriving RFF from scratch this summer is a substantive head start.

Full STARTER documents for each capstone (with acceptance checklists and suggested approach) are attached to this packet.

---

## 7. Calendar

```
                         2026
       Mon         Tue         Wed         Thu         Fri
W-1   May 5       May 6       May 7       May 8       May 9          ← Program prep (Julian)
 0    May 12      May 13      May 14      May 15      May 16         ← Nolan onboards as pilot
 1    May 19      May 20      May 21      May 22      May 23         ← Nolan walks L01-L03
 2    May 26      May 27      May 28      May 29      May 30         ← L04-L06 drafts; capstone briefs published
═══════════════════ PROGRAM WINDOW ═══════════════════
 3    Jun 1       Jun 2       Jun 3       Jun 4       Jun 5          ← Thomas day 1 — L01
 4    Jun 8       Jun 9       Jun 10      Jun 11      Jun 12         ← Thomas L02-L03; Friday demo
 5    Jun 15      Jun 16      Jun 17      Jun 18      Jun 19         ← Thomas L04 + capstone scaffolding
 6    Jun 22      Jun 23      Jun 24      Jun 25      Jun 26         ← Jarrett day 1 — L01; Thomas builds capstone
 7    Jun 29      Jun 30      Jul 1       Jul 2       Jul 3          ← Jarrett L02-L03; Thomas L06 (opt)
 8    Jul 6       Jul 7       Jul 8       Jul 9       Jul 10         ← Capstone build; Jarrett L05
 9    Jul 13      Jul 14      Jul 15      Jul 16      Jul 17         ← Capstone build, code review, dry-run Fri
 10   Jul 20      Jul 21      Jul 22      Jul 23      Jul 24         ← Rehearsal; ★ FINAL ON-SITE PRESENTATION Fri ★
═══════════════════ END WINDOW ═══════════════════
 11   Jul 27      Jul 28      Jul 29      Jul 30      Jul 31         ← Performance reports to Prof. Henry by Tue Jul 28
```

**Friday demos** in weeks 4 – 9 give each intern weekly practice presenting work to the cohort. These compound into the on-site presentation skill.

---

## 8. Assessment

### What's measured and how

For each RMC intern (Thomas, Jarrett):

1. **Capstone A-SMART measurable bar** — meets / does not meet (binary, against the threshold in §6). Recorded during the Jul 17 dry-run.
2. **Capstone code quality** — passes `npm run build` and `npm test` on a fresh clone; vitest tests cover non-rendering logic; the README is comprehensible to someone reading cold.
3. **PR participation** — at least one merged or reviewed PR by Jul 24.
4. **Presentation quality** — 5-minute on-site demo against a rubric covering: time discipline, narrative arc (TSDR), clarity of measurable result, handling of audience questions.

For Nolan (VCU lead-track), the assessment shape is similar but the artifacts differ — see §6.3.

### What Prof. Henry receives (by Tue, July 28)

- A **per-intern performance report** (1–2 pages) addressing the four assessment dimensions above.
- Direct links to the public capstone code in the repo.
- The recorded 5-minute presentation (or live attendance, if Sam attends Friday Jul 24 on-site).
- Hours-tracked summary against the 130-hour minimum.

### What Prof. Henry can request anytime

- Mid-program check-in calls.
- Access to the Friday demo recordings.
- Sample work artifacts (PRs, lesson you-try outputs) before the program ends.

We will respond within two business days.

---

## 9. Professional expectations

### Cadence and communication

- **Daily standup** (15 min, async-friendly written update).
- **Weekly check-in with Julian** (30 min, scheduled).
- **Friday demos** for the full cohort.
- All cohort communication uses GitHub (issues, PRs, Discussions) and Microsoft Teams (synchronous meetings only).

### Code conduct

- All commits made by an intern are signed by that intern (we do not ghost-write).
- Pull requests target a designated `lesson-pr-target` branch first; no direct pushes to `main`.
- The library license is MIT; interns retain authorship attribution in commit history.
- Patent-pending core code (US 63/897,713) remains AsterMind property; intern contributions to *open-source* code (lessons, capstones, demos) remain MIT-licensed.

### What we will not ask interns to do

- Build proprietary closed-source product features. The internship is on the open-source community edition.
- Sign onto the patent. Their work stays publicly licensed and their own.
- Work outside agreed hours / past program end without separate post-cohort arrangement.

---

## 10. Risks we've identified and how we're managing them

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Jarrett misses the 130-hr minimum given part-time schedule | Med | Hours tracked weekly from Jun 22; flag at week 6 if behind; offer Saturday-hours option |
| Capstone bar not met by Jul 17 dry-run | Med | Documented narrower fallbacks for both technical capstones; bar is binary so we know early |
| Final presentation tech fails on-site | Low | All capstones are static HTML + JS bundle; demo from a single laptop with offline copy |
| Jarrett's LOTL dataset not pre-curated by Jun 22 | Med | Owned by Julian as a Phase 1 deliverable; treated as the single riskiest dependency |
| Intern requests to extend past Jul 24 | Med | Out of scope for syllabus; handled as separate post-cohort arrangement if it arises |

---

## 11. Sources and references

The pedagogical decisions in §3 draw on the following:

- Khogali et al. (2024). *A-SMART Learning Outcomes and Backward Design.* PMC11589412. <https://pmc.ncbi.nlm.nih.gov/articles/PMC11589412/>
- Johns Hopkins SPH CTL. *Writing SMART Learning Objectives.* <https://ctl.jhsph.edu/blog/posts/SMART-learning-objectives/>
- Chatterjee & Corral. *How to Write Well-Defined Learning Objectives.* PMC5944406.
- Maestro Learning. *Tell, Show, Do, Review.* <https://maestrolearning.com/blogs/tell-show-do-review/>
- Wiggins, G., & McTighe, J. (2005). *Understanding by Design* (2nd ed.). ASCD.
- Anderson, L. W., & Krathwohl, D. R. (Eds.) (2001). *A Taxonomy for Learning, Teaching, and Assessing: A Revision of Bloom's Taxonomy.* Longman.
- Swann, C., et al. (2022). *(Over)use of SMART Goals.* Health Psychology Review. <https://www.tandfonline.com/doi/full/10.1080/17437199.2021.2023608>

The technical content draws on:

- Huang, G.-B., Zhu, Q.-Y., & Siew, C.-K. (2006). *Extreme Learning Machine: Theory and applications.* Neurocomputing.
- Rahimi, A., & Recht, B. (2007). *Random Features for Large-Scale Kernel Machines.* NeurIPS.
- MITRE ATT&CK (Living-Off-The-Land technique families T1059, T1218, T1197). <https://attack.mitre.org/>
- LolBAS Project. <https://lolbas-project.github.io/>

---

## 12. Document attachments (PDF packet)

This syllabus is delivered with the following attachments:

1. **L00 — ELM Primer** (lesson README)
2. **L01 — JS/TS in this repo** (lesson README)
3. **L02 — Your first classifier** (lesson README)
4. **L03 — Embeddings + similarity** (lesson README)
5. **Capstone STARTER — Thomas (Adaptive RPS)**
6. **Capstone STARTER — Jarrett (LOTL classifier)**
7. **Capstone STARTER — Nolan (Infrastructure + RFF)**
8. **ADR-0003** — the curriculum-structure decision record
9. **IMPL-0003** — the 8-week execution plan

These attachments are also live in the public repository at <https://github.com/AsterMindAI/AsterMind-Community-Edition>.

---

## 13. Sign-off

We invite Prof. Henry's review and feedback before the program start on June 1, 2026. Feedback may be returned in any form (email, marked-up PDF, mid-program check-in call). Items we are particularly interested in feedback on:

- **A-SMART outcome rigor.** Are the measurable bars (≥80%, ≥85%, ≥10 pp) appropriate for first-job interns?
- **Workload calibration.** Is 7 lessons + 3-week capstone build realistic for the hours involved?
- **Final-presentation rubric.** Does the 5-minute / 10-minute time budget give a fair assessment surface?
- **Anything else** that would help the program serve RMC's CS students better.

— *Julian Wilkison-Duran, CTO, AsterMind AI Co.*
*julian@astermind.ai*
*Document version: 2026-05-05 rev 1*
