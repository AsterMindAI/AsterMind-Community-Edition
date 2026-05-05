# Lesson Template

This is the **starting point for every new AsterMind lesson**. Copy this directory, rename it, edit the five files, and you have a working lesson.

## Why a template?

Every lesson has the same shape so:

- A new author doesn't have to invent layout, navigation, or notes plumbing.
- A learner who's done one lesson knows where to look in the next.
- The lessons live happily in version control and break the build if they go out of spec.

## How to make a new lesson

1. **Copy this directory** to `examples/lessons/L<NN>-<slug>/`. Use the next available `<NN>` and a short slug:

   ```bash
   cp -R examples/lessons/_template examples/lessons/L05-online-learning
   ```

2. **Edit the five files** (in any order — they reference each other by string id, so go where it's easiest):

   | File | What it owns |
   |------|--------------|
   | `index.html` | The HTML for each slide. Header text, page title, slide content. |
   | `slides.json` | The slide order, plus optional `demo` and `notes_id` fields. |
   | `live-demo.js` | One function per interactive demo. Wire to slides via `window.Lesson.onSlide(id, fn)`. |
   | `speaker-notes.js` | One key per slide id; `left` is the script, `right` is bullet cues. |
   | `README.md` | Replace this content with the lesson's pitch + you-try. |

3. **Run it locally** to check it renders:

   ```bash
   LESSON_DIR=L05-online-learning npm run dev:lesson
   # or, if you added a per-lesson script in package.json:
   npm run dev:lesson:05
   ```

4. **Add it to the curriculum index** at [`examples/lessons/README.md`](../README.md) so it shows up in the table.

5. **Open a PR.** The vitest schema check will validate your `slides.json` automatically.

## What every lesson README should contain

When you replace this README for your lesson, follow this shape:

```markdown
# Lesson <NN> — <Title>

**Time:** ~30 minutes
**Prerequisites:** Lesson <NN-1> complete; `npm install` run.
**You'll learn:** one concrete capability the learner walks away with.

## Run it

\`\`\`bash
npm run dev:lesson:<NN>
\`\`\`

## After this lesson, you'll be able to:

- Bullet 1 — concrete, observable.
- Bullet 2 — concrete, observable.
- Bullet 3 — concrete, observable.

## You try

Three small exercises the learner does inside the live demo. No grading.
```

## Naming conventions

- Lesson directories: `L<NN>-<kebab-slug>/` (e.g. `L02-your-first-classifier/`).
- Slide ids in HTML / JSON: lowercase kebab (`welcome`, `how-to-add-slides`). Must be valid HTML ids.
- Demo function names in `live-demo.js`: camelCase, suffix `Demo` (e.g. `helloDemo`, `embeddingDemo`).
- Notes keys in `speaker-notes.js`: match the slide id exactly.

## Things to watch out for

- **Slide ids must match between `index.html`, `slides.json`, and `speaker-notes.js`.** A typo in any one of them silently breaks the wiring.
- **Don't put your custom CSS in the shared file.** Lessons can add their own `<style>` block in `index.html` for slide-specific styles. Keep `_shared/lesson.css` for the deck infrastructure only.
- **Demos should bind once.** The `helloDemo` in this template uses `button.dataset.bound = "1"` to avoid re-binding when the learner navigates back. Follow the same pattern.
- **Live demos use only the public API.** If your lesson needs an internal symbol, it shouldn't be a lesson — it's a test.
