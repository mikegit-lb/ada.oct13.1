import { test, expect } from '@playwright/test';

test('loads on Stage 1 story slide and Next advances', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('progress')).toContainText('STAGE 1');
  await expect(page.getByTestId('progress')).toContainText('1/');
  await page.getByTestId('next').click();
  await expect(page.getByTestId('progress')).toContainText('2/');
  await expect(page.getByTestId('back')).toBeEnabled();
});

test('app starts when localStorage throws', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });
  });
  await page.goto('/');
  await expect(page.getByTestId('progress')).toContainText('STAGE 1');
  await expect(page.getByTestId('stars')).toContainText('0');
});

test('app starts when localStorage holds corrupt JSON', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('secretMap.v1', '{oops'));
  await page.goto('/');
  await expect(page.getByTestId('progress')).toContainText('STAGE 1');
  await expect(page.getByTestId('stars')).toContainText('0');
});

test('header shows four map pieces and no horizontal scroll', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('map-piece-4')).toBeVisible();
  const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(sw).toBeLessThanOrEqual(iw);
});
