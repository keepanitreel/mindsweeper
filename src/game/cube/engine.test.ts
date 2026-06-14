import { describe, expect, it } from 'vitest';
import { CUBE_PRESETS } from './presets';
import { armCubeBoard, chordCubeCell, createInitialCubeGame, revealCubeCell, toggleCubeFlag } from './engine';
import { coordinateKey, getSurfaceNeighbors } from './geometry';
import type { CubeCell, CubeCoordinate, CubeGameState } from './types';

describe('cube engine setup', () => {
  it('creates an unarmed surface-only board for every face', () => {
    const game = createInitialCubeGame(CUBE_PRESETS.starter);

    expect(game.status).toBe('ready');
    expect(game.isArmed).toBe(false);
    expect(Object.keys(game.board)).toHaveLength(6);
    expect(game.board.front).toHaveLength(1);
    expect(game.board.front[0]).toHaveLength(4);
    expect(game.board.front[0][0]).toHaveLength(4);
    expect(game.board.front[0][0][0]).toMatchObject({ face: 'front', row: 0, col: 0, depth: 0, hasMine: false });
  });

  it('arms the cube without placing mines in the first-click safe zone', () => {
    const game = createInitialCubeGame(CUBE_PRESETS.starter);
    const firstClick = { face: 'front' as const, row: 1, col: 1, depth: 0 };
    const armed = armCubeBoard(game, firstClick, () => 0);
    const allCells = Object.values(armed.board).flat(3);
    const safeCoordinates = [
      firstClick,
      ...getSurfaceNeighbors(firstClick, CUBE_PRESETS.starter.size),
    ];

    expect(armed.isArmed).toBe(true);
    expect(allCells.filter((cell) => cell.hasMine)).toHaveLength(24);
    expect(safeCoordinates.every((coordinate) => !armed.board[coordinate.face][coordinate.depth][coordinate.row][coordinate.col].hasMine)).toBe(true);
  });

  it('protects adjacent-face surface neighbors for an edge first click', () => {
    const game = createInitialCubeGame(CUBE_PRESETS.starter);
    const firstClick = { face: 'front' as const, row: 1, col: 3, depth: 0 };
    const adjacentFaceNeighbor = { face: 'right' as const, row: 1, col: 0, depth: 0 };
    const armed = armCubeBoard(game, firstClick, () => 0);
    const safeCoordinates = [
      firstClick,
      ...getSurfaceNeighbors(firstClick, CUBE_PRESETS.starter.size),
    ];

    expect(getSurfaceNeighbors(firstClick, CUBE_PRESETS.starter.size)).toContainEqual(adjacentFaceNeighbor);
    expect(cellAt(armed, adjacentFaceNeighbor).hasMine).toBe(false);
    expect(safeCoordinates.every((coordinate) => !cellAt(armed, coordinate).hasMine)).toBe(true);
  });

  it('calculates exact surface numbers for known mines', () => {
    const game = createInitialCubeGame({ id: 'starter', label: 'Starter Cube', size: 4, mines: 1 });
    const firstClick = { face: 'front' as const, row: 1, col: 1, depth: 0 };
    const surfaceMine: CubeCoordinate = { face: 'front', row: 1, col: 3, depth: 0 };
    const armed = armCubeBoard(game, firstClick, randomForMineTargets(game, firstClick, [surfaceMine]));
    const expectedSurfaceNeighborMines = new Map(
      [
        { face: 'front' as const, row: 0, col: 2, depth: 0 },
        { face: 'front' as const, row: 0, col: 3, depth: 0 },
        { face: 'front' as const, row: 1, col: 2, depth: 0 },
        { face: 'right' as const, row: 1, col: 0, depth: 0 },
        { face: 'front' as const, row: 2, col: 2, depth: 0 },
        { face: 'front' as const, row: 2, col: 3, depth: 0 },
      ].map((coordinate) => [coordinateKey(coordinate), 1]),
    );

    expect(getAllCells(armed).filter((cell) => cell.hasMine)).toHaveLength(1);
    expect(cellAt(armed, surfaceMine).hasMine).toBe(true);

    getSurfaceCells(armed).forEach((cell) => {
      const key = coordinateKey(cell);

      expect(cell.surfaceNeighborMines, `${key} surface clue`).toBe(expectedSurfaceNeighborMines.get(key) ?? 0);
    });
  });

  it('arms a cloned board without mutating the original unarmed board', () => {
    const game = createInitialCubeGame(CUBE_PRESETS.starter);
    const armed = armCubeBoard(game, { face: 'front', row: 1, col: 1, depth: 0 }, () => 0);

    expect(armed.board).not.toBe(game.board);
    expect(getAllCells(armed).filter((cell) => cell.hasMine)).toHaveLength(24);
    expect(getAllCells(game).every((cell) => !cell.hasMine && cell.surfaceNeighborMines === 0)).toBe(true);
  });
});

