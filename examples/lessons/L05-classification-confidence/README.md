# Lesson 05 — Classification with Confidence

**Time budget:** 45 minutes
**Prerequisites:** [L02 — Your first classifier](../L02-first-classifier/) walked through. (You don't need L03 or L04 for this one.)
**Required for:** Jarrett (his LOTL classifier capstone needs the threshold-tuning UI).
**Optional for:** Thomas, Nolan.

## Learning outcomes (A-SMART)

By the end of this 45-minute lesson, the intern will:

1. **Train** an `IntentClassifier` on the bundled 20-example support-ticket dataset (binary: low vs urgent), and read off each held-out prediction's confidence value (`prob`) in the demo panel, in under 10 minutes.
2. **Move the confidence-threshold slider** across the range [0.50, 0.99] and observe **precision and recall update live** on a 10-example held-out set, observing at least three distinct (precision, recall) pairs, in under 10 minutes.
3. **Identify a threshold value** that achieves **precision ≥ 0.85 with recall ≥ 0.50** on the held-out set, write that threshold and one sentence on the tradeoff into the demo's notes box, in under 10 minutes.

## Slide arc (TSDR)

| Beat | Slides | Purpose |
|------|--------|---------|
| **Tell** | `welcome`, `confidence-not-just-label`, `precision-recall` | Every prediction has a confidence; two distinct error modes |
| **Show** | `the-threshold`, `pr-curve` | What the threshold knob does; the shape of the tradeoff |
| **Do** | `live-threshold` | Interactive: train + threshold slider + live precision/recall + confusion matrix |
| **Review** | `connection-to-capstone`, `next-steps` | Jarrett's LOTL bridge; pointer to L06 |

## Run it

```bash
npm run dev:lesson:05
```

## You try

All three You-Trys are in the panel on slide `live-threshold`.

### You-Try 1 — Train and read confidences

Click **Train**. A held-out test grid appears with all 10 examples, each annotated with its predicted class and the confidence (`prob`) of that prediction.

**Pass condition:** you can point at one prediction with confidence ≥ 0.90, and one with confidence in [0.50, 0.70] (a "borderline" call). Confidence values are visible as numbers on each row.

### You-Try 2 — Sweep the threshold

Drag the **Threshold** slider from 0.50 → 0.99 slowly. Watch four numbers update live:
- **Precision** — of the items the model marked "urgent", how many actually are
- **Recall** — of the truly urgent items, how many got flagged
- **TP / FP / TN / FN** confusion-matrix counts

**Pass condition:** observe at least three distinct (precision, recall) pairs as you sweep. The default at threshold = 0.50 should be different from the values at 0.95.

### You-Try 3 — Find a useful threshold

Find a threshold that hits **precision ≥ 0.85 AND recall ≥ 0.50** on the held-out set.

**Pass condition:** That threshold value is reachable on this dataset (the precision/recall curve has been calibrated for that). Once you find one, type it + a one-sentence rationale into the **Notes** box. Example:

> "Threshold 0.78. Higher precision means fewer false alarms for the on-call analyst; we sacrifice recall (some real urgent tickets get flagged 'low'), but only the most confident urgent calls make it through."

There's no single "correct" answer — multiple thresholds satisfy the bar. The point is making the tradeoff explicit.

## Notes for the presenter

- The dataset is small and clean. Real-world precision-recall curves have more interesting structure; this dataset is intentionally simpler so the threshold knob produces visible movement without you having to explain dataset quirks.
- ELM training is randomized; first-train results vary. If precision/recall numbers come in flat (i.e. all predictions are confidently correct), re-click **Train** — sometimes the model lands in a slightly less confident regime that's better for teaching the threshold concept.
- The "Notes" box is a soft enforcement of "actually think about it" — a sentence is plenty. Don't grade.
- Don't introduce ROC curves today; that's a half-step beyond what's needed. Precision/recall on a single threshold + the visible tradeoff is enough.

## Connection to Jarrett's capstone

Jarrett's [LOTL command classifier capstone](../../capstones/jarrett-lotl-classifier/STARTER.md) has, as a hard requirement, a threshold slider that exposes the precision/recall tradeoff visibly. This lesson is the rehearsal:

- **High threshold (e.g. 0.90)** — only flag commands the classifier is *very* confident are malicious. SOC analysts get fewer alerts; some real attacks slip through. Use when alert fatigue is the problem.
- **Low threshold (e.g. 0.50)** — flag anything the classifier leans toward malicious. Catches more attacks; alerts swamp the analyst. Use when missing an attack is far worse than reviewing a false positive.

There's no universally right threshold — it depends on the cost of a missed attack vs the cost of analyst time. Jarrett's capstone makes that call explicit.

## Where this is enforced

- **`tests/lessons-schema.test.ts`** validates this lesson's `slides.json`.
- The `IntentClassifier` config used in the demo matches the smoke-test config in [`tests/IntentClassifier.test.ts`](../../../tests/IntentClassifier.test.ts), so the lesson stays aligned with what's shipped.
- Precision/recall are computed in plain JS in the demo (no library helper); this is intentional — Jarrett's capstone will compute them the same way.
