import { describe, expect, it } from 'vitest';
import type { CubeCoordinate, CubeFace, CubeSurfaceCoordinate } from './types';
import { CUBE_FACES, coordinateKey, getSurfaceNeighbors } from './geometry';

type EdgeTransitionCase = {
  label: string;
  from: (index: number, size: number) => CubeSurfaceCoordinate;
  to: (index: number, size: number) => CubeCoordinate;
};

const edgeTransitionCases: EdgeTransitionCase[] = [
  {
    label: 'front top to top bottom edge',
    from: (col) => ({ face: 'front', row: 0, col }),
    to: (col, size) => ({ face: 'top', row: size - 1, col, depth: 0 }),
  },
  {
    label: 'front right to right left edge',
    from: (row, size) => ({ face: 'front', row, col: size - 1 }),
    to: (row) => ({ face: 'right', row, col: 0, depth: 0 }),
  },
  {
    label: 'front bottom to bottom top edge',
    from: (col, size) => ({ face: 'front', row: size - 1, col }),
    to: (col) => ({ face: 'bottom', row: 0, col, depth: 0 }),
  },
  {
    label: 'front left to left right edge',
    from: (row) => ({ face: 'front', row, col: 0 }),
    to: (row, size) => ({ face: 'left', row, col: size - 1, depth: 0 }),
  },
  {
    label: 'right top to top right edge',
    from: (col) => ({ face: 'right', row: 0, col }),
    to: (col, size) => ({ face: 'top', row: size - 1 - col, col: size - 1, depth: 0 }),
  },
  {
    label: 'right right to back left edge',
    from: (row, size) => ({ face: 'right', row, col: size - 1 }),
    to: (row) => ({ face: 'back', row, col: 0, depth: 0 }),
  },
  {
    label: 'right bottom to bottom right edge',
    from: (col, size) => ({ face: 'right', row: size - 1, col }),
    to: (col, size) => ({ face: 'bottom', row: col, col: size - 1, depth: 0 }),
  },
  {
    label: 'right left to front right edge',
    from: (row) => ({ face: 'right', row, col: 0 }),
    to: (row, size) => ({ face: 'front', row, col: size - 1, depth: 0 }),
  },
  {
    label: 'back top to top top edge',
    from: (col) => ({ face: 'back', row: 0, col }),
    to: (col, size) => ({ face: 'top', row: 0, col: size - 1 - col, depth: 0 }),
  },
  {
    label: 'back right to left left edge',
    from: (row, size) => ({ face: 'back', row, col: size - 1 }),
    to: (row) => ({ face: 'left', row, col: 0, depth: 0 }),
  },
  {
    label: 'back bottom to bottom bottom edge',
    from: (col, size) => ({ face: 'back', row: size - 1, col }),
    to: (col, size) => ({ face: 'bottom', row: size - 1, col: size - 1 - col, depth: 0 }),
  },
  {
    label: 'back left to right right edge',
    from: (row) => ({ face: 'back', row, col: 0 }),
    to: (row, size) => ({ face: 'right', row, col: size - 1, depth: 0 }),
  },
  {
    label: 'left top to top left edge',
    from: (col) => ({ face: 'left', row: 0, col }),
    to: (col) => ({ face: 'top', row: col, col: 0, depth: 0 }),
  },
  {
    label: 'left right to front left edge',
    from: (row, size) => ({ face: 'left', row, col: size - 1 }),
    to: (row) => ({ face: 'front', row, col: 0, depth: 0 }),
  },
  {
    label: 'left bottom to bottom left edge',
    from: (col, size) => ({ face: 'left', row: size - 1, col }),
    to: (col, size) => ({ face: 'bottom', row: size - 1 - col, col: 0, depth: 0 }),
  },
  {
    label: 'left left to back right edge',
    from: (row) => ({ face: 'left', row, col: 0 }),
    to: (row, size) => ({ face: 'back', row, col: size - 1, depth: 0 }),
  },
  {
    label: 'top top to back top edge',
    from: (col) => ({ face: 'top', row: 0, col }),
    to: (col, size) => ({ face: 'back', row: 0, col: size - 1 - col, depth: 0 }),
  },
  {
    label: 'top right to right top edge',
    from: (row, size) => ({ face: 'top', row, col: size - 1 }),
    to: (row, size) => ({ face: 'right', row: 0, col: size - 1 - row, depth: 0 }),
  },
  {
    label: 'top bottom to front top edge',
    from: (col, size) => ({ face: 'top', row: size - 1, col }),
    to: (col) => ({ face: 'front', row: 0, col, depth: 0 }),
  },
  {
    label: 'top left to left top edge',
    from: (row) => ({ face: 'top', row, col: 0 }),
    to: (row) => ({ face: 'left', row: 0, col: row, depth: 0 }),
  },
  {
    label: 'bottom top to front bottom edge',
    from: (col) => ({ face: 'bottom', row: 0, col }),
    to: (col, size) => ({ face: 'front', row: size - 1, col, depth: 0 }),
  },
  {
    label: 'bottom right to right bottom edge',
    from: (row, size) => ({ face: 'bottom', row, col: size - 1 }),
    to: (row, size) => ({ face: 'right', row: size - 1, col: row, depth: 0 }),
  },
  {
    label: 'bottom bottom to back bottom edge',
    from: (col, size) => ({ face: 'bottom', row: size - 1, col }),
    to: (col, size) => ({ face: 'back', row: size - 1, col: size - 1 - col, depth: 0 }),
  },
  {
    label: 'bottom left to left bottom edge',
    from: (row) => ({ face: 'bottom', row, col: 0 }),
    to: (row, size) => ({ face: 'left', row: size - 1, col: size - 1 - row, depth: 0 }),
  },
];

