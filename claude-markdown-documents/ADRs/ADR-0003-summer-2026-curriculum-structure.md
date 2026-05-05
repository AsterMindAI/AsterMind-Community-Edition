# ADR-0003 — Curriculum structure for the summer 2026 internship cohort

- **Status:** Proposed
- **Date:** 2026-05-05
- **Authors:** Julian Wilkison-Duran (with planning support from Claude / Vern)
- **Depends on:** [ADR-0002](./ADR-0002-elm-explination-as-canonical-lesson-model.md) (lesson format and pedagogy — A-SMART + TSDR + Backward Design).
- **Supersedes:** the curriculum sequence and capstone shape proposed in [IMPL-0002 § Curriculum](../implementation-plans/IMPL-0002-canonical-lesson-series.md). The lesson **format** decision in ADR-0002 still stands; only the *what and how many* changes here.

## Context

ADR-0002 canonized the lesson **format** (the five-asset shape, A-SMART outcomes, TSDR slide arc, Backward Design authoring) but left curriculum *content and sequence* as a 10-lesson placeholder hypothesis. We now have concrete information about who the curriculum is for, when, and how the program is assessed — that information forces a re-shape.

### The cohort (confirmed 2026-05-05)

Three interns + one already-engaged lead:

| Name | Program | Window | Hours/wk | Background | Lane fit |
|------|---------|--------|----------|------------|----------|
| **Nolan Moore** | VCU CS Junior (lead-track) | May 12 – July 24 | flexible | Just hit DS / NLP this semester; AI/ML proper is fall. *Limited TS.* Math-motivated; explicitly drawn to non-LLM systems. Has Claude/Copilot. | **Infrastructure + math** — Discussions, issues, NPM publish, FE-ML use cases, research notebook |
| **Thomas Addison** | RMC CS, May '27 grad | June 1 – July 24 | 40 (full-time) | Algorithms, Data Structures, OOP, Game Design. **Godot** experience (transfers well). Self-described "outside-the-box" — built a custom reflection-shield system when engine physics misbehaved. | **In-browser adaptive game** using OnlineELM |
| **Jarrett Hartsoe** | RMC Cybersecurity, Dec '26 grad | June 22 – July 24 | 25–30 (part-time) | Python, C/C++, MIPS, Linux shell. Methodical debugger. Pen-testing + game-dev interests. CompTIA A+. **No JS/TS.** | **Browser LOTL command classifier** — distinguish benign admin commands from Living-Off-The-Land malicious invocations |

### The fixed program window

Per the RMC advisor (Sam Henry, Asst. Prof. CS, Randolph-Macon):

- **Internship period: June 1 – July 24, 2026** (8 calendar weeks).
- **130 hr minimum** per intern; 160 hr recommended.
- **Final on-site presentation in the final week** is the assessment artifact. Sam writes a performance report based on it.
- "Higher-achieving students, but inexperienced, likely first real job" — Sam's framing.

We default to Sam's window over the interns' self-stated availability (Thomas wrote "June 1 – Aug 31"; Jarrett wrote "June 22 – Aug 28"). If they want to continue past July 24, that becomes a separate post-internship arrangement, not in scope here.

### What the bios change about ADR-0002's curriculum hypothesis

Three things shift:

1. **JavaScript is the bigger gap than ML.** None of the three has shipped TypeScript. Even Nolan, our strongest, says "limited Java/TypeScript". L01 must be the JS/TS on-ramp, not anything ML.
2. **There is no homogeneous cohort to sequence synchronously.** Nolan starts May 12 on a different track. Thomas is solo for 3 weeks (June 1 – June 21). Jarrett joins June 22 on part-time hours that put his minimum within 7 hours of Sam's 130 floor.
3. **The capstone is plural, not singular.** The original L10 ("pick from three templates") becomes one-template-per-intern with the lane chosen up front, not at the end. Each lane plays to a specific intern's strengths and unblocks them from competing for the same scope.

