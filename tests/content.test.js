import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { beFor, toIng } from '../js/engine/grammar.js';

const c = JSON.parse(fs.readFileSync(new URL('../data/content.json', import.meta.url), 'utf8'));
const [hook, now, later, challenge] = c.stages;

test('four stages in order', () => assert.deepEqual(c.stages.map((s) => s.id), ['hook', 'now', 'later', 'challenge']));
test('stage titles are exact', () => assert.deepEqual(c.stages.map((s) => s.title), [
  'STAGE 1: THE HOOK & WARM-UP', 'STAGE 2: ACTION NOW (The Observation Screen)',
  'STAGE 3: ACTION LATER (The Timeline Screen)', 'STAGE 4: THE CHALLENGE (Which Way Do You Go?)']));
test('stage 1 is grammar-free multiple choice', () => {
  const acts = hook.slides.filter((s) => s.kind === 'activity');
  assert.ok(acts.length >= 4 && acts.every((a) => a.type === 'multipleChoice'));
  assert.doesNotMatch(JSON.stringify(acts), /\b(am|is|are)\b/i);
});
test('stage 2 has exactly 3 dragFill slides whose answers match beFor and precede a -ing word', () => {
  const d = now.slides.filter((s) => s.type === 'dragFill'); assert.equal(d.length, 3);
  for (const s of d) s.people.forEach((p, i) => {
    assert.equal(s.answers[i], beFor(p));
    assert.match(s.template, new RegExp(`\\{${i}\\}\\s+\\w+ing\\b`));
  });
  assert.ok(d.flatMap((s) => s.answers).includes('am'));
});
test('stage 3 teaches markers and phrases and sorts same-form sentences', () => {
  const t = JSON.stringify(later);
  for (const w of ['Tomorrow', 'Next week', 'We are going to', 'Our plan is']) assert.ok(t.includes(w), w);
  const sort = later.slides.find((s) => s.type === 'sort'); assert.ok(sort.cards.length >= 8);
  for (const k of sort.cards) {
    assert.match(k.text, /\b(am|is|are) \w+ing\b/);
    assert.match(k.text, k.bin === 'NOW' ? /\bnow\b/i : /\b(tomorrow|next week)\b/i);
  }
  assert.ok(later.slides.some((s) => s.type === 'dragFill' && s.answers.join() === 'NOW,LATER'));
});
test('stage 4 has 3 scenarios; double-consonant and silent-e; both paths used', () => {
  const q = challenge.slides.find((s) => s.type === 'pathQuiz').scenarios; assert.equal(q.length, 3);
  const ings = q.map((s) => toIng(s.verb)); assert.ok(ings.includes('swimming') && ings.includes('making'));
  assert.deepEqual([...new Set(q.map((s) => s.path))].sort(), ['LATER', 'NOW']);
  for (const s of q) assert.match(s.clue, s.path === 'NOW' ? /right now|at this moment/i : /tomorrow|next week/i);
});
test('every activity has at least 2 hints and every stage a mapPiece 1..4', () => {
  c.stages.forEach((s, i) => {
    assert.equal(s.mapPiece, i + 1);
    for (const a of s.slides.filter((x) => x.kind === 'activity')) assert.ok(a.hints.length >= 2, a.type);
  });
});
test('Pip text never says "wrong"', () => assert.doesNotMatch(JSON.stringify(c), /\bwrong\b/i));
