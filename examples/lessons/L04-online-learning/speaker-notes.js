// L04 — speaker notes
window.Notes = {
  welcome: {
    left: `
      <p>Open by orienting Thomas explicitly — this is his lane's foundational lesson. Jarrett and Nolan are sitting in either as required (Nolan) or as a recommended optional (Jarrett, only if hours allow).</p>
      <p>Three observable outcomes. The third one — the forgetting-factor tradeoff — is the conceptually meaty one and should get the most time.</p>
    `,
    right: `
      <h3>Frame the audience</h3>
      <ul>
        <li>Thomas's required lesson.</li>
        <li>Concept drift + λ tradeoff is the center of gravity.</li>
      </ul>
    `,
  },

  "why-online": {
    left: `
      <p>The three real-world examples (autocomplete, sensors, RPS opponent) are doing pedagogical work — they make "online learning" concrete before any algorithm appears.</p>
      <p>If the cohort has a concrete project in mind that doesn't involve streaming data, mention it and walk through whether it'd benefit from online updates anyway. Most production systems do at some scale.</p>
    `,
    right: `
      <h3>Concrete first, theory after</h3>
      <ul>
        <li>Three real-world examples.</li>
        <li>RPS hook is for Thomas; sensors hook is for Jarrett if he's there.</li>
      </ul>
    `,
  },

  "rls-intuition": {
    left: `
      <p>Resist the urge to derive RLS. The two-state-pieces framing (β + P) is enough for them to use the API correctly today.</p>
      <p>The "O(1) per update" point matters because it's <em>why</em> online learning is even feasible. If updates got linearly slower with dataset size, online learning would be useless past day 1.</p>
    `,
    right: `
      <h3>Two pieces of state</h3>
      <ul>
        <li>β = weights (what's been learned).</li>
        <li>P = confidence per direction.</li>
        <li>Updates are O(1) in dataset size.</li>
      </ul>
    `,
  },

  "forgetting-factor": {
    left: `
      <p>The three numerical examples (1.0, 0.99, 0.9) and the "after N samples, weight is..." framing are the things to land. Don't go into the math of the geometric series; the multiplicative-decay intuition is enough.</p>
      <p>The tradeoff slide (lower λ vs higher λ) is the lesson's main concept. The hands-on you-try in step 3 is what makes it stick — they have to <em>feel</em> the tradeoff.</p>
    `,
    right: `
      <h3>The tradeoff</h3>
      <ul>
        <li>Low λ → fast adaptation, jumpy on stable data.</li>
        <li>High λ → stable, slow to recover from drift.</li>
        <li>No "best" — situational.</li>
      </ul>
    `,
  },

  "the-api": {
    left: `
      <p>Three rules. The seed-batch requirement is the most surprising one — first-time users hit it and get a confusing error. Naming it now saves a frustrating debug session later.</p>
      <p>The 2D-array-for-single-sample quirk is not unusual in numerical libraries (numpy users will recognise it). For Thomas, who'll write update calls for every game round, this is the one to internalize.</p>
    `,
    right: `
      <h3>Three quirks to remember</h3>
      <ul>
        <li><code>init</code> first or <code>update</code> errors.</li>
        <li>2D arrays even for one sample.</li>
        <li><code>predict</code> returns prob rows, not labels.</li>
      </ul>
    `,
  },

  "live-stream": {
    left: `
      <p>Click <strong>Start</strong>. Don't talk for 15 seconds. Let them watch. The orange line climbing is the moment.</p>
      <p>For You-Try 2 (drift), pause and ask: "what do you think will happen when I click Flip?" Get a guess on the record before clicking. Then click. The crash is more dramatic if predicted.</p>
      <p>For You-Try 3 (λ tuning), do λ=0.9 first to see fast recovery, then λ=1.0 to compare. The slow recovery at λ=1.0 is uncomfortable to watch — that's the point.</p>
      <p>The yellow-outlined points on the scatter canvas are wrong predictions. After drift, almost everything gets a yellow outline; as the model recovers, outlines disappear. That's a second visual signal beyond the accuracy plot.</p>
    `,
    right: `
      <h3>Let them watch first</h3>
      <ul>
        <li>Predict before clicking Flip.</li>
        <li>Compare λ=0.9 vs λ=1.0 head-to-head.</li>
        <li>Yellow outlines = wrong predictions.</li>
      </ul>
    `,
  },

  "connection-to-capstone": {
    left: `
      <p>This is the bridge to Thomas's capstone. Make the mapping explicit — every component of the demo maps to a component of RPS. Leave the slide up while you walk Thomas through it; he should leave this lesson with a clear plan for his capstone scaffold.</p>
      <p>For Jarrett (if attending): note that classification with confidence (L05) is more directly relevant to his lane. Online learning may show up if his classifier needs to update during deployment, but that's a stretch.</p>
    `,
    right: `
      <h3>Walk the mapping</h3>
      <ul>
        <li>Round = sample.</li>
        <li>History = input.</li>
        <li>Drift = strategy shift.</li>
        <li>λ ≈ 0.95 starting point.</li>
      </ul>
    `,
  },

  "next-steps": {
    left: `
      <p>The lesson tree branches here by lane. Be explicit about who goes where.</p>
      <p>Thomas should leave this lesson and go straight to capstone scaffolding (build the game shell first, then wire the model — see his STARTER.md).</p>
    `,
    right: `
      <h3>Branch by lane</h3>
      <ul>
        <li>Jarrett → L05.</li>
        <li>Nolan → L06.</li>
        <li>Thomas → capstone.</li>
      </ul>
    `,
  },
};
