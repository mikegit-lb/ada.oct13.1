import { el, img } from '../ui/dom.js';
import { checkChoice } from '../engine/check.js';
import { createHints } from '../ui/hints.js';

export function mountMultipleChoice(root, slide, ctx) {
  const hints = createHints(slide.hints, ctx.pip);
  const wrong = new Set();
  let solved = null;

  const card = el('section', { class: 'card activity' });
  root.append(card);

  function render() {
    card.replaceChildren(...[
      el('p', { class: 'prompt', text: slide.prompt }),
      slide.image ? img(slide.image, slide.alt || '', 'scene') : null,
      el('div', { class: 'options', role: 'group', 'aria-label': slide.prompt },
        slide.options.map((o) => el('button', {
          type: 'button', 'data-testid': `option-${o.id}`,
          class: 'option' + (solved === o.id ? ' right' : wrong.has(o.id) ? ' nope' : ''),
          disabled: solved !== null,
          onclick: () => pick(o.id),
        }, o.image ? img(o.image, o.label) : null, el('span', { text: o.label, 'aria-hidden': o.image ? 'true' : null })))),
    ].filter(Boolean));
  }

  function pick(id) {
    if (solved !== null) return;
    if (checkChoice(slide, id)) {
      solved = id; ctx.onAttempt(true); render(); ctx.onComplete();
    } else {
      wrong.add(id); ctx.onAttempt(false); hints.miss(); render();
      card.querySelector(`[data-testid="option-${id}"]`)?.focus();
    }
  }
  render();
  return () => card.remove();
}
