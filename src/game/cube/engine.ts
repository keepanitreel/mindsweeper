import type { CubeBoard, CubeCell, CubeCoordinate, CubeFace, CubeGameState, CubePreset } from './types';
import { CUBE_FACES, coordinateKey, getDepthStackCoordinates, getSurfaceNeighbors } from './geometry';

export type RandomSource = () => number;

export function createInitialCubeGame(preset: CubePreset): CubeGameState {
  return {
    preset,
    board: createEmptyCubeBoard(preset),
    status: 'ready',
    isArmed: false,
    revealedCount: 0,
    flaggedCount: 0,
  };
}

export function createEmptyCubeBoard(preset: CubePreset): CubeBoard {
  return CUBE_FACES.reduce((board, face) => {
    board[face] = Array.from({ length: preset.hiddenDepth + 1 }, (_, depth) =>
      Array.from({ length: preset.size }, (_, row) =>
        Array.from({ length: preset.size }, (_, col): CubeCell => ({
          id: `${face}-${row}-${col}-${depth}`,
          face,
          row,
          col,
          depth,
          hasMine: false,
          surfaceNeighborMines: 0,
          depthMineCount: 0,
          isRevealed: false,
          isFlagged: false,
          isExploded: false,
          isIncorrectFlag: false,
        })),
      ),
    );
    return board;
  }, {} as Record<CubeFace, CubeCell[][][]>);
}

export function armCubeBoard(game: CubeGameState, firstClick: CubeCoordinate, random: RandomSource = Math.random): CubeGameState {
  if (game.isArmed) {
    return game;
  }

  const board = cloneCubeBoard(game.board);
  const safeKeys = new Set([
    coordinateKey(firstClick),
    ...getSurfaceNeighbors(firstClick, game.preset.size).map(coordinateKey),
    ...getDepthStackCoordinates(firstClick, game.preset.hiddenDepth).map(coordinateKey),
  ]);
  const candidates = getAllCubeCells(board).filter((cell) => !safeKeys.has(coordinateKey(cell)));
  const shuffled = shuffle(candidates, random);

  shuffled.slice(0, game.preset.mines).forEach((cell) => {
    board[cell.face][cell.depth][cell.row][cell.col] = { ...board[cell.face][cell.depth][cell.row][cell.col], hasMine: true };
  });

  calculateCubeClues(board, game.preset);

  return { ...game, board, isArmed: true };
}

export function revealCubeCell(game: CubeGameState, coordinate: CubeCoordinate, random: RandomSource = Math.random): CubeGameState {
  if (game.status === 'won' || game.status === 'lost') {
    return game;
  }

  const currentTarget = game.board[coordinate.face]?.[coordinate.depth]?.[coordinate.row]?.[coordinate.col];
  if (!currentTarget || currentTarget.isFlagged || currentTarget.isRevealed) {
    return game;
  }

  const armed = game.isArmed ? game : armCubeBoard(game, coordinate, random);
  const target = armed.board[coordinate.face]?.[coordinate.depth]?.[coordinate.row]?.[coordinate.col];

  if (!target || target.isFlagged || target.isRevealed) {
    return game;
  }

  if (target.hasMine) {
    return revealCubeLoss(armed, coordinate);
  }

  const board = cloneCubeBoard(armed.board);
  if (coordinate.depth === 0) {
    revealSurfaceSafeCells(board, coordinate, armed.preset);
  } else {
    board[coordinate.face][coordinate.depth][coordinate.row][coordinate.col] = { ...target, isRevealed: true };
  }

  return finalizeCubeProgress(armed, board);
}

export function toggleCubeFlag(game: CubeGameState, coordinate: CubeCoordinate): CubeGameState {
  if (game.status === 'won' || game.status === 'lost') {
    return game;
  }

  const target = game.board[coordinate.face]?.[coordinate.depth]?.[coordinate.row]?.[coordinate.col];
  if (!target || target.isRevealed) {
    return game;
  }

  const board = cloneCubeBoard(game.board);
  board[coordinate.face][coordinate.depth][coordinate.row][coordinate.col] = { ...target, isFlagged: !target.isFlagged };

  return { ...game, board, flaggedCount: countCubeFlags(board) };
}

export function chordCubeCell(game: CubeGameState, coordinate: CubeCoordinate): CubeGameState {
  if (!canChordCubeCell(game, coordinate)) {
    return game;
  }

  const target = game.board[coordinate.face]?.[0]?.[coordinate.row]?.[coordinate.col];
  const neighbors = getSurfaceNeighbors(target, game.preset.size);

  return neighbors.reduce((nextGame, neighbor) => {
    const cell = nextGame.board[neighbor.face][0][neighbor.row][neighbor.col];
    return cell.isRevealed || cell.isFlagged ? nextGame : revealCubeCell(nextGame, neighbor);
  }, game);
}

