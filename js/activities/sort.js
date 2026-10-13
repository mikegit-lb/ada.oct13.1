import { el, img } from '../ui/dom.js';
import { checkSort } from '../engine/check.js';
import { createHints } from '../ui/hints.js';

export function mountSort(root, slide, ctx) {
  const hints = createHints(slide.hints, ctx.pip);
  // Single source of truth: card id -> bin id, or null while the card is still in the pool.
  const placement = Object.fromEntries(slide.cards.map((c) => [c.id, null]));
  const locked = new Set();
  let selected = null;
  let nope = new Set();
  let done = false;
  let focusId = null;

  const card = el('section', { class: 'card activity' });
  root.append(card);

  // Interleave NOW and LATER cards so the pool does not give the answer away by order.
  const byBin = (b) => slide.cards.filter((c) => c.bin === b);
  const [a, b] = [byBin('NOW'), byBin('LATER')];
  const order = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) { if (a[i]) order.push(a[i]); if (b[i]) order.push(b[i]); }

  function move(id, bin) {
    if (done || locked.has(id)) return;
    placement[id] = bin; selected = null; nope = new Set();
    const nextPool = order.find((c) => placement[c.id] == null);
    focusId = bin == null ? `card-${id}` : nextPool ? `card-${nextPool.id}` : 'check';
    render();
  }

  function onCard(c) {
    if (done || locked.has(c.id)) return;
    if (selected != null && selected !== c.id) { selected = c.id; focusId = `card-${c.id}`; return render(); }
    if (selected === c.id) { selected = null; focusId = `card-${c.id}`; return render(); }
    if (placement[c.id] != null) return move(c.id, null); // tap a placed card: back to the pool
    selected = c.id; focusId = `card-${c.id}`; render();
  }

  function check() {
    const res = checkSort(slide.cards, placement);
    for (const c of slide.cards) if (placement[c.id] === c.bin) locked.add(c.id);
    nope = new Set(res.wrong);
    if (res.allCorrect) { done = true; render(); ctx.onAttempt(true); ctx.onComplete(); return; }
    ctx.onAttempt(false);
    const n = hints.attempts + 1;
    const firstWrong = slide.cards.find((c) => nope.has(c.id));
    const [hNow, hLater, hAnswer] = slide.hints;
    const text = n >= 3 ? hAnswer : firstWrong.bin === 'LATER' ? hLater : hNow;
    hints.miss(); ctx.pip.say(`Almost! Try again. ${text}`, 'hint');
    focusId = 'check'; render();
  }

  function cardBtn(c) {
    const isLocked = locked.has(c.id);
    const cls = 'card-item' + (isLocked ? ' right' : nope.has(c.id) ? ' nope shake' : '') + (selected === c.id ? ' selected' : '');
    return el('button', {
      type: 'button', class: cls, 'data-testid': `card-${c.id}`, draggable: isLocked || done ? null : 'true',
      disabled: isLocked, 'aria-pressed': String(selected === c.id),
      ondragstart: (e) => { e.dataTransfer.setData('text/plain', c.id); e.dataTransfer.effectAllowed = 'move'; },
      onclick: () => onCard(c),
    }, img(c.image, c.alt), el('span', { text: (isLocked ? '✓ ' : '') + c.text }));
  }

  const dropOn = (bin) => ({
    ondragover: (e) => e.preventDefault(),
    ondrop: (e) => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); if (id in placement) move(id, bin); },
  });

  function render() {
    const pool = order.filter((c) => placement[c.id] == null);
    card.replaceChildren(...[
      el('p', { class: 'prompt', text: slide.prompt }),
      el('div', { class: 'pool', 'data-testid': 'pool', role: 'group', 'aria-label': 'Sentences to sort', ...dropOn(null) }, pool.map(cardBtn)),
      el('div', { class: 'bins' }, slide.bins.map((bn) => el('section', { class: 'bin', 'data-bin': bn.id, ...dropOn(bn.id) },
        el('button', {
          type: 'button', class: 'bin-title btn', 'data-testid': `bin-${bn.id}`, disabled: done,
          'aria-label': `Put selected sentence in ${bn.id}, ${bn.tr}`, text: `${bn.id} · ${bn.tr}`,
          onclick: () => { if (selected != null) move(selected, bn.id); },
        }),
        order.filter((c) => placement[c.id] === bn.id).map(cardBtn)))),
      el('button', { type: 'button', class: 'btn btn-main', 'data-testid': 'check', text: 'Check', disabled: done || pool.length > 0, onclick: check }),
    ]);
    if (focusId) { card.querySelector(`[data-testid="${focusId}"]`)?.focus(); focusId = null; }
  }
  render();
  return () => card.remove();
}
