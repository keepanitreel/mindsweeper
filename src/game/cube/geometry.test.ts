import { describe, expect, it } from 'vitest';
import type { CubeSurfaceCoordinate } from './types';
import { CUBE_FACES, coordinateKey, getDepthStackCoordinates, getSurfaceNeighbors } from './geometry';

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

  it('returns hidden depth stack coordinates behind a surface cell', () => {
    const surface: CubeSurfaceCoordinate = { face: 'right', row: 2, col: 1 };

    expect(getDepthStackCoordinates(surface, 3)).toEqual([
      { face: 'right', row: 2, col: 1, depth: 1 },
      { face: 'right', row: 2, col: 1, depth: 2 },
      { face: 'right', row: 2, col: 1, depth: 3 },
    ]);
  });

  it('creates stable coordinate keys', () => {
    expect(coordinateKey({ face: 'top', row: 1, col: 2, depth: 3 })).toBe('top:1:2:3');
  });
});
