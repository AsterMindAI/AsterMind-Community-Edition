// L03 — speaker notes
window.Notes = {
  welcome: {
    left: `
      <p>Open with the honesty: today's similarity is character-level, not semantic. Don't oversell. The third you-try is to find the failure mode on purpose.</p>
      <p>If a learner has read about LLM embeddings beforehand, they may expect this lesson to be that. It's not. Acknowledge that gap up front rather than letting them discover it confused.</p>
    `,
    right: `
      <h3>Honesty up front</h3>
      <ul>
        <li>This isn't LLM-style embeddings.</li>
        <li>You-Try 3 is finding the failure on purpose.</li>
      </ul>
    `,
  },

  "text-as-numbers": {
    left: `
      <p>The hook: "models do math; math wants numbers." This is the bridge from "I've heard of vectors" to "I'm building one right now."</p>
      <p>Don't sell the encoder as smart. It counts characters. The depth is in what comes <em>after</em> the encoding (cosine, ranking, store).</p>
    `,
    right: `
      <h3>Plain framing</h3>
      <ul>
        <li>String → fixed-length number list.</li>
        <li>Today's encoder is just character counts.</li>
        <li>Crude. That's fine.</li>
      </ul>
    `,
  },

  "cosine-intuition": {
    left: `
      <p>Spend 3-5 minutes on the SVG. Walk the three special cases (0°, 90°, 180°). If they have linear-algebra background, drop the formula <code>cos θ = (A · B) / (|A| |B|)</code>; if not, skip the formula entirely — the geometric intuition is enough.</p>
      <p>The "for non-negative vectors, score is in [0, 1]" detail matters because the bar visualizations in step 2 of the demo only render positive scores.</p>
    `,
    right: `
      <h3>Geometric, not algebraic</h3>
      <ul>
        <li>1 = same direction; 0 = perpendicular.</li>
        <li>Drop the formula only if they want it.</li>
        <li>Non-negative vectors → score in [0,1].</li>
      </ul>
    `,
  },

  "the-encoder": {
    left: `
      <p>Walk the constructor args slowly. <code>charSet</code> includes accented characters because the corpus has French — point at that and explain why (encoder must have a slot for every character it will see).</p>
      <p>If a learner asks "what about Chinese / Arabic / emoji?" — answer "they'd need to be in charSet, or use mode: 'token'. Today we keep it small."</p>
    `,
    right: `
      <h3>Why the long charSet</h3>
      <ul>
        <li>French accents need slots.</li>
        <li>Out-of-charSet characters are dropped silently.</li>
        <li>Token mode is an alternative; not today.</li>
      </ul>
    `,
  },

  "the-store": {
    left: `
      <p>The store API is two methods today: <code>add</code> and <code>query</code>. Don't show <code>has</code>, <code>get</code>, capacity ring buffers — those are L04+ if at all.</p>
      <p>Highlight that the score in the result is <em>cosine</em> by default — which is what we want. Other metrics exist (e.g. <code>dot</code>, <code>l2</code>); cosine is the one to learn first.</p>
    `,
    right: `
      <h3>Two methods only</h3>
      <ul>
        <li><code>add(item)</code> / <code>query(vec, k, opts)</code></li>
        <li>Score = cosine by default.</li>
        <li>Don't mention dot/l2 today.</li>
      </ul>
    `,
  },

  "live-similarity": {
    left: `
      <p>Step 1 (chip click) is fast and concrete: click "hello there", see the 16 bars. Pick a chip with lots of E's (e.g. "good evening") to show a tall bar in the E slot.</p>
      <p>Step 2 (search): type "hi" yourself first, on screen. Top-3 should be English greetings. Then type "bonjour" — top-3 should shift to French. The visible shift is the moment.</p>
      <p>Step 3 (observation): this is the lesson's point. Don't supply the answer. If they're stuck, prompt: "you typed two queries that mean the same thing. What did the model think?"</p>
      <p>Word-count gate (≥15) is a soft enforcement of "actually write a sentence" rather than "k". Don't grade content; grade effort.</p>
    `,
    right: `
      <h3>The moment matters</h3>
      <ul>
        <li>Click a chip, see bars.</li>
        <li>Type "hi" then "bonjour"; watch the list shift.</li>
        <li>Don't supply the observation answer.</li>
      </ul>
    `,
  },

  "caveat-lexical-vs-semantic": {
    left: `
      <p>This slide is the lesson's payoff. The two-similarities framing makes the boundary explicit, which prevents future confusion.</p>
      <p>The mention of <code>EncoderELM</code> is a forward link, not today's content. Don't open it. Just plant: "there's a step beyond pure character counts; you'll see it."</p>
    `,
    right: `
      <h3>The honest boundary</h3>
      <ul>
        <li>Lexical = character/token overlap.</li>
        <li>Semantic = meaning overlap.</li>
        <li>Both have uses. Don't conflate.</li>
      </ul>
    `,
  },

  "next-steps": {
    left: `
      <p>Branch the cohort here: Thomas needs L04 next; Jarrett can skip to L05. Nolan does both as the lead.</p>
      <p>If you're walking this with a single intern, say which lesson is theirs and why.</p>
    `,
    right: `
      <h3>Branch the path</h3>
      <ul>
        <li>Thomas → L04 (online learning).</li>
        <li>Jarrett → L05 (classification + confidence).</li>
        <li>Nolan → both.</li>
      </ul>
    `,
  },
};
