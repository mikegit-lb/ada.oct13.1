import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkChoice, checkFill, checkSort, checkOrder, checkGate, nextHint } from '../js/engine/check.js';

test('checkFill flags each blank', () => {
  assert.deepEqual(checkFill({answers:['is','are']}, ['is','is']), {correct:[true,false], allCorrect:false});
  assert.equal(checkFill({answers:['am']}, [null]).allCorrect, false);
});
test('checkSort lists misplaced card ids', () => {
  const r = checkSort([{id:'a',bin:'NOW'},{id:'b',bin:'LATER'}], {a:'LATER', b:'LATER'});
  assert.deepEqual(r, {wrong:['a'], allCorrect:false});
});
test('checkOrder accepts any listed sentence, ignoring case and final period', () => {
  assert.equal(checkOrder({accept:['The fox is running now.']}, ['the','fox','is','running','now']), true);
  assert.equal(checkOrder({accept:['The fox is running now.']}, ['fox','the','is','running','now']), false);
});
test('checkGate scores path, be and -ing separately', () => {
  const s = {path:'NOW', person:'pl', verb:'swim'};
  assert.deepEqual(checkGate(s, {path:'NOW', be:'are', ing:'swimming'}), {pathOk:true, beOk:true, ingOk:true, passed:true});
  assert.equal(checkGate(s, {path:'LATER', be:'are', ing:'swiming'}).passed, false);
});
test('nextHint escalates then holds on the last hint', () => {
  assert.equal(nextHint(0, ['a','b']), null); assert.equal(nextHint(1, ['a','b']), 'a'); assert.equal(nextHint(5, ['a','b']), 'b');
});
test('checkChoice compares the picked id', () => { assert.equal(checkChoice({answer:'fox'}, 'fox'), true); assert.equal(checkChoice({answer:'fox'}, 'frog'), false); });
