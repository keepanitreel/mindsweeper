import type { CubeCoordinate, CubeFace, CubeSurfaceCoordinate } from './types';

export const CUBE_FACES = ['front', 'right', 'back', 'left', 'top', 'bottom'] as const satisfies readonly CubeFace[];

type Edge = 'top' | 'right' | 'bottom' | 'left';
type EdgeMapper = (index: number, size: number) => CubeCoordinate;

const edgeTransitions: Record<CubeFace, Record<Edge, EdgeMapper>> = {
  front: {
    top: (col, size) => ({ face: 'top', row: size - 1, col, depth: 0 }),
    right: (row) => ({ face: 'right', row, col: 0, depth: 0 }),
    bottom: (col) => ({ face: 'bottom', row: 0, col, depth: 0 }),
    left: (row, size) => ({ face: 'left', row, col: size - 1, depth: 0 }),
  },
  right: {
    top: (col, size) => ({ face: 'top', row: size - 1 - col, col: size - 1, depth: 0 }),
    right: (row) => ({ face: 'back', row, col: 0, depth: 0 }),
    bottom: (col, size) => ({ face: 'bottom', row: col, col: size - 1, depth: 0 }),
    left: (row, size) => ({ face: 'front', row, col: size - 1, depth: 0 }),
  },
  back: {
    top: (col, size) => ({ face: 'top', row: 0, col: size - 1 - col, depth: 0 }),
    right: (row) => ({ face: 'left', row, col: 0, depth: 0 }),
    bottom: (col, size) => ({ face: 'bottom', row: size - 1, col: size - 1 - col, depth: 0 }),
    left: (row, size) => ({ face: 'right', row, col: size - 1, depth: 0 }),
  },
  left: {
    top: (col) => ({ face: 'top', row: col, col: 0, depth: 0 }),
    right: (row) => ({ face: 'front', row, col: 0, depth: 0 }),
    bottom: (col, size) => ({ face: 'bottom', row: size - 1 - col, col: 0, depth: 0 }),
    left: (row, size) => ({ face: 'back', row, col: size - 1, depth: 0 }),
  },
  top: {
    top: (col, size) => ({ face: 'back', row: 0, col: size - 1 - col, depth: 0 }),
    right: (row, size) => ({ face: 'right', row: 0, col: size - 1 - row, depth: 0 }),
    bottom: (col) => ({ face: 'front', row: 0, col, depth: 0 }),
    left: (row) => ({ face: 'left', row: 0, col: row, depth: 0 }),
  },
  bottom: {
    top: (col, size) => ({ face: 'front', row: size - 1, col, depth: 0 }),
    right: (row, size) => ({ face: 'right', row: size - 1, col: row, depth: 0 }),
    bottom: (col, size) => ({ face: 'back', row: size - 1, col: size - 1 - col, depth: 0 }),
    left: (row, size) => ({ face: 'left', row: size - 1, col: size - 1 - row, depth: 0 }),
  },
};

export function getSurfaceNeighbors(coordinate: CubeSurfaceCoordinate, size: number): CubeCoordinate[] {
  const neighbors: CubeCoordinate[] = [];
  const seen = new Set<string>();

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
      if (rowOffset === 0 && colOffset === 0) {
        continue;
      }

      const mapped = mapSurfaceNeighbor(coordinate, rowOffset, colOffset, size);
      if (!mapped) {
        continue;
      }

      const key = coordinateKey(mapped);
      if (!seen.has(key)) {
        seen.add(key);
        neighbors.push(mapped);
      }
    }
  }

  return neighbors;
}

export function coordinateKey(coordinate: CubeCoordinate): string {
  return `${coordinate.face}:${coordinate.row}:${coordinate.col}:${coordinate.depth}`;
}

function mapSurfaceNeighbor(coordinate: CubeSurfaceCoordinate, rowOffset: number, colOffset: number, size: number): CubeCoordinate | null {
  const row = coordinate.row + rowOffset;
  const col = coordinate.col + colOffset;
  const rowOutside = row < 0 || row >= size;
  const colOutside = col < 0 || col >= size;

  if (!rowOutside && !colOutside) {
    return { face: coordinate.face, row, col, depth: 0 };
  }

  if (rowOutside && colOutside) {
    return null;
  }

  // Cube Mode V1 allows diagonals only within a face; crossing faces is orthogonal-only.
  if (rowOffset !== 0 && colOffset !== 0) {
    return null;
  }

  if (rowOutside) {
    const edge: Edge = row < 0 ? 'top' : 'bottom';
    return edgeTransitions[coordinate.face][edge](col, size);
  }

  const edge: Edge = col < 0 ? 'left' : 'right';
  return edgeTransitions[coordinate.face][edge](row, size);
}
