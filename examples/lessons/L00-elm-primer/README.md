# Lesson L00 — ELM Primer

**Time budget:** 45 minutes
**Prerequisites:** None. Just `npm install` from the repo root and a modern browser.

The first lesson in the AsterMind curriculum. A 16-slide visual primer that motivates the Extreme Learning Machine — what it is, why the random-projection trick works, and what makes it train so fast.

## Learning outcomes (A-SMART)

By the end of this 45-minute lesson, the intern will:

1. **Explain** in 2–3 sentences why an ELM doesn't need backpropagation, by referencing the random hidden layer + closed-form output solve. Verifiable: write the explanation and have a peer (or instructor) check it against the deck's "ELM one-shot solve" slide.

2. **Run** the live in-browser ELM training demo and **identify** the difference between training time, prediction time, and the model's accuracy on the 4-class toy dataset. Verifiable: open the deck, click Train, click Predict, observe the latency readouts.

3. **Modify** at least one hyperparameter on the live demo (hidden units, ridge λ, or activation), retrain, and **describe** the effect on accuracy or stability. Verifiable: complete the You-Try block below.

## Run it

```bash
npm run dev:elm
# or, equivalent:
npm run dev:lesson:00
```

The deck opens at `http://localhost:5173/L00-elm-primer/`. Use **Next** / **Back** buttons or arrow keys. Toggle **Notes** to see the speaker-notes track alongside each slide.

## Slide arc (TSDR)

The deck follows the **Tell → Show → Do → Review** structure:

| Beat | Slides | Purpose |
|------|--------|---------|
| **Tell** | About / New Frontier / Library intro / Intro / NN overview / Backprop loops | Who built this, why ELMs matter, what's broken about backprop |
| **Show** | Neuron / Vectorization / Huang's bold question / City grid / GPS / Why randomness | The core insight, narrated through visual metaphors |
| **Do** | Hidden layer / ELM one-shot solve / Prediction | Live in-browser training and prediction |
| **Review** | CTA | What you can do next, links out |

## You try

Open the live demo (Hidden layer / ELM one-shot solve / Prediction slides). Try each of the following and note what changes:

1. **Halve the hidden units** (e.g. from 256 to 128, then to 32). Retrain. What happens to training time? What happens to accuracy on the 4-class dataset? At what point does accuracy degrade noticeably?

2. **Change the activation function** from `relu` to `tanh` (or whichever is available in the demo controls). Retrain. Does the decision boundary on the visualisation slide look the same shape, or different? Why might that be?

3. **Increase the ridge λ** by 10× (e.g. `1e-2` → `1e-1`). Retrain. Notice whether predictions become more conservative (probabilities closer to uniform) or sharper. Tie that back to what ridge regularisation does mathematically.

If any of these aren't directly tunable in the in-deck UI, replicate them in the JS console:

```js
// In the browser DevTools console, after the deck loads:
import('/dist/astermind.esm.js').then(m => {
  const elm = new m.ELM({ categories: ['a','b','c','d'], hiddenUnits: 32, useTokenizer: true });
  elm.train();
  console.log(elm.predict('hello', 4));
});
```

## After this lesson

You're ready for **L01 — JavaScript & TypeScript for ML newcomers** (planned), where the curriculum starts using the library directly in code. Or jump to [the practical examples](../../practical-examples/) for full applications.

## Lesson format note

This lesson predates the standardised lesson template ([`_template/`](../_template/)). It uses bespoke per-slide CSS and a custom deck navigator (parallax, minimap, slide-stage-specific layouts) that the shared `lesson-deck.js` doesn't replicate. Future lessons (L01+) will use the shared scaffold; L00 stays as it is because its visual storytelling carries the load.
