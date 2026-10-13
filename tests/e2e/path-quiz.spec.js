import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { beFor, toIng } from '../../js/engine/grammar.js';

const c = JSON.parse(fs.readFileSync(new URL('../../data/content.json', import.meta.url), 'utf8'));
const idx = c.stages[3].slides.findIndex((x) => x.type === 'pathQuiz');
const gates = c.stages[3].slides[idx].scenarios;
const other = (p) => (p === 'NOW' ? 'LATER' : 'NOW');
const open = (page) => page.goto(`/?stage=3&slide=${idx}`);
const hearts = async (page) => ((await page.getByTestId('hearts').textContent()).match(/❤/g) || []).length;

async function solve(page, s) {
  await page.getByTestId(`path-${s.path}`).click();
  await page.getByTestId(`be-${beFor(s.person)}`).click();
  await page.getByTestId(`ing-${toIng(s.verb)}`).click();
  await page.getByTestId('gate-check').click();
}

test('wrong fork costs a heart, shows the marker hint, and does not reveal the be-step', async ({ page }) => {
  await open(page);
  expect(await hearts(page)).toBe(3);
  await page.getByTestId(`path-${other(gates[0].path)}`).click();
  expect(await hearts(page)).toBe(2);
  await expect(page.getByTestId('pip-bubble')).toContainText(c.stages[3].slides[idx].hints[0]);
  await expect(page.getByTestId('be-is')).toHaveCount(0);
});

test('right fork then wrong be costs a heart and flags only the be chip', async ({ page }) => {
  await open(page);
  const s = gates[0];
  await page.getByTestId(`path-${s.path}`).click();
  await page.getByTestId('be-is').click();
  await page.getByTestId(`ing-${toIng(s.verb)}`).click();
  await page.getByTestId('gate-check').click();
  expect(await hearts(page)).toBe(2);
  await expect(page.getByTestId('be-is')).toHaveClass(/bad/);
  await expect(page.getByTestId(`ing-${toIng(s.verb)}`)).not.toHaveClass(/bad/);
});

test('wrong -ing spelling flags only the -ing chip', async ({ page }) => {
  await open(page);
  const s = gates[0];
  await page.getByTestId(`path-${s.path}`).click();
  await page.getByTestId(`be-${beFor(s.person)}`).click();
  await page.getByTestId('ing-swiming').click();
  await page.getByTestId('gate-check').click();
  await expect(page.getByTestId('ing-swiming')).toHaveClass(/bad/);
  await expect(page.getByTestId(`be-${beFor(s.person)}`)).not.toHaveClass(/bad/);
});

test('all gates correct completes; stars count first-try gates only', async ({ page }) => {
  await open(page);
  await solve(page, gates[0]);
  // gate 2: miss once on the fork, then solve (no star)
  await page.getByTestId(`path-${other(gates[1].path)}`).click();
  await solve(page, gates[1]);
  await expect(page.getByTestId('next')).toBeDisabled();
  await solve(page, gates[2]);
  await expect(page.getByTestId('next')).toBeEnabled();
  await expect(page.getByTestId('stars')).toContainText('2');
});

test('hearts reaching 0 shows a hint card, refills hearts, and the same gate stays retryable', async ({ page }) => {
  await open(page);
  const s = gates[0];
  for (let k = 0; k < 3; k++) await page.getByTestId(`path-${other(s.path)}`).click();
  await expect(page.getByTestId('hint-card')).toBeVisible();
  expect(await hearts(page)).toBe(3);
  await expect(page.getByTestId('next')).toBeDisabled();
  await expect(page.getByTestId(`path-${s.path}`)).toBeVisible();
  await solve(page, s);
  await expect(page.getByTestId('hint-card')).toHaveCount(0);
  await expect(page.getByTestId('next')).toBeDisabled();
});

test('-ing distractor chips are unique and include the right form exactly once', async ({ page }) => {
  await open(page);
  for (const s of gates) {
    await page.getByTestId(`path-${s.path}`).click();
    const texts = await page.locator('[data-testid^="ing-"]').allTextContents();
    expect(texts.length).toBe(3);
    expect(new Set(texts).size).toBe(3);
    expect(texts.filter((t) => t === toIng(s.verb)).length).toBe(1);
    await page.getByTestId(`be-${beFor(s.person)}`).click();
    await page.getByTestId(`ing-${toIng(s.verb)}`).click();
    await page.getByTestId('gate-check').click();
  }
});
