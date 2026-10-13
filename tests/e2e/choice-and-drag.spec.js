import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const c = JSON.parse(fs.readFileSync(new URL('../../data/content.json', import.meta.url), 'utf8'));
const find = (stage, pred) => { const s = c.stages[stage].slides; const i = s.findIndex(pred); return [i, s[i]]; };
const open = (page, stage, i) => page.goto(`/?stage=${stage}&slide=${i}`);

test('multipleChoice: wrong pick keeps next disabled and shows a hint; correct pick enables next', async ({ page }) => {
  const [i, s] = find(0, (x) => x.type === 'multipleChoice');
  await open(page, 0, i);
  await expect(page.getByTestId('next')).toBeDisabled();
  const wrong = s.options.find((o) => o.id !== s.answer);
  await page.getByTestId(`option-${wrong.id}`).click();
  await expect(page.getByTestId('next')).toBeDisabled();
  await expect(page.getByTestId('pip-bubble')).toContainText('Try again');
  await page.getByTestId(`option-${s.answer}`).click();
  await expect(page.getByTestId('next')).toBeEnabled();
  await expect(page.getByTestId('stars')).toContainText('1');
});

const drag1 = () => find(1, (x) => x.type === 'dragFill');

test('dragFill: HTML5 drag of chips into slots; check passes when all correct', async ({ page, isMobile }) => {
  const [i, s] = drag1();
  await open(page, 1, i);
  await expect(page.getByTestId('check')).toBeDisabled();
  for (let k = 0; k < s.answers.length; k++) {
    await page.getByTestId(`chip-${s.answers[k]}`).dragTo(page.getByTestId(`slot-${k}`));
  }
  await expect(page.getByTestId('slot-0')).toHaveText(s.answers[0]);
  await page.getByTestId('check').click();
  await expect(page.getByTestId('next')).toBeEnabled();
});

test('dragFill: tap chip then tap slot places it (touch fallback)', async ({ page }) => {
  const [i, s] = drag1();
  await open(page, 1, i);
  for (let k = 0; k < s.answers.length; k++) {
    await page.getByTestId(`chip-${s.answers[k]}`).click();
    await page.getByTestId(`slot-${k}`).click();
  }
  await page.getByTestId('check').click();
  await expect(page.getByTestId('next')).toBeEnabled();
});

test('dragFill: keyboard places a chip and focus lands on the next empty slot', async ({ page }) => {
  const [i, s] = drag1();
  await open(page, 1, i);
  await page.getByTestId(`chip-${s.answers[0]}`).focus();
  await page.keyboard.press('Enter');
  await page.getByTestId('slot-0').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('slot-0')).toHaveText(s.answers[0]);
  await expect(page.getByTestId('slot-1')).toBeFocused();
});

test('dragFill: tapping a filled slot returns its chip to the tray, nothing duplicated', async ({ page }) => {
  const [i, s] = drag1();
  await open(page, 1, i);
  const chip = s.answers[0];
  await page.getByTestId(`chip-${chip}`).click();
  await page.getByTestId('slot-0').click();
  await expect(page.getByTestId(`chip-${chip}`)).toHaveCount(0);
  await page.getByTestId('slot-0').click();
  await expect(page.getByTestId(`chip-${chip}`)).toHaveCount(1);
  await expect(page.getByTestId(`chip-${chip}`)).toBeFocused();
  await expect(page.getByTestId('slot-0')).toHaveText('___');
  await expect(page.getByTestId('tray').locator('button')).toHaveCount(s.chips.length);
});

test('dragFill: wrong answers turn the slot orange and the second miss shows hint 2', async ({ page }) => {
  const [i, s] = drag1();
  await open(page, 1, i);
  const swapped = [...s.answers].reverse();
  for (let k = 0; k < swapped.length; k++) {
    await page.getByTestId(`chip-${swapped[k]}`).click();
    await page.getByTestId(`slot-${k}`).click();
  }
  await page.getByTestId('check').click();
  const slot = page.getByTestId('slot-0');
  await expect(slot).toHaveClass(/nope/);
  expect(await slot.evaluate((e) => getComputedStyle(e).borderColor)).toBe('rgb(232, 89, 12)');
  await expect(page.getByTestId('pip-bubble')).toContainText(s.hints[0]);
  await page.getByTestId('check').click();
  await expect(page.getByTestId('pip-bubble')).toContainText(s.hints[1]);
  await expect(page.getByTestId('next')).toBeDisabled();
});

test('dragFill labels sets: NOW/LATER chips go into set headers', async ({ page }) => {
  const [i, s] = find(2, (x) => x.type === 'dragFill');
  await open(page, 2, i);
  for (let k = 0; k < 2; k++) {
    await page.getByTestId(`chip-${s.answers[k]}`).click();
    await page.getByTestId(`slot-${k}`).click();
  }
  await page.getByTestId('check').click();
  await expect(page.getByTestId('next')).toBeEnabled();
});
