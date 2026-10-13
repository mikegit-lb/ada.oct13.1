import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const c = JSON.parse(fs.readFileSync(new URL('../../data/content.json', import.meta.url), 'utf8'));
const find = (stage, pred) => { const s = c.stages[stage].slides; const i = s.findIndex(pred); return [i, s[i]]; };
const open = (page, stage, i) => page.goto(`/?stage=${stage}&slide=${i}`);
const sortSlide = () => find(2, (x) => x.type === 'sort');
const buildSlide = () => find(1, (x) => x.type === 'buildSentence');

async function putAll(page, s, swap = false) {
  for (const k of s.cards) {
    const bin = swap ? (k.bin === 'NOW' ? 'LATER' : 'NOW') : k.bin;
    await page.getByTestId(`card-${k.id}`).click();
    await page.getByTestId(`bin-${bin}`).click();
  }
}
// Map the accepted sentence to tile indices (a tile may hold several words).
function tileOrder(s) {
  let rest = s.accept[0].replace(/\.$/, '').toLowerCase(); const used = new Set(); const out = [];
  while (rest) {
    const n = s.tiles.findIndex((t, i) => !used.has(i) && (rest === t.toLowerCase() || rest.startsWith(t.toLowerCase() + ' ')));
    used.add(n); out.push(n); rest = rest.slice(s.tiles[n].length).trim();
  }
  return out;
}

test('sort: tap-then-tap moves a card into a bin and back out; drag works too', async ({ page }) => {
  const [i, s] = sortSlide(); await open(page, 2, i);
  const k = s.cards[0];
  await page.getByTestId(`card-${k.id}`).click();
  await page.getByTestId('bin-NOW').click();
  await expect(page.locator('[data-bin=NOW]').getByTestId(`card-${k.id}`)).toHaveCount(1);
  await page.getByTestId(`card-${k.id}`).click();
  await expect(page.getByTestId('pool').getByTestId(`card-${k.id}`)).toHaveCount(1);
  // Long pools do not fit the viewport together with the bins, so drive the HTML5 events directly.
  const dt = await page.evaluateHandle(() => new DataTransfer());
  await page.getByTestId(`card-${k.id}`).dispatchEvent('dragstart', { dataTransfer: dt });
  await page.getByTestId('bin-LATER').dispatchEvent('dragover', { dataTransfer: dt });
  await page.getByTestId('bin-LATER').dispatchEvent('drop', { dataTransfer: dt });
  await expect(page.locator('[data-bin=LATER]').getByTestId(`card-${k.id}`)).toHaveCount(1);
});

test('sort: check marks misplaced cards, locks correct ones, hint names the time words', async ({ page }) => {
  const [i, s] = sortSlide(); await open(page, 2, i);
  const wrongOne = s.cards.find((x) => x.bin === 'LATER');
  for (const k of s.cards) {
    await page.getByTestId(`card-${k.id}`).click();
    await page.getByTestId(`bin-${k.id === wrongOne.id ? 'NOW' : k.bin}`).click();
  }
  await page.getByTestId('check').click();
  await expect(page.getByTestId(`card-${wrongOne.id}`)).toHaveClass(/nope/);
  const good = s.cards.find((x) => x.id !== wrongOne.id);
  await expect(page.getByTestId(`card-${good.id}`)).toBeDisabled();
  await expect(page.getByTestId('pip-bubble')).toContainText('tomorrow or next week');
  await expect(page.getByTestId('next')).toBeDisabled();
});

test('sort: all Stage 3 cards sorted correctly completes the activity', async ({ page }) => {
  const [i, s] = sortSlide(); expect(s.cards.length).toBe(8); await open(page, 2, i);
  await putAll(page, s);
  await page.getByTestId('check').click();
  await expect(page.getByTestId('next')).toBeEnabled();
});

test('sort: bins show the Turkish gloss', async ({ page }) => {
  const [i] = sortSlide(); await open(page, 2, i);
  await expect(page.getByTestId('bin-NOW')).toContainText('Şimdi');
  await expect(page.getByTestId('bin-LATER')).toContainText('Sonra');
});

test('buildSentence: tiles build the row, placed tile returns, check passes', async ({ page }) => {
  const [i, s] = buildSlide(); await open(page, 1, i);
  const order = tileOrder(s);
  await page.getByTestId(`tile-${order[0]}`).click();
  await expect(page.getByTestId('answer-row').getByTestId(`tile-${order[0]}`)).toHaveCount(1);
  await page.getByTestId(`tile-${order[0]}`).click();
  await expect(page.getByTestId('tile-bank').getByTestId(`tile-${order[0]}`)).toHaveCount(1);
  for (const n of order) await page.getByTestId(`tile-${n}`).click();
  await page.getByTestId('check').click();
  await expect(page.getByTestId('next')).toBeEnabled();
});

test('buildSentence: wrong order shows a hint and keyboard works', async ({ page }) => {
  const [i, s] = buildSlide(); await open(page, 1, i);
  const order = tileOrder(s).reverse();
  for (const n of order) { await page.getByTestId(`tile-${n}`).focus(); await page.keyboard.press(n % 2 ? 'Enter' : 'Space'); }
  await page.getByTestId('check').press('Enter');
  await expect(page.getByTestId('pip-bubble')).toContainText(s.hints[0]);
  await expect(page.getByTestId('next')).toBeDisabled();
});
