import { describe, expect, it } from 'vitest';
import { DIFFICULTY_PRESETS } from './presets';
import { createInitialGame, getNeighborCoordinates, armBoard } from './engine';

describe('game engine board setup', () => {
  it('creates an unarmed hidden board for the selected difficulty', () => {
    const game = createInitialGame(DIFFICULTY_PRESETS.easy);

    expect(game.status).toBe('ready');
    expect(game.isArmed).toBe(false);
    expect(game.board).toHaveLength(9);
    expect(game.board[0]).toHaveLength(9);
    expect(game.board.flat().every((cell) => !cell.hasMine && !cell.isRevealed && !cell.isFlagged)).toBe(true);
  });

  it('returns all valid neighboring coordinates around a cell', () => {
    expect(getNeighborCoordinates(0, 0, 3, 3)).toEqual([
      { row: 0, col: 1 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
    ]);

    expect(getNeighborCoordinates(1, 1, 3, 3)).toHaveLength(8);
  });

  it('arms the board without placing mines on the first click safe zone', () => {
    const game = createInitialGame(DIFFICULTY_PRESETS.easy);
    const armed = armBoard(game, { row: 4, col: 4 }, () => 0);
    const mines = armed.board.flat().filter((cell) => cell.hasMine);
    const forbidden = [{ row: 4, col: 4 }, ...getNeighborCoordinates(4, 4, 9, 9)];

    expect(armed.isArmed).toBe(true);
    expect(mines).toHaveLength(10);
    expect(forbidden.every((coordinate) => !armed.board[coordinate.row][coordinate.col].hasMine)).toBe(true);
    expect(armed.board.flat().some((cell) => cell.neighborMines > 0)).toBe(true);
  });
});
