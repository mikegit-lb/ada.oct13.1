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

## Lesson length

- Every slide in `data/content.json` has an `est` (seconds a 10-year-old A1 learner needs, including reading and retries).
- The finale shows the total ("This lesson takes about 59 minutes"); `tests/content.test.js` keeps the sum within 3300-3900 s and each stage near its share (hook 10%, now 30%, later 35%, challenge 25%).
- Current estimate: about 59 minutes, 66 activities (Stage 4 gates: 13 across 5 path quizzes).
