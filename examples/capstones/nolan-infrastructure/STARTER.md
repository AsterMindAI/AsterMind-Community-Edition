# Capstone — Nolan — Community Infrastructure + RFF Research Notebook

> **Status:** STARTER (initial scoping — refine at kickoff May 12)
> **Owner:** Nolan Moore (cohort lead)
> **Window:** May 12 – July 24 (longer than the RMC interns; you're VCU-track)
> **Final presentation:** 10 minutes on Jul 24 — internal to Julian + cohort, not the RMC on-site

## A-SMART outcome (the contract)

> *"By July 24, 2026, Nolan will publish: (a) a configured GitHub Discussions space with ≥3 categories and ≥5 seeded starter threads, (b) `docs/PUBLISHING.md` documenting an end-to-end NPM publish dry-run with provenance + 2FA, (c) `claude-markdown-documents/research-notebooks/NB-005-random-fourier-features.md` deriving Random Fourier Features from scratch with a runnable worked example referencing `src/pro/math/`, and present a 10-minute on-site walkthrough during the final program week."*

Source: [ADR-0003 § Capstone lanes](../../../claude-markdown-documents/ADRs/ADR-0003-summer-2026-curriculum-structure.md#3-capstone-lanes-with-a-smart-outcomes).

## Why this lane

You told Julian you're "primarily drawn to the mathematical applications for how these advanced systems are being created" and that you're excited by approaches that *aren't* just "cram more data into an LLM." This lane gives you both:

- **The infrastructure track** matches your lead role — you're the cohort's pilot intern, the one who tests the lessons before Thomas + Jarrett arrive, and the one who sets up the long-term community surface.
- **The math notebook** is your portfolio piece. You'll be taking AI/ML in fall; deriving Random Fourier Features from scratch this summer accelerates that course and gives you a concrete artifact to reference.

## Three deliverables

### Deliverable 1 — GitHub Discussions

The community-edition repo doesn't have Discussions enabled yet. That's how interns and external contributors ask questions without filing issues.

**What you'll do:**
- Enable Discussions on `AsterMindAI/AsterMind-Community-Edition`.
- Create ≥3 categories — recommended starter set: **Q&A**, **Ideas / feature requests**, **Show & tell** (community demos and capstones).
- Seed ≥5 starter threads — at least one per category. Examples: pinned "Welcome to AsterMind Discussions" thread, a Q&A on "What ML knowledge do I need to use this library?", a Show-and-tell of L00 with a link.
- Document the moderation policy in a pinned post (or in `CONTRIBUTING.md`).

**Acceptance:** Discussions live, ≥3 categories, ≥5 threads, all reachable from a single click on the repo's GitHub page.

### Deliverable 2 — `docs/PUBLISHING.md`

**Why this is critical:** v4.0.0 is tagged in git but is **not yet `npm publish`'d**. This deliverable is what lets Julian push that button with confidence.

**What you'll do:**
- Read the existing [package.json](../../../package.json) — note `publishConfig`, `prepublishOnly` script, `files` field.
- Read [npm's official 2FA-for-publish docs](https://docs.npmjs.com/configuring-two-factor-authentication) and [npm provenance docs](https://docs.npmjs.com/generating-provenance-statements).
- Write `docs/PUBLISHING.md` covering:
  - Prerequisites (npm account, 2FA enabled, org membership in `@astermind`)
  - The dry-run procedure (`npm publish --dry-run` → review the file list against `files` in package.json)
  - The actual publish procedure with provenance enabled
  - Post-publish smoke-test (install in a clean directory, import the package, run the L02 you-try)
  - Rollback procedure if a publish breaks
- Run an actual dry-run end-to-end with Julian (don't actually publish; this is the dry-run).

**Acceptance:** `docs/PUBLISHING.md` exists, has been used to walk a real dry-run, and Julian signs off that he'd push the button using only this doc.

### Deliverable 3 — `NB-005-random-fourier-features.md`

The math research notebook. Lab-style narrative, like the existing [NB-001 through NB-004](../../../claude-markdown-documents/research-notebooks/).

**What it covers:**

1. **The problem.** Kernel methods (e.g. RBF kernel in `KernelELM`) are accurate but don't scale — naïvely O(N²) in training-set size. Show this with a benchmark on a non-tiny dataset.
2. **Bochner's theorem.** Any shift-invariant kernel can be written as the Fourier transform of a probability distribution. Walk the derivation.
3. **The RFF construction.** Sample N random features (cos/sin of random projections); the inner product of two random feature vectors approximates the kernel value. Approximation error decreases as N grows.
4. **Worked example.** Use `src/pro/math/` (existing AsterMind code) on a 2D non-linear toy dataset (XOR-like or two interleaved spirals). Show the decision boundary for: (a) plain linear classifier, (b) RFF + linear, (c) full RBF KernelELM. Side-by-side, with accuracy and runtime numbers.
5. **When to use RFF vs Nyström.** Both approximate kernels; they differ in how. Compare briefly. Cite the Rahimi & Recht 2007 NeurIPS paper.
6. **Limitations and surprises.** Where does the approximation break down? What did surprise you while writing this?

**What it doesn't need to be:** an academic paper. It's a notebook in our internal research-narrative style — clear, honest, with worked examples. Aim for ~1000–1500 lines.

**Acceptance:** Notebook lives at `claude-markdown-documents/research-notebooks/NB-005-random-fourier-features.md`, the worked example imports real AsterMind code (no toy reimplementations), and a reader with a calculus background but no prior kernel-methods exposure can follow it.

## Documented alternatives for Deliverable 3

If RFF feels too narrow once you've started, swap in one of these (let Julian know first):

- **Kernel ridge regression from scratch.** Derive the closed-form solution; show why ELM's output layer *is* kernel ridge in disguise. More foundational, less specific to one technique.
- **Benchmark of kernel choices** (RBF vs polynomial vs linear vs Nyström-RBF) on a fixed dataset, with rigorous methodology. More empirical, less math-derivation.
- **Nyström approximation deep-dive.** Different way of approximating kernels (already in `KernelELM` via the Nyström landmarks). Complementary to RFF.

The A-SMART bar transfers as-is to any of these.

## Acceptance checklist (overall)

- [ ] GitHub Discussions enabled, ≥3 categories, ≥5 starter threads, moderation policy documented.
- [ ] `docs/PUBLISHING.md` exists, walks an end-to-end dry-run with provenance + 2FA, and Julian has signed off.
- [ ] `claude-markdown-documents/research-notebooks/NB-005-random-fourier-features.md` (or chosen alternative) exists with a runnable worked example using real AsterMind code.
- [ ] At least 5 PRs filed by Jul 24 (lesson patches from your pilot run + infrastructure work + the notebook count).
- [ ] 10-minute presentation deck exists at `presentation.md` covering: state-of-the-community + math walkthrough.

## Suggested pacing

You have ~10 weeks (May 12 – Jul 24). Heavier upfront on infrastructure, heavier later on the math notebook.

| Window | Focus |
|--------|-------|
| **May 12–31** (school still on) | Walk L01–L03 as the pilot test; file lesson-patch PRs; rough out Discussions structure |
| **Jun 1–14** (school out) | Discussions live; PUBLISHING.md draft; start NB-005 outline |
| **Jun 15–30** | PUBLISHING.md dry-run rehearsal; start NB-005 derivation section |
| **Jul 1–14** | NB-005 worked example (the heavy lifting); polish all three deliverables |
| **Jul 15–24** | Presentation prep + dry-run Jul 17 + on-site Jul 24 |

## Mentor / lead expectations

You're the cohort's lead, not just a parallel intern. That means:

- **Mentor Thomas + Jarrett on JS basics** when they hit walls during their L01–L03 onboarding. You'll be one week ahead of Thomas; teaching cements your own learning.
- **Friday demos** — you watch + give feedback on Thomas's and Jarrett's weekly demos, not just present your own.
- **Weekly check-ins with Julian** — bring agenda, drive the conversation. This is leadership practice.

## Where this is enforced

- **`docs/PUBLISHING.md` review** — Julian walks through it cold and tries to break it. Anything ambiguous gets flagged.
- **NB-005 review** — Julian + cohort review the notebook for clarity. The "could a beginner follow this?" bar is the same one we apply to lessons.
- **Final presentation Jul 24** — internal to the cohort + Julian. Slide deck + demo of Discussions activity + walk-through of the notebook's key derivation.
