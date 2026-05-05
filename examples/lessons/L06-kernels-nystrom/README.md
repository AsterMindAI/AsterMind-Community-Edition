# Lesson 06 — Kernels and the Nyström Approximation

**Time budget:** 60 minutes (longest lesson; the math is denser)
**Prerequisites:** [L02 — Your first classifier](../L02-first-classifier/) and [L03 — Embeddings + similarity](../L03-embeddings-similarity/) walked through. Comfort with the idea that a model maps inputs to outputs.
**Required for:** Nolan (his Random Fourier Features capstone notebook builds on this).
**Optional for:** Thomas, Jarrett.

## Learning outcomes (A-SMART)

By the end of this 60-minute lesson, the intern will:

1. **Train** a `KernelELM` with the **linear** kernel on a non-linearly-separable 2D dataset (concentric rings, ~120 points), observe its held-out accuracy ≤ 60%, and articulate why a linear model fails on this geometry, in under 15 minutes.
2. **Train** a `KernelELM` with the **RBF** kernel (mode `exact`) on the same dataset, observe a curved decision boundary visualized on the canvas, and compare its held-out accuracy to the linear model (≥ 90% expected), in under 15 minutes.
3. **Switch the same model to Nyström mode** with three landmark counts (m ∈ {5, 20, 100}), observe the **training-time / accuracy tradeoff** in the demo's stats panel, and identify the smallest m that retains accuracy within 5 percentage points of the exact RBF model, in under 20 minutes.

The three outcomes form a story arc: *linear can't*, *RBF can*, *Nyström can almost as well, much faster*. This arc is the foundation of Nolan's RFF capstone notebook, where Random Fourier Features are presented as another way to get the kernel benefit at linear cost.

## Slide arc (TSDR)

| Beat | Slides | Purpose |
|------|--------|---------|
| **Tell** | `welcome`, `linear-fails`, `kernel-trick` | Motivate non-linear classification; introduce the kernel-trick framing |
| **Show** | `rbf-intuition`, `cost-of-kernels`, `nystrom-intuition` | RBF as local-similarity Gaussian; the O(N²) cost; landmarks as approximation |
| **Do** | `live-kernels` | Interactive: 2D rings, train linear vs RBF vs Nyström, see boundaries + timing |
| **Review** | `connection-to-rff`, `next-steps` | Bridge to Nolan's RFF capstone notebook; pointer to the cohort wrap |

## Run it

```bash
npm run dev:lesson:06
```

## You try

All three You-Trys live in the panel on slide `live-kernels`. The interactive panel shows:
- A **2D scatter canvas** (~250 points, two concentric rings — class 0 inner, class 1 outer)
- A **decision-boundary canvas** that re-renders after each training run (colored by predicted class on a 60×60 grid)
- A **stats panel** with held-out accuracy and training time in milliseconds
- Three **train buttons**: Linear, RBF (exact), RBF (Nyström)
- A **landmark slider** for the Nyström mode (m ∈ [5, 100])

### You-Try 1 — Show that linear fails

1. Click **Train Linear**.
2. Look at the decision boundary on the right canvas.
3. Note the held-out accuracy in the stats panel (expect ≤ 60%).

**Pass condition:** the linear-kernel boundary is a straight line (or close to it). The accuracy is barely better than random because no straight line can separate two concentric rings.

### You-Try 2 — Show that RBF works

1. Click **Train RBF (exact)**.
2. Compare the boundary to You-Try 1: it should now be curved, hugging the inner ring.
3. Compare accuracy: expect ≥ 90% on the held-out set.

**Pass condition:** the boundary visibly curves. Accuracy jumps. You can articulate aloud why curved decision regions are possible now (the kernel maps inputs into a space where they *are* linearly separable; the curve in 2D is the shadow of that linear boundary).

### You-Try 3 — Find the right number of landmarks

1. Click **Train RBF (Nyström)** with the slider at **m = 5**. Note accuracy + training time.
2. Move the slider to **m = 20**. Train again. Note accuracy + time.
3. Move to **m = 100**. Train again. Note accuracy + time.

**Pass condition:** identify the smallest m where Nyström-mode accuracy is within 5 percentage points of the exact-RBF accuracy from You-Try 2. Write that m + a one-sentence rationale (about speed/accuracy tradeoff) into the demo's notes box.

## Notes for the presenter

- The lesson is denser than the others. Don't rush the kernel-trick slide (`kernel-trick`); learners need 30 seconds to absorb "we never actually compute the high-dim mapping; we only compute pairwise kernel values."
- The RBF intuition slide (`rbf-intuition`) uses the "Gaussian bump centered on each training point" mental model. This is more intuitive than the formal RKHS framing and sufficient for everything in this lesson and Nolan's capstone notebook.
- The Nyström explanation (`nystrom-intuition`) uses the metaphor of "asking a few representative neighbors" instead of the full O(N²) pairwise comparison. Don't introduce SVD-based whitening details unless asked; the demo uses `whiten: true` by default.
- ELM with closed-form ridge regression trains in milliseconds for these small datasets — both exact RBF and Nyström. The training-time tradeoff is real but small at this scale; for Nolan's capstone notebook he should benchmark on a larger dataset (a few thousand points) where the cost gap shows.

## Connection to Nolan's RFF capstone notebook

Nolan's [research-notebook capstone](../../capstones/nolan-infrastructure/STARTER.md) requires deriving Random Fourier Features (RFF) from scratch and benchmarking it. **RFF is a different way of doing the same thing Nyström does in this lesson** — both approximate a kernel-based model at linear cost.

The clean comparison Nolan should make in NB-005:

| Method | Training cost | Idea |
|--------|---------------|------|
| **Linear ELM** | O(N) | No kernel; can only handle linearly separable problems |
| **Exact RBF KernelELM** | O(N²) memory, O(N³) solve | Full kernel; expensive but accurate |
| **Nyström RBF KernelELM** | O(N · m) where m << N | Pick m landmarks; approximate the kernel matrix |
| **Random Fourier Features** | O(N · D) where D is feature count | Sample random projections; approximate the kernel via Bochner's theorem |

L06 hands Nolan the first three rows hands-on. RFF is the fourth; that's the math in his notebook.

## Where this is enforced

- **`tests/lessons-schema.test.ts`** validates this lesson's `slides.json`.
- The `KernelELM` API used in the demo is the same one tested in [`tests/KernelELM.test.ts`](../../../tests/KernelELM.test.ts).
- The "linear fails on rings" claim is not unit-tested in the library (it's an emergent property of the geometry); the demo demonstrates it interactively rather than asserting it in CI.