## Decision

We will run a **7-lesson curriculum (L00 – L06) plus three lane-specific capstones**, taught with the staggered self-paced model below.

### 1. Curriculum shape

| # | Title | Beat | Concept | Library surface | Audience |
|---|-------|------|---------|------------------|----------|
| **L00** | ELM Primer (✅ shipped) | Foundation | What an ELM is and why it's clever | `ELM` (basic) | All — pre-onboarding read |
| **L01** | JS/TS in this repo | Onboarding | Build, test, edit, ship a one-line PR | none — repo plumbing | All RMC interns, day 1 |
| **L02** | Your first classifier | Onboarding | Train, predict, evaluate | `ELM`, `Evaluation` | All RMC interns, day 2–3 |
| **L03** | Embeddings + similarity | Onboarding | Words → vectors → cosine | `UniversalEncoder`, `EmbeddingStore` | All RMC interns, day 4–5 |
| **L04** | Online learning with `OnlineELM` | Capability (Thomas-lane primary) | RLS + forgetting; updating without retraining | `OnlineELM` | Thomas required; others optional |
| **L05** | Classification with confidence | Capability (Jarrett-lane primary) | Thresholds, ROC, false positives matter | `ELM`, `ConfidenceClassifierELM` | Jarrett required; others optional |
| **L06** | Kernels and Nyström intuition | Capability (Nolan-lane primary) | Why kernels, when Nyström helps | `KernelELM` | Nolan required; others optional |
| **C-T** | **Capstone — Thomas** | Application | In-browser adaptive game | OnlineELM + game loop | Thomas |
| **C-J** | **Capstone — Jarrett** | Application | Browser LOTL command classifier | `FeatureCombinerELM` + thresholds + UI | Jarrett |
| **C-N** | **Capstone — Nolan** | Application | Community infrastructure + research notebook | tooling + writing | Nolan |

L07–L09 from the original IMPL-0002 (DeepELM, TF-IDF retrieval, Web Workers) are **deferred to a future cohort**. Their concepts can surface inside individual capstones if relevant, but they are not required curriculum for this cohort. We're picking depth over breadth.

### 2. Staggered self-paced model

The original IMPL-0002 implicitly assumed a synchronous cohort moving through L01 → L02 → L03 together. That doesn't fit. Instead:

- **L01–L03 are individual onboarding** — each intern works through them solo on their first ~5 working days, regardless of when that calendar week falls. Thomas does L01–L03 starting June 1; Jarrett does L01–L03 starting June 22.
- **L04–L06 are menu picks during weeks 3–5**, with each intern *required* to complete the lesson aligned to their capstone lane and *encouraged* (not required) to do the others. This protects Jarrett's tight hours.
- **Daily 15-minute standup** (async-ok via written update) keeps the cohort connected without forcing parallel progress.
- **Friday demos** — each intern shows what they built that week, in the deck format. This *is* practice for the final on-site presentation.

### 3. Capstone lanes (with A-SMART outcomes)

Per ADR-0002, every deliverable carries an A-SMART outcome. The three capstone outcomes:

**Thomas — In-browser adaptive game**

> *"By July 24, 2026, Thomas will ship a static-HTML browser game (zero server) that uses `OnlineELM` to predict the player's next move across ≥30 consecutive rounds, achieving a measurable improvement in agent win rate of ≥10 percentage points between rounds 1–10 (untrained baseline) and rounds 21–30 (after online learning), and present it live in a 5-minute on-site demo during the final program week."*

Default game: rock-paper-scissors against an adapting agent (smallest viable state space, clearest learning curve). Thomas may pick a different game shape if it meets the same outcome bar. Code lives at `examples/capstones/thomas-adaptive-game/` and ships with vitest tests for the non-rendering logic.

**Jarrett — Browser LOTL command classifier**

