import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { createInitialCubeGame, revealCubeCell } from './game/cube/engine';
import { getDepthStackCoordinates, getSurfaceNeighbors } from './game/cube/geometry';
import { CUBE_PRESETS } from './game/cube/presets';
import type { CubeCell, CubeCoordinate, CubeGameState } from './game/cube/types';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('Minesweeper app', () => {
  it('renders the Microsoft-style Classic Mode shell', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Minesweeper' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new game/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Difficulty')).toHaveValue('easy');
    expect(screen.getByText('Classic Mode')).toBeInTheDocument();
    expect(screen.getAllByRole('gridcell', { name: /covered cell/i })).toHaveLength(81);
  });

  it('renders one page-level main landmark', () => {
    render(<App />);

    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByRole('main')).toHaveClass('app-shell');
  });

  it('reveals and flags cells from the board', async () => {
    const user = userEvent.setup();
    render(<App />);

    const firstCell = screen.getAllByRole('gridcell', { name: /covered cell/i })[40];
    await user.click(firstCell);

    expect(screen.getByText(/playing/i)).toBeInTheDocument();

    const flagMode = screen.getByRole('button', { name: /flag mode/i });
    await user.click(flagMode);
    const coveredCell = screen.getAllByRole('gridcell', { name: /covered cell/i })[0];
    await user.click(coveredCell);

    expect(screen.getByRole('gridcell', { name: /flagged cell/i })).toBeInTheDocument();
  });

  it('changes to expert difficulty and creates a 480-cell board', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(screen.getByLabelText('Difficulty'), 'expert');

    expect(screen.getAllByRole('gridcell', { name: /covered cell/i })).toHaveLength(480);
    expect(screen.getByText('099')).toBeInTheDocument();
  });

  it('undoes the mine hit that ended the game', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('gridcell', { name: 'Covered cell row 5 column 5' }));
    await user.click(screen.getByRole('gridcell', { name: 'Covered cell row 1 column 2' }));

    expect(screen.getByText('Game over')).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: 'Mine cell row 1 column 2' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /undo last move/i }));

    expect(screen.queryByText('Game over')).not.toBeInTheDocument();
    expect(screen.getByText('Playing')).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: 'Covered cell row 1 column 2' })).toBeInTheDocument();
  });

  it('switches between Classic and Cube Mode shells', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByText('Classic Mode')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cube mode/i }));

    expect(screen.getByRole('heading', { name: 'Cube Mode' })).toBeInTheDocument();
    expect(screen.getAllByText('Starter Cube').length).toBeGreaterThan(0);
    expect(screen.queryByLabelText('Difficulty')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^classic$/i }));

    expect(screen.getByText('Classic Mode')).toBeInTheDocument();
    expect(screen.getAllByRole('gridcell', { name: /covered cell/i })).toHaveLength(81);
  });

  it('renders Cube Mode controls and cells', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /cube mode/i }));

    expect(screen.getByRole('heading', { name: 'Cube Mode' })).toBeInTheDocument();
    expect(screen.getByLabelText('Cube difficulty')).toHaveValue('starter');
    expect(screen.getByRole('button', { name: /rotate left/i })).toBeInTheDocument();
    expect(screen.getAllByRole('gridcell', { name: /covered cube cell/i }).length).toBeGreaterThan(0);
  });

  it('reveals and flags Cube Mode cells', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /cube mode/i }));
    await user.click(screen.getByRole('gridcell', { name: /covered cube cell front row 2 column 2 surface/i }));

    expect(screen.getByText('Playing')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /flag mode/i }));
    await user.click(screen.getAllByRole('gridcell', { name: /covered cube cell/i })[0]);

    expect(screen.getByRole('gridcell', { name: /flagged cube cell/i })).toBeInTheDocument();
  });

  it('does not start cube drag capture from cube cell buttons', async () => {
    const user = userEvent.setup();
    const setPointerCapture = vi.fn();
    const elementPrototype = Element.prototype as Partial<Pick<Element, 'setPointerCapture'>>;
    const originalSetPointerCapture = elementPrototype.setPointerCapture;
    elementPrototype.setPointerCapture = setPointerCapture;

    try {
      render(<App />);

      await user.click(screen.getByRole('button', { name: /cube mode/i }));
      const cell = screen.getByRole('gridcell', { name: /covered cube cell front row 2 column 2 surface/i });

      await user.pointer([{ keys: '[MouseLeft>]', target: cell }]);

      expect(setPointerCapture).not.toHaveBeenCalled();

      await user.pointer([{ keys: '[/MouseLeft]', target: cell }]);
      await user.click(cell);

      expect(screen.getByText('Playing')).toBeInTheDocument();
    } finally {
      if (originalSetPointerCapture) {
        elementPrototype.setPointerCapture = originalSetPointerCapture;
      } else {
        delete elementPrototype.setPointerCapture;
      }
    }
  });

  it('chords revealed Cube Mode surface numbers when matching surface mines are flagged', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(cubeTestRandom);
    const user = userEvent.setup();
    const modeledGame = createModeledCubeGameAfterFirstClick();
    const chordTarget = findChordTarget(modeledGame);
    const surfaceMines = getSurfaceNeighbors(chordTarget, modeledGame.preset.size)
      .map((coordinate) => modeledGame.board[coordinate.face][0][coordinate.row][coordinate.col])
      .filter((cell) => cell.hasMine);

    render(<App />);

    await user.click(screen.getByRole('button', { name: /cube mode/i }));
    await user.click(screen.getByRole('gridcell', { name: getCoveredCubeCoordinateLabel(firstCubeClick) }));
    await user.click(screen.getByRole('button', { name: /flag mode/i }));
    for (const mine of surfaceMines) {
      await user.click(screen.getByRole('gridcell', { name: getCubeCellLabel(mine) }));
    }
    await user.click(screen.getByRole('button', { name: /flag mode/i }));

    const revealedBefore = screen.getAllByRole('gridcell', { name: /revealed cube cell/i }).length;
    await user.click(screen.getByRole('gridcell', { name: getCubeCellLabel(chordTarget) }));

    expect(screen.getAllByRole('gridcell', { name: /revealed cube cell/i }).length).toBeGreaterThan(revealedBefore);
  });

  it('closes the Cube Mode depth stack after a terminal mine hit', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(cubeTestRandom);
    const user = userEvent.setup();
    const modeledGame = createModeledCubeGameAfterFirstClick();
    const stackSurface = findDepthStackSurface(modeledGame);
    const stackMine = getDepthStackCoordinates(stackSurface, modeledGame.preset.hiddenDepth)
      .map((coordinate) => modeledGame.board[coordinate.face][coordinate.depth][coordinate.row][coordinate.col])
      .find((cell) => cell.hasMine)!;

    render(<App />);

    await user.click(screen.getByRole('button', { name: /cube mode/i }));
    await user.click(screen.getByRole('gridcell', { name: getCoveredCubeCoordinateLabel(firstCubeClick) }));
    await user.click(screen.getByRole('gridcell', { name: getCubeCellLabel(stackSurface) }));

    expect(screen.getByLabelText(getDepthStackLabel(stackSurface))).toBeInTheDocument();

    await user.click(screen.getByRole('gridcell', { name: getCubeCellLabel(stackMine) }));

    expect(screen.getByText('Mine hit')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByLabelText(getDepthStackLabel(stackSurface))).not.toBeInTheDocument());
  });

  it('undoes the Cube Mode mine hit that ended the game', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(cubeTestRandom);
    const user = userEvent.setup();
    const modeledGame = createModeledCubeGameAfterFirstClick();
    const mine = getSurfaceCells(modeledGame).find((cell) => cell.hasMine)!;

    expect(mine).toBeDefined();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /cube mode/i }));
    await user.click(screen.getByRole('gridcell', { name: getCoveredCubeCoordinateLabel(firstCubeClick) }));
    await user.click(screen.getByRole('gridcell', { name: getCoveredCubeCoordinateLabel(mine) }));

    expect(screen.getByText('Game over')).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: getMineCubeCoordinateLabel(mine) })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /undo last cube move/i }));

    expect(screen.queryByText('Game over')).not.toBeInTheDocument();
    expect(screen.getByText('Playing')).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: getCoveredCubeCoordinateLabel(mine) })).toBeInTheDocument();
  });

  it('chords a revealed Cube Mode split clue when matching surface mines are flagged', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(cubeTestRandom);
    const user = userEvent.setup();
    const modeledGame = createModeledCubeGameAfterFirstClick();
    const chordTarget = findSplitChordTarget(modeledGame);
    const surfaceMines = getSurfaceNeighbors(chordTarget, modeledGame.preset.size)
      .map((coordinate) => modeledGame.board[coordinate.face][0][coordinate.row][coordinate.col])
      .filter((cell) => cell.hasMine);

    render(<App />);

    await user.click(screen.getByRole('button', { name: /cube mode/i }));
    await user.click(screen.getByRole('gridcell', { name: getCoveredCubeCoordinateLabel(firstCubeClick) }));
    await user.click(screen.getByRole('button', { name: /flag mode/i }));
    for (const mine of surfaceMines) {
      await user.click(screen.getByRole('gridcell', { name: getCubeCellLabel(mine) }));
    }
    await user.click(screen.getByRole('button', { name: /flag mode/i }));

    const revealedBefore = screen.getAllByRole('gridcell', { name: /revealed cube cell/i }).length;
    await user.click(screen.getByRole('gridcell', { name: getCubeCellLabel(chordTarget) }));

    expect(screen.getByLabelText(getDepthStackLabel(chordTarget))).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /chord surface/i }));

    expect(screen.getAllByRole('gridcell', { name: /revealed cube cell/i }).length).toBeGreaterThan(revealedBefore);
  });

  it('shows the Cube Mode depth peek when a cell receives keyboard focus', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(cubeTestRandom);
    const user = userEvent.setup();
    const modeledGame = createModeledCubeGameAfterFirstClick();
    const peekTarget = getSurfaceCells(modeledGame).find((cell) => cell.depthMineCount > 0)!;

    expect(peekTarget).toBeDefined();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /cube mode/i }));
    await user.click(screen.getByRole('gridcell', { name: getCoveredCubeCoordinateLabel(firstCubeClick) }));

    const peekButton = screen.getByRole('gridcell', { name: getCubeCellLabel(peekTarget) });
    fireEvent.focus(peekButton);

    expect(screen.getByText(`Depth ${peekTarget.depthMineCount}`)).toBeInTheDocument();

    fireEvent.blur(peekButton);

    expect(screen.queryByText(`Depth ${peekTarget.depthMineCount}`)).not.toBeInTheDocument();
  });

  it('does not reveal a Cube Mode cell after touch press-and-hold depth peek', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(cubeTestRandom);
    const user = userEvent.setup();
    const modeledGame = createModeledCubeGameAfterFirstClick();
    const peekTarget = findCoveredDepthPeekTarget(modeledGame);

    render(<App />);

    await user.click(screen.getByRole('button', { name: /cube mode/i }));
    await user.click(screen.getByRole('gridcell', { name: getCoveredCubeCoordinateLabel(firstCubeClick) }));

    vi.useFakeTimers();
    const peekButton = screen.getByRole('gridcell', { name: getCoveredCubeCoordinateLabel(peekTarget) });
    dispatchTouchPointerEvent(peekButton, 'pointerdown');
    act(() => {
      vi.advanceTimersByTime(451);
    });

    expect(screen.getByText(`Depth ${peekTarget.depthMineCount}`)).toBeInTheDocument();

    dispatchTouchPointerEvent(peekButton, 'pointerup');
    fireEvent.click(peekButton);

    expect(screen.queryByText(`Depth ${peekTarget.depthMineCount}`)).not.toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: getCoveredCubeCoordinateLabel(peekTarget) })).toBeInTheDocument();
  });

  it('does not flag a Cube Mode cell after touch press-and-hold depth peek context menu', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(cubeTestRandom);
    const user = userEvent.setup();
    const modeledGame = createModeledCubeGameAfterFirstClick();
    const peekTarget = findCoveredDepthPeekTarget(modeledGame);

    render(<App />);

    await user.click(screen.getByRole('button', { name: /cube mode/i }));
    await user.click(screen.getByRole('gridcell', { name: getCoveredCubeCoordinateLabel(firstCubeClick) }));

    vi.useFakeTimers();
    const peekButton = screen.getByRole('gridcell', { name: getCoveredCubeCoordinateLabel(peekTarget) });
    dispatchTouchPointerEvent(peekButton, 'pointerdown');
    act(() => {
      vi.advanceTimersByTime(451);
    });

    expect(screen.getByText(`Depth ${peekTarget.depthMineCount}`)).toBeInTheDocument();

    fireEvent.contextMenu(peekButton);
    dispatchTouchPointerEvent(peekButton, 'pointerup');

    expect(screen.queryByRole('gridcell', { name: /flagged cube cell/i })).not.toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: getCoveredCubeCoordinateLabel(peekTarget) })).toBeInTheDocument();
  });
});

