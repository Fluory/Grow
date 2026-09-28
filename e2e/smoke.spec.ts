import { expect, test } from '@playwright/test';

test.describe('smoke', () => {
  test('home tells the story and links to the garden', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('A garden that grows');
    await expect(page.getByRole('complementary', { name: 'Today in the garden' })).toBeVisible();
    await page.getByRole('link', { name: /Walk the garden/ }).click();
    await expect(page).toHaveURL(/\/garden$/);
    await expect(page.getByRole('slider', { name: 'Day' })).toBeVisible();
  });

  test('weather record shows the reference year with a table view', async ({ page }) => {
    await page.goto('/weather');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('The only boss of the garden.');
    await expect(page.getByRole('img', { name: /Heilbronn 2025\/26/ })).toBeVisible();
    await page
      .getByText(/Show every day as a table/)
      .first()
      .click();
    await expect(page.getByRole('table').first()).toBeVisible();
  });

  test('logbook lists day 0 and opens its page', async ({ page }) => {
    await page.goto('/logbook');
    await page
      .getByRole('link', { name: /An empty garden bed by a stream/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/day\/0$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('An empty garden bed by a stream');
  });

  test('chapters render MDX', async ({ page }) => {
    await page.goto('/chapters/l-systems');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Plants from grammars');
    await expect(page.getByRole('heading', { level: 2, name: /A string that rewrites itself/ })).toBeVisible();
  });

  test('theme toggle switches to night', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: /Switch to (night|day)/ });
    const before = await page.locator('html').getAttribute('data-theme');
    await toggle.click();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', before ?? '');
  });

  test('legal pages exist', async ({ page }) => {
    await page.goto('/impressum');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Impressum');
    await page.goto('/datenschutz');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Datenschutzerklärung');
  });
});
