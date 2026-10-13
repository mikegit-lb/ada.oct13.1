import { test, expect } from '@playwright/test';
import { content, answerActivity } from './helpers.js';

test('full lesson with correct answers collects all four map pieces and reaches the finale', async ({ page }) => {
  test.setTimeout(300000); // ~70 activities: the whole lesson is played through click by click
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  for (const [si, stage] of content.stages.entries()) {
    await expect(page.getByTestId('progress')).toContainText(stage.title);
    for (const [k, s] of stage.slides.entries()) {
      if (k === 0) await expect(page.getByTestId('back')).toBeDisabled(); // never before the stage start
      if (s.kind === 'activity') await answerActivity(page, s);
      await page.getByTestId('next').click();
    }
    await expect(page.getByTestId('stage-done')).toBeVisible();
    await expect(page.getByTestId(`map-piece-${si + 1}`)).toHaveClass(/collected/);
    await page.getByTestId('next').click();
  }
  await expect(page.getByTestId('finale')).toContainText('The Secret Map of the Magic Forest');
  const total = content.stages.flatMap((s) => s.slides).reduce((t, s) => t + s.est, 0);
  await expect(page.getByTestId('est-minutes')).toContainText(`about ${Math.round(total / 60)} minutes`);
  const stars = Number((await page.getByTestId('stars').textContent()).replace(/\D/g, ''));
  expect(stars).toBeGreaterThan(0);
  await expect(page.getByTestId('final-stars')).toContainText(String(stars));
  expect(errors).toEqual([]);
  await page.getByTestId('play-again').click();
  await expect(page.getByTestId('progress')).toContainText('STAGE 1');
  await expect(page.getByTestId('stars')).toContainText('0');
});

test('Stage 3: wrong answers keep Next locked until the correct answers are given', async ({ page }) => {
  test.setTimeout(180000);
  const stage = content.stages[2];
  await page.goto('/?stage=2&slide=0');
  for (const s of stage.slides) {
    if (s.kind === 'activity') await answerActivity(page, s, true);
    await page.getByTestId('next').click();
  }
  await expect(page.getByTestId('stage-done')).toBeVisible();
  await expect(page.getByTestId('map-piece-3')).toHaveClass(/collected/);
});

test('mute toggle persists across reloads', async ({ page }) => {
  await page.goto('/');
  const mute = page.getByTestId('mute');
  await expect(mute).toHaveAttribute('aria-pressed', 'false');
  await mute.click();
  await expect(mute).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.getByTestId('mute')).toHaveAttribute('aria-pressed', 'true');
});