const cubeTestRandom = 0.05;
const firstCubeClick: CubeCoordinate = { face: 'front', row: 1, col: 1, depth: 0 };

function createModeledCubeGameAfterFirstClick(): CubeGameState {
  return revealCubeCell(createInitialCubeGame(CUBE_PRESETS.starter), firstCubeClick, () => cubeTestRandom);
}

function findChordTarget(game: CubeGameState): CubeCell {
  const target = getSurfaceCells(game).find((cell) => cell.isRevealed && cell.surfaceNeighborMines > 0 && cell.depthMineCount === 0);

  expect(target).toBeDefined();
  return target!;
}

function findDepthStackSurface(game: CubeGameState): CubeCell {
  const target = getSurfaceCells(game).find(
    (cell) =>
      cell.isRevealed &&
      cell.depthMineCount > 0 &&
      getDepthStackCoordinates(cell, game.preset.hiddenDepth).some((coordinate) => game.board[coordinate.face][coordinate.depth][coordinate.row][coordinate.col].hasMine),
  );

  expect(target).toBeDefined();
  return target!;
}

function findSplitChordTarget(game: CubeGameState): CubeCell {
  const target = getSurfaceCells(game).find((cell) => cell.isRevealed && cell.surfaceNeighborMines > 0 && cell.depthMineCount > 0);

  expect(target).toBeDefined();
  return target!;
}