> *"By July 24, 2026, Jarrett will ship a browser-based Living-Off-The-Land (LOTL) command classifier that distinguishes benign system-admin commands from malicious LOTL invocations on a curated dataset of ≥200 examples (50/50 balanced, drawn from MITRE Atomic Red Team and public admin-script corpora), achieving ≥85% accuracy on a held-out test set of ≥30 commands, with a confidence-threshold UI that exposes the precision/recall tradeoff visibly, and present it live in a 5-minute on-site demo during the final program week."*

**Why LOTL.** Adversaries increasingly avoid bringing their own malware and instead misuse legitimate pre-installed binaries — `powershell.exe`, `certutil.exe`, `bitsadmin.exe`, `wmic.exe`, `mshta.exe`. The same binary appears in benign and malicious traffic; the signal is in *how* it's invoked (encoded payloads, suspicious flag combinations, network-fetch patterns). This is a real, current, unsolved-by-pattern-match security problem (MITRE ATT&CK T1059, T1218, T1197). It rewards a learned model in a way phishing-URL detection or generic spam classification do not.

**Implementation shape.** Static HTML page + text input. Pasted commands are tokenized + paired with engineered numeric features (encoded-blob presence, suspicious-flag count, LolBAS-name presence, argument entropy, network-indicator presence) and classified with `FeatureCombinerELM`. Confidence-threshold knob exposes precision/recall live on a held-out set.

**Dataset.** Bundled JSON of ~200–500 curated commands at `examples/capstones/jarrett-lotl-classifier/data/`, balanced ~50/50:
- *Malicious side:* MITRE Atomic Red Team atomics, LolBAS abuse examples, Mordor / Open Threat Research labeled telemetry.
- *Benign side:* GitHub admin-script corpora, Linux distro maintainer scripts, common DBA / DevOps command snippets.

Pre-curation of the bundled dataset is **owned by Julian in IMPL-0003 Phase 1** so Jarrett doesn't lose a week of his already-tight schedule on data wrangling.

**Documented narrower alternative.** If multi-binary scope feels too wide, Jarrett may scope down to **encoded-PowerShell detection** (just T1059.001 — `-EncodedCommand` and obfuscation patterns). Same A-SMART bar, smaller surface, easier to verify.

Code at `examples/capstones/jarrett-lotl-classifier/`.

**Nolan — Community infrastructure + research notebook**

> *"By July 24, 2026, Nolan will publish: (a) a configured GitHub Discussions space with ≥3 categories and ≥5 seeded starter threads, (b) `docs/PUBLISHING.md` documenting an end-to-end NPM publish dry-run with provenance + 2FA, (c) `claude-markdown-documents/research-notebooks/NB-005-random-fourier-features.md` deriving Random Fourier Features from scratch with a runnable worked example referencing `src/pro/math/`, and present a 10-minute on-site walkthrough during the final program week."*

Code/docs live in their target locations (not under `examples/capstones/`) since Nolan's deliverable is the repo itself.

## Why this and not something else

**A. Keep the original 10-lesson plan and push hard.**
Rejected. We have 8 weeks, two of them part-time. 10 lessons × any meaningful you-try work × intern speed = visibly underwater. Better to ship 7 strong lessons + 3 capstones than 10 thin ones.

