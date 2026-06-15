import * as THREE from 'three';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { createInitialCubeGame } from '../game/cube/engine';
import { CUBE_PRESETS } from '../game/cube/presets';
import { isCubeCellUserData } from './cubeBoardPicking';
import { buildCubeCellGroup, createCellTexture, disposeObject3D } from './cubeBoardScene';

const createdObjects: THREE.Object3D[] = [];
const canvasContext = {
  arc: vi.fn(),
  beginPath: vi.fn(),
  createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  fill: vi.fn(),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  lineTo: vi.fn(),
  moveTo: vi.fn(),
  stroke: vi.fn(),
  strokeRect: vi.fn(),
} as unknown as CanvasRenderingContext2D;
const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((contextId) => {
  return contextId === '2d' ? canvasContext : null;
});

afterAll(() => {
  getContextSpy.mockRestore();
});

afterEach(() => {
  createdObjects.splice(0).forEach((object) => disposeObject3D(object));
});

describe('cube board scene helpers', () => {
  it('builds one mesh per visible surface cell with stable metadata', () => {
    const game = createInitialCubeGame(CUBE_PRESETS.starter);
    const group = buildCubeCellGroup(game);
    createdObjects.push(group);

    const meshes: THREE.Mesh[] = [];
    group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        meshes.push(object);
      }
    });

    expect(meshes).toHaveLength(6 * CUBE_PRESETS.starter.size * CUBE_PRESETS.starter.size);
    expect(meshes.some((mesh) => isCubeCellUserData(mesh.userData) && mesh.userData.face === 'front' && mesh.userData.row === 1 && mesh.userData.col === 1)).toBe(
      true,
    );
    expect(meshes.every((mesh) => mesh.geometry instanceof THREE.PlaneGeometry)).toBe(true);
  });

  it('places cube faces on different world axes', () => {
    const game = createInitialCubeGame(CUBE_PRESETS.starter);
    const group = buildCubeCellGroup(game);
    createdObjects.push(group);

    const faceGroups = group.children;

    expect(faceGroups).toHaveLength(6);
    expect(faceGroups.find((face) => face.name === 'cube-face-front')?.position.z).toBeGreaterThan(0);
    expect(faceGroups.find((face) => face.name === 'cube-face-back')?.position.z).toBeLessThan(0);
    expect(faceGroups.find((face) => face.name === 'cube-face-right')?.position.x).toBeGreaterThan(0);
    expect(faceGroups.find((face) => face.name === 'cube-face-left')?.position.x).toBeLessThan(0);
    expect(faceGroups.find((face) => face.name === 'cube-face-top')?.position.y).toBeGreaterThan(0);
    expect(faceGroups.find((face) => face.name === 'cube-face-bottom')?.position.y).toBeLessThan(0);
  });

  it('draws different textures for covered, flagged, and revealed cells', () => {
    const game = createInitialCubeGame(CUBE_PRESETS.starter);
    const covered = game.board.front[0][0][0];
    const flagged = { ...covered, isFlagged: true };
    const revealed = { ...covered, isRevealed: true, surfaceNeighborMines: 3, depthMineCount: 2 };

    const coveredTexture = createCellTexture(covered);
    const flaggedTexture = createCellTexture(flagged);
    const revealedTexture = createCellTexture(revealed);

    expect((coveredTexture.image as HTMLCanvasElement).width).toBe(96);
    expect((flaggedTexture.image as HTMLCanvasElement).width).toBe(96);
    expect((revealedTexture.image as HTMLCanvasElement).width).toBe(96);
    expect(flaggedTexture).not.toBe(coveredTexture);
    expect(revealedTexture).not.toBe(coveredTexture);

    coveredTexture.dispose();
    flaggedTexture.dispose();
    revealedTexture.dispose();
  });
});
