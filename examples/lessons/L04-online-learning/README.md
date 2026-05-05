# Lesson 04 — Online Learning with `OnlineELM`

**Time budget:** 45 minutes
**Prerequisites:** [L03 — Embeddings + similarity](../L03-embeddings-similarity/) walked through. Comfortable with the train → predict → evaluate loop from L02.
**Required for:** Thomas (capstone is built on `OnlineELM`).
**Optional for:** Jarrett, Nolan (recommended if hours allow).

## Learning outcomes (A-SMART)

By the end of this 45-minute lesson, the intern will:

1. **Stream** ≥50 labelled 2D points one-at-a-time into an `OnlineELM` (after a 4-point seed batch via `init`), and observe the live accuracy counter climb to ≥90% within the first 30 streamed points, in under 10 minutes.
2. **Trigger a concept-drift event** (the demo's "Flip boundary" button) mid-stream and observe the recent-window accuracy crash and then recover, in under 10 minutes.
3. **Tune the forgetting factor** λ across three values (1.0, 0.99, 0.9) and identify which value recovers from drift fastest in the recent-window accuracy plot, in under 10 minutes.

## Slide arc (TSDR)

| Beat | Slides | Purpose |
|------|--------|---------|
| **Tell** | `welcome`, `why-online`, `rls-intuition` | Motivate why batch retraining isn't always possible; introduce RLS in plain language |
| **Show** | `forgetting-factor`, `the-api` | What λ does; the `init` + `update` + `predict` API |
| **Do** | `live-stream` | One interactive 2D scatter + accuracy plot with three you-trys built in |
| **Review** | `connection-to-capstone`, `next-steps` | Bridge to Thomas's RPS capstone; pointer to L05/L06 |

## Run it

```bash
npm run dev:lesson:04
```

## You try

All three You-Trys live on slide `live-stream`. The interactive panel has:
- A 2D **scatter canvas** showing labelled points falling in real time (red = class 0, blue = class 1).
- An **accuracy plot** with two lines: cumulative accuracy (gray) and recent 20-point window accuracy (orange).
- A **stream control** (start / pause / reset).
- A **forgetting-factor slider** (0.85 – 1.00).
- A **"Flip boundary"** button that swaps the true class assignment mid-stream — concept drift.

### You-Try 1 — Stream and watch it learn

1. Click **Start** with the default forgetting factor (1.0).
2. Watch the accuracy plot. Within the first ~30 points, recent-window accuracy should climb to ≥90%.
3. **Pass condition:** the recent-window line stabilises ≥0.90 by point 30.

### You-Try 2 — Trigger concept drift

1. Once accuracy is high, click **Flip boundary**. The true class assignment swaps (the diagonal flips).
2. Watch the recent-window accuracy crash to roughly 50% — the model is now wrong about everything.
3. Keep streaming. The model will (eventually) recover.
4. **Pass condition:** observe that with λ = 1.0, recovery is *slow* (≥40 points to climb back above 0.85). Note the recovery curve shape.

### You-Try 3 — Tune the forgetting factor

1. **Reset** the demo. Drop λ to 0.9. Stream again to convergence. Then flip boundary.
2. Compare the recovery shape to You-Try 2.
3. Try λ = 0.99 too.
4. **Pass condition:** identify (in the demo's notes panel) which λ recovers fastest. Write one sentence on what tradeoff lower λ buys you.

> The trade-off you should observe: lower λ → faster adaptation to drift, but noisier accuracy when the world is stable. λ = 1.0 (no forgetting) → most stable on stationary data, slowest to recover from drift. There is no "best" value; it depends on how often you expect the world to change.

## Notes for the presenter

- The 2D scatter is intentionally simple — a linearly separable diagonal split. The point isn't dataset complexity; it's seeing the *adaptation* visibly.
- The seed batch (4 points, called via `init`) is a quirk of RLS: the algorithm needs an initial estimate of `P` (the inverse-covariance matrix) before `update` can do anything. We hide this with a fixed seed so the learner doesn't have to think about it on slide 6, but explain it on slide 5.
- The "Flip boundary" button is the moment that sells online learning. With a batch-trained classifier, drift would mean retraining from scratch on a new dataset. With `OnlineELM`, the recovery is automatic — that's the point.
- The forgetting-factor slider goes 0.85 → 1.0. Don't go below 0.85; values below that destabilise updates and the demo gets ugly without teaching anything new.

## Connection to Thomas's capstone

Thomas's RPS-with-adaptive-opponent capstone is built on exactly this primitive. Each round the player throws a move; that's one streaming sample. The agent uses `OnlineELM.update` to absorb the sample; on the next round the agent's prediction reflects what it just learned. The forgetting factor in the capstone is what makes the agent quick to adapt to a player's strategy shift (e.g. when the player gets bored of always throwing rock and starts throwing scissors). λ ≈ 0.95 is the right ballpark — fast enough to chase strategy shifts, slow enough to not over-react to one-round randomness.

## Where this is enforced

- **`tests/lessons-schema.test.ts`** validates this lesson's `slides.json`.
- The `OnlineELM` API used in the demo is the same API tested in [`tests/OnlineELM.test.ts`](../../../tests/OnlineELM.test.ts) — so this lesson stays aligned with what's actually shipped.
- Concept-drift behaviour is not unit-tested in the library (it's an emergent behaviour of the algorithm + dataset). The lesson's pass condition is a self-check by the learner, not a CI gate.