**B. Single shared capstone.**
Rejected. Three different strength profiles and three different on-site presentations needed (Sam's report is per-student). One capstone forces them to compete for the same scope; lanes let them play to type.

**C. Synchronous cohort progression (everyone on the same lesson the same week).**
Rejected by the calendar. Nolan starts May 12; Jarrett starts June 22. Synchronous progression would either make Nolan wait three weeks doing nothing useful or make Jarrett start three weeks behind. Self-paced onboarding lessons sidestep both.

**D. Treat Nolan's track as not-curriculum and only run lessons for Thomas + Jarrett.**
Considered. Rejected because Nolan benefits from L02 + L03 anyway (he hasn't taken AI/ML yet) and pairing him on L01 polish before Thomas arrives is the cheapest pilot we can run. He's also a peer mentor — he should know what the others know.

**E. Defer all curriculum work; make the interns build the lessons.**
Tempting on cost. Rejected because the bios show all three need a learning ramp, not a teaching task. They can't build lessons for a thing they haven't learned. *After* the cohort, they can — and that's a logical IMPL-0004 if this works.

## Consequences

### Positive

- Each intern has a deliverable that maps cleanly to a 5–10 minute on-site presentation — Sam's assessment artifact lines up with our planning artifact.
- Lane-specific capstones reduce scope competition and let each intern "own" something in the final repo.
- Thomas's strength (game design + custom-systems thinking) gets pointed at the lesson concept (online learning) where it's most visible.
- Jarrett's part-time schedule isn't punished — he has fewer required lessons (L01–L03 + L05 + capstone = 5 things) than Thomas (L01–L03 + L04 + L06 + capstone = 6 things, with more weekly hours to do them).
- Nolan's lead role becomes formal: he's been doing infrastructure work since May 12, that work is now on the deliverable list with criteria.

### Negative

- Three capstones means three separate code reviews, three separate presentation rehearsals, and three separate feedback cycles in the final week. Higher mentor load than a single shared capstone.
- The L04–L06 menu means cross-lane learning is opt-in. Risk: an intern finishes the cohort knowing only their lane's lesson. Mitigation: the Friday demos expose everyone to everyone's work, even without doing the you-try.
- L07–L09 (DeepELM, TF-IDF retrieval, Web Workers) won't be authored this cohort. Future-cohort risk: those concepts get written under more time pressure later.

### Neutral

- Nolan's program rules differ from RMC's (VCU credit pathway, different start date, no Sam-style report). His final presentation is internal — to Julian and the cohort — rather than on-site to RMC. We document this so it doesn't surprise anyone.

## Out of scope (for this ADR)

- Wage/stipend specifics (handled separately by Julian).
- VCU credit paperwork for Nolan (in flight; not curriculum).
- Whether lessons get hosted on GitHub Pages publicly during or after the cohort (separate decision; recommend deferring until after the cohort ships, then making it Nolan's late-cohort deliverable if time permits).
- Localization, certificates, third-party LMS integration.
- Long-term curriculum (L07+ for future cohorts) — separate ADR when there's a future cohort.

## Validation / how we'll know it worked

- **Onboarding:** each intern completes L01–L03 within their first 5 working days, unaided beyond standup questions.
- **A-SMART rigor:** every lesson README and every capstone outcome passes the action-verb-and-measurability review (no "understand", no "be familiar with").
- **Capstone bar:** each capstone hits its A-SMART measurable bar (Thomas's ≥10 pp win-rate gain, Jarrett's ≥85% accuracy, Nolan's three artifacts present and reviewed).
- **Presentation:** all three present on-site (or remote-equivalent for Nolan) in the final program week. Performance reports submitted to Sam by July 28.
- **Repo health:** by July 24, every capstone's code lives in the repo, has tests, follows the four-rule bar from CONTRIBUTING.md, and passes CI.
- **Long-arc signal (Q4 2026):** at least one capstone gets cited in an external blog post, talk, or job application.

## See also

- [ADR-0002](./ADR-0002-elm-explination-as-canonical-lesson-model.md) — lesson format and pedagogy this curriculum follows.
- [IMPL-0003](../implementation-plans/IMPL-0003-summer-2026-curriculum-execution.md) — the week-by-week execution plan.
- [IMPL-0002](../implementation-plans/IMPL-0002-canonical-lesson-series.md) — Phase 0 (template) and Phase 1 (L00 refactor) are still in force; Phases 2–5 are superseded by IMPL-0003.
- [NB-004](../research-notebooks/NB-004-lesson-curriculum-design.md) — the research notebook on the original curriculum design.
