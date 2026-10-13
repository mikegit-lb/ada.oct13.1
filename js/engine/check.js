import { beFor, toIng } from './grammar.js';

export const checkChoice = (item, picked) => item.answer === picked;

export function checkFill(item, placed) {
  const correct = item.answers.map((a, i) => placed[i] === a);
  return { correct, allCorrect: correct.every(Boolean) };
}

export function checkSort(cards, placement) {
  const wrong = cards.filter((c) => placement[c.id] !== c.bin).map((c) => c.id);
  return { wrong, allCorrect: wrong.length === 0 };
}

const norm = (s) => s.trim().toLowerCase().replace(/\.$/, '');
export function checkOrder(item, tiles) {
  const got = norm(tiles.join(' '));
  return item.accept.some((a) => norm(a) === got);
}

export function checkGate(s, pick) {
  const pathOk = pick.path === s.path;
  const beOk = pick.be === beFor(s.person);
  const ingOk = pick.ing === toIng(s.verb);
  return { pathOk, beOk, ingOk, passed: pathOk && beOk && ingOk };
}

export function nextHint(attempts, hints) {
  if (attempts <= 0 || !hints.length) return null;
  return hints[Math.min(attempts, hints.length) - 1];
}
