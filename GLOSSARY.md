# Glossary

ML and library-specific terms used in this repo, defined for someone who has not taken a machine-learning class.

When a term has a one-line definition, that's all you need. When you want to go deeper, follow the linked source files or external references.

> **Format note:** terms are alphabetical. Cross-references are *italicised*.

---

## A

**A-SMART** — A learning-objective rubric: **A**ction-oriented, **S**pecific, **M**easurable, **A**chievable, **R**elevant, **T**ime-bound. The leading **A** forces a Bloom-aligned action verb (apply, build, train) and bans non-observable verbs like *understand*. AsterMind lessons use this for outcomes; see [ADR-0002 § Lesson pedagogy](./claude-markdown-documents/ADRs/ADR-0002-elm-explination-as-canonical-lesson-model.md).

**Activation function** — A non-linear function applied element-wise to a layer's outputs, letting the network represent things that aren't straight lines. Common choices in this library: `relu`, `leakyrelu`, `sigmoid`, `tanh`, `linear`, `gelu`. All live in [`src/core/Activations.ts`](./src/core/Activations.ts).

**AUC (Area Under the Curve)** — A scalar summary of a *ROC curve*. AUC = 1.0 is perfect; AUC = 0.5 is random.

## B

**Backpropagation** — The standard training algorithm for deep neural networks: compute gradients of the loss with respect to weights, then update via gradient descent. **ELMs do not use backprop** — that's the whole point.

**Backward Design** — A lesson-authoring workflow from Wiggins & McTighe's *Understanding by Design*: write the *learning outcome* first, then design the assessment that proves it, then build the exposition that gets the learner there. See [ADR-0002](./claude-markdown-documents/ADRs/ADR-0002-elm-explination-as-canonical-lesson-model.md).

**Bloom's Taxonomy** — A six-level ladder of cognitive verbs (remember, understand, apply, analyze, evaluate, create) used to choose action verbs for *A-SMART* outcomes. AsterMind lessons aim for levels 2–4 (apply / analyze) for beginner audiences.

## C

**Closed-form solve** — A mathematical solution that gives the answer directly, without iterating. ELMs train their output layer with the closed-form ridge-regression solution `W = (HᵀH + λI)⁻¹ HᵀY`, which is why they don't need *backpropagation*.

**Cosine similarity** — A measure of the angle between two vectors, scaled to [-1, 1]. The default similarity metric in [`EmbeddingStore`](./src/core/EmbeddingStore.ts).

**Cross-entropy** — A loss function for classification. Lower is better. AsterMind reports it as one of several quality metrics in [`Evaluation.ts`](./src/core/Evaluation.ts).

## E

**ELM (Extreme Learning Machine)** — A neural network with a randomly-initialised hidden layer and a *closed-form* output layer. Training is fast (no *backprop*), small (kilobytes), and runs anywhere JS runs. The headline architecture in this library; see [`src/core/ELM.ts`](./src/core/ELM.ts).

**Embedding** — A dense vector representation of an input (a word, document, image patch). Two embeddings being close in vector space means the inputs are similar. AsterMind builds embeddings via the ELM hidden layer, via *DeepELM* stacking, and via *TF-IDF*.

**ESM / UMD** — Two JavaScript module formats. ESM (`import { ELM } from ...`) is the modern standard. UMD (`window.astermind.ELM`) is the legacy `<script src=...>` global format. The library ships both.

## F

**F1 score** — Harmonic mean of *precision* and *recall*. A single-number summary of classifier quality; useful when you can't favour one over the other.

**Fine-tuning** — Continuing to train a model on new data starting from previously-learned weights. AsterMind supports a simulated form via the `reuseWeights` option on `trainFromData`.

**Forgetting factor** — In *Online ELM*, a number in (0, 1] that controls how quickly old observations decay. 1.0 = no forgetting; 0.95 = recent data dominates. See [`OnlineELM.ts`](./src/core/OnlineELM.ts).

## H

**He initialisation** — Weight-init strategy that samples from a distribution scaled by `sqrt(2 / fan_in)`. The default for *ReLU* and its relatives.

**Hidden layer** — In a neural network, the layers between input and output. ELMs have exactly one hidden layer, and its weights are random and frozen. *DeepELM* stacks several frozen hidden layers.

**Hybrid retrieval** — Combining lexical search (*TF-IDF*) with semantic search (dense embeddings) for better recall. See [`src/pro/retrieval/`](./src/pro/retrieval/).

## K

**Kernel** — A function `K(x, y)` measuring similarity between two inputs. *KernelELM* replaces the random hidden layer with a kernel matrix, letting the model fit non-linear patterns without explicitly choosing features. Common kernels: *RBF*, linear, polynomial, Laplacian.

**KNN (k-Nearest Neighbours)** — Find the `k` closest items to a query, by some similarity metric. AsterMind has a generic implementation in [`src/ml/KNN.ts`](./src/ml/KNN.ts) and a vector-store-backed version in [`EmbeddingStore`](./src/core/EmbeddingStore.ts).

## M

**MAE (Mean Absolute Error)** — Average of `|y − ŷ|`. Robust to outliers compared to *RMSE*.

