import { describe, expect, it } from 'vitest';
import { CUBE_PRESETS } from './presets';
import { armCubeBoard, createInitialCubeGame } from './engine';
import { coordinateKey, getDepthStackCoordinates, getSurfaceNeighbors } from './geometry';
import type { CubeCell, CubeCoordinate, CubeGameState } from './types';

describe('cube engine setup', () => {
  it('creates an unarmed board for every face and depth layer', () => {
    const game = createInitialCubeGame(CUBE_PRESETS.starter);

    expect(game.status).toBe('ready');
    expect(game.isArmed).toBe(false);
    expect(Object.keys(game.board)).toHaveLength(6);
    expect(game.board.front).toHaveLength(3);
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
      ...getDepthStackCoordinates(firstClick, CUBE_PRESETS.starter.hiddenDepth),
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
      ...getDepthStackCoordinates(firstClick, CUBE_PRESETS.starter.hiddenDepth),
    ];

    expect(getSurfaceNeighbors(firstClick, CUBE_PRESETS.starter.size)).toContainEqual(adjacentFaceNeighbor);
    expect(cellAt(armed, adjacentFaceNeighbor).hasMine).toBe(false);
    expect(safeCoordinates.every((coordinate) => !cellAt(armed, coordinate).hasMine)).toBe(true);
  });

  it('calculates exact surface numbers and depth markers for known mines', () => {
    const game = createInitialCubeGame({ id: 'starter', label: 'Starter Cube', size: 4, hiddenDepth: 2, mines: 2 });
    const firstClick = { face: 'front' as const, row: 1, col: 1, depth: 0 };
    const hiddenMine: CubeCoordinate = { face: 'front', row: 3, col: 3, depth: 1 };
    const surfaceMine: CubeCoordinate = { face: 'front', row: 1, col: 3, depth: 0 };
    const armed = armCubeBoard(game, firstClick, randomForMineTargets(game, firstClick, [hiddenMine, surfaceMine]));
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

    expect(getAllCells(armed).filter((cell) => cell.hasMine)).toHaveLength(2);
    expect(cellAt(armed, hiddenMine).hasMine).toBe(true);
    expect(cellAt(armed, surfaceMine).hasMine).toBe(true);

    getSurfaceCells(armed).forEach((cell) => {
      const key = coordinateKey(cell);

      expect(cell.surfaceNeighborMines, `${key} surface clue`).toBe(expectedSurfaceNeighborMines.get(key) ?? 0);
      expect(cell.depthMineCount, `${key} depth clue`).toBe(key === coordinateKey({ face: 'front', row: 3, col: 3, depth: 0 }) ? 1 : 0);
    });
  });

  it('arms a cloned board without mutating the original unarmed board', () => {
    const game = createInitialCubeGame(CUBE_PRESETS.starter);
    const armed = armCubeBoard(game, { face: 'front', row: 1, col: 1, depth: 0 }, () => 0);

    expect(armed.board).not.toBe(game.board);
    expect(getAllCells(armed).filter((cell) => cell.hasMine)).toHaveLength(24);
    expect(getAllCells(game).every((cell) => !cell.hasMine && cell.surfaceNeighborMines === 0 && cell.depthMineCount === 0)).toBe(true);
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
    ...getDepthStackCoordinates(firstClick, game.preset.hiddenDepth).map(coordinateKey),
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
