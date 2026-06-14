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

export function cloneCubeBoard(board: CubeBoard): CubeBoard {
  return CUBE_FACES.reduce((next, face) => {
    next[face] = board[face].map((layer) => layer.map((row) => row.map((cell) => ({ ...cell }))));
    return next;
  }, {} as Record<CubeFace, CubeCell[][][]>);
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
