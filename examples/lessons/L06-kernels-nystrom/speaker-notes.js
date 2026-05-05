// L06 — speaker notes
window.Notes = {
  welcome: {
    left: `
      <p>Open by orienting Nolan — this is the math-flavoured lesson and his lane's foundation. Tell him explicitly that NB-005 (RFF) is going to ride directly on the kernel-trick framing introduced today.</p>
      <p>The 60-minute time budget is a real one — this lesson is denser than L01–L05. Don't try to compress.</p>
    `,
    right: `
      <h3>Set the depth</h3>
      <ul>
        <li>Nolan-required; capstone bridge is direct.</li>
        <li>Densest lesson; budget 60 min, not 45.</li>
      </ul>
    `,
  },

  "linear-fails": {
    left: `
      <p>The ASCII rings diagram does the work — make sure they look at it for 15 seconds. Hand-draw a straight line on the whiteboard if you have one. Show how every line cuts both rings.</p>
      <p>The "pixels for digits, audio spectra, cybersecurity events" list is meant to land that this isn't a contrived 2D toy — non-linearly-separable problems are the rule, not the exception.</p>
    `,
    right: `
      <h3>Make them try</h3>
      <ul>
        <li>"Try drawing a line" — they can't.</li>
        <li>Real-world examples: digits, audio, security events.</li>
        <li>Linear failure is the rule.</li>
      </ul>
    `,
  },

  "kernel-trick": {
    left: `
      <p>The hardest slide in the lesson. Walk it slowly. The (x, y) → (x, y, x²+y²) example is concrete; spend time on it.</p>
      <p>The key sentence is "we never compute the mapping; we compute only pairwise inner products via the kernel." Say it twice, in different words. The kernel-trick concept is the whole foundation; everything else is mechanics.</p>
      <p>If they ask "what kernel function corresponds to (x, y, x²+y²)?" — answer: a polynomial kernel of degree 2. But don't open that rabbit hole; the answer is just to confirm that the trick is real and well-defined.</p>
    `,
    right: `
      <h3>Walk it slowly</h3>
      <ul>
        <li>"We never compute the mapping" — twice.</li>
        <li>(x,y) → (x,y,x²+y²) is the warmup.</li>
        <li>Polynomial kernel = that mapping. Don't dive in.</li>
      </ul>
    `,
  },

  "rbf-intuition": {
    left: `
      <p>The Gaussian-bump-per-training-point mental model is the most useful framing. Don't introduce RKHS, Mercer's theorem, or any of the heavy machinery today; Nolan can encounter that in his own reading if he wants.</p>
      <p>The γ-as-bandwidth detail matters because the demo uses a fixed γ. If a learner asks "how do you pick γ?" — answer: "in production you'd tune it via cross-validation. Today γ=12 is hand-picked for the 0–1 unit square; it works."</p>
    `,
    right: `
      <h3>Bumps, not RKHS</h3>
      <ul>
        <li>One Gaussian bump per training point.</li>
        <li>γ controls bandwidth.</li>
        <li>γ=12 hand-picked for unit square.</li>
      </ul>
    `,
  },

  "cost-of-kernels": {
    left: `
      <p>The N=100 / 10K / 1M numbers ground the cost. Real-world ML datasets routinely cross the "off the table" boundary; that's <em>why</em> approximations exist as a research area.</p>
      <p>This is also Nolan's bridge into NB-005 — RFF is born of the same scaling problem. Make the linkage explicit aloud.</p>
    `,
    right: `
      <h3>Numbers ground it</h3>
      <ul>
        <li>100 → trivial; 10K → careful; 1M → no.</li>
        <li>Why approximations are a real research area.</li>
        <li>Bridge to RFF / NB-005.</li>
      </ul>
    `,
  },

  "nystrom-intuition": {
    left: `
      <p>"Ask a few representative neighbors" is the everyday metaphor. The N × m matrix vs N × N matrix framing makes the cost saving concrete.</p>
      <p>Don't introduce SVD whitening details unless asked. Our implementation defaults to <code>whiten: true</code> and the demo doesn't expose the toggle. The right level of abstraction here is "Nyström picks landmarks; m is the knob."</p>
      <p>The "m → N is identical to exact" line is important — Nyström isn't a separate algorithm, it's a parameterised approximation. As m grows, you smoothly approach exact RBF.</p>
    `,
    right: `
      <h3>Smooth approximation</h3>
      <ul>
        <li>m landmarks, not full pairwise.</li>
        <li>m → N = exact RBF (and equally expensive).</li>
        <li>Don't open SVD/whitening today.</li>
      </ul>
    `,
  },

  "live-kernels": {
    left: `
      <p><strong>Step 1 — Linear:</strong> click <em>Train Linear</em> first. Watch the boundary canvas. It'll be a straight line (or close to it). Held-out accuracy will be ~50–60% — barely better than random. Pause, point at the boundary, ask "does this look like a useful classifier?" Get a "no" out loud.</p>
      <p><strong>Step 2 — RBF:</strong> click <em>Train RBF (exact)</em>. The boundary suddenly hugs the inner ring; accuracy jumps to ≥90%. The visual change is the moment.</p>
      <p><strong>Step 3 — Nyström sweep:</strong> walk through m=5, m=20, m=100 in that order. Read accuracy + time aloud at each. The "smallest m within 5 pp of exact" answer is usually around 15–25 for this dataset, but ELM init randomness can shift it; let them find their own answer.</p>
      <p>The runs-history list at the bottom is for them to read. They can compare across runs without remembering numbers.</p>
      <p>Resample-data button reshuffles training + held-out. Useful for showing that the conclusions are robust across resamples (not lucky on one specific dataset).</p>
    `,
    right: `
      <h3>Demo flow</h3>
      <ul>
        <li>Linear first; ask "is this useful?"</li>
        <li>RBF: visual jump = the lesson.</li>
        <li>Nyström sweep: 5 → 20 → 100.</li>
        <li>Resample to verify robustness.</li>
      </ul>
    `,
  },

  "connection-to-rff": {
    left: `
      <p>This is the explicit bridge into Nolan's capstone notebook. The four-row table is the structural outline he'll fill in.</p>
      <p>"Data-dependent vs data-independent" is the headline distinction between Nyström and RFF, and it's worth saying once. Nyström picks landmarks <em>from the data</em>; RFF samples random projections <em>independent of the data</em>. Different machinery, similar effect.</p>
      <p>For Nolan: leave this slide up while you walk him through what NB-005 should produce. The benchmark portion (rows 1–4 head-to-head on a real dataset) is the heavy lifting.</p>
    `,
    right: `
      <h3>The four-row table</h3>
      <ul>
        <li>Data-dependent (Nyström) vs data-independent (RFF).</li>
        <li>NB-005 fills in row 4 + benchmarks all four.</li>
        <li>Leave this slide up during the handoff.</li>
      </ul>
    `,
  },

  "next-steps": {
    left: `
      <p>This is the curriculum's last lesson. Capstone build is full-time from here.</p>
      <p>If walking with Nolan: confirm next concrete actions — start NB-005 outline, draft PUBLISHING.md, schedule Discussions go-live. The capstone STARTER.md has the full deliverable list.</p>
    `,
    right: `
      <h3>Final lesson</h3>
      <ul>
        <li>Curriculum complete.</li>
        <li>Capstone build is full-time.</li>
        <li>Confirm NB-005 outline + PUBLISHING.md + Discussions on Nolan's side.</li>
      </ul>
    `,
  },
};
