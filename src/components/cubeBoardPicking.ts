import { CUBE_FACES } from '../game/cube/geometry';
import type { CubeCoordinate, CubeFace } from '../game/cube/types';
import type { CubeRotation } from './CubeBoard';

export const CUBE_DRAG_THRESHOLD_PX = 6;

export interface PointerPosition {
  x: number;
  y: number;
}

export type CubeSurfacePick = CubeCoordinate & { depth: 0 };

export type CubeCellUserData = CubeSurfacePick & {
  kind: 'cube-cell';
};

export function hasPointerDragged(start: PointerPosition, current: PointerPosition, threshold = CUBE_DRAG_THRESHOLD_PX): boolean {
  return Math.hypot(current.x - start.x, current.y - start.y) >= threshold;
}

export function snapCubeRotation(rotation: CubeRotation, increment = 90): CubeRotation {
  return {
    x: snapAngle(rotation.x, increment),
    y: snapAngle(rotation.y, increment),
  };
}

export function createSurfacePicks(size: number): CubeSurfacePick[] {
  return CUBE_FACES.flatMap((face) =>
    Array.from({ length: size }, (_, row) =>
      Array.from({ length: size }, (_, col): CubeSurfacePick => ({ face, row, col, depth: 0 })),
    ).flat(),
  );
}

export function createCubeCellUserData(pick: CubeSurfacePick): CubeCellUserData {
  return { kind: 'cube-cell', ...pick };
}

export function isCubeCellUserData(value: unknown): value is CubeCellUserData {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<CubeCellUserData>;
  return (
    candidate.kind === 'cube-cell' &&
    isCubeFace(candidate.face) &&
    Number.isInteger(candidate.row) &&
    Number.isInteger(candidate.col) &&
    candidate.row! >= 0 &&
    candidate.col! >= 0 &&
    candidate.depth === 0
  );
}

function isCubeFace(value: unknown): value is CubeFace {
  return typeof value === 'string' && CUBE_FACES.includes(value as CubeFace);
}

function snapAngle(value: number, increment: number): number {
  const snapped = Math.round(value / increment) * increment;
  return Object.is(snapped, -0) ? 0 : snapped;
}
