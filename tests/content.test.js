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
const acts = (st) => st.slides.filter((s) => s.kind === 'activity');
const allActs = c.stages.flatMap(acts);
const slidesOf = (st, type) => st.slides.filter((s) => s.type === type);

test('stage 2 keeps its 3 core dragFill slides first; every dragFill answer matches beFor and precedes a -ing word', () => {
  assert.deepEqual(now.slides.slice(1, 4).map((s) => s.type), ['dragFill', 'dragFill', 'dragFill']);
  assert.ok(now.slides.slice(1, 4).flatMap((s) => s.answers).includes('am'));
  const d = slidesOf(now, 'dragFill'); assert.ok(d.length >= 6);
  for (const s of d) s.people.forEach((p, i) => {
    assert.equal(s.answers[i], beFor(p));
    assert.match(s.template, new RegExp(`\\{${i}\\}\\s+\\w+ing\\b`));
    assert.ok(s.chips.includes(s.answers[i]));
  });
});
test('stage 3 teaches markers and phrases; every sort card uses am/is/are + Verb-ing with the right marker', () => {
  const t = JSON.stringify(later);
  for (const w of ['Tomorrow', 'Next week', 'We are going to', 'Our plan is']) assert.ok(t.includes(w), w);
  const sorts = slidesOf(later, 'sort'); assert.ok(sorts.length >= 3);
  assert.ok(sorts[0].cards.length >= 8);
  assert.equal(sorts.at(-1).cards.length, 10, 'review sort closes the stage');
  assert.equal(later.slides.findLast((s) => s.kind === 'activity'), sorts.at(-1));
  for (const s of sorts) {
    assert.ok(s.cards.some((k) => k.bin === 'NOW') && s.cards.some((k) => k.bin === 'LATER'));
    for (const k of s.cards) {
      assert.match(k.text, /\b(am|is|are) \w+ing\b/);
      assert.match(k.text, k.bin === 'NOW' ? /\bnow\b/i : /\b(tomorrow|next week)\b/i);
    }
  }
  assert.ok(later.slides.some((s) => s.type === 'dragFill' && s.answers.join() === 'NOW,LATER'));
});
test('stage 4 keeps the 3 core gates first; every gate in every pathQuiz is consistent', () => {
  const quizzes = slidesOf(challenge, 'pathQuiz');
  assert.equal(quizzes[0].scenarios.length, 3);
  const ings = quizzes[0].scenarios.map((s) => toIng(s.verb)); assert.ok(ings.includes('swimming') && ings.includes('making'));
  assert.deepEqual([...new Set(quizzes[0].scenarios.map((s) => s.path))].sort(), ['LATER', 'NOW']);
  assert.ok(quizzes.filter((q) => /^Bonus Gate/.test(q.title)).length >= 2);
  assert.ok(quizzes.some((q) => /^Boss/.test(q.title) && q.scenarios.length >= 4));
  const gates = quizzes.flatMap((q) => q.scenarios);
  assert.equal(new Set(gates.map((g) => g.id)).size, gates.length);
  assert.equal(new Set(gates.map((g) => g.clue)).size, gates.length);
  for (const s of gates) {
    assert.match(s.clue, s.path === 'NOW' ? /right now|at this moment/i : /tomorrow|next week/i);
    assert.match(`${s.subject} ${beFor(s.person)} ${toIng(s.verb)} ${s.ending}`, /^[A-Z].* (am|is|are) \w+ing /);
  }
  const spelled = new Set(allActs.filter((a) => a.tag === 'spelling').map((a) => a.verb));
  for (const g of gates) assert.ok(spelled.has(g.verb), `no -ing spelling round for ${g.verb}`);
});
test('new item types: spelling, agreement, time-word and picture-match answers are all correct', () => {
  const by = (tag) => allActs.filter((a) => a.tag === tag);
  assert.ok(by('spelling').length >= 14);
  for (const a of by('spelling')) {
    assert.equal(a.answer, toIng(a.verb)); assert.equal(new Set(a.options.map((o) => o.label)).size, 3);
    assert.ok(a.options.some((o) => o.id === a.answer)); assert.match(a.prompt, new RegExp(`^${a.verb} \\+ ing`));
  }
  assert.ok(by('agreement').length >= 5);
  for (const a of by('agreement')) { assert.equal(a.answer, beFor(a.person)); assert.match(a.sentence, /___ \w+ing\b/); }
  assert.ok(by('timeWord').length >= 4);
  for (const a of by('timeWord')) {
    assert.match(a.sentence, /\b(am|is|are) \w+ing\b/);
    assert.match(a.sentence, a.answer === 'NOW' ? /\bnow\b/i : /\b(tomorrow|next week)\b/i);
  }
  assert.ok(by('pictureMatch').length >= 4);
  for (const a of by('pictureMatch')) {
    const right = a.options.find((o) => o.id === a.answer).label;
    assert.match(right, /^[A-Z].* (am|is|are) \w+ing\b.*\b(now|tomorrow|next week)\b/i);
    assert.equal(new Set(a.options.map((o) => o.id)).size, a.options.length);
  }
});
test('build-sentence rounds exist for NOW and LATER and every new one uses be + toIng(verb)', () => {
  const builds = allActs.filter((a) => a.type === 'buildSentence');
  assert.ok(builds.length >= 11);
  assert.ok(builds.some((b) => /\bnow\b/.test(b.accept[0])) && builds.some((b) => /tomorrow|next week/.test(b.accept[0])));
  for (const b of builds.filter((x) => x.verb)) {
    assert.ok(b.accept[0].includes(`${beFor(b.person)} ${toIng(b.verb)}`), b.accept[0]);
    assert.match(b.accept[0], /\b(now|tomorrow|next week)\b/);
    const words = (a) => a.join(' ').replace(/\.$/, '').toLowerCase().split(' ').sort().join('|');
    assert.equal(words(b.tiles), words(b.accept), 'tiles spell the sentence');
  }
});
test('60-80 activities in total, with a mix of all five types', () => {
  assert.ok(allActs.length >= 60 && allActs.length <= 80, String(allActs.length));
  assert.deepEqual([...new Set(allActs.map((a) => a.type))].sort(), ['buildSentence', 'dragFill', 'multipleChoice', 'pathQuiz', 'sort']);
});
test('every slide has an est; the lesson takes 55-65 minutes with a sensible split across stages', () => {
  for (const s of c.stages.flatMap((x) => x.slides)) assert.ok(Number.isInteger(s.est) && s.est >= 10 && s.est <= 400, JSON.stringify(s).slice(0, 60));
  const sums = c.stages.map((st) => st.slides.reduce((a, s) => a + s.est, 0));
  const total = sums.reduce((a, b) => a + b);
  assert.ok(total >= 3300 && total <= 3900, `total ${total}s`);
  [0.10, 0.30, 0.35, 0.25].forEach((share, i) => assert.ok(Math.abs(sums[i] / total - share) <= 0.04, `stage ${i + 1}: ${(sums[i] / total * 100).toFixed(1)}%`));
});
test('every activity has at least 2 hints and every stage a mapPiece 1..4', () => {
  c.stages.forEach((s, i) => {
    assert.equal(s.mapPiece, i + 1);
    for (const a of s.slides.filter((x) => x.kind === 'activity')) assert.ok(a.hints.length >= 2, a.type);
  });
});
test('Pip text never says "wrong"', () => assert.doesNotMatch(JSON.stringify(c), /\bwrong\b/i));
