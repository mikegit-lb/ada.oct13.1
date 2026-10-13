import { test } from 'node:test';
import assert from 'node:assert/strict';
import { beFor, toIng, ingDistractors } from '../js/engine/grammar.js';

test('beFor maps person to be-form', () => {
  assert.equal(beFor('I'), 'am'); assert.equal(beFor('sg'), 'is'); assert.equal(beFor('pl'), 'are');
});
test('toIng applies spelling rules', () => {
  const t = { swim:'swimming', run:'running', sit:'sitting', climb:'climbing', make:'making',
    dance:'dancing', fly:'flying', visit:'visiting', meet:'meeting', draw:'drawing',
    play:'playing', build:'building', sing:'singing', eat:'eating' };
  for (const [v, e] of Object.entries(t)) assert.equal(toIng(v), e);
});
test('ingDistractors gives two unique wrong forms', () => {
  const s = ingDistractors('swim');
  assert.equal(s.length, 2); assert.equal(new Set(s).size, 2);
  assert.ok(!s.includes('swimming')); assert.ok(s.includes('swiming'));
  const m = ingDistractors('make');
  assert.equal(new Set(m).size, 2); assert.ok(m.includes('makeing')); assert.ok(!m.includes('making'));
});