describe('cube engine actions', () => {
  it('ignores an invalid fresh reveal without arming', () => {
    const game = createInitialCubeGame(CUBE_PRESETS.starter);
    const next = revealCubeCell(game, { face: 'front', row: 99, col: 1, depth: 0 }, () => 0);

    expect(next).toBe(game);
    expect(next.status).toBe('ready');
    expect(next.isArmed).toBe(false);
  });

  it('ignores a flagged fresh reveal without arming', () => {
    const game = createInitialCubeGame(CUBE_PRESETS.starter);
    const coordinate = { face: 'front' as const, row: 0, col: 0, depth: 0 };
    const flagged = toggleCubeFlag(game, coordinate);
    const next = revealCubeCell(flagged, coordinate, () => 0);

    expect(next).toBe(flagged);
    expect(next.status).toBe('ready');
    expect(next.isArmed).toBe(false);
    expect(next.board.front[0][0][0].isFlagged).toBe(true);
    expect(next.flaggedCount).toBe(1);
  });

  it('reveals a first surface cell and starts play', () => {
    const game = createInitialCubeGame(CUBE_PRESETS.starter);
    const next = revealCubeCell(game, { face: 'front', row: 1, col: 1, depth: 0 }, () => 0);

    expect(next.status).toBe('playing');
    expect(next.isArmed).toBe(true);
    expect(next.board.front[0][1][1].isRevealed).toBe(true);
    expect(next.revealedCount).toBeGreaterThan(0);
  });

  it('toggles flags on covered surface cells', () => {
    const game = createInitialCubeGame(CUBE_PRESETS.starter);
    const flaggedSurface = toggleCubeFlag(game, { face: 'front', row: 0, col: 0, depth: 0 });

    expect(flaggedSurface.board.front[0][0][0].isFlagged).toBe(true);
    expect(flaggedSurface.flaggedCount).toBe(1);
  });

  it('loses and reveals mines when a mine is revealed', () => {
    const game = createInitialCubeGame({ id: 'starter', label: 'Starter Cube', size: 4, mines: 1 });
    const armed = armCubeBoard(game, { face: 'front', row: 1, col: 1, depth: 0 }, () => 0);
    const mine = Object.values(armed.board).flat(3).find((cell) => cell.hasMine)!;
    const lost = revealCubeCell(armed, mine);

    expect(lost.status).toBe('lost');
    expect(lost.board[mine.face][mine.depth][mine.row][mine.col].isExploded).toBe(true);
    expect(
      Object.values(lost.board)
        .flat(3)
        .filter((cell) => cell.hasMine)
        .every((cell) => cell.isRevealed),
    ).toBe(true);
  });

  it('wins when every safe cube cell is revealed', () => {
    let game = createInitialCubeGame({ id: 'starter', label: 'Starter Cube', size: 3, mines: 1 });
    game = armCubeBoard(game, { face: 'front', row: 1, col: 1, depth: 0 }, () => 0);

    for (const cell of Object.values(game.board).flat(3)) {
      if (!cell.hasMine) {
        game = revealCubeCell(game, cell);
      }
    }

    expect(game.status).toBe('won');
  });

  it('surface-chords revealed cells when adjacent surface flags match the surface number', () => {
    let game = createInitialCubeGame({ id: 'starter', label: 'Starter Cube', size: 4, mines: 1 });
    game = armCubeBoard(game, { face: 'front', row: 1, col: 1, depth: 0 }, () => 0);
    const mine = Object.values(game.board)
      .flat(3)
      .find((cell) => cell.hasMine && cell.depth === 0)!;
    const numbered = getSurfaceNeighbors(mine, 4).find((coordinate) => !game.board[coordinate.face][0][coordinate.row][coordinate.col].hasMine)!;

    game = revealCubeCell(game, numbered);
    game = toggleCubeFlag(game, mine);

    const chorded = chordCubeCell(game, numbered);

    expect(chorded.revealedCount).toBeGreaterThan(game.revealedCount);
  });
});

function cellAt(game: CubeGameState, coordinate: CubeCoordinate): CubeCell {
  return game.board[coordinate.face][coordinate.depth][coordinate.row][coordinate.col];
}

function getAllCells(game: CubeGameState): CubeCell[] {
  return Object.values(game.board).flatMap((layers) => layers.flatMap((rows) => rows.flat()));
}

function getSurfaceCells(game: CubeGameState): CubeCell[] {
  return Object.values(game.board).flatMap((layers) => layers[0].flat());
}

function randomForMineTargets(game: CubeGameState, firstClick: CubeCoordinate, targets: CubeCoordinate[]): () => number {
  const safeKeys = new Set([
    coordinateKey(firstClick),
    ...getSurfaceNeighbors(firstClick, game.preset.size).map(coordinateKey),
  ]);
  const candidates = getAllCells(game).filter((cell) => !safeKeys.has(coordinateKey(cell)));
  const targetIndexes = targets.map((target) => candidates.findIndex((cell) => coordinateKey(cell) === coordinateKey(target)));

  expect(targetIndexes.every((index) => index >= 0)).toBe(true);
  expect(targetIndexes).toEqual([...targetIndexes].sort((left, right) => right - left));

  let currentIndex = candidates.length - 1;

  return () => {
    const index = currentIndex;
    currentIndex -= 1;

    const targetSlot = targetIndexes.indexOf(index);
    const swapIndex = targetSlot === -1 ? index : targetSlot;

    return swapIndex / (index + 1);
  };
}
