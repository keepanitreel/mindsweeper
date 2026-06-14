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

export function revealCell(game: GameState, coordinate: Coordinate, random: RandomSource = Math.random): GameState {
  if (game.status === 'won' || game.status === 'lost') {
    return game;
  }

  const armed = game.isArmed ? game : armBoard(game, coordinate, random);
  const target = armed.board[coordinate.row]?.[coordinate.col];

  if (!target || target.isFlagged || target.isRevealed) {
    return armed;
  }

  if (target.hasMine) {
    return revealLoss(armed, coordinate);
  }

  const board = cloneBoard(armed.board);
  revealSafeCells(board, coordinate, armed.difficulty.width, armed.difficulty.height);
  const revealedCount = countRevealed(board);
  const status = revealedCount === armed.difficulty.width * armed.difficulty.height - armed.difficulty.mines ? 'won' : 'playing';

  return {
    ...armed,
    board,
    status,
    revealedCount,
    flaggedCount: countFlags(board),
  };
}

export function toggleFlag(game: GameState, coordinate: Coordinate): GameState {
  if (game.status === 'won' || game.status === 'lost') {
    return game;
  }

  const target = game.board[coordinate.row]?.[coordinate.col];
  if (!target || target.isRevealed) {
    return game;
  }

  const board = cloneBoard(game.board);
  board[coordinate.row][coordinate.col] = {
    ...board[coordinate.row][coordinate.col],
    isFlagged: !board[coordinate.row][coordinate.col].isFlagged,
  };

  return {
    ...game,
    board,
    flaggedCount: countFlags(board),
  };
}

export function chordCell(game: GameState, coordinate: Coordinate): GameState {
  if (game.status !== 'playing') {
    return game;
  }

  const target = game.board[coordinate.row]?.[coordinate.col];
  if (!target?.isRevealed || target.neighborMines === 0) {
    return game;
  }

  const neighbors = getNeighborCoordinates(coordinate.row, coordinate.col, game.difficulty.width, game.difficulty.height);
  const flagCount = neighbors.filter((neighbor) => game.board[neighbor.row][neighbor.col].isFlagged).length;
  if (flagCount !== target.neighborMines) {
    return game;
  }

  return neighbors.reduce((nextGame, neighbor) => {
    if (nextGame.status === 'lost') {
      return nextGame;
    }

    const cell = nextGame.board[neighbor.row][neighbor.col];
    if (cell.isRevealed || cell.isFlagged) {
      return nextGame;
    }

    return revealCell(nextGame, neighbor);
  }, game);
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

function revealSafeCells(board: Board, start: Coordinate, width: number, height: number): number {
  const queue = [start];
  const visited = new Set<string>();
  let revealed = 0;

  while (queue.length > 0) {
    const coordinate = queue.shift()!;
    const key = coordinateKey(coordinate);
    if (visited.has(key)) {
      continue;
    }

    visited.add(key);
    const cell = board[coordinate.row][coordinate.col];
    if (cell.isRevealed || cell.isFlagged || cell.hasMine) {
      continue;
    }

    board[coordinate.row][coordinate.col] = { ...cell, isRevealed: true };
    revealed += 1;

    if (cell.neighborMines === 0) {
      getNeighborCoordinates(cell.row, cell.col, width, height).forEach((neighbor) => queue.push(neighbor));
    }
  }

  return revealed;
}

function revealLoss(game: GameState, exploded: Coordinate): GameState {
  const board = cloneBoard(game.board);

  board.forEach((row) => {
    row.forEach((cell) => {
      if (cell.hasMine) {
        board[cell.row][cell.col] = {
          ...cell,
          isRevealed: true,
          isExploded: cell.row === exploded.row && cell.col === exploded.col,
        };
      } else if (cell.isFlagged) {
        board[cell.row][cell.col] = {
          ...cell,
          isIncorrectFlag: true,
        };
      }
    });
  });

  return {
    ...game,
    board,
    status: 'lost',
    revealedCount: countRevealed(board),
    flaggedCount: countFlags(board),
  };
}

function countRevealed(board: Board): number {
  return board.flat().filter((cell) => cell.isRevealed && !cell.hasMine).length;
}

function countFlags(board: Board): number {
  return board.flat().filter((cell) => cell.isFlagged).length;
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
