import { expect, test, type Locator, type Page } from '@playwright/test';

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

  const stage = page.locator('.cube-stage');
  const initialRotationY = await stage.getAttribute('data-rotation-y');
  await page.getByRole('button', { name: /rotate left/i }).click();
  await expect.poll(() => stage.getAttribute('data-rotation-y')).not.toBe(initialRotationY);

  const canvas = page.getByLabel(/interactive cube board/i);
  const revealedPick = await clickCanvasPick(page, canvas);

  await expect(page.getByText('Playing')).toBeVisible();
  await expect(page.getByRole('gridcell', { name: getRevealedCanvasPickLabel(revealedPick) })).toBeVisible();

  await page.getByRole('button', { name: /flag mode/i }).click();
  await page.getByRole('button', { name: /rotate right/i }).click();
  const flaggedPick = await clickCanvasPick(page, canvas, revealedPick);

  await expect(page.getByRole('gridcell', { name: getFlaggedCanvasPickLabel(flaggedPick) })).toBeVisible();
});

test('opens a Cube Mode depth stack after revealing a depth-marked surface cell', async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
  await page.goto('/');

  await page.getByRole('button', { name: /cube mode/i }).click();
  await clickDomCell(page.getByRole('gridcell', { name: /covered cube cell front row 2 column 2 surface/i }));

  const revealedDepthCell = page
    .getByRole('gridcell', { name: /revealed cube cell .* depth mines/i })
    .filter({ hasText: /[1-3]/ })
    .first();
  await clickDomCell(revealedDepthCell);

  await expect(page.getByLabel(/depth stack for/i)).toBeVisible();
});

test('renders a nonblank Cube Mode canvas', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /cube mode/i }).click();

  const canvas = page.getByLabel(/interactive cube board/i);
  await expect(canvas).toBeVisible();

  await expect.poll(() => hasRenderedCanvasPixels(page, canvas)).toBe(true);
});

test('uses canvas raycasting to reveal the picked Cube Mode coordinate', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /cube mode/i }).click();

  const canvas = page.getByLabel(/interactive cube board/i);
  const pick = await clickCanvasPick(page, canvas);
  await expect(page.getByRole('gridcell', { name: getRevealedCanvasPickLabel(pick!) })).toBeVisible();
});

test('uses canvas raycasting to flag the picked Cube Mode coordinate', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /cube mode/i }).click();
  await page.getByRole('button', { name: /flag mode/i }).click();

  const canvas = page.getByLabel(/interactive cube board/i);
  const pick = await clickCanvasPick(page, canvas);
  await expect(page.getByRole('gridcell', { name: getFlaggedCanvasPickLabel(pick!) })).toBeVisible();
});

test('dragging the Cube Mode canvas rotates without revealing the drag-start cell', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /cube mode/i }).click();

  const canvas = page.getByLabel(/interactive cube board/i);
  const stage = page.locator('.cube-stage');
  const beforeX = await stage.getAttribute('data-rotation-x');
  const beforeY = await stage.getAttribute('data-rotation-y');
  const revealedBefore = await page.getByRole('gridcell', { name: /revealed cube cell/i }).count();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();

  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 + 120, box!.y + box!.height / 2 + 20, { steps: 5 });
  await page.mouse.up();

  await expect.poll(() => stage.getAttribute('data-rotation-y')).not.toBe(beforeY);
  expect(await stage.getAttribute('data-rotation-x')).not.toBeNull();
  expect(beforeX).not.toBeNull();
  await expect(page.getByRole('gridcell', { name: /revealed cube cell/i })).toHaveCount(revealedBefore);
});

function getRevealedCanvasPickLabel(pick: string): RegExp {
  const [face, row, col] = pick.split(':');
  return new RegExp(`revealed cube cell ${face} row ${Number(row) + 1} column ${Number(col) + 1} surface`, 'i');
}

function getFlaggedCanvasPickLabel(pick: string): RegExp {
  const [face, row, col] = pick.split(':');
  return new RegExp(`flagged cube cell ${face} row ${Number(row) + 1} column ${Number(col) + 1} surface`, 'i');
}

async function clickCanvasPick(page: Page, canvas: Locator, previousPick?: string): Promise<string> {
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();

  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);

  await expect.poll(() => canvas.getAttribute('data-last-pick')).toMatch(/^(front|right|back|left|top|bottom):\d+:\d+$/);
  const pick = await canvas.getAttribute('data-last-pick');
  expect(pick).toMatch(/^(front|right|back|left|top|bottom):\d+:\d+$/);
  if (previousPick) {
    expect(pick).not.toBe(previousPick);
  }

  return pick!;
}

async function clickDomCell(cell: Locator): Promise<void> {
  await cell.evaluate((element) => {
    (element as HTMLButtonElement).click();
  });
}

async function hasRenderedCanvasPixels(page: Page, canvas: Locator): Promise<boolean> {
  const screenshot = await canvas.screenshot();

  return page.evaluate(async (imageBase64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${imageBase64}`;
    await image.decode();

    const canvasElement = document.createElement('canvas');
    canvasElement.width = image.naturalWidth;
    canvasElement.height = image.naturalHeight;

    const context = canvasElement.getContext('2d');
    if (!context || canvasElement.width === 0 || canvasElement.height === 0) {
      return false;
    }

    context.drawImage(image, 0, 0);

    const samplePoints = [
      [0.1, 0.1],
      [0.2, 0.2],
      [0.35, 0.35],
      [0.5, 0.5],
      [0.65, 0.5],
      [0.5, 0.65],
      [0.8, 0.8],
      [0.9, 0.9],
    ];
    const colors = new Set<string>();

    for (const [x, y] of samplePoints) {
      const pixels = context.getImageData(Math.floor(canvasElement.width * x), Math.floor(canvasElement.height * y), 1, 1).data;
      colors.add(Array.from(pixels).join(','));
    }

    return colors.size > 1;
  }, screenshot.toString('base64'));
}
