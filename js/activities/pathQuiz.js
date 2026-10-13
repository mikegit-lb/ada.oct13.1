import { el, img } from '../ui/dom.js';
import { checkGate } from '../engine/check.js';
import { beFor, toIng, ingDistractors } from '../engine/grammar.js';

const PATHS = [{ id: 'NOW', tr: 'Şimdi' }, { id: 'LATER', tr: 'Sonra' }];

export function mountPathQuiz(root, slide, ctx) {
  const [h1, h2, h3] = slide.hints;
  let i = 0;                 // current gate
  let pathPick = null;       // null while the child is still at the fork
  let be = null, ing = null; // picked chips in the build step
  let bad = { be: false, ing: false };
  let missed = false;        // any miss on this gate => no star
  let note = null;           // hint card text (shown after the hearts run out)
  let finished = false;
  let focusId = null;

  const card = el('section', { class: 'card activity' });
  root.append(card);
  const gate = () => slide.scenarios[i];

  function ingChips(s) {
    const all = [toIng(s.verb), ...ingDistractors(s.verb)];
    const r = i % all.length; // rotate so the right answer is not always first
    return [...all.slice(r), ...all.slice(0, r)];
  }

  function miss(hint, part) {
    missed = true;
    ctx.state.loseHeart();
    ctx.onAttempt(false);
    ctx.pip.say(`Almost! Try again. ${hint}`, 'hint');
    if (ctx.state.hearts === 0) {
      // Never a game over: refill, show the answer pattern, and let the child retry the same gate.
      ctx.state.refillHearts();
      const s = gate();
      note = `Pip's hint: ${s.path === 'NOW' ? 'NOW' : 'LATER'} gate. Use "${beFor(s.person)}" and "${toIng(s.verb)}".`;
      be = null; ing = null; bad = { be: false, ing: false };
      ctx.onHeartsChange();
    } else if (part) bad[part] = true;
    render();
  }

  function pickPath(id) {
    note = null;
    if (id !== gate().path) return miss(h1, null);
    pathPick = id; focusId = 'be-is'; render();
  }

  function pickBe(v) { be = v; bad.be = false; note = null; focusId = `be-${v}`; render(); }
  function pickIng(v) { ing = v; bad.ing = false; note = null; focusId = `ing-${v}`; render(); }

  function openGate() {
    const s = gate();
    const res = checkGate(s, { path: pathPick, be, ing });
    if (!res.passed) {
      bad = { be: !res.beOk, ing: !res.ingOk };
      return miss(!res.beOk ? h2 : h3, !res.beOk ? 'be' : 'ing');
    }
    if (!missed) ctx.onAttempt(true); else ctx.pip.say('You opened the gate! Great job!', 'cheer');
    card.classList.add('gate-open');
    if (i === slide.scenarios.length - 1) { finished = true; render(); ctx.onComplete(); return; }
    i += 1; pathPick = null; be = null; ing = null; bad = { be: false, ing: false }; missed = false; note = null;
    focusId = 'path-NOW'; render();
  }

  function render() {
    const s = gate();
    const kids = [
      el('p', { class: 'prompt', text: `${slide.title} · Gate ${i + 1} of ${slide.scenarios.length}` }),
    ];
    if (finished) {
      kids.push(el('p', { class: 'clue', text: `All ${slide.scenarios.length} gates are open! Hooray!` }));
    } else {
      kids.push(img(s.image, s.alt, 'scene'), el('p', { class: 'clue', text: s.clue }));
      if (pathPick == null) {
        kids.push(el('div', { class: 'fork', role: 'group', 'aria-label': 'Which way do you go?' },
          PATHS.map((p) => el('button', { type: 'button', class: `btn path-${p.id}`, 'data-testid': `path-${p.id}`, onclick: () => pickPath(p.id) },
            el('span', { text: p.id }), el('small', { text: p.tr })))));
      } else {
        kids.push(
          el('p', { class: 'gate-sentence', 'aria-live': 'polite' },
            el('span', { text: s.subject }), el('strong', { text: be || '___' }), el('strong', { text: ing || '___' }), el('span', { text: s.ending })),
          el('div', { class: 'chip-group', role: 'group', 'aria-label': 'am, is or are' },
            ['am', 'is', 'are'].map((v) => el('button', { type: 'button', class: 'chip' + (be === v ? ' picked' : '') + (be === v && bad.be ? ' bad' : ''), 'data-testid': `be-${v}`, 'aria-pressed': String(be === v), onclick: () => pickBe(v) }, v))),
          el('div', { class: 'chip-group', role: 'group', 'aria-label': 'Verb with ing' },
            ingChips(s).map((v) => el('button', { type: 'button', class: 'chip' + (ing === v ? ' picked' : '') + (ing === v && bad.ing ? ' bad' : ''), 'data-testid': `ing-${v}`, 'aria-pressed': String(ing === v), onclick: () => pickIng(v) }, v))),
          el('button', { type: 'button', class: 'btn btn-main', 'data-testid': 'gate-check', text: 'Open the gate!', disabled: !be || !ing, onclick: openGate }));
      }
    }
    if (note) kids.push(el('p', { class: 'hint-card', 'data-testid': 'hint-card', role: 'status', text: note }));
    card.replaceChildren(...kids);
    if (focusId) { card.querySelector(`[data-testid="${focusId}"]`)?.focus(); focusId = null; }
  }
  render();
  return () => card.remove();
}
