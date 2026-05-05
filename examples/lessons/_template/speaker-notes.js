// Lesson template — speaker notes
// ----------------------------------------------------------------------------
// One key per slide id. Each entry has:
//   left  — what to say (script-style, full sentences)
//   right — talking cues (bullet list of emphases / things to point at)
//
// Both are HTML strings so you can use <strong>, <em>, <ul>, <li>, etc.
// The shared deck reads window.Notes; do not rename this global.

window.Notes = {
  welcome: {
    left: `
      <p>Welcome the learner by name if you can. Tell them what they'll be able to do <em>by the end of this lesson</em> — a concrete capability, not a list of topics.</p>
      <p>Set the time expectation up front: "This should take about 30 minutes; we'll do three small you-try exercises."</p>
    `,
    right: `
      <h3>Emphasize</h3>
      <ul>
        <li>What they'll be able to <em>do</em> after.</li>
        <li>Time estimate.</li>
        <li>Permission to skip a slide if the concept is already familiar.</li>
      </ul>
    `,
  },

  "how-to-add-slides": {
    left: `
      <p>This is the meta-slide for whoever copies this template. Three files to edit, no magic, no hidden steps.</p>
      <p>If presenting live, skip this slide unless the audience is going to author their own lesson today.</p>
    `,
    right: `
      <h3>Talking cues</h3>
      <ul>
        <li>The deck falls back to DOM order if <code>slides.json</code> is missing slides.</li>
        <li>Notes are optional; the deck doesn't care if a slide has no notes.</li>
        <li>Slide ids must match between HTML and JSON.</li>
      </ul>
    `,
  },

  "live-demo-example": {
    left: `
      <p>This is the simplest live demo: a button that updates a counter. Tiny, but it shows the wiring — slide id → demo function via the <code>demo</code> field in <code>slides.json</code>.</p>
      <p>If the audience is junior, walk through the three files together (<code>index.html</code>, <code>slides.json</code>, <code>live-demo.js</code>) and trace how they connect.</p>
    `,
    right: `
      <h3>Show, don't tell</h3>
      <ul>
        <li>Click the button on screen.</li>
        <li>Open the file, change "1 time" to your name, reload.</li>
        <li>Highlight that the demo only binds once even when navigating back.</li>
      </ul>
    `,
  },
};
