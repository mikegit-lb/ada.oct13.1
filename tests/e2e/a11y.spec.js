import { test, expect } from '@playwright/test';
import { content, answerActivity } from './helpers.js';

const allSlides = content.stages.flatMap((st, si) => st.slides.map((s, i) => ({ si, i, s })));

async function audit(page) {
  return page.evaluate(() => {
    const noAlt = [...document.querySelectorAll('img')].filter((n) => !(n.getAttribute('alt') || '').trim()).map((n) => n.getAttribute('src'));
    const name = (n) => (n.getAttribute('aria-label') || n.textContent || n.getAttribute('title') || '').trim();
    const noName = [...document.querySelectorAll('button, a, input, select, textarea')].filter((n) => !name(n)).map((n) => n.outerHTML.slice(0, 80));
    const fake = [...document.querySelectorAll('[onclick], [role=button]')].filter((n) => n.tagName !== 'BUTTON').map((n) => n.outerHTML.slice(0, 80));
    return { noAlt, noName, fake, over: document.documentElement.scrollWidth - window.innerWidth };
  });
}

test('every slide: images have alt, controls have names, no horizontal overflow', async ({ page }) => {
  test.setTimeout(120000);
  for (const w of [360, 1280]) {
    await page.setViewportSize({ width: w, height: 740 });
    for (const { si, i } of allSlides) {
      await page.goto(`/?stage=${si}&slide=${i}`);
      await expect(page.getByTestId('progress')).toContainText(`${i + 1}/`);
      const r = await audit(page);
      expect(r, `stage ${si} slide ${i} @${w}`).toEqual({ noAlt: [], noName: [], fake: [], over: expect.any(Number) });
      expect(r.over, `overflow stage ${si} slide ${i} @${w}`).toBeLessThanOrEqual(0);
    }
  }
});

test('path quiz build step and stage-complete screen do not overflow at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  const st = content.stages[3]; const idx = st.slides.findIndex((s) => s.type === 'pathQuiz');
  await page.goto(`/?stage=3&slide=${idx}`);
  await page.getByTestId(`path-${st.slides[idx].scenarios[0].path}`).click();
  let r = await audit(page);
  expect(r).toMatchObject({ noAlt: [], noName: [], fake: [] }); expect(r.over).toBeLessThanOrEqual(0);
  await page.goto('/?stage=0&slide=0');
  for (let k = 0; k < content.stages[0].slides.length; k++) {
    const s = content.stages[0].slides[k];
    if (s.kind === 'activity') await answerActivity(page, s);
    await page.getByTestId('next').click();
  }
  await expect(page.getByTestId('stage-done')).toBeVisible();
  r = await audit(page);
  expect(r).toMatchObject({ noAlt: [], noName: [], fake: [] }); expect(r.over).toBeLessThanOrEqual(0);
});

async function tabUntil(page, testId, max = 80) {
  for (let n = 0; n < max; n++) {
    await page.keyboard.press('Tab');
    if (await page.evaluate((id) => document.activeElement?.dataset?.testid === id, testId)) return n + 1;
  }
  return -1;
}

for (const [si, st] of content.stages.entries()) {
  test(`keyboard: Tab reaches the footer navigation without a trap (stage ${si + 1})`, async ({ page }) => {
    // First activity: Next is still locked, so the last stop is Back. First slide: Next itself.
    const k = st.slides.findIndex((s) => s.kind === 'activity');
    await page.goto(`/?stage=${si}&slide=${k}`);
    expect(await tabUntil(page, 'back')).toBeGreaterThan(0);
    await page.goto(`/?stage=${si}&slide=0`);
    expect(await tabUntil(page, 'next')).toBeGreaterThan(0);
  });
}

test('reduced motion: no running animations after answering and finishing a stage', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?stage=0&slide=1');
  const running = () => page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
  await answerActivity(page, content.stages[0].slides[1]);
  expect(await running()).toBe(0);
  await page.goto('/?stage=0&slide=0');
  for (let k = 0; k < content.stages[0].slides.length; k++) {
    const s = content.stages[0].slides[k];
    if (s.kind === 'activity') await answerActivity(page, s);
    await page.getByTestId('next').click();
  }
  await expect(page.getByTestId('stage-done')).toBeVisible();
  expect(await running()).toBe(0);
  expect(await page.locator('.confetti').count()).toBe(0);
});
