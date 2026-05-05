// L02 — speaker notes
window.Notes = {
  welcome: {
    left: `
      <p>Open with the time expectation: 45 minutes, three observable outcomes, all in the page.</p>
      <p>If a learner is anxious about ML, normalise: today is API + observation, not theory. The theory is L00. Today they'll do.</p>
    `,
    right: `
      <h3>Set the table</h3>
      <ul>
        <li>Three things they'll do.</li>
        <li>No terminal today.</li>
        <li>Theory was L00; today is the keyboard.</li>
      </ul>
    `,
  },

  "what-is-classification": {
    left: `
      <p>"Classification, plain" — that's the framing. Don't drift into multilabel, hierarchical classification, anything fancy.</p>
      <p>The point of the example is: input is a string, output is a label + confidence number. That's it. That's the contract.</p>
    `,
    right: `
      <h3>Anchor on the contract</h3>
      <ul>
        <li>Input: text. Output: label + prob.</li>
        <li>No multilabel, no hierarchy today.</li>
      </ul>
    `,
  },

  "meet-intent-classifier": {
    left: `
      <p>Three lines of code is the whole API surface they need today. Don't open the source. Don't explain "Tokenizer". The activation function will land in L05; today it's just a config knob.</p>
      <p>If they ask "why these specific values for hiddenUnits / activation?": say "tested defaults; you'll learn to tune them in L06". Don't open the rabbit hole.</p>
    `,
    right: `
      <h3>Resist the depth</h3>
      <ul>
        <li>Three lines = enough.</li>
        <li>Don't explain Tokenizer or activation today.</li>
        <li>"Tested defaults" is a fine answer to "why?"</li>
      </ul>
    `,
  },

  "the-data": {
    left: `
      <p>Have them eyeball the table. Tiny dataset; intentional. Production is millions; we use 26 examples to make the lesson tractable.</p>
      <p>Point at the held-out column specifically. "These six examples won't be in training. The model has to figure them out."</p>
    `,
    right: `
      <h3>Eyeball the held-out</h3>
      <ul>
        <li>20 train + 6 held-out.</li>
        <li>Held-out is the test of generalization.</li>
      </ul>
    `,
  },

  "the-api": {
    left: `
      <p>Walk the three calls slowly: build, train, predict. Highlight the topK parameter — it's the second positional arg to predict.</p>
      <p>The result format is sorted, most-likely first. That's a small but useful contract.</p>
    `,
    right: `
      <h3>Walk the three calls</h3>
      <ul>
        <li>Build / train / predict.</li>
        <li>Result is sorted, prob descending.</li>
      </ul>
    `,
  },

  "accuracy-explained": {
    left: `
      <p>This is the only "concept" slide for today. The training-vs-held-out distinction is the most important thing they'll take from this lesson.</p>
      <p>Overfitting gets a name today. They'll see actual overfitting in L05 (when they tune the threshold knob) and L06 (when hidden units climb too high). Drop the seed.</p>
    `,
    right: `
      <h3>The one concept that lasts</h3>
      <ul>
        <li>Training acc ≠ held-out acc.</li>
        <li>Held-out is what counts.</li>
        <li>Name "overfitting" today; revisit later.</li>
      </ul>
    `,
  },

  "live-classifier": {
    left: `
      <p>Click <strong>Train</strong> first, before talking. Let them see the accuracy numbers appear. The "200ms" training time is the hook for "ELMs solve in closed form" — say it once.</p>
      <p>If accuracy comes in below 80%, click again calmly. ELM has random init; small datasets are sensitive to it. This is genuinely how it works in production.</p>
      <p>"Add Spanish" — predict accuracy will likely drop slightly. That's not failure. Three classes is harder than two. The bar relaxes to 75%.</p>
      <p>"Predict live" — encourage them to try edge cases: a single character, an empty string (the input is trimmed; nothing happens), a non-Latin script. Each is a teachable moment about what tokenization is doing under the hood.</p>
      <p>"Export JSON" — emphasize that this is a snapshot, not a full model save. Make sure they actually paste it somewhere. The "save and reload" muscle memory matters more than the literal bytes today.</p>
    `,
    right: `
      <h3>Click first, talk after</h3>
      <ul>
        <li>Hit Train immediately.</li>
        <li>Re-click if &lt; 80% — explain randomness.</li>
        <li>Spanish drops accuracy a bit; that's normal.</li>
        <li>Push edge cases on the predict input.</li>
        <li>Snapshot ≠ literal model save. Make them paste somewhere.</li>
      </ul>
    `,
  },

  "things-to-notice": {
    left: `
      <p>Open prompts again, like in L01. The "what surprised you" question gets the most useful answers.</p>
      <p>The "non-Latin script" question is intentionally a gotcha — the tokenizer wasn't trained on those characters, so prediction is essentially random. That's a real production concern; it'll come up again.</p>
    `,
    right: `
      <h3>Open prompts</h3>
      <ul>
        <li>Why might re-train differ?</li>
        <li>Did Spanish raise or lower held-out?</li>
        <li>Non-Latin — what happened?</li>
      </ul>
    `,
  },

  "next-steps": {
    left: `
      <p>The bridge into L03 is "how does the model see text?" — that's the embedding question. Don't preview the answer; just plant the question.</p>
      <p>If you have time, point at the training data and ask "the model can't actually read the word 'hello' — what does it see?" Let them sit with the question.</p>
    `,
    right: `
      <h3>Plant L03's question</h3>
      <ul>
        <li>"Hello" → what numbers?</li>
        <li>Don't preview the answer.</li>
      </ul>
    `,
  },
};