describe('cube geometry', () => {
  it('lists all six faces in stable render order', () => {
    expect(CUBE_FACES).toEqual(['front', 'right', 'back', 'left', 'top', 'bottom']);
  });

  it('returns same-face neighbors for interior cells', () => {
    const neighbors = getSurfaceNeighbors({ face: 'front', row: 1, col: 1 }, 4);

    expect(neighbors).toHaveLength(8);
    expect(neighbors).toContainEqual({ face: 'front', row: 0, col: 0, depth: 0 });
    expect(neighbors).toContainEqual({ face: 'front', row: 2, col: 2, depth: 0 });
  });

  it('maps orthogonal edge neighbors to adjacent cube faces', () => {
    expect(getSurfaceNeighbors({ face: 'front', row: 1, col: 3 }, 4)).toContainEqual({ face: 'right', row: 1, col: 0, depth: 0 });
    expect(getSurfaceNeighbors({ face: 'front', row: 0, col: 2 }, 4)).toContainEqual({ face: 'top', row: 3, col: 2, depth: 0 });
    expect(getSurfaceNeighbors({ face: 'front', row: 3, col: 2 }, 4)).toContainEqual({ face: 'bottom', row: 0, col: 2, depth: 0 });
    expect(getSurfaceNeighbors({ face: 'front', row: 2, col: 0 }, 4)).toContainEqual({ face: 'left', row: 2, col: 3, depth: 0 });
  });

  it('omits corner-over-corner diagonals because cube vertices have ambiguous ownership', () => {
    const neighbors = getSurfaceNeighbors({ face: 'front', row: 0, col: 0 }, 4);

    expect(neighbors).toHaveLength(5);
    expect(neighbors).not.toContainEqual({ face: 'top', row: 3, col: 3, depth: 0 });
  });

  it('keeps non-corner edge diagonals on the same face and omits cross-face diagonals', () => {
    const neighbors = getSurfaceNeighbors({ face: 'front', row: 0, col: 1 }, 4);

    expect(neighbors).toHaveLength(6);
    expect(neighbors).toContainEqual({ face: 'front', row: 1, col: 0, depth: 0 });
    expect(neighbors).toContainEqual({ face: 'front', row: 1, col: 2, depth: 0 });
    expect(neighbors).toContainEqual({ face: 'top', row: 3, col: 1, depth: 0 });
    expect(neighbors).not.toContainEqual({ face: 'top', row: 3, col: 0, depth: 0 });
    expect(neighbors).not.toContainEqual({ face: 'top', row: 3, col: 2, depth: 0 });
  });

  it.each(edgeTransitionCases)('maps $label for every edge index', ({ from, to }) => {
    const size = 4;

    for (let index = 0; index < size; index += 1) {
      expect(getSurfaceNeighbors(from(index, size), size)).toContainEqual(to(index, size));
    }
  });

  it('keeps all size 4 surface neighbors unique, in bounds, and reciprocal', () => {
    const size = 4;
    const faces = new Set<CubeFace>(CUBE_FACES);

    for (const face of CUBE_FACES) {
      for (let row = 0; row < size; row += 1) {
        for (let col = 0; col < size; col += 1) {
          const coordinate: CubeCoordinate = { face, row, col, depth: 0 };
          const neighbors = getSurfaceNeighbors(coordinate, size);
          const keys = neighbors.map(coordinateKey);

          expect(new Set(keys).size).toBe(keys.length);

          for (const neighbor of neighbors) {
            expect(faces.has(neighbor.face)).toBe(true);
            expect(neighbor.row).toBeGreaterThanOrEqual(0);
            expect(neighbor.row).toBeLessThan(size);
            expect(neighbor.col).toBeGreaterThanOrEqual(0);
            expect(neighbor.col).toBeLessThan(size);
            expect(neighbor.depth).toBe(0);
            expect(getSurfaceNeighbors(neighbor, size)).toContainEqual(coordinate);
          }
        }
      }
    }
  });

  it('creates stable coordinate keys', () => {
    expect(coordinateKey({ face: 'top', row: 1, col: 2, depth: 3 })).toBe('top:1:2:3');
  });
});