function findCoveredDepthPeekTarget(game: CubeGameState): CubeCell {
  const target = getSurfaceCells(game).find((cell) => !cell.isRevealed && cell.depthMineCount > 0);

  expect(target).toBeDefined();
  return target!;
}

function getSurfaceCells(game: CubeGameState): CubeCell[] {
  return Object.values(game.board).flatMap((layers) => layers[0].flat());
}

function getCubeCellLabel(cell: CubeCell): string {
  const layer = cell.depth === 0 ? 'surface' : `depth ${cell.depth}`;
  const base = `cube cell ${cell.face} row ${cell.row + 1} column ${cell.col + 1} ${layer}`;

  if (cell.isFlagged) {
    return `Flagged ${base}`;
  }

  if (!cell.isRevealed) {
    return `Covered ${base}`;
  }

  if (cell.hasMine) {
    return `Mine ${base}`;
  }

  return `Revealed ${base} with ${cell.surfaceNeighborMines} surface mines and ${cell.depthMineCount} depth mines`;
}

function getCoveredCubeCoordinateLabel(coordinate: CubeCoordinate): string {
  const layer = coordinate.depth === 0 ? 'surface' : `depth ${coordinate.depth}`;
  return `Covered cube cell ${coordinate.face} row ${coordinate.row + 1} column ${coordinate.col + 1} ${layer}`;
}

function getMineCubeCoordinateLabel(coordinate: CubeCoordinate): string {
  const layer = coordinate.depth === 0 ? 'surface' : `depth ${coordinate.depth}`;
  return `Mine cube cell ${coordinate.face} row ${coordinate.row + 1} column ${coordinate.col + 1} ${layer}`;
}

function getDepthStackLabel(surfaceCell: CubeCell): string {
  return `Depth stack for ${surfaceCell.face} row ${surfaceCell.row + 1} column ${surfaceCell.col + 1}`;
}

function dispatchTouchPointerEvent(target: Element, type: 'pointerdown' | 'pointerup') {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  Object.defineProperty(event, 'pointerType', { value: 'touch' });
  fireEvent(target, event);
}
