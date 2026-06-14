import { describe, expect, it } from 'vitest';
import { DIFFICULTY_PRESETS } from './presets';
import { armBoard, chordCell, createInitialGame, getNeighborCoordinates, revealCell, toggleFlag } from './engine';

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

describe('game engine actions', () => {
  it('reveals the first clicked safe area and starts play', () => {
    const game = createInitialGame(DIFFICULTY_PRESETS.easy);
    const next = revealCell(game, { row: 4, col: 4 }, () => 0);

    expect(next.status).toBe('playing');
    expect(next.isArmed).toBe(true);
    expect(next.board[4][4].isRevealed).toBe(true);
    expect(next.board[4][4].hasMine).toBe(false);
    expect(next.revealedCount).toBeGreaterThan(0);
  });

  it('toggles flags on covered cells and leaves revealed cells unchanged', () => {
    const game = createInitialGame(DIFFICULTY_PRESETS.easy);
    const flagged = toggleFlag(game, { row: 0, col: 0 });
    const unflagged = toggleFlag(flagged, { row: 0, col: 0 });
    const revealed = revealCell(game, { row: 4, col: 4 }, () => 0);
    const unchanged = toggleFlag(revealed, { row: 4, col: 4 });

    expect(flagged.board[0][0].isFlagged).toBe(true);
    expect(flagged.flaggedCount).toBe(1);
    expect(unflagged.board[0][0].isFlagged).toBe(false);
    expect(unflagged.flaggedCount).toBe(0);
    expect(unchanged.board[4][4].isFlagged).toBe(false);
  });

  it('loses and reveals mines when a mine is revealed', () => {
    const game = createInitialGame({ id: 'custom', label: 'Custom', width: 5, height: 5, mines: 1, isCustom: true });
    const armed = armBoard(game, { row: 2, col: 2 }, () => 0);
    const mine = armed.board.flat().find((cell) => cell.hasMine);
    const lost = revealCell(armed, { row: mine!.row, col: mine!.col });

    expect(lost.status).toBe('lost');
    expect(lost.board[mine!.row][mine!.col].isExploded).toBe(true);
    expect(lost.board.flat().filter((cell) => cell.hasMine).every((cell) => cell.isRevealed)).toBe(true);
  });

  it('wins when every safe cell is revealed', () => {
    let game = createInitialGame({ id: 'custom', label: 'Custom', width: 5, height: 5, mines: 1, isCustom: true });
    game = armBoard(game, { row: 2, col: 2 }, () => 0);

    for (const cell of game.board.flat()) {
      if (!cell.hasMine) {
        game = revealCell(game, { row: cell.row, col: cell.col });
      }
    }

    expect(game.status).toBe('won');
  });

  it('chords a revealed number when adjacent flags match its number', () => {
    let game = createInitialGame({ id: 'custom', label: 'Custom', width: 5, height: 5, mines: 1, isCustom: true });
    game = armBoard(game, { row: 2, col: 2 }, () => 0);
    const mine = game.board.flat().find((cell) => cell.hasMine)!;
    const numbered = getNeighborCoordinates(mine.row, mine.col, 5, 5).find((coordinate) => !game.board[coordinate.row][coordinate.col].hasMine)!;
    game = revealCell(game, numbered);
    game = toggleFlag(game, { row: mine.row, col: mine.col });

    const chorded = chordCell(game, numbered);

    expect(chorded.revealedCount).toBeGreaterThan(game.revealedCount);
  });
});
