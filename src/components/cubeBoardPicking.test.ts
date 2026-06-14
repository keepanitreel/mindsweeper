import { describe, expect, it } from 'vitest';
import { CUBE_FACES } from '../game/cube/geometry';
import {
  CUBE_DRAG_THRESHOLD_PX,
  createCubeCellUserData,
  createSurfacePicks,
  hasPointerDragged,
  isCubeCellUserData,
  snapCubeRotation,
} from './cubeBoardPicking';

describe('cube board picking helpers', () => {
  it('uses an explicit drag threshold', () => {
    expect(CUBE_DRAG_THRESHOLD_PX).toBe(6);
    expect(hasPointerDragged({ x: 20, y: 20 }, { x: 24, y: 23 })).toBe(false);
    expect(hasPointerDragged({ x: 20, y: 20 }, { x: 26, y: 20 })).toBe(true);
    expect(hasPointerDragged({ x: 20, y: 20 }, { x: 20, y: 27 })).toBe(true);
  });

  it('snaps rotation to quarter turns', () => {
    expect(snapCubeRotation({ x: -24, y: -32 })).toEqual({ x: 0, y: 0 });
    expect(snapCubeRotation({ x: 48, y: 134 })).toEqual({ x: 90, y: 90 });
    expect(snapCubeRotation({ x: -136, y: 226 })).toEqual({ x: -180, y: 270 });
  });

  it('creates one surface pick for every face row and column', () => {
    const picks = createSurfacePicks(3);

    expect(picks).toHaveLength(CUBE_FACES.length * 3 * 3);
    expect(picks[0]).toEqual({ face: 'front', row: 0, col: 0, depth: 0 });
    expect(picks).toContainEqual({ face: 'bottom', row: 2, col: 2, depth: 0 });
  });

  it('marks and validates cube cell mesh user data', () => {
    const userData = createCubeCellUserData({ face: 'right', row: 2, col: 1, depth: 0 });

    expect(userData).toEqual({ kind: 'cube-cell', face: 'right', row: 2, col: 1, depth: 0 });
    expect(isCubeCellUserData(userData)).toBe(true);
    expect(isCubeCellUserData({ kind: 'cube-cell', face: 'front', row: -1, col: 0, depth: 0 })).toBe(false);
    expect(isCubeCellUserData({ kind: 'other', face: 'front', row: 0, col: 0, depth: 0 })).toBe(false);
  });
});
