# The Secret Map of the Magic Forest

A static, kid-friendly lesson site that teaches the two uses of the Present Continuous
(NOW vs LATER) to A1 Turkish-speaking 10-year-olds. Four gamified stages, mascot Pip the fox.

## Run

- `npm install`
- `npm run serve` then open http://localhost:4173 (a static host is required because the lesson loads `data/content.json` with `fetch`)
- `npm test` runs the unit tests (grammar, checkers, state, content lint, assets, lesson script)
- `npm run e2e` runs the Playwright tests (desktop and 360px phone viewport); first run needs `npx playwright install chromium`
- `npm run build:md` regenerates `docs/lesson-script.md` (bullet-only lesson script) from `data/content.json`

## Layout

- `data/content.json`: all lesson text and activities
- `js/engine/`: pure logic (grammar, answer checking, progress state)
- `js/activities/`: one module per activity type
- `js/ui/`: slides, Pip, hints, confetti
- `assets/`: hand-authored SVG art

## Deep links (demos and tests)

`/?stage=2&slide=4` (zero-based) jumps straight to a slide.
