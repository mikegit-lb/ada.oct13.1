import { expect } from '@playwright/test';
import fs from 'node:fs';
import { beFor, toIng } from '../../js/engine/grammar.js';

export const content = JSON.parse(fs.readFileSync(new URL('../../data/content.json', import.meta.url), 'utf8'));

// Map an accepted sentence to the tile indices that spell it (a tile may hold several words).
export function tileOrder(s) {
  let rest = s.accept[0].replace(/\.$/, '').toLowerCase(); const used = new Set(); const out = [];
  while (rest) {
    const n = s.tiles.findIndex((t, i) => !used.has(i) && (rest === t.toLowerCase() || rest.startsWith(t.toLowerCase() + ' ')));
    used.add(n); out.push(n); rest = rest.slice(s.tiles[n].length).trim();
  }
  return out;
}

async function fillDrag(page, s, answers) {
  for (let k = 0; k < answers.length; k++) {
    await page.getByTestId(`chip-${answers[k]}`).click();
    await page.getByTestId(`slot-${k}`).click();
  }
}

// Answers one activity slide. wrongFirst: submit a wrong attempt, check Next stays locked, then fix it.
export async function answerActivity(page, s, wrongFirst = false) {
  const next = page.getByTestId('next');
  if (s.type === 'multipleChoice') {
    if (wrongFirst) { await page.getByTestId(`option-${s.options.find((o) => o.id !== s.answer).id}`).click(); await expect(next).toBeDisabled(); }
    await page.getByTestId(`option-${s.answer}`).click();
  } else if (s.type === 'dragFill') {
    if (wrongFirst) {
      await fillDrag(page, s, [...s.answers].reverse());
      await page.getByTestId('check').click();
      await expect(next).toBeDisabled();
      for (let k = 0; k < s.answers.length; k++) await page.getByTestId(`slot-${k}`).click();
    }
    await fillDrag(page, s, s.answers);
    await page.getByTestId('check').click();
  } else if (s.type === 'sort') {
    const place = async (k, bin) => { await page.getByTestId(`card-${k.id}`).click(); await page.getByTestId(`bin-${bin}`).click(); };
    if (wrongFirst) {
      for (const k of s.cards) await place(k, k.bin === 'NOW' ? 'LATER' : 'NOW');
      await page.getByTestId('check').click();
      await expect(next).toBeDisabled();
      for (const k of s.cards) await page.getByTestId(`card-${k.id}`).click(); // back to the pool
    }
    for (const k of s.cards) await place(k, k.bin);
    await page.getByTestId('check').click();
  } else if (s.type === 'buildSentence') {
    const order = tileOrder(s);
    if (wrongFirst) {
      for (const n of [...order].reverse()) await page.getByTestId(`tile-${n}`).click();
      await page.getByTestId('check').click();
      await expect(next).toBeDisabled();
      for (const n of [...order].reverse()) await page.getByTestId(`tile-${n}`).click();
    }
    for (const n of order) await page.getByTestId(`tile-${n}`).click();
    await page.getByTestId('check').click();
  } else if (s.type === 'pathQuiz') {
    for (const g of s.scenarios) {
      if (wrongFirst) await page.getByTestId(`path-${g.path === 'NOW' ? 'LATER' : 'NOW'}`).click();
      await page.getByTestId(`path-${g.path}`).click();
      await page.getByTestId(`be-${beFor(g.person)}`).click();
      await page.getByTestId(`ing-${toIng(g.verb)}`).click();
      await page.getByTestId('gate-check').click();
    }
  } else throw new Error(`unhandled ${s.type}`);
  await expect(next).toBeEnabled();
}
