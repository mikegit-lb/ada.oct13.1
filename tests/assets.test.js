import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const c = JSON.parse(fs.readFileSync(new URL('../data/content.json', import.meta.url), 'utf8'));
const refs = new Set();
(function walk(v, key) {
  if (Array.isArray(v)) v.forEach((x) => walk(x, key));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k);
  else if (typeof v === 'string' && (key === 'image' || key === 'images')) refs.add(v);
})(c);
for (let i = 1; i <= 4; i++) refs.add(`map-piece-${i}.svg`);

test('there are image references', () => assert.ok(refs.size > 20));
for (const r of refs) {
  test(`asset ${r}`, () => {
    const p = new URL(`../assets/${r}`, import.meta.url);
    assert.ok(fs.existsSync(p), 'missing');
    const s = fs.readFileSync(p, 'utf8');
    assert.ok(s.startsWith('<svg'));
    assert.match(s, /viewBox=/);
    assert.match(s, /<title>[^<]+<\/title>/);
    assert.ok(s.length < 40 * 1024);
  });
}