export function canChordCubeCell(game: CubeGameState, coordinate: CubeCoordinate): boolean {
  if (game.status !== 'playing' || coordinate.depth !== 0) {
    return false;
  }

  const target = game.board[coordinate.face]?.[0]?.[coordinate.row]?.[coordinate.col];
  if (!target?.isRevealed || target.surfaceNeighborMines === 0) {
    return false;
  }

  const neighbors = getSurfaceNeighbors(target, game.preset.size);
  const flagCount = neighbors.filter((neighbor) => game.board[neighbor.face][0][neighbor.row][neighbor.col].isFlagged).length;

  return flagCount === target.surfaceNeighborMines;
}

export function cloneCubeBoard(board: CubeBoard): CubeBoard {
  return CUBE_FACES.reduce((next, face) => {
    next[face] = board[face].map((layer) => layer.map((row) => row.map((cell) => ({ ...cell }))));
    return next;
  }, {} as Record<CubeFace, CubeCell[][][]>);
}

function revealSurfaceSafeCells(board: CubeBoard, start: CubeCoordinate, preset: CubePreset): void {
  const queue = [start];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const coordinate = queue.shift()!;
    const key = coordinateKey(coordinate);
    if (visited.has(key)) {
      continue;
    }

    visited.add(key);
    const cell = board[coordinate.face][0][coordinate.row][coordinate.col];
    if (cell.isRevealed || cell.isFlagged || cell.hasMine) {
      continue;
    }

    board[cell.face][0][cell.row][cell.col] = { ...cell, isRevealed: true };
    const revealedCell = board[cell.face][0][cell.row][cell.col];

    if (revealedCell.depthMineCount === 0) {
      revealSafeDepthStack(board, revealedCell, preset);
    }

    if (revealedCell.surfaceNeighborMines === 0 && revealedCell.depthMineCount === 0) {
      getSurfaceNeighbors(revealedCell, preset.size).forEach((neighbor) => queue.push(neighbor));
    }
  }
}

function revealSafeDepthStack(board: CubeBoard, surfaceCell: CubeCell, preset: CubePreset): void {
  getDepthStackCoordinates(surfaceCell, preset.hiddenDepth).forEach((coordinate) => {
    const cell = board[coordinate.face][coordinate.depth][coordinate.row][coordinate.col];
    if (!cell.hasMine && !cell.isFlagged) {
      board[cell.face][cell.depth][cell.row][cell.col] = { ...cell, isRevealed: true };
    }
  });
}

function revealCubeLoss(game: CubeGameState, exploded: CubeCoordinate): CubeGameState {
  const board = cloneCubeBoard(game.board);

  getAllCubeCells(board).forEach((cell) => {
    if (cell.hasMine) {
      board[cell.face][cell.depth][cell.row][cell.col] = {
        ...cell,
        isRevealed: true,
        isExploded: coordinateKey(cell) === coordinateKey(exploded),
      };
    } else if (cell.isFlagged) {
      board[cell.face][cell.depth][cell.row][cell.col] = { ...cell, isIncorrectFlag: true };
    }
  });

  return { ...game, board, status: 'lost', revealedCount: countCubeRevealed(board), flaggedCount: countCubeFlags(board) };
}

function finalizeCubeProgress(game: CubeGameState, board: CubeBoard): CubeGameState {
  const revealedCount = countCubeRevealed(board);
  const safeCells = getAllCubeCells(board).filter((cell) => !cell.hasMine).length;
  const status = revealedCount === safeCells ? 'won' : 'playing';

  return { ...game, board, status, revealedCount, flaggedCount: countCubeFlags(board) };
}

function countCubeRevealed(board: CubeBoard): number {
  return getAllCubeCells(board).filter((cell) => cell.isRevealed && !cell.hasMine).length;
}

function countCubeFlags(board: CubeBoard): number {
  return getAllCubeCells(board).filter((cell) => cell.isFlagged).length;
}

function calculateCubeClues(board: CubeBoard, preset: CubePreset): void {
  CUBE_FACES.forEach((face) => {
    board[face][0].forEach((row) => {
      row.forEach((cell) => {
        const surfaceNeighborMines = getSurfaceNeighbors(cell, preset.size).filter(
          (neighbor) => board[neighbor.face][0][neighbor.row][neighbor.col].hasMine,
        ).length;
        const depthMineCount = getDepthStackCoordinates(cell, preset.hiddenDepth).filter(
          (coordinate) => board[coordinate.face][coordinate.depth][coordinate.row][coordinate.col].hasMine,
        ).length;
        board[cell.face][0][cell.row][cell.col] = { ...cell, surfaceNeighborMines, depthMineCount };
      });
    });
  });
}

function getAllCubeCells(board: CubeBoard): CubeCell[] {
  return CUBE_FACES.flatMap((face) => board[face].flat(2));
}

function shuffle<T>(items: T[], random: RandomSource): T[] {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}
