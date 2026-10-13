# The Secret Map of the Magic Forest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static, kid-friendly interactive lesson site that teaches the two uses of the Present Continuous (NOW vs LATER) to A1 Turkish-speaking 10-year-olds through four gamified stages, plus a bullet-only Markdown lesson script generated from the same content.

**Architecture:** All lesson text lives in one `data/content.json`. A small set of reusable activity modules (multiple choice, drag-fill, sort, build-sentence, path quiz) render any activity from JSON. Pure logic (grammar rules, answer checking, progress state) is separate from DOM code so it is unit-tested with `node:test`; the DOM flow is verified with Playwright. No build step; ES modules served statically.

**Tech Stack:** Vanilla HTML/CSS/ES modules, hand-authored SVG art, `node:test`, `@playwright/test`, `serve` (dev server). Node 22+.

**Spec:** `docs/superpowers/specs/2026-10-13-secret-map-brief.md`

## Global Constraints

- Learner: A1 English, native Turkish, age 10. Short sentences, words from the vocabulary list in Task 2 only.
- Tone: highly energetic, playful, extremely encouraging; mascot Pip the fox speaks all feedback; no negative words ("wrong" never appears, use "Almost! Try again").
- Title: "The Secret Map of the Magic Forest"; four stages titled exactly `STAGE 1: THE HOOK & WARM-UP`, `STAGE 2: ACTION NOW (The Observation Screen)`, `STAGE 3: ACTION LATER (The Timeline Screen)`, `STAGE 4: THE CHALLENGE (Which Way Do You Go?)`.
- Form shown everywhere is identical: `Subject + am/is/are + Verb-ing`; only the time marker differs (`now` / `right now` vs `tomorrow` / `next week`).
- Stage 1 contains no grammar (no am/is/are in any option label or prompt).
- Stage 2: exactly three dynamic-action slides, each a drag-and-drop of be-forms into blanks. Chips are `is` / `are`, plus `am` only for the subject "I" (decision: A1 learners need it; it is the only deviation from the brief's `is / are`).
- Stage 3 uses markers "Tomorrow" and "Next week" and the phrases "We are going to..." and "Our plan is...".
- Stage 4: exactly three scenarios; each needs time-marker path then correct be + Verb-ing.
- Turkish support: Turkish also uses -yor for plans, so a "Türkçe İpucu" card shows `Şimdi yüzüyorum` / `Yarın yüzüyorum`; `Şimdi` = NOW, `Sonra` = LATER labels appear beside the English labels.
- Markdown lesson script: Markdown headings per stage and bullet points only (no paragraphs).
- Works at 360px width; touch and keyboard operable; no network calls; no runtime dependencies.

## Review Focus

- Phone/tablet users cannot native-drag: every drag target also works by tap-chip-then-tap-slot (Task 5).
- Keyboard-only users: chips, slots, cards and bins reachable by Tab and operable with Enter/Space; focus never lost after placing (Task 5, 6).
- `localStorage` blocked or holding corrupt JSON: app starts at Stage 1 with zero stars, no exception (Task 4).
- Repeated mistakes never dead-end: hearts reaching 0 in Stage 4 shows a hint and lets the child retry the same gate, never a game-over lock (Task 7).
- -ing spelling and agreement for double-consonant (`swim`), silent-e (`make`) and `I`/plural subjects are right in both engine and content (Task 1, 2).

---

### Task 1: Grammar and answer-checking engine

**Files:**
- Create: `package.json` (`"type":"module"`; scripts `test` = `node --test tests/*.test.js`, `serve` = `serve -l 4173 .`, `e2e` = `playwright test`, `build:md` = `node scripts/build-lesson-md.js`; devDependencies `@playwright/test`, `serve`)
- Create: `js/engine/grammar.js`, `js/engine/check.js`
- Test: `tests/grammar.test.js`, `tests/check.test.js`

**Interfaces:**
- Produces: `beFor(person: 'I'|'sg'|'pl'): 'am'|'is'|'are'`
- Produces: `toIng(verb: string): string`
- Produces: `checkChoice(item: {answer: string}, picked: string): boolean`
- Produces: `checkFill(item: {answers: string[]}, placed: (string|null)[]): {correct: boolean[], allCorrect: boolean}`
- Produces: `checkSort(cards: {id: string, bin: string}[], placement: Record<string,string>): {wrong: string[], allCorrect: boolean}`
- Produces: `checkOrder(item: {accept: string[]}, tiles: string[]): boolean` (join with spaces, case-insensitive, ignore trailing `.`)
- Produces: `checkGate(s: {path: 'NOW'|'LATER', person: 'I'|'sg'|'pl', verb: string}, pick: {path: string, be: string, ing: string}): {pathOk: boolean, beOk: boolean, ingOk: boolean, passed: boolean}`
- Produces: `nextHint(attempts: number, hints: string[]): string|null` (null at 0 attempts; hint index = min(attempts, hints.length) - 1)

- [ ] **Step 1: `git init`, write `package.json`, run `npm install`.**

- [ ] **Step 2: Write failing tests**

```js
// tests/grammar.test.js
test('beFor maps person to be-form', () => {
  assert.equal(beFor('I'), 'am'); assert.equal(beFor('sg'), 'is'); assert.equal(beFor('pl'), 'are');
});
test('toIng applies spelling rules', () => {
  const t = { swim:'swimming', run:'running', sit:'sitting', climb:'climbing', make:'making',
    dance:'dancing', fly:'flying', visit:'visiting', meet:'meeting', draw:'drawing',
    play:'playing', build:'building', sing:'singing', eat:'eating' };
  for (const [v, e] of Object.entries(t)) assert.equal(toIng(v), e);
});
// tests/check.test.js
test('checkFill flags each blank', () => {
  assert.deepEqual(checkFill({answers:['is','are']}, ['is','is']), {correct:[true,false], allCorrect:false});
  assert.equal(checkFill({answers:['am']}, [null]).allCorrect, false);
});
test('checkSort lists misplaced card ids', () => {
  const r = checkSort([{id:'a',bin:'NOW'},{id:'b',bin:'LATER'}], {a:'LATER', b:'LATER'});
  assert.deepEqual(r, {wrong:['a'], allCorrect:false});
});
test('checkOrder accepts any listed sentence, ignoring case and final period', () => {
  assert.equal(checkOrder({accept:['The fox is running now.']}, ['the','fox','is','running','now']), true);
  assert.equal(checkOrder({accept:['The fox is running now.']}, ['fox','the','is','running','now']), false);
});
test('checkGate scores path, be and -ing separately', () => {
  const s = {path:'NOW', person:'pl', verb:'swim'};
  assert.deepEqual(checkGate(s, {path:'NOW', be:'are', ing:'swimming'}), {pathOk:true, beOk:true, ingOk:true, passed:true});
  assert.equal(checkGate(s, {path:'LATER', be:'are', ing:'swiming'}).passed, false);
});
test('nextHint escalates then holds on the last hint', () => {
  assert.equal(nextHint(0, ['a','b']), null); assert.equal(nextHint(1, ['a','b']), 'a'); assert.equal(nextHint(5, ['a','b']), 'b');
});
test('checkChoice compares the picked id', () => { assert.equal(checkChoice({answer:'fox'}, 'fox'), true); assert.equal(checkChoice({answer:'fox'}, 'frog'), false); });
```

- [ ] **Step 3: Run `npm test`.** Expected: FAIL, modules not found.

- [ ] **Step 4: Implement both modules per the signatures.** `toIng` rules in order: ends in `ie` is out of scope; ends in `e` (not `ee`) drops `e`; one-syllable (single vowel group) consonant-vowel-consonant with final letter not `w`/`x`/`y` doubles the final consonant; otherwise append `ing`.

- [ ] **Step 5: Run `npm test`.** Expected: PASS.

- [ ] **Step 6: Commit** `feat: grammar rules and answer checkers`.

---

### Task 2: Lesson content (`data/content.json`) and content lint

**Files:**
- Create: `data/content.json`
- Test: `tests/content.test.js`

**Interfaces:**
- Consumes: `beFor`, `toIng` (Task 1)
- Produces: `content.json` shape (all later tasks read it):
  - `{ title: string, mascot: {name:'Pip'}, stages: Stage[4] }`
  - `Stage = { id: 'hook'|'now'|'later'|'challenge', title: string, goal: string, mapPiece: 1|2|3|4, slides: Slide[] }`
  - `Slide = Story | Teach | Activity`
  - `Story = {kind:'story', image: string, alt: string, lines: string[]}` (lines are Pip's screen text, short)
  - `Teach = {kind:'teach', image?: string, alt?: string, title: string, bullets: string[], compare?: {now: string, later: string}, turkish?: string}`
  - `Activity = {kind:'activity', type, hints: string[], ...}` with per-type fields:
    - `multipleChoice`: `{prompt, image?, alt?, options: {id, label, image?}[], answer: id}`
    - `dragFill`: `{prompt, images: string[], alts: string[], template: string` (blanks as `{0}`, `{1}`), `people: ('I'|'sg'|'pl')[]`, `answers: string[]`, `chips: string[]}`; when used for set labelling, `answers` are `NOW`/`LATER` and `people` is omitted
    - `sort`: `{prompt, bins: [{id:'NOW', tr:'Şimdi'}, {id:'LATER', tr:'Sonra'}], cards: {id, text, image, alt, bin}[]}`
    - `buildSentence`: `{prompt, image?, alt?, tiles: string[], accept: string[]}`
    - `pathQuiz`: `{scenarios: {id, image, alt, clue, path:'NOW'|'LATER', subject: string, person, verb, ending: string}[]}` (sentence = `subject + be + toIng(verb) + ending`)
- Image refs are file names under `assets/` (Task 3).

- [ ] **Step 1: Write failing `tests/content.test.js`** (load JSON with `fs.readFileSync`):

```js
test('four stages in order', () => assert.deepEqual(c.stages.map(s=>s.id), ['hook','now','later','challenge']));
test('stage 1 is grammar-free multiple choice', () => {
  const acts = hook.slides.filter(s=>s.kind==='activity');
  assert.ok(acts.length >= 4 && acts.every(a=>a.type==='multipleChoice'));
  const text = JSON.stringify(acts); assert.doesNotMatch(text, /\b(am|is|are)\b/i);
});
test('stage 2 has exactly 3 dragFill slides whose answers match beFor and precede a -ing word', () => {
  const d = now.slides.filter(s=>s.type==='dragFill'); assert.equal(d.length, 3);
  for (const s of d) s.people.forEach((p,i)=>{ assert.equal(s.answers[i], beFor(p)); assert.match(s.template, new RegExp(`\\{${i}\\}\\s+\\w+ing\\b`)); });
  assert.ok(d.flatMap(s=>s.answers).includes('am'));
});
test('stage 3 teaches markers and phrases and sorts same-form sentences', () => {
  const t = JSON.stringify(later); for (const w of ['Tomorrow','Next week','We are going to','Our plan is']) assert.ok(t.includes(w), w);
  const sort = later.slides.find(s=>s.type==='sort'); assert.ok(sort.cards.length >= 8);
  for (const k of sort.cards) { assert.match(k.text, /\b(am|is|are) \w+ing\b/);
    assert.match(k.text, k.bin==='NOW' ? /\bnow\b/i : /\b(tomorrow|next week)\b/i); }
  assert.ok(later.slides.some(s=>s.type==='dragFill' && s.answers.join()==='NOW,LATER'));
});
test('stage 4 has 3 scenarios; one each of double-consonant and silent-e; both paths used', () => {
  const q = challenge.slides.find(s=>s.type==='pathQuiz').scenarios; assert.equal(q.length, 3);
  const ings = q.map(s=>toIng(s.verb)); assert.ok(ings.includes('swimming') && ings.includes('making'));
  assert.deepEqual([...new Set(q.map(s=>s.path))].sort(), ['LATER','NOW']);
  for (const s of q) assert.match(s.clue, s.path==='NOW' ? /right now|at this moment/i : /tomorrow|next week/i);
});
test('every activity has at least 2 hints and every stage a mapPiece 1..4', () => { /* assert */ });
test('Pip text never says "wrong"', () => assert.doesNotMatch(JSON.stringify(c), /\bwrong\b/i));
```

- [ ] **Step 2: Run `node --test tests/content.test.js`.** Expected: FAIL (file missing).

- [ ] **Step 3: Author `data/content.json`** with exactly these items (Pip lines are short, exclamatory, emoji-friendly; add `alt` for every image):
  - **Vocabulary (core list; any other word must be a name or noun already in this plan's sentences, e.g. Mia, Pip, owl, banana):** fox, frog, bird, monkey, tree, river, waterfall, hill, cave, boat, map, kite, lunch, sing, swim, fly, jump, run, eat, draw, climb, dance, make, visit, build, meet, play, look, walk, now, right now, tomorrow, next week.
  - **hook** (`mapPiece` 1): story slide (torn map found in a tree; Pip says hello) then 4 `multipleChoice`: "Tap the FOX" (fox/frog/bird), "Tap the TREE with the secret map" (tree/river/hill), "Tap the WATERFALL" (waterfall/cave/boat), "Tap the BOAT" (boat/kite/map); image options.
  - **now** (`mapPiece` 2): teach slide ("Look! It is happening NOW!", bullets, `Şimdi` badge, formula `Subject + am/is/are + Verb-ing`); three `dragFill` slides: (1) bird flying + frogs swimming: "The bird {0} flying." `is`; "The frogs {1} swimming." `are`; (2) monkeys + fox: "The monkeys {0} eating." `are`; "The fox {1} running." `is`; (3) Mia and Pip: "I {0} looking at the map." `am`; "Pip and I {1} walking." `are`. Then two `buildSentence` ("The fox is running now.", "The birds are singing now.") and two `multipleChoice` -ing spelling items (swim→swimming, make→making).
  - **later** (`mapPiece` 3): story (map shows tomorrow's plan), teach slide with `compare` {now: "We are climbing the hill now.", later: "We are climbing the hill tomorrow."} stressing "same form, different time marker", teach slide for "Tomorrow", "Next week", "We are going to visit the waterfall tomorrow." and "Our plan is to visit the waterfall tomorrow.", the Türkçe İpucu card (`Şimdi yüzüyorum.` / `Yarın yüzüyorum.`); `dragFill` labelling two image sets (Set A: three "sun/clock" scenes; Set B: three "calendar" scenes) with chips `NOW`, `LATER` (answers `NOW`,`LATER`); `sort` with 8 cards: NOW = "Pip is swimming now.", "The birds are singing right now.", "We are eating lunch now.", "I am drawing the map now."; LATER = "We are visiting the waterfall tomorrow.", "Pip is meeting the owl next week.", "They are building a boat tomorrow.", "I am flying the kite next week."; 3 `multipleChoice` marker items (pick `now` or `tomorrow` to match a calendar/sun picture); 2 `buildSentence` ("We are going to climb the hill tomorrow.", "Our plan is to visit the cave next week.").
  - **challenge** (`mapPiece` 4): story slide, then one `pathQuiz` slide: (1) river gate, clue "Listen! Right now, the monkeys ... in the river!", NOW, subject "The monkeys", person `pl`, verb `swim`, ending "in the river."; (2) hill gate, clue "Tomorrow, Pip and I ... the Big Hill!", LATER, subject "Pip and I", `pl`, `climb`, "the Big Hill."; (3) cave gate, clue "Next week, Pip ... a magic boat!", LATER, subject "Pip", `sg`, `make`, "a magic boat."; then a finale story slide (map complete, "Tomorrow we are going to...").
  - Every activity gets 2–3 progressive `hints` (hint 1 about the time marker, hint 2 about be-form, hint 3 gives the answer pattern).

- [ ] **Step 4: Run `npm test`.** Expected: PASS (all tests so far).

- [ ] **Step 5: Commit** `feat: lesson content for four stages`.

---

### Task 3: Visual assets (SVG art)

**Files:**
- Create: `assets/*.svg` (one file per image name referenced in `data/content.json`; expected set: `forest-hook`, `map-torn`, `scene-bird-frog`, `scene-monkeys-fox`, `scene-mia-pip`, `scene-timeline`, `gate-river`, `gate-hill`, `gate-cave`, `finale-map`, icons `fox`, `frog`, `bird`, `monkey`, `tree`, `river`, `waterfall`, `hill`, `cave`, `boat`, `kite`, `map`, `sun-now`, `calendar-later`, `map-piece-1`..`map-piece-4`, and one small scene per sort card and per marker item)
- Test: `tests/assets.test.js`

**Interfaces:**
- Consumes: image names in `data/content.json` (Task 2)
- Produces: every referenced image resolves to `assets/<name>` (include `.svg` in the content value)

- [ ] **Step 1: Write failing `tests/assets.test.js`:** walk the parsed content for every string value under keys `image`, `images`, and option/card `image`; assert each file exists in `assets/`, starts with `<svg`, has `viewBox`, contains a `<title>`, and is under 40 KB.

- [ ] **Step 2: Run `node --test tests/assets.test.js`.** Expected: FAIL, missing files.

- [ ] **Step 3: Author the SVGs.** Style: flat, bold 4px rounded outlines, `viewBox="0 0 400 300"` for scenes and `0 0 120 120` for icons, palette fixed to CSS-independent hex values (forest greens `#2f9e44`/`#b2f2bb`, sky `#a5d8ff`, sun `#ffd43b`, fox `#ff922b`, map parchment `#f3e3b3`). Scenes must show the motion cue (wings spread, splash rings, motion lines) that the sentence describes; "now" scenes include `sun-now` badge, "later" scenes include `calendar-later` badge. Every file has `<title>` matching the content `alt`.

- [ ] **Step 4: Run `npm test`.** Expected: PASS.

- [ ] **Step 5: Commit** `feat: svg scenes and icons`.

---

### Task 4: App shell, state, stage runner and story/teach rendering

**Files:**
- Create: `index.html`, `css/styles.css`, `js/app.js`, `js/engine/state.js`, `js/ui/slides.js`, `js/ui/pip.js`, `playwright.config.js`
- Test: `tests/state.test.js`, `tests/e2e/shell.spec.js`

**Interfaces:**
- Consumes: `content.json` shape (Task 2)
- Produces: `createState(storage?: Storage): State` with `{stars, hearts, stageIndex, completed: number[]}` plus `addStars(n)`, `loseHeart()`, `refillHearts()`, `completeStage(i)`, `setStage(i)`, `reset()`; persistence under key `secretMap.v1`; every storage access in try/catch; `hearts` starts at 3.
- Produces: `renderSlide(root: HTMLElement, slide: Slide, ctx: Ctx): void` for `story`/`teach`; activity slides call `mountActivity(root, slide, ctx)` (Tasks 5–7).
- Produces: `type Ctx = {state: State, pip: {say(text: string, mood?: 'cheer'|'hint'): void}, onAttempt(correct: boolean): void, onComplete(): void}`; `onAttempt(true)` adds 1 star and confetti; `onComplete` enables the `next` button.
- Produces: `speak(text: string): void` in `js/ui/pip.js`, a no-op when `speechSynthesis` is missing or throws.
- Produces: test ids `next`, `back`, `stars`, `hearts`, `progress`, `map-piece-<1..4>`, `pip-bubble`; a header shows the map with 4 pieces filling in as stages complete, Turkish `Şimdi`/`Sonra` glossary chips on NOW/LATER cards.
- Playwright config: `webServer` runs `npm run serve`, `baseURL` `http://localhost:4173`, projects: desktop and a 360x740 mobile viewport.

- [ ] **Step 1: Write failing tests**

```js
// tests/state.test.js
test('state persists stars and completed stages', () => {
  const mem = fakeStorage(); const a = createState(mem); a.addStars(3); a.completeStage(0);
  const b = createState(mem); assert.equal(b.stars, 3); assert.deepEqual(b.completed, [0]);
});
test('corrupt storage JSON falls back to a fresh state', () => { const s = createState(fakeStorage({'secretMap.v1':'{oops'})); assert.equal(s.stars, 0); assert.equal(s.stageIndex, 0); });
test('throwing storage never throws', () => { const s = createState(throwingStorage()); s.addStars(1); assert.equal(s.stars, 1); });
test('hearts floor at 0 and refill to 3', () => { const s = createState(fakeStorage()); for (let i=0;i<5;i++) s.loseHeart(); assert.equal(s.hearts, 0); s.refillHearts(); assert.equal(s.hearts, 3); });
// tests/e2e/shell.spec.js
test('loads on Stage 1 story slide and Next advances', async ({page}) => {
  await page.goto('/'); await expect(page.getByTestId('progress')).toContainText('STAGE 1');
  await page.getByTestId('next').click(); /* second slide visible */ });
test('app starts when localStorage throws', async ({page}) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', {get(){ throw new Error('blocked'); }}); });
  await page.goto('/'); await expect(page.getByTestId('progress')).toContainText('STAGE 1'); });
test('no horizontal scroll at 360px', async ({page}) => { /* scrollWidth <= innerWidth */ });
```

- [ ] **Step 2: Run `npm test` and `npx playwright test tests/e2e/shell.spec.js`.** Expected: FAIL.

- [ ] **Step 3: Implement `state.js`, `pip.js`, `slides.js`, `app.js`, `index.html`, `styles.css`.** `app.js` fetches `data/content.json`, flattens stages to a slide cursor, shows `STAGE n: title` in the header, and on stage end calls `completeStage`, awards the map piece with a short animation. CSS: tokens on `:root` (16px gutters, 56px minimum touch targets, `prefers-reduced-motion` disables animation), large rounded type (system font stack with `"Nunito", system-ui`), high-contrast colours, card UI per slide.

- [ ] **Step 4: Run both test commands.** Expected: PASS.

- [ ] **Step 5: Commit** `feat: app shell, state, and slide runner`.

---

### Task 5: `multipleChoice` and `dragFill` activities

**Files:**
- Create: `js/activities/index.js` (exports `mountActivity` dispatching on `slide.type`), `js/activities/multipleChoice.js`, `js/activities/dragFill.js`, `js/ui/hints.js`
- Modify: `js/ui/slides.js` (call `mountActivity` for `kind:'activity'`)
- Test: `tests/e2e/choice-and-drag.spec.js`

**Interfaces:**
- Consumes: `checkChoice`, `checkFill`, `nextHint` (Task 1); `Ctx` (Task 4)
- Produces: `mountActivity(root: HTMLElement, slide: Activity, ctx: Ctx): () => void` (returns destroy fn); each activity calls `ctx.onAttempt(bool)` per check and `ctx.onComplete()` once all correct; wrong attempt shows the next hint via `ctx.pip.say(hint, 'hint')`.
- Produces test ids: `option-<id>`; `chip-<text>`, `slot-<i>`, `check`, `tray`.

- [ ] **Step 1: Write failing Playwright tests** (read answers from `data/content.json` through `fs` in the spec):
  - `multipleChoice: correct pick enables next, wrong pick keeps next disabled and shows a hint` (Stage 1 first activity).
  - `dragFill: HTML5 drag of chip into slot fills it; check passes when all correct` using `dragTo`.
  - `dragFill: tap chip then tap slot places it (touch fallback)` using `click` twice, in the 360px project.
  - `dragFill: keyboard Tab/Enter on chip then Enter on slot places it, and focus lands on the next empty slot`.
  - `dragFill: tapping a filled slot returns its chip to the tray (no chip is ever duplicated or lost)`.
  - `dragFill: wrong answers turn the slot orange (not red), second wrong shows hint 2`.
  - `dragFill labels sets: NOW/LATER chips accept into set headers` (Stage 3 labelling slide).

- [ ] **Step 2: Run `npx playwright test tests/e2e/choice-and-drag.spec.js`.** Expected: FAIL.

- [ ] **Step 3: Implement both modules.** `dragFill` keeps one `placed: (string|null)[]` array as the single source of truth and re-renders from it; native drag events plus the click-to-select path share one `place(slotIndex, chip)` function. `check` button disabled until every slot has a chip. Slots and chips are `<button>`s with `aria-label`.

- [ ] **Step 4: Run the spec.** Expected: PASS.

- [ ] **Step 5: Commit** `feat: multiple choice and drag-fill activities`.

---

### Task 6: `sort` and `buildSentence` activities

**Files:**
- Create: `js/activities/sort.js`, `js/activities/buildSentence.js`
- Modify: `js/activities/index.js` (register both)
- Test: `tests/e2e/sort-and-build.spec.js`

**Interfaces:**
- Consumes: `checkSort`, `checkOrder`, `nextHint` (Task 1); `Ctx` (Task 4)
- Produces test ids: `card-<id>`, `bin-NOW`, `bin-LATER`, `check`; `tile-<n>`, `answer-row`, `tile-bank`.

- [ ] **Step 1: Write failing Playwright tests:**
  - `sort: dragging or tap-then-tap moves a card into a bin and back out`.
  - `sort: check marks only misplaced cards, keeps correct ones locked, and hint names the time marker words` (e.g. "Look for tomorrow or next week").
  - `sort: all 8 Stage 3 cards sorted correctly completes the activity`.
  - `sort: bins show Şimdi and Sonra gloss beside NOW and LATER`.
  - `buildSentence: tapping tiles builds the answer row; tapping a placed tile returns it; check passes for the accepted order`.
  - `buildSentence: keyboard operable` (Enter/Space on tiles).

- [ ] **Step 2: Run the spec.** Expected: FAIL.

- [ ] **Step 3: Implement both modules** with the same single-source-of-truth pattern as Task 5 (`placement: Record<id, bin|null>`; `answer: string[]`). Sorted-correct cards get a green check and become non-interactive; misplaced ones shake once (skipped under reduced motion).

- [ ] **Step 4: Run the spec.** Expected: PASS.

- [ ] **Step 5: Commit** `feat: sort and build-sentence activities`.

---

### Task 7: `pathQuiz` ("Which Way Do You Go?")

**Files:**
- Create: `js/activities/pathQuiz.js`
- Modify: `js/activities/index.js` (register)
- Test: `tests/e2e/path-quiz.spec.js`

**Interfaces:**
- Consumes: `checkGate`, `toIng`, `beFor`, `nextHint` (Task 1); `state.loseHeart/refillHearts` (Task 4)
- Produces test ids: `path-NOW`, `path-LATER`, `be-<is|are|am>`, `ing-<form>`, `gate-check`, `hearts`.

Mechanic per scenario: (1) show gate picture and clue, child taps a fork `NOW` or `LATER`; (2) sentence builder appears: `<subject> [be] [verb-ing] <ending>` with three be chips (`am`, `is`, `are`) and three -ing chips (correct form plus two plausible misspellings generated from the verb, e.g. `swimming` + `swiming`, `swimin`); (3) `gate-check` opens the gate (animation + Pip cheer) and advances. Hearts start at 3 per stage.

- [ ] **Step 1: Write failing Playwright tests:**
  - `wrong fork costs a heart, shows the marker hint, and does not reveal the be-step`.
  - `right fork then wrong be or wrong -ing costs a heart and highlights only the faulty part`.
  - `all three correct gates complete the activity; stars awarded count first-try gates`.
  - `hearts reaching 0 shows a hint card, refills hearts, and the same gate stays retryable` (never a game-over state; `next` remains unreachable until solved).
  - `distractor -ing chips never include the correct form twice and are unique` (assert chip texts per scenario).

- [ ] **Step 2: Run the spec.** Expected: FAIL.

- [ ] **Step 3: Implement `mountActivity` for `pathQuiz`.** Build distractors with a pure helper `ingDistractors(verb: string): string[]` exported from `js/engine/grammar.js` (add its unit test to `tests/grammar.test.js` first: for `swim` returns exactly two unique strings, neither equal to `swimming`, and containing `swiming`; for `make` returns two unique strings including `makeing`, neither equal to `making`). Heart loss only on a failed `gate-check` or wrong fork.

- [ ] **Step 4: Run `npm test` and the spec.** Expected: PASS.

- [ ] **Step 5: Commit** `feat: which-way path quiz`.

---

### Task 8: Story polish, rewards, finale and full playthrough

**Files:**
- Modify: `js/app.js`, `js/ui/slides.js`, `css/styles.css`
- Create: `js/ui/confetti.js`, `tests/e2e/playthrough.spec.js`

**Interfaces:**
- Consumes: everything above.
- Produces: `confetti(root: HTMLElement): void` (CSS-only particles; no-op under `prefers-reduced-motion`); finale screen shows the assembled four-piece map, total stars, and a "Play again" button that calls `state.reset()`.

- [ ] **Step 1: Write failing `tests/e2e/playthrough.spec.js`:** reads `data/content.json` and drives the whole lesson with correct answers (choice via `option-<id>`, drag-fill via tap placement, sort via tap placement, build via tiles, path quiz via fork/be/ing chips), asserting after each stage that `map-piece-<n>` has class `collected`, and at the end that the finale shows `stars` greater than 0 and the text "The Secret Map of the Magic Forest". A second test replays Stage 3 with only wrong answers first, asserting `next` stays disabled until the correct answers are given. Run in desktop and 360px projects.

- [ ] **Step 2: Run `npx playwright test tests/e2e/playthrough.spec.js`.** Expected: FAIL (finale/rewards missing).

- [ ] **Step 3: Implement** stage-complete map-piece animation, finale screen, confetti, Pip speech via `speak()` on story lines (with a mute toggle button `data-testid="mute"` that persists in state), and the `Back` button never going before the current stage start.

- [ ] **Step 4: Run `npm test` and `npm run e2e`.** Expected: all PASS.

- [ ] **Step 5: Commit** `feat: rewards, finale, and full playthrough test`.

---

### Task 9: Markdown lesson script generator

**Files:**
- Create: `scripts/build-lesson-md.js`, `docs/lesson-script.md` (generated output, committed)
- Test: `tests/lesson-md.test.js`

**Interfaces:**
- Consumes: `data/content.json` shape (Task 2)
- Produces: `renderLessonMd(content: Content): string`; CLI `npm run build:md` writes `docs/lesson-script.md`.

- [ ] **Step 1: Write failing tests**

```js
test('one H2 per stage with the exact stage titles', () => {
  const md = renderLessonMd(content); for (const s of content.stages) assert.ok(md.includes(`## ${s.title}`));
  assert.equal(md.match(/^## /gm).length, 4);
});
test('only headings, bullets and blank lines (no paragraphs)', () => {
  for (const line of renderLessonMd(content).split('\n')) assert.match(line, /^(#{1,3} .+|\s*- .+|)$/);
});
test('lists every activity type, sort card, and path-quiz gate', () => {
  const md = renderLessonMd(content); assert.ok(md.includes('Drag and Drop')); assert.ok(md.includes('We are visiting the waterfall tomorrow.')); assert.ok(md.includes('Which Way Do You Go?'));
});
```

- [ ] **Step 2: Run `node --test tests/lesson-md.test.js`.** Expected: FAIL.

- [ ] **Step 3: Implement `renderLessonMd`** per stage: `## <title>`, then `- Goal:`, `- Interaction type:`, `- Screen text:` with nested bullets for story lines, teach bullets, each activity's prompt/items/answers, hints, and the Turkish tip. Run `npm run build:md` to produce the committed file.

- [ ] **Step 4: Run `npm test`.** Expected: PASS.

- [ ] **Step 5: Commit** `feat: generated bullet-only lesson script`.

---

### Task 10: Accessibility and release check

**Files:**
- Modify: whichever files fail the checks below
- Create: `tests/e2e/a11y.spec.js`, `README.md` (how to run: `npm install`, `npm run serve`, `npm test`, `npm run e2e`, `npm run build:md`; note that a static host is required because content loads via `fetch`)

- [ ] **Step 1: Write failing `tests/e2e/a11y.spec.js`:** (a) every `img` has non-empty `alt`; (b) every interactive element is a `button`/`a`/`input` with an accessible name; (c) Tab from page load reaches `next` without a keyboard trap on each stage's first activity; (d) with `reducedMotion: 'reduce'` no element has a running CSS animation; (e) pages at 360px and 1280px have `scrollWidth <= innerWidth`.

- [ ] **Step 2: Run `npx playwright test tests/e2e/a11y.spec.js`.** Expected: FAIL on any gap.

- [ ] **Step 3: Fix the gaps found; write `README.md`.**

- [ ] **Step 4: Run `npm test && npm run e2e`.** Expected: all PASS, zero console errors recorded in the playthrough.

- [ ] **Step 5: Commit** `chore: accessibility fixes and readme`.
