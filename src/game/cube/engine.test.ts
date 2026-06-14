import { describe, expect, it } from 'vitest';
import { CUBE_PRESETS } from './presets';
import { armCubeBoard, createInitialCubeGame } from './engine';
import { getDepthStackCoordinates, getSurfaceNeighbors } from './geometry';

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

  it('calculates surface numbers and depth markers on surface cells', () => {
    const game = createInitialCubeGame({ id: 'starter', label: 'Starter Cube', size: 4, hiddenDepth: 2, mines: 1 });
    const armed = armCubeBoard(game, { face: 'front', row: 1, col: 1, depth: 0 }, () => 0);
    const surfaceCells = Object.values(armed.board).flatMap((face) => face[0].flat());

    expect(surfaceCells.some((cell) => cell.surfaceNeighborMines > 0)).toBe(true);
    expect(surfaceCells.every((cell) => cell.depthMineCount >= 0 && cell.depthMineCount <= 2)).toBe(true);
  });
});
