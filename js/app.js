import { createState } from './engine/state.js';
import { renderSlide } from './ui/slides.js';
import { createPip } from './ui/pip.js';
import { confetti } from './ui/confetti.js';
import { el, img } from './ui/dom.js';

const $ = (s) => document.querySelector(s);
const root = $('#stage');
const state = createState();
const pip = createPip($('[data-testid=pip-bubble]'));
const done = new Set();
let content, idx = 0, screen = 'lesson', nextOn = false;

const stage = () => content.stages[state.stageIndex];
const slideKey = () => `${state.stageIndex}:${idx}`;
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function renderHud() {
  $('[data-testid=stars]').textContent = `⭐ ${state.stars}`;
  $('[data-testid=hearts]').textContent = '❤'.repeat(state.hearts) + '♡'.repeat(3 - state.hearts);
  $('[data-testid=hearts]').setAttribute('aria-label', `${state.hearts} hearts`);
  $('.map-pieces').replaceChildren(...[1, 2, 3, 4].map((n) => el('span',
    { class: 'piece' + (state.completed.includes(n - 1) ? ' collected' : ''), 'data-testid': `map-piece-${n}` },
    img(`map-piece-${n}.svg`, `Map piece ${n}`))));
}

function setNext(on, label) {
  nextOn = on;
  const b = $('[data-testid=next]');
  b.disabled = !on;
  if (label) b.textContent = label;
}

const ctx = {
  state, pip,
  onAttempt(correct) {
    if (correct) { state.addStars(1); confetti(document.body); pip.say(pick(content.feedback.cheer), 'cheer'); }
    else pip.say(pick(content.feedback.retry), 'hint');
    renderHud();
  },
  onComplete() { done.add(slideKey()); setNext(true); },
  onHeartsChange: renderHud,
};

function show() {
  renderHud();
  if (screen === 'stageDone') return showStageDone();
  if (screen === 'finale') return showFinale();
  const st = stage(), slide = st.slides[idx];
  const last = idx === st.slides.length - 1;
  $('[data-testid=progress]').textContent = `${st.title} · ${idx + 1}/${st.slides.length}`;
  $('[data-testid=back]').disabled = idx === 0;
  setNext(slide.kind !== 'activity' || done.has(slideKey()), last ? 'Finish stage' : 'Next');
  renderSlide(root, slide, ctx);
  root.focus({ preventScroll: true });
}

function showStageDone() {
  const n = stage().mapPiece;
  $('[data-testid=progress]').textContent = `${stage().title} · complete!`;
  $('[data-testid=back]').disabled = true;
  root.replaceChildren(el('section', { class: 'card stage-done', 'data-testid': 'stage-done' },
    el('h2', { text: `You found map piece ${n}!` }),
    img(`map-piece-${n}.svg`, `Map piece ${n}`, 'big-piece'),
    el('p', { text: 'Hooray! Pip is so proud of you!' })));
  pip.say('Map piece found! 🗺️', 'cheer');
  confetti(document.body);
  setNext(true, state.stageIndex === 3 ? 'See the map' : 'Next stage');
}

function showFinale() {
  $('[data-testid=progress]').textContent = 'THE END';
  $('[data-testid=back]').disabled = true;
  root.replaceChildren(el('section', { class: 'card finale', 'data-testid': 'finale' },
    el('h2', { text: content.title }),
    el('div', { class: 'finale-map' }, [1, 2, 3, 4].map((n) => img(`map-piece-${n}.svg`, `Map piece ${n}`))),
    el('p', { class: 'finale-stars', 'data-testid': 'final-stars', text: `You collected ${state.stars} stars!` }),
    el('button', { class: 'btn btn-main', type: 'button', 'data-testid': 'play-again', text: 'Play again',
      onclick() { state.reset(); done.clear(); screen = 'lesson'; idx = 0; show(); } })));
  setNext(false, 'The End');
}

$('[data-testid=next]').addEventListener('click', () => {
  if (!nextOn) return;
  if (screen === 'stageDone') {
    if (state.stageIndex === 3) screen = 'finale';
    else { state.setStage(state.stageIndex + 1); state.refillHearts(); screen = 'lesson'; idx = 0; }
  } else if (idx === stage().slides.length - 1) {
    state.completeStage(state.stageIndex); screen = 'stageDone';
  } else idx += 1;
  show();
});
$('[data-testid=back]').addEventListener('click', () => {
  if (screen === 'lesson' && idx > 0) { idx -= 1; show(); }
});

try {
  content = await fetch('data/content.json').then((r) => r.json());
  if (state.completed.length === 4) screen = 'finale';
  show();
} catch {
  root.replaceChildren(el('p', { class: 'card', text: 'Oh no! Pip could not load the map. Please open this page from a web server.' }));
}
