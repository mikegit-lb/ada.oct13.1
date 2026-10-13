import { el, img } from '../ui/dom.js';
import { checkOrder } from '../engine/check.js';
import { createHints } from '../ui/hints.js';

export function mountBuildSentence(root, slide, ctx) {
  const hints = createHints(slide.hints, ctx.pip);
  const answer = []; // tile indices in the order the child placed them (single source of truth)
  let status = null; // 'nope' | 'right' | null
  let focusId = null;

  const card = el('section', { class: 'card activity' });
  root.append(card);

  function toggle(n) {
    if (status === 'right') return;
    const at = answer.indexOf(n);
    if (at >= 0) answer.splice(at, 1); else answer.push(n);
    status = null; focusId = `tile-${n}`; render();
  }

  function check() {
    if (checkOrder(slide, answer.map((n) => slide.tiles[n]))) {
      status = 'right'; render(); ctx.onAttempt(true); ctx.onComplete();
    } else {
      status = 'nope'; ctx.onAttempt(false); hints.miss(); focusId = 'check'; render();
    }
  }

  const tileBtn = (n) => el('button', {
    type: 'button', class: 'tile' + (status === 'right' ? ' right' : ''), 'data-testid': `tile-${n}`,
    disabled: status === 'right', onclick: () => toggle(n),
    'aria-label': `${slide.tiles[n]}, ${answer.includes(n) ? 'in your sentence. Press to remove' : 'press to add'}`,
  }, slide.tiles[n]);

  function render() {
    const bank = slide.tiles.map((_, n) => n).filter((n) => !answer.includes(n));
    card.replaceChildren(...[
      el('p', { class: 'prompt', text: slide.prompt }),
      slide.image ? img(slide.image, slide.alt || '', 'scene') : null,
      el('div', { class: 'answer-row' + (status === 'nope' ? ' nope' : ''), 'data-testid': 'answer-row', role: 'group', 'aria-label': 'Your sentence' }, answer.map(tileBtn)),
      el('div', { class: 'tile-bank', 'data-testid': 'tile-bank', role: 'group', 'aria-label': 'Word tiles' }, bank.map(tileBtn)),
      el('button', { type: 'button', class: 'btn btn-main', 'data-testid': 'check', text: 'Check', disabled: status === 'right' || bank.length > 0, onclick: check }),
    ].filter(Boolean));
    if (focusId) { card.querySelector(`[data-testid="${focusId}"]`)?.focus(); focusId = null; }
  }
  render();
  return () => card.remove();
}
