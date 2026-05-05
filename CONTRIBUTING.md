# Contributing

Welcome. AsterMind is a small library that takes pull requests seriously. This guide tells you what to expect.

## Local setup

```bash
git clone git@github.com:AsterMindAI/AsterMind-Community-Edition.git
cd AsterMind-Community-Edition
npm install
npm test          # 80+ tests should pass before you start
```

You'll need Node.js 20+ and npm 10+. The repo's `package-lock.json` is committed — `npm ci` works for reproducible installs in CI.

## Daily commands

| Command | What it does |
|---------|--------------|
| `npm test` | vitest suite (use during development) |
| `npm run build` | rollup → `dist/{esm,umd}.js` + tsc → `dist/index.d.ts` |
| `npm run watch` | rollup in watch mode |
| `npm run clean` | wipe `dist/` |
| `npm run dev:elm` | open the L00 lesson primer in your browser |
| `npm run dev:lesson:template` | open the lesson scaffold in your browser |
| `npm run dev:news` / `dev:lang` / `dev:autocomplete` / `dev:music` / etc. | open one of the demos |

See [`package.json`](./package.json) for the full list of `dev:*` scripts.

## What a good PR looks like

- **Small and focused.** One concern per PR. If you found two bugs while fixing one, file the second separately.
- **Tested.** If it touches the public API, it has at least a smoke test under [`tests/`](./tests/).
- **Documented.** If it changes a public method, it updates the README's "What's in the box" list. If it adds a major capability, it includes an ADR (see below).
- **Builds clean.** `npm run build` and `npm test` pass on your branch.
- **Doesn't enlarge the public API silently.** If you add an export to `src/index.ts`, that's a deliberate choice, not a side effect.

## Project conventions

### TypeScript
- `strict: true` everywhere. Don't suppress errors — fix them.
- Prefer named exports over default. The library's public surface is named exports only.
- New files use `kebab-case.ts`. Older files are `PascalCase.ts`; both are tolerated, new code follows kebab.

### Tests
- Live in [`tests/`](./tests/) as `.test.ts` files.
- Use vitest. The environment auto-switches to `jsdom` for tests that touch the DOM.
- A test should fail before your fix and pass after it.

### Imports
- All `src/` imports use `.js` extensions in module specifiers (rollup expects this for ESM output): `import { ELM } from '../core/ELM.js'`.
- No deep imports into `src/` from outside the source tree. The public surface is `src/index.ts`.

## Where new features go

| Kind of feature | Lives in |
|-----------------|----------|
| A new ML model (classifier, encoder) | `src/core/` |
| A wrapper around an existing model for a specific task | `src/tasks/` |
| A retrieval / RAG / summarization addition | `src/pro/` |
| A synthetic-data generator | `src/synth/` |
| A pre- or post-processing utility | `src/preprocessing/` or `src/utils/` |
| A teaching artifact (slides, demo) | `examples/lessons/` |
| A working application demo | `examples/practical-examples/` |

If you're not sure, propose it in an issue first.

## Before adding a new ELM variant

We retired 21 community variants and 5 pro variants in v4.0.0 because they were untested scaffolding. The bar for new variants is therefore explicit:

1. **Real math.** The variant's class name describes what it does, not aspirationally. If you call it `QuantumInspiredELM`, it implements quantum-inspired math, not adjacent-pair swaps.
2. **Real tests.** Unit tests exercise the math the name implies — not just "the class can be constructed."
3. **An ADR.** A short ADR (in [`claude-markdown-documents/ADRs/`](./claude-markdown-documents/ADRs/)) explains what this variant offers that core `ELM` / `KernelELM` / `OnlineELM` / `DeepELM` doesn't.
4. **At least one example or lesson.** A new variant earns at least one runnable demo or lesson that uses it.

Variants meeting these four bars are welcome. Variants that don't will get politely rejected. See [`docs/HISTORY.md`](./docs/HISTORY.md) for the full retirement record.

## Architecture decisions and implementation plans

Significant changes get an ADR. The convention is documented in [`claude-markdown-documents/README.md`](./claude-markdown-documents/README.md).

- **ADRs** answer *why* a decision was made and which alternatives were weighed. Numbered `ADR-NNNN-slug.md`.
- **Implementation plans** answer *how* — phases, file lists, validation steps. Numbered to match (`IMPL-NNNN-slug.md`).
- **Don't edit accepted ADRs.** Supersede them with a new ADR. The history matters.

You don't need an ADR for a bug fix. You do need one for: removing public API, changing how a major subsystem works, establishing a project-wide convention.

## Lesson contributions

Lessons follow a defined pedagogy: A-SMART outcomes + TSDR slide arc + Backward Design authoring (terms in [`GLOSSARY.md`](./GLOSSARY.md)). Start by copying the template:

```bash
cp -R examples/lessons/_template examples/lessons/L<NN>-<slug>
```

Edit the five files documented in [`examples/lessons/_template/README.md`](./examples/lessons/_template/README.md). The full pedagogy rationale is in [ADR-0002](./claude-markdown-documents/ADRs/ADR-0002-elm-explination-as-canonical-lesson-model.md). The build will validate your `slides.json` against the schema (see [`tests/lessons-schema.test.ts`](./tests/lessons-schema.test.ts)).

## Git workflow

- **Don't force-push to `main`.** If `main` is broken, fix it forward.
- **Don't skip hooks.** No `--no-verify` on commits.
- **Commit messages** are present-tense imperative ("Fix broken README links", not "Fixed" or "Fixes"). The first line is a one-line summary; the body explains *why*.
- **Branches** are short slugs: `fix/readme-links`, `feat/web-worker-fanout`. Avoid issue numbers in branch names.

## License + patent

By contributing, you agree your contributions are licensed under MIT (the project license; see [`docs/LEGAL.md`](./docs/LEGAL.md)). The patent notice (US 63/897,713) covers the AsterMind ELM techniques and is filed by AsterMind AI Co.

## Asking for help

Open an issue. Tag it `question` if you're not yet sure whether you're proposing a change or just asking. We'd rather answer too many questions than have someone spin in confusion.
