# Capstone — Thomas — Adaptive Rock-Paper-Scissors

> **Status:** STARTER (scaffolding stub — full content arrives at scoping conversation, end of Week 4)
> **Owner:** Thomas Addison
> **Window:** scoping Jun 12; build Jun 15 – Jul 17; dry-run Jul 17; on-site demo **Jul 24**.

## A-SMART outcome (the contract)

> *"By July 24, 2026, Thomas will ship a static-HTML browser game (zero server) that uses `OnlineELM` to predict the player's next move across ≥30 consecutive rounds, achieving a measurable improvement in agent win rate of ≥10 percentage points between rounds 1–10 (untrained baseline) and rounds 21–30 (after online learning), and present it live in a 5-minute on-site demo during the final program week."*

Source: [ADR-0003 § Capstone lanes](../../../claude-markdown-documents/ADRs/ADR-0003-summer-2026-curriculum-structure.md#3-capstone-lanes-with-a-smart-outcomes).

## Why Rock-Paper-Scissors

- **Smallest viable state space.** 3 choices × short history window. Enough surface for online learning to find a pattern; small enough that learning is fast and visibly traceable.
- **Online learning is the whole point of `OnlineELM`.** RPS rewards exactly that — the model updates after every round (no batch retraining), and the agent's win rate climbs visibly as it learns the player's habits. That's the demo.
- **Plays your strengths.** Game design (Godot) translates to a JS game loop; the "reflection shield" mindset — building a custom system when the off-the-shelf one misbehaves — is exactly what tuning online-learning hyperparameters feels like.

## What we'll provide

- **L04 — Online learning with `OnlineELM`** (capability lesson, completed Week 5). Covers RLS update, forgetting factor, batch-vs-online, and the API of `window.astermind.OnlineELM`.
- **The lesson scaffold** at [`examples/lessons/_template/`](../../lessons/_template/) gives you a styling baseline if you choose to wrap the demo in a deck format. (Optional — game can be a standalone page.)
- **The UMD bundle** at `/astermind.umd.js` — load with `<script src="/astermind.umd.js">`, then `window.astermind.OnlineELM` is available.
- **A code review** with Julian end-of-week from Week 5 onward.

## What you'll build

A static HTML page (`index.html`) plus one or two JS files. No server, no build step required (vite serves it for local dev).

The page contains:

1. **The game UI** — three big buttons (rock, paper, scissors), a round counter, the agent's last move, win/loss/tie indicators.
2. **A live win-rate chart** — agent's rolling win rate over the last N rounds, updating round-by-round. This is the visible "the agent is learning" artifact.
3. **An "online learning step" view** — small panel that shows the model's prediction confidence for each move *before* it commits, updating as the model learns.
4. **A reset button** — clears state so the audience can play multiple rounds.

The agent logic:

- Encode the player's recent move history (last K moves, one-hot or simple counts) as the input to `OnlineELM`.
- Predict the player's next move (3-class classification: rock/paper/scissors).
- Pick the counter (rock → paper, paper → scissors, scissors → rock).
- After the player commits, do an online update: input = the history snapshot, target = what the player actually played.

## Acceptance checklist

When all are ticked, the capstone is done.

- [ ] Code lives at `examples/capstones/thomas-adaptive-game/` with `index.html`, `game.js`, and a `README.md` Sam could read cold.
- [ ] No server required — static HTML + JS only.
- [ ] Uses `window.astermind.OnlineELM` (not a hand-rolled model).
- [ ] Game runs at least 30 rounds without state corruption (round counter advances, win-rate updates, no console errors).
- [ ] Recorded demo shows a measurable ≥10 percentage point win-rate gain between rounds 1–10 and rounds 21–30 against a non-random player (you, or a scripted "biased player" baseline). Recording lives at `examples/capstones/thomas-adaptive-game/demo-recording.md` as a frame-by-frame description, or as an embedded gif/video link.
- [ ] vitest test under `tests/capstones/thomas-adaptive-game/` covers the non-rendering game logic (move encoding, win/loss judgement, counter-selection function).
- [ ] `npm run build` and `npm test` both pass on a fresh clone.
- [ ] 5-minute presentation deck exists at `presentation.md` (or in slides.json if you wrap it in the lesson scaffold).

## Suggested approach (non-binding)

**Week 5 (Jun 15–19) — scaffolding.** Build the game shell first. No ELM yet. Hard-code an opponent that picks randomly, get the UI working, get the win-rate chart updating. *Goal: by Friday, you have a working RPS game with a dumb opponent.*

**Week 6 (Jun 22–26) — wire the model.** Replace the random opponent with `OnlineELM`. Use a tiny history window first (1–3 prior moves). Don't optimize — just get end-to-end. *Goal: by Friday, the model is in the loop, even if it doesn't yet outperform random.*

**Week 7 (Jun 29 – Jul 3) — tune.** Try different history window sizes, hidden-unit counts, forgetting factors. Find the combo that gives a clear learning curve against a deliberately biased player (e.g. someone who throws rock 50% of the time). *Goal: hit the ≥10 pp bar.*

**Week 8 (Jul 6–10) — polish.** Add the prediction-confidence panel. Tighten the UI. Write tests for the move-encoding and counter-selection functions. *Goal: code review-ready.*

**Week 9 (Jul 13–17) — presentation prep.** Write the 5-minute deck. Practice it. Dry-run on Friday Jul 17.

## Stretch ideas (only after the bar is met)

- Multi-player mode where the agent learns from each player separately.
- A "model snapshot" downloaded as JSON at end-of-game, with a paste-back button to load a prior agent.
- Difficulty slider exposing the forgetting-factor knob (low = stubborn, high = adapts fast).
- Visualize the agent's prediction confidence as a colored gradient on the player's button row.

## Documented narrower fallback

If RPS doesn't surface a clean learning curve (e.g. a player who throws too randomly), fall back to a minigame with a more visible bias signal:

- **"Predict the next button"** — three buttons, one is highlighted as "correct" each round; the player chooses. The correct button follows a pattern (e.g. cycles, or repeats with bias). The agent tries to predict which button the player will pick. Same `OnlineELM` machinery, larger signal.

The A-SMART bar transfers as-is.

## Where this is enforced

- **vitest** in `tests/capstones/thomas-adaptive-game/` (you write these).
- **The dry-run on Jul 17** — Julian and Nolan will play 30 rounds against your agent live. The win-rate gain has to be visible on screen.
- **The on-site presentation Jul 24** — Sam plays a few rounds. Same bar.
