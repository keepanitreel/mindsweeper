import type { Board, Cell, Coordinate, Difficulty, GameState } from './types';

export type RandomSource = () => number;

export function createInitialGame(difficulty: Difficulty): GameState {
  return {
    difficulty,
    board: createEmptyBoard(difficulty.width, difficulty.height),
    status: 'ready',
    isArmed: false,
    revealedCount: 0,
    flaggedCount: 0,
  };
}

export function createEmptyBoard(width: number, height: number): Board {
  return Array.from({ length: height }, (_, row) =>
    Array.from({ length: width }, (_, col): Cell => ({
      id: `${row}-${col}`,
      row,
      col,
      hasMine: false,
      neighborMines: 0,
      isRevealed: false,
      isFlagged: false,
      isExploded: false,
      isIncorrectFlag: false,
    })),
  );
}

export function getNeighborCoordinates(row: number, col: number, width: number, height: number): Coordinate[] {
  const neighbors: Coordinate[] = [];

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
      if (rowOffset === 0 && colOffset === 0) {
        continue;
      }

      const nextRow = row + rowOffset;
      const nextCol = col + colOffset;
      if (nextRow >= 0 && nextRow < height && nextCol >= 0 && nextCol < width) {
        neighbors.push({ row: nextRow, col: nextCol });
      }
    }
  }

  return neighbors;
}

export function armBoard(game: GameState, firstClick: Coordinate, random: RandomSource = Math.random): GameState {
  if (game.isArmed) {
    return game;
  }

  const board = cloneBoard(game.board);
  const { width, height, mines } = game.difficulty;
  const safeKeys = new Set([
    coordinateKey(firstClick),
    ...getNeighborCoordinates(firstClick.row, firstClick.col, width, height).map(coordinateKey),
  ]);
  const candidates = board.flat().filter((cell) => !safeKeys.has(coordinateKey(cell)));
  const shuffled = shuffle(candidates, random);

  shuffled.slice(0, mines).forEach((cell) => {
    board[cell.row][cell.col] = { ...board[cell.row][cell.col], hasMine: true };
  });

  board.forEach((row) => {
    row.forEach((cell) => {
      board[cell.row][cell.col] = {
        ...board[cell.row][cell.col],
        neighborMines: getNeighborCoordinates(cell.row, cell.col, width, height).filter(
          (neighbor) => board[neighbor.row][neighbor.col].hasMine,
        ).length,
      };
    });
  });

  return {
    ...game,
    board,
    isArmed: true,
  };
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

function shuffle<T>(items: T[], random: RandomSource): T[] {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

function coordinateKey(coordinate: Coordinate): string {
  return `${coordinate.row}-${coordinate.col}`;
}
