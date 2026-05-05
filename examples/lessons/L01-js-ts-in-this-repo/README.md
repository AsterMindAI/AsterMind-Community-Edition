# Lesson 01 — JavaScript & TypeScript in This Repo

**Time budget:** 45 minutes
**Prerequisites:** [L00 — ELM Primer](../L00-elm-primer/) walked through. Node 18+ installed (`node --version`). A terminal you're comfortable with.

## Learning outcomes (A-SMART)

By the end of this 45-minute lesson, the intern will:

1. **Clone, install, and run** this repository's test suite from a fresh terminal, achieving a green `npm test` (≥106 passing) in under 5 minutes.
2. **Edit a single line** in `src/core/Activations.ts`, observe the resulting test failure in `npm test`, revert the edit, and re-run to green — all in under 10 minutes.
3. **Open a draft pull request** on the `lesson-pr-target` branch with a one-line README typo fix, with a green CI check, in under 15 minutes.

These three outcomes are observable, measurable (timed + green-CI gated), and time-bounded against the 45-minute lesson length. They do not require any ML knowledge — they exercise the development loop only.

## Slide arc (TSDR)

| Beat | Slides | Purpose |
|------|--------|---------|
| **Tell** | `welcome`, `why-typescript`, `what-is-npm` | Motivate why TS, what npm does, why a build step exists |
| **Show** | `repo-tour`, `live-types`, `build-pipeline`, `tests-explained` | Walk the repo, demo type-checking live, explain the build + test loop |
| **Do** | `do-clone-install`, `do-edit-and-pr` | Two terminal-side you-try blocks |
| **Review** | `review` | Reflection prompts |

Slide 5 (`live-types`) has an interactive demo: toggle between a valid and a type-error TypeScript snippet and watch the page render the type-checker's verdict. No real `tsc` runs — it's a hand-coded simulator that shows *the shape* of a type error, not the literal `tsc` output.

## Run it

```bash
npm run dev:lesson:01
# or: LESSON_DIR=L01-js-ts-in-this-repo npm run dev:lesson
```

## You try

The two Do-beat slides each have a terminal-side exercise. Both happen *outside* the deck — go to your terminal, do the steps, come back.

### You-Try 1 — Clone, install, test (slide `do-clone-install`)

```bash
git clone git@github.com:AsterMindAI/AsterMind-Community-Edition.git astermind-l01
cd astermind-l01
npm install
npm test
```

**Pass condition:** vitest reports ≥106 passing tests, 0 failing. Time yourself — should be under 5 minutes on a typical laptop.

### You-Try 2 — Break a test, fix it, ship a PR (slide `do-edit-and-pr`)

1. Open [src/core/Activations.ts](../../../src/core/Activations.ts).
2. Find the `relu` function. Change `return Math.max(0, x);` to `return Math.max(1, x);` (deliberately wrong).
3. Run `npm test`. Observe at least one test failing in [tests/Activations.test.ts](../../../tests/Activations.test.ts).
4. Revert the change. Run `npm test`. Confirm green again.
5. Now open [README.md](../../../README.md), find one typo or one phrase you'd improve, fix it, and open a draft PR against the `lesson-pr-target` branch.
6. Wait for CI to go green on the PR.

**Pass condition:** PR exists on `lesson-pr-target` with a green CI check. Tag yourself in the PR description as "L01 you-try 2 — [your name]".

## Notes for the presenter

If walking this live with a learner, the highest-leverage moment is **slide 5** (`live-types`). Have them toggle the snippet themselves before you continue. Pause for at least 30 seconds even if they "get it" instantly — the moment of seeing the type error appear is the one that sells TypeScript.

The you-tries deliberately happen in the terminal, not the page. The lesson goal is "fluent in the dev loop," and the dev loop *is* the terminal. Don't let the learner skip those.

## Where this is enforced

- **`tests/lessons-schema.test.ts`** validates this lesson's `slides.json` against the shared schema.
- **`npm run dev:lesson:01`** is wired in `package.json`. If it doesn't open the deck, that's a bug to file, not a lesson failure.
- The `lesson-pr-target` branch must exist on origin before learners attempt You-Try 2. If it doesn't, file an issue and tag the cohort lead (Nolan).
