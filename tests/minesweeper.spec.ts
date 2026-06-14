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

test('makes the classic playing field the dominant desktop region', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');

  const boardRegion = page.locator('.board-wrap');
  const boardBox = await boardRegion.boundingBox();
  const controlBox = await page.locator('.control-strip').boundingBox();
  const hudBox = await page.locator('.hud').boundingBox();
  const subHudBox = await page.locator('.sub-hud').boundingBox();

  expect(boardBox).not.toBeNull();
  expect(controlBox).not.toBeNull();
  expect(hudBox).not.toBeNull();
  expect(subHudBox).not.toBeNull();

  const chromeHeight = controlBox!.height + hudBox!.height + subHudBox!.height;
  expect(boardBox!.height).toBeGreaterThan(720 * 0.64);
  expect(boardBox!.height).toBeGreaterThan(chromeHeight * 2);
});

test('undoes the move that hit a mine', async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
  await page.goto('/');

  await page.getByRole('gridcell', { name: /covered cell row 5 column 5/i }).click();
  await page.getByRole('gridcell', { name: /covered cell row 1 column 2/i }).click();

  await expect(page.getByText('Game over')).toBeVisible();
  await expect(page.getByRole('gridcell', { name: /mine cell row 1 column 2/i })).toBeVisible();

  await page.getByRole('button', { name: /undo last move/i }).click();

  await expect(page.getByText('Playing')).toBeVisible();
  await expect(page.getByText('Game over')).toBeHidden();
  await expect(page.getByRole('gridcell', { name: /covered cell row 1 column 2/i })).toBeVisible();
});

test('selects Cube Mode and performs a basic cube interaction', async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
  await page.goto('/');

  await page.getByRole('button', { name: /cube mode/i }).click();

  await expect(page.getByRole('heading', { name: 'Cube Mode' })).toBeVisible();
  await expect(page.getByLabel('Cube difficulty')).toHaveValue('starter');
  await expect(page.getByRole('button', { name: /rotate left/i })).toBeVisible();

  const cube = page.locator('.cube');
  const initialCubeTransform = await cube.evaluate((element) => getComputedStyle(element).transform);
  await page.getByRole('button', { name: /rotate left/i }).click();
  await expect.poll(async () => cube.evaluate((element) => getComputedStyle(element).transform)).not.toBe(initialCubeTransform);
  await page.getByRole('gridcell', { name: /covered cube cell right row 2 column 2 surface/i }).click();

  await expect(page.getByText('Playing')).toBeVisible();

  await page.getByRole('button', { name: /flag mode/i }).click();
  await page.getByRole('button', { name: /rotate right/i }).click();
  await page.getByRole('gridcell', { name: /covered cube cell front row 3 column 1 surface/i }).click();

  await expect(page.getByRole('gridcell', { name: /flagged cube cell/i }).first()).toBeVisible();
});

test('opens a Cube Mode depth stack after revealing a depth-marked surface cell', async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
  await page.goto('/');

  await page.getByRole('button', { name: /cube mode/i }).click();
  await page.getByRole('gridcell', { name: /covered cube cell front row 2 column 2 surface/i }).click();

  const revealedDepthCell = page
    .getByRole('gridcell', { name: /revealed cube cell .* depth mines/i })
    .filter({ hasText: /[1-3]/ })
    .first();
  await revealedDepthCell.click();

  await expect(page.getByLabel(/depth stack for/i)).toBeVisible();
});
