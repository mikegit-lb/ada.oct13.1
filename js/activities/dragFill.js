import { el, img } from '../ui/dom.js';
import { checkFill } from '../engine/check.js';
import { createHints } from '../ui/hints.js';

export function mountDragFill(root, slide, ctx) {
  const hints = createHints(slide.hints, ctx.pip);
  const lines = slide.template.split('\n');
  const perLineImages = !slide.people && slide.images.length === lines.length;
  // Single source of truth: slot index -> chip index (or null). A chip is in the tray iff it is in no slot.
  const placed = slide.answers.map(() => null);
  let selected = null;
  let feedback = null; // boolean[] after a failed check
  let locked = false;
  let focusId = null;

  const card = el('section', { class: 'card activity' });
  root.append(card);
  const textOf = (i) => (placed[i] == null ? null : slide.chips[placed[i]]);

  function place(slotIdx, chipIdx) {
    if (locked) return;
    placed[slotIdx] = chipIdx; // any previous occupant simply returns to the tray
    selected = null; feedback = null;
    const nextEmpty = placed.findIndex((p) => p == null);
    focusId = nextEmpty >= 0 ? `slot-${nextEmpty}` : 'check';
    render();
  }

  function onSlot(i) {
    if (locked) return;
    if (selected != null) return place(i, selected);
    if (placed[i] != null) { // tap a filled slot: chip goes back to the tray
      const chipText = slide.chips[placed[i]];
      placed[i] = null; feedback = null; focusId = `chip-${chipText}`; render();
    }
  }

  function onChip(c) {
    if (locked) return;
    selected = selected === c ? null : c;
    focusId = `chip-${slide.chips[c]}`;
    render();
  }

  function check() {
    const res = checkFill(slide, placed.map((_, i) => textOf(i)));
    if (res.allCorrect) {
      locked = true; feedback = res.correct; render(); ctx.onAttempt(true); ctx.onComplete();
    } else {
      feedback = res.correct; ctx.onAttempt(false); hints.miss(); focusId = 'check'; render();
    }
  }

  function slotBtn(i) {
    const t = textOf(i);
    const cls = 'slot' + (t ? ' filled' : '') + (feedback ? (feedback[i] ? ' right' : ' nope') : '');
    return el('button', {
      type: 'button', class: cls, 'data-testid': `slot-${i}`, disabled: locked,
      'aria-label': t ? `Blank ${i + 1}: ${t}. Press to remove` : `Blank ${i + 1}: empty`,
      ondragover: (e) => e.preventDefault(),
      ondrop: (e) => { e.preventDefault(); const c = Number(e.dataTransfer.getData('text/plain')); if (!Number.isNaN(c)) place(i, c); },
      onclick: () => onSlot(i),
    }, t || '___');
  }

  function lineEl(line, li) {
    const parts = line.split(/(\{\d+\})/).map((p) => {
      const m = p.match(/^\{(\d+)\}$/);
      return m ? slotBtn(Number(m[1])) : p ? el('span', { text: p }) : null;
    });
    const row = el('div', { class: perLineImages ? 'set-row' : 'fill-line' }, parts);
    return perLineImages ? el('div', {}, img(slide.images[li], slide.alts[li]), row) : row;
  }

  function render() {
    const tray = slide.chips.map((t, c) => (placed.includes(c) ? null : el('button', {
      type: 'button', draggable: 'true', class: 'chip' + (selected === c ? ' selected' : ''),
      'data-testid': `chip-${t}`, 'aria-pressed': String(selected === c), disabled: locked,
      ondragstart: (e) => { e.dataTransfer.setData('text/plain', String(c)); e.dataTransfer.effectAllowed = 'move'; },
      onclick: () => onChip(c),
    }, t)));
    card.replaceChildren(...[
      el('p', { class: 'prompt', text: slide.prompt }),
      !perLineImages ? slide.images.map((n, k) => img(n, slide.alts[k], 'scene')) : null,
      lines.map(lineEl),
      el('div', { class: 'tray', 'data-testid': 'tray', role: 'group', 'aria-label': 'Choices' }, tray),
      el('button', { type: 'button', class: 'btn btn-main', 'data-testid': 'check', text: 'Check', disabled: locked || placed.some((p) => p == null), onclick: check }),
    ].flat().filter(Boolean));
    if (focusId) { card.querySelector(`[data-testid="${focusId}"]`)?.focus(); focusId = null; }
  }
  render();
  return () => card.remove();
}
