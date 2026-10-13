import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { renderLessonMd } from '../scripts/build-lesson-md.js';

const content = JSON.parse(fs.readFileSync(new URL('../data/content.json', import.meta.url), 'utf8'));

test('one H2 per stage with the exact stage titles', () => {
  const md = renderLessonMd(content);
  for (const s of content.stages) assert.ok(md.includes(`## ${s.title}`));
  assert.equal(md.match(/^## /gm).length, 4);
});
test('only headings, bullets and blank lines (no paragraphs)', () => {
  for (const line of renderLessonMd(content).split('\n')) assert.match(line, /^(#{1,3} .+|\s*- .+|)$/);
});
test('lists every activity type, sort card, and path-quiz gate', () => {
  const md = renderLessonMd(content);
  assert.ok(md.includes('Drag and Drop'));
  assert.ok(md.includes('We are visiting the waterfall tomorrow.'));
  assert.ok(md.includes('Which Way Do You Go?'));
  for (const c of content.stages[2].slides.find((s) => s.type === 'sort').cards) assert.ok(md.includes(c.text), c.text);
  for (const g of content.stages[3].slides.find((s) => s.type === 'pathQuiz').scenarios) assert.ok(md.includes(g.clue), g.clue);
});
test('includes the Turkish tip and every hint', () => {
  const md = renderLessonMd(content);
  assert.ok(md.includes('Şimdi yüzüyorum.') && md.includes('Yarın yüzüyorum.'));
  for (const st of content.stages) for (const s of st.slides) for (const h of s.hints || []) assert.ok(md.includes(h), h);
});
