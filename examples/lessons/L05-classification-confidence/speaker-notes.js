// L05 — speaker notes
window.Notes = {
  welcome: {
    left: `
      <p>Open by orienting Jarrett — this is his lane's foundational lesson; everything he'll do in the LOTL classifier capstone is built on threshold-tuning. Nolan as required-for-completeness; Thomas optional.</p>
      <p>Three observable outcomes. Outcome 3 (find a useful threshold) is the synthesis of 1 and 2.</p>
    `,
    right: `
      <h3>Frame the audience</h3>
      <ul>
        <li>Jarrett's required lesson.</li>
        <li>Outcome 3 is synthesis — give it the most time.</li>
      </ul>
    `,
  },

  "confidence-not-just-label": {
    left: `
      <p>Make explicit that the <code>prob</code> field has been there since L02. We just ignored it. The lesson is using something already familiar in a new way, not introducing a new API surface.</p>
      <p>"Confidence ≠ correctness" is the line that prevents future bugs. A confident wrong prediction is a real thing. Calibration is a deeper topic; today, the loose correlation is enough.</p>
    `,
    right: `
      <h3>Reuse the familiar</h3>
      <ul>
        <li><code>prob</code> was always there.</li>
        <li>Confidence ≠ correctness, but correlates.</li>
      </ul>
    `,
  },

  "precision-recall": {
    left: `
      <p>Use the support-ticket framing — it's the most relatable. If you have time, ask: "if you were the on-call engineer, which error mode is more painful?" Get an answer before continuing. They'll usually pick FN (missed urgent), and that's the right intuition for security classifiers too.</p>
      <p>Don't introduce F1, AUC, or any other derived metric today. Precision + recall is the conceptual minimum.</p>
    `,
    right: `
      <h3>Two error modes</h3>
      <ul>
        <li>FP wastes time. FN misses real problems.</li>
        <li>Precision penalises FP; recall penalises FN.</li>
        <li>Don't introduce F1/AUC today.</li>
      </ul>
    `,
  },

  "the-threshold": {
    left: `
      <p>The 6-line <code>decide</code> function is the entire mechanism. Read it aloud — it's that simple. The model's job is to produce <code>prob</code>; the threshold's job is to translate <code>prob</code> into a decision.</p>
      <p>The "I don't know" possibility (escalate to a human, defer the call, pre-warn the user) is a real design choice in production. Mention it once; don't dwell.</p>
    `,
    right: `
      <h3>Six lines of code</h3>
      <ul>
        <li>Threshold is application logic, not model logic.</li>
        <li>"I don't know" is a valid third class in production.</li>
      </ul>
    `,
  },

  "pr-curve": {
    left: `
      <p>The numerical example is illustrative. The actual numbers in the demo will differ; ELM init is random.</p>
      <p>"Flat in the upper-right is what you want" — that's a useful heuristic. A steep curve means small threshold changes have big consequences, which is operationally fragile.</p>
    `,
    right: `
      <h3>Curve geometry</h3>
      <ul>
        <li>Flat upper-right = robust threshold choice.</li>
        <li>Steep dropoff = fragile.</li>
        <li>Don't memorise — feel it in the demo.</li>
      </ul>
    `,
  },

  "live-threshold": {
    left: `
      <p>Click Train. <em>Don't talk for 10 seconds.</em> Let the held-out grid populate. Point at one row with high confidence and one with low confidence — match the You-Try 1 pass condition.</p>
      <p>Drag the slider slowly. Stop at three places: 0.50, 0.75, 0.95. Read the precision/recall numbers aloud at each. The change is the lesson.</p>
      <p>Confusion matrix moves with the slider. Highlight that TP+FP+TN+FN always equals 10 (the held-out size). Conservation principle — it's all about how the 10 get distributed.</p>
      <p>Live input at step 3: encourage them to type things deliberately — both clearly urgent and clearly low, then a borderline like "login slow today". The borderline cases are where threshold matters most.</p>
      <p>Step 4 (notes box): no grading. The rationale sentence is what matters, not the threshold value. Multiple thresholds satisfy the bar; let them pick whichever they reason about clearly.</p>
    `,
    right: `
      <h3>Demo flow</h3>
      <ul>
        <li>Train, pause, point at a confident + a borderline row.</li>
        <li>Slider stops at 0.50 / 0.75 / 0.95.</li>
        <li>Confusion-matrix sums conserved.</li>
        <li>Live input on borderline cases.</li>
        <li>Step 4: rationale matters, not the value.</li>
      </ul>
    `,
  },

  "connection-to-capstone": {
    left: `
      <p>Walk Jarrett through the mapping explicitly. Today's "low/urgent" is tomorrow's "benign/malicious". The threshold UI he'll build for LOTL is structurally identical to the demo on slide 6.</p>
      <p>The "credible-security-engineer move" line is meant for the on-site presentation. Reporting accuracy alone is amateur; reporting precision and recall at three thresholds is what a real SOC pitch looks like.</p>
    `,
    right: `
      <h3>Capstone bridge</h3>
      <ul>
        <li>Same UI, different labels.</li>
        <li>Capstone deck: precision/recall at 3 τ's.</li>
        <li>That's the credible move.</li>
      </ul>
    `,
  },

  "next-steps": {
    left: `
      <p>Branch by lane: Nolan to L06; Jarrett to capstone scoping; Thomas already past required curriculum.</p>
      <p>For Jarrett specifically: the next concrete action is pulling up his STARTER.md and starting the dataset walk-through with Julian. Make that handoff explicit if walking with him.</p>
    `,
    right: `
      <h3>Branch by lane</h3>
      <ul>
        <li>Nolan → L06.</li>
        <li>Jarrett → capstone scoping.</li>
        <li>Thomas → already past required.</li>
      </ul>
    `,
  },
};