**MMR (Maximal Marginal Relevance)** — A reranking strategy that balances relevance against redundancy: pick items that are relevant *and* different from already-picked items. Used in [`OmegaRR`](./src/pro/reranking/).

## N

**Nyström approximation** — A way to approximate a large kernel matrix `K` by sampling a small subset of "landmark" rows/columns. Lets *KernelELM* scale to thousands of training points without storing the full `N × N` matrix. See `mode: 'nystrom'` in [`KernelELM.ts`](./src/core/KernelELM.ts).

## O

**One-hot encoding** — Representing a label as a vector of zeros with a single one at the label's index. AsterMind uses one-hot for classification targets; helper at `elm.oneHot(numClasses, classIndex)`.

**Online learning** — Training a model continuously as data arrives, without storing the whole history. See [`OnlineELM.ts`](./src/core/OnlineELM.ts) — uses *RLS* under the hood.

## P

**Precision** — Of the items the model called positive, what fraction actually were? `tp / (tp + fp)`.

**Pseudoinverse** — A generalisation of matrix inverse to non-square or singular matrices. The closed-form ELM solve uses it (or the equivalent ridge solve, for stability).

## R

**RAG (Retrieval-Augmented Generation)** — Answering a query by first retrieving relevant context, then generating a response conditioned on it. AsterMind's [`pro/omega/`](./src/pro/omega/) handles the retrieval + assembly side; the generation side is up to you (the library doesn't ship an LLM).

**Random projection** — Mapping high-dimensional inputs to lower-dimensional space using a random matrix. Surprisingly, this preserves enough structure for downstream classification to work well. The Johnson–Lindenstrauss lemma is why ELMs work at all.

**RBF (Radial Basis Function) kernel** — `K(x, y) = exp(-γ‖x − y‖²)`. The most common kernel choice. Higher `γ` → sharper similarity; lower `γ` → broader.

**Recall** — Of the actual positives, what fraction did the model find? `tp / (tp + fn)`.

**Reranking** — Taking a list of retrieved items and re-ordering them with a more careful scorer. AsterMind's `OmegaRR` ([`src/pro/reranking/`](./src/pro/reranking/)) is deterministic — same input always produces same output.

**RFF (Random Fourier Features)** — A way to approximate an RBF kernel by an explicit feature map of random sinusoids. Used in [`src/pro/math/`](./src/pro/math/) as a faster alternative to *Nyström*.

**Ridge regression** — Linear regression with an L2 penalty `λ‖W‖²` to prevent overfitting. The "λ" appears as `ridgeLambda` in ELM configs. Defaults of `1e-2` to `1e-3` are usually fine.

**RLS (Recursive Least Squares)** — An algorithm for updating a least-squares solution when new data arrives, without re-solving from scratch. The mechanism behind *Online ELM*.

**RMSE (Root Mean Squared Error)** — `sqrt(mean((y − ŷ)²))`. A regression metric; lower is better.

**ROC (Receiver Operating Characteristic) curve** — A plot of true-positive rate vs false-positive rate across thresholds. *AUC* is the area under this curve.

**R²** — The coefficient of determination, in (-∞, 1]. 1.0 means the model perfectly explains the variance; 0.0 means it does no better than predicting the mean.

## S

**Softmax** — Squashes a vector into a probability distribution that sums to 1. The standard final step for multi-class classification.

**Summarisation (deterministic)** — Producing a short version of a longer text with no LLM and no randomness. AsterMind's [`OmegaSumDet`](./src/pro/summarization/) ranks sentences by *TF-IDF* and content overlap.

## T

**TF-IDF (Term Frequency–Inverse Document Frequency)** — A classical text-vector representation: terms that appear often in this document but rarely in others get high weight. Implemented in [`src/ml/TFIDF.ts`](./src/ml/TFIDF.ts).

**Transfer entropy** — An information-theoretic measure of how much one time series predicts another, beyond what its own past predicts. The pro feature in [`src/pro/infoflow/`](./src/pro/infoflow/). Useful for causality analysis.

**TSDR** — A four-beat lesson structure: **T**ell, **S**how, **D**o, **R**eview. The standard direct-instruction shape; the AsterMind lesson convention. See [ADR-0002](./claude-markdown-documents/ADRs/ADR-0002-elm-explination-as-canonical-lesson-model.md).

## W

**Web Worker** — A browser API that runs JavaScript on a background thread so it doesn't block the UI. AsterMind exposes [`ELMWorker`](./src/core/ELMWorker.ts) (worker side) and [`ELMWorkerClient`](./src/core/ELMWorkerClient.ts) (main-thread RPC).

**Weight initialisation** — How a network's random weights are sampled at construction time. AsterMind supports `uniform`, `xavier` (Glorot), and `he`. Different initialisers suit different *activation functions*.

**Whitening** — Decorrelating + scaling features so they have zero mean and unit variance. In KernelELM's *Nyström* mode, optional whitening is applied to the landmark embedding for inference parity (the `whiten: true` option).

## X

**Xavier initialisation** — Also called Glorot initialisation. Samples weights from a uniform distribution scaled by `sqrt(6 / (fan_in + fan_out))`. The default for sigmoid/tanh activations.
