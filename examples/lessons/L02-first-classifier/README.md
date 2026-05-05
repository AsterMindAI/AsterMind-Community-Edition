# Lesson 02 — Your First Classifier

**Time budget:** 45 minutes
**Prerequisites:** [L01 — JS/TS in this repo](../L01-js-ts-in-this-repo/) walked through. Repo cloned and `npm test` passing.

## Learning outcomes (A-SMART)

By the end of this 45-minute lesson, the intern will:

1. **Train** an `IntentClassifier` on the bundled 20-example English/French greeting dataset in the live demo, achieving **≥80% accuracy on a 6-example held-out test set**, in under 20 minutes.
2. **Add a third class** (Spanish, 10 examples + 3 held-out) using the demo's "Add Spanish" button, retrain, and observe the new held-out accuracy in the same demo, in under 10 minutes.
3. **Export the trained classifier's snapshot** (categories, training summary, accuracy numbers) as JSON via the demo's "Export" button, and paste the JSON back into a notes file, in under 5 minutes.

All three outcomes are observable in the live demo (no terminal work). Each maps to one You-Try block.

## Slide arc (TSDR)

| Beat | Slides | Purpose |
|------|--------|---------|
| **Tell** | `welcome`, `what-is-classification`, `meet-intent-classifier` | Motivate classification; introduce the API |
| **Show** | `the-data`, `the-api`, `accuracy-explained` | Walk the dataset, the train/predict calls, what an accuracy number means |
| **Do** | `live-classifier` | One big interactive demo containing all three You-Trys (train → add class → export) |
| **Review** | `things-to-notice`, `next-steps` | What surprised you? Pointer to L03 |

## Run it

```bash
npm run dev:lesson:02
# or: LESSON_DIR=L02-first-classifier npm run dev:lesson
```

## You try

All three You-Try blocks live in the **single interactive panel on slide `live-classifier`**. There's no terminal work in this lesson — everything happens in the page.

### You-Try 1 — Train and check accuracy

Click **"Train"**. The panel reports:
- Training accuracy (should be high — the model has seen these)
- **Held-out accuracy on 6 unseen examples** (this is the number that counts)

**Pass condition:** held-out accuracy ≥80%. ELM training is randomized, so re-click Train if the first run is unlucky; aim for a stable result.

### You-Try 2 — Add a third class

Click **"Add Spanish & retrain"**. The panel adds 10 Spanish greetings + 3 held-out and retrains.

**Pass condition:** new held-out accuracy across all 9 examples (3 each language) is ≥75%. (Slightly relaxed from 80% — three classes is harder than two.)

### You-Try 3 — Export the model snapshot

Click **"Export JSON"**. A textarea fills with a JSON snapshot:

```json
{
  "categories": ["english", "french", "spanish"],
  "trainingSet": [...],
  "heldOutAccuracy": 0.83,
  "config": { "hiddenUnits": 32, "useTokenizer": true, "activation": "relu" },
  "trainedAt": "2026-..."
}
```

**Pass condition:** Copy the JSON. Paste it into a notes file (`l02-snapshot.json` in your notes dir, or wherever you keep them). Confirm it parses with `JSON.parse(...)` without errors.

> **Note on what "export" means here.** This is a *snapshot* — categories, training set, accuracy numbers, config — not the literal trained model weights. Saving and reloading actual model weights is a topic for a later lesson. The point of this You-Try is "the trained thing is data you can save and reason about," not full model serialization.

## Notes for the presenter

- Click **Train** at least once *before* explaining what it does. The "model went from random to 80% accurate in 200ms" moment is the hook for the whole lesson.
- ELM has random initialization — first-training results vary. If accuracy comes in below 80%, re-click Train; explain calmly that this variance is normal for tiny datasets and a real production model would use far more training data.
- The "Add Spanish" button is intentionally one-shot (clicking again just retrains the same dataset). If a learner wants to try other languages, that's L03 territory.
- Don't get pulled into "but how does ELM actually work?" — that's L00. Today is API + observation.

## Where this is enforced

- **`tests/lessons-schema.test.ts`** validates this lesson's `slides.json`.
- The bundled dataset is hard-coded in [`live-demo.js`](./live-demo.js) — small enough to read end-to-end. If a learner asks "where does this data come from?", show them.
- The `IntentClassifier` config (hiddenUnits, useTokenizer, activation) is the same as the smoke tests in [`tests/IntentClassifier.test.ts`](../../../tests/IntentClassifier.test.ts), so this lesson stays in sync with what's actually shipped.
