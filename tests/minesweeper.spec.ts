import { expect, test } from '@playwright/test';

test('plays a basic desktop game interaction', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Minesweeper' })).toBeVisible();
  await expect(page.getByText('Classic Mode')).toBeVisible();

  const centerCell = page.getByRole('gridcell', { name: /covered cell row 5 column 5/i });
  await centerCell.click();
  await expect(page.getByText('Playing')).toBeVisible();

  await page.getByRole('button', { name: /flag mode/i }).click();
  await page.getByRole('gridcell', { name: /covered cell/i }).first().click();
  await expect(page.getByRole('gridcell', { name: /flagged cell/i }).first()).toBeVisible();
});

test('changes difficulty and renders the expert board', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Difficulty').selectOption('expert');

  await expect(page.getByText('099')).toBeVisible();
  await expect(page.getByRole('grid', { name: /expert minesweeper board/i })).toBeVisible();
  await expect(page.getByRole('gridcell', { name: /covered cell/i })).toHaveCount(480);
});

test('renders usable mobile layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Minesweeper' })).toBeVisible();
  await expect(page.getByRole('button', { name: /new game/i })).toBeVisible();
  await expect(page.getByRole('grid')).toBeVisible();
});
