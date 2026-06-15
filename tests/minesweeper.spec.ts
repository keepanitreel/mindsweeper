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
    Math.random = () => 0.05;
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
  const flaggedPick = await clickCanvasPick(page, canvas, { previousPick: revealedPick });

  await expect(page.getByRole('gridcell', { name: getFlaggedCanvasPickLabel(flaggedPick) })).toBeVisible();
});

test('keeps Cube Mode surface-only during play', async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0.05;
  });
  await page.goto('/');

  await page.getByRole('button', { name: /cube mode/i }).click();
  await clickDomCell(page.getByRole('gridcell', { name: /covered cube cell front row 2 column 2 surface/i }));

  await expect(page.getByLabel('Cube difficulty')).not.toContainText('Deep Cube');

  await expect(page.getByText(/^Depth /i)).toHaveCount(0);
  await expect(page.getByLabel(/depth stack/i)).toHaveCount(0);
  await expect(page.getByRole('gridcell', { name: /depth mines/i })).toHaveCount(0);
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
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /cube mode/i }).click();

  const canvas = page.getByLabel(/interactive cube board/i);
  const centerPick = await clickCanvasPick(page, canvas);
  await expect(page.getByRole('gridcell', { name: getRevealedCanvasPickLabel(centerPick) })).toBeVisible();

  const offCenterPick = await clickCanvasPick(page, canvas, { xFraction: 0.42, yFraction: 0.42, previousPick: centerPick });
  await expect(page.getByRole('gridcell', { name: getRevealedCanvasPickLabel(offCenterPick) })).toBeVisible();
});

test('uses canvas context menu to flag the picked Cube Mode coordinate', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /cube mode/i }).click();

  const canvas = page.getByLabel(/interactive cube board/i);
  const pick = await clickCanvasPick(page, canvas, { button: 'right' });
  await expect(page.getByRole('gridcell', { name: getFlaggedCanvasPickLabel(pick) })).toBeVisible();
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

interface CanvasPickOptions {
  xFraction?: number;
  yFraction?: number;
  button?: 'left' | 'right' | 'middle';
  previousPick?: string;
}

async function clickCanvasPick(page: Page, canvas: Locator, options: CanvasPickOptions = {}): Promise<string> {
  const { xFraction = 0.5, yFraction = 0.5, button = 'left', previousPick } = options;
  const pickPattern = /^(front|right|back|left|top|bottom):\d+:\d+$/;
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();

  await page.mouse.click(box!.x + box!.width * xFraction, box!.y + box!.height * yFraction, { button });

  let observedPick = '';
  await expect
    .poll(async () => {
      const pick = await canvas.getAttribute('data-last-pick');
      if (!pick || !pickPattern.test(pick) || (previousPick && pick === previousPick)) {
        return '';
      }

      observedPick = pick;
      return pick;
    })
    .toMatch(pickPattern);

  expect(observedPick).toMatch(pickPattern);
  if (previousPick) {
    expect(observedPick).not.toBe(previousPick);
  }

  return observedPick;
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
