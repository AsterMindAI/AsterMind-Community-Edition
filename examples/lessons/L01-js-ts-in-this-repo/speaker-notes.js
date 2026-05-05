// L01 — speaker notes
// One key per slide id. left = script. right = talking cues.
// HTML strings; <strong>, <em>, <ul>, <li> all OK.

window.Notes = {
  welcome: {
    left: `
      <p>Set the time expectation aloud: "We have 45 minutes; you'll come out of this with three concrete things on a checklist."</p>
      <p>If the learner is anxious about JS specifically, normalise it: this lesson assumes they've coded <em>something</em> before, in any language. Python / C / GDScript all transfer.</p>
    `,
    right: `
      <h3>Emphasize</h3>
      <ul>
        <li>Three observable outcomes — not "understand TS"</li>
        <li>No ML today; tomorrow.</li>
        <li>This is the loop they'll use every day. Fluency, not facts.</li>
      </ul>
    `,
  },

  "why-typescript": {
    left: `
      <p>The "errors at edit time, not runtime" framing is the only TS pitch worth giving today. Don't sell autocomplete or refactoring; those land later.</p>
      <p>If they ask "but JavaScript is fine, right?" — yes, but only after you've been bitten enough times to internalise the bugs. TS short-circuits that learning curve.</p>
    `,
    right: `
      <h3>Talking cues</h3>
      <ul>
        <li>Edit time vs runtime — say it twice.</li>
        <li>Don't drift into <em>structural typing</em>, <em>generics</em>, etc. today.</li>
        <li>The crash example is the real point.</li>
      </ul>
    `,
  },

  "what-is-npm": {
    left: `
      <p>The big thing to land: <code>node_modules/</code> is downloaded, never edited, never committed. Lots of new contributors try to fix things by editing in there.</p>
      <p>The "0 runtime dependencies" detail is a confidence-builder. They're not stepping into a sprawling supply chain.</p>
    `,
    right: `
      <h3>Show, don't tell</h3>
      <ul>
        <li>Open <code>package.json</code>; point at <code>"dependencies": {}</code>.</li>
        <li>Open <code>node_modules/</code>; show how huge it is, then close it.</li>
      </ul>
    `,
  },

  "repo-tour": {
    left: `
      <p>Don't read the file tree aloud. Pause for 30 seconds; let them read. Then point at <em>just three</em> directories: <code>src/</code>, <code>tests/</code>, <code>examples/lessons/</code>.</p>
      <p>If you have time, open the actual repo in their editor side-by-side.</p>
    `,
    right: `
      <h3>Pick three</h3>
      <ul>
        <li><code>src/</code> = the code that ships</li>
        <li><code>tests/</code> = vitest specs</li>
        <li><code>examples/lessons/</code> = where they live this summer</li>
      </ul>
    `,
  },

  "live-types": {
    left: `
      <p>Have <em>them</em> click the buttons, not you. Even if they "get it" instantly, make them push the button. The moment-of-error appearing is the lesson.</p>
      <p>The third question on the you-try ("what would the error <em>not</em> tell you?") is intentionally open. Possible good answers: a fix suggestion, the line of the producer of the bad value, etc. Don't push for one.</p>
    `,
    right: `
      <h3>Hand them the keyboard</h3>
      <ul>
        <li>Three clicks, slow.</li>
        <li>Read the error message aloud.</li>
        <li>This is the foundational TS moment. Don't rush.</li>
      </ul>
    `,
  },

  "build-pipeline": {
    left: `
      <p>The arrow diagram is enough. Don't open the rollup config or the tsconfig — they're not productive reading for a beginner.</p>
      <p>The hook is the "next two lessons load <code>astermind.umd.js</code> via a script tag" detail. That's why this matters today, not abstractly.</p>
    `,
    right: `
      <h3>Forward-link</h3>
      <ul>
        <li>L02 + L03 use the UMD bundle. This is the bridge.</li>
        <li>Don't open rollup.config.cjs.</li>
      </ul>
    `,
  },

  "tests-explained": {
    left: `
      <p>If they've used pytest, unittest, or any other xUnit-shaped framework, this is just the JS version. Anchor to that if they have it.</p>
      <p>The <code>describe / it / expect</code> trio is the whole API for today. They'll see <code>beforeEach</code>, <code>vi.fn</code>, etc. later — none of it for L01.</p>
    `,
    right: `
      <h3>Anchor to known testing</h3>
      <ul>
        <li>Same shape as pytest / unittest / JUnit.</li>
        <li>Today: <code>describe / it / expect</code> only.</li>
      </ul>
    `,
  },

  "do-clone-install": {
    left: `
      <p>Sit with them while they do this. The first <code>npm install</code> is psychologically the most fragile moment — if it fails, they think the whole thing's broken.</p>
      <p>If git SSH fails for them, fall back to HTTPS without making it a thing. The point is to get to a green test run.</p>
    `,
    right: `
      <h3>Don't leave them alone</h3>
      <ul>
        <li>Watch the <code>npm install</code>.</li>
        <li>If it fails: <code>node --version</code> first.</li>
        <li>Goal: green tests.</li>
      </ul>
    `,
  },

  "do-edit-and-pr": {
    left: `
      <p>Two reasons we break <code>relu</code> specifically: the test failure is loud and unambiguous (it's in the most-tested file), and the fix is one character.</p>
      <p>For the README fix, encourage a <em>real</em> typo or wording improvement, not a fake one. Authentic small contributions are what we want them learning.</p>
      <p>The <code>lesson-pr-target</code> branch must exist on origin. If it doesn't, that's a Phase 0 bug — file an issue and tell Nolan.</p>
    `,
    right: `
      <h3>Watch for</h3>
      <ul>
        <li>Are they reading the test failure message? Coach them to.</li>
        <li>Real README fixes only — no faked typos.</li>
        <li><code>lesson-pr-target</code> must exist before this slide is run.</li>
      </ul>
    `,
  },

  review: {
    left: `
      <p>Don't let the review become a quiz. The questions are open-ended on purpose — you want to hear what surprised them, not what they remembered.</p>
      <p>If they say "nothing surprised me," push once: "Was there a moment where you had to slow down or look something up?"</p>
    `,
    right: `
      <h3>Open prompts, not test questions</h3>
      <ul>
        <li>Push gently if they say "nothing."</li>
        <li>Their answer goes in their own notes; not graded.</li>
        <li>Then point at L02.</li>
      </ul>
    `,
  },
};
