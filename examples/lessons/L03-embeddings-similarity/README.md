# Lesson 03 — Embeddings + Similarity

**Time budget:** 45 minutes
**Prerequisites:** [L02 — Your first classifier](../L02-first-classifier/) walked through, including all three You-Trys.

## Learning outcomes (A-SMART)

By the end of this 45-minute lesson, the intern will:

1. **Encode** any of the 10 bundled greeting phrases into a fixed-length numeric vector using `UniversalEncoder`, observe the resulting vector's dimension and first 16 components in the live demo, in under 5 minutes.
2. **Query** the bundled `EmbeddingStore` (10 phrases pre-encoded) with a typed query phrase and receive the top-3 results sorted by cosine similarity — with cosine scores visible — in under 10 minutes.
3. **Identify and articulate one limitation** of character-level lexical similarity (the kind built today) by typing two semantically related but lexically different phrases (e.g. "hi" vs "salut") and observing that the cosine score does *not* reflect their meaning. Write the observation in the You-Try note field, in under 5 minutes.

Outcome 3 is deliberate — this lesson teaches *the mechanism* (vector → cosine → ranking) honestly, including its main failure mode. Real semantic embeddings live in later lessons.

## Slide arc (TSDR)

| Beat | Slides | Purpose |
|------|--------|---------|
| **Tell** | `welcome`, `text-as-numbers`, `cosine-intuition` | Motivate why a vector, what cosine means geometrically |
| **Show** | `the-encoder`, `the-store` | API for `UniversalEncoder` and `EmbeddingStore` |
| **Do** | `live-similarity` | Interactive: encode a query, see top-3 from the store, with score |
| **Review** | `caveat-lexical-vs-semantic`, `next-steps` | What this kind of similarity does *not* capture; bridge to later lessons |

## Run it

```bash
npm run dev:lesson:03
# or: LESSON_DIR=L03-embeddings-similarity npm run dev:lesson
```

## You try

All three You-Trys live in the panel on slide `live-similarity`.

### You-Try 1 — Encode a phrase

Click any of the 10 bundled phrases. The panel shows:
- The phrase's character-level vector dimension (a single integer)
- The first 16 vector components rendered as a horizontal bar plot

**Pass condition:** You can name the vector's dimension out loud and point at one tall bar and one short bar in the visualization.

### You-Try 2 — Query the store

Type a query phrase into the search input. The panel shows the top-3 phrases from the bundled corpus, sorted by cosine similarity (highest first), each with its score (0.00 – 1.00).

**Pass condition:** Type "hi" — receive top-3 with cosine scores ≥ 0 visibly displayed. The English greeting "hi friend" should rank higher than the French ones (the encoder is character-level; "hi" overlaps more with English-character phrases). If it doesn't, that's still a valid observation — note it in the You-Try 3 box.

### You-Try 3 — Find the failure mode

The encoder doesn't know that "hi" and "salut" mean the same thing. They share almost no characters; their cosine similarity is near zero.

1. Type "hi" into the query box and note the top-3 with their scores.
2. Then type "salut" and note the new top-3.
3. Notice how *little* overlap there is between the two result lists, even though the queries mean roughly the same thing in different languages.
4. In the **Observation** textarea below the search, write one sentence summarising what you saw and what it implies for using this kind of similarity in real apps.

**Pass condition:** Observation is written, makes a specific claim about character-level lexical similarity vs semantic similarity, and is at least 15 words long.

## Notes for the presenter

The pedagogical risk in L03 is that learners see "embeddings" and assume they mean *semantic* embeddings (the kind LLMs use). They don't, in this lesson. We teach the mechanism honestly with the simplest possible encoder (character-level), and we name the limitation. Don't over-promise.

If a learner asks "does this know that 'cat' and 'dog' are both animals?" — answer: "No, not with this encoder. That's what L05 and beyond start to address." Don't open the rabbit hole today.

The cosine-intuition slide has no live widget — just a static SVG. If the cohort has time and energy, you can spend a full 5 minutes on it. If they're tired, the takeaway "1 means same direction, 0 means perpendicular, scores between are how aligned" is enough.

## Where this is enforced

- **`tests/lessons-schema.test.ts`** validates this lesson's `slides.json`.
- The bundled corpus is hard-coded in [`live-demo.js`](./live-demo.js). Change it at your peril (it's calibrated so You-Try 2 produces a reproducible result for "hi").
- `EmbeddingStore` and `UniversalEncoder` are both stable public-API symbols (their tests live in [`tests/EmbeddingStore.test.ts`](../../../tests/EmbeddingStore.test.ts)).
