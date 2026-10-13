import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../js/engine/state.js';

const fakeStorage = (init = {}) => { const m = { ...init }; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; } }; };
const throwingStorage = () => ({ getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } });

test('state persists stars and completed stages', () => {
  const mem = fakeStorage(); const a = createState(mem); a.addStars(3); a.completeStage(0);
  const b = createState(mem); assert.equal(b.stars, 3); assert.deepEqual(b.completed, [0]);
});
test('corrupt storage JSON falls back to a fresh state', () => {
  const s = createState(fakeStorage({ 'secretMap.v1': '{oops' })); assert.equal(s.stars, 0); assert.equal(s.stageIndex, 0);
});
test('wrong-shaped storage JSON falls back to a fresh state', () => {
  const s = createState(fakeStorage({ 'secretMap.v1': '{"stars":"x","completed":7}' })); assert.equal(s.stars, 0); assert.deepEqual(s.completed, []);
});
test('throwing storage never throws', () => { const s = createState(throwingStorage()); s.addStars(1); assert.equal(s.stars, 1); });
test('hearts floor at 0 and refill to 3', () => {
  const s = createState(fakeStorage()); for (let i = 0; i < 5; i++) s.loseHeart(); assert.equal(s.hearts, 0); s.refillHearts(); assert.equal(s.hearts, 3);
});
test('reset clears progress', () => {
  const s = createState(fakeStorage()); s.addStars(2); s.completeStage(1); s.setStage(2); s.reset();
  assert.deepEqual([s.stars, s.stageIndex, s.completed.length, s.hearts], [0, 0, 0, 3]);
});
