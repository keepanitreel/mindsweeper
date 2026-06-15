import * as THREE from 'three';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialCubeGame } from '../game/cube/engine';
import { CUBE_PRESETS } from '../game/cube/presets';
import { isCubeCellUserData } from './cubeBoardPicking';
import { buildCubeCellGroup, createCellTexture, createCubeBoardScene, disposeObject3D } from './cubeBoardScene';

const rendererMock = vi.hoisted(() => ({
  dispose: vi.fn(),
  render: vi.fn((scene: { updateMatrixWorld: (force?: boolean) => void }) => {
    scene.updateMatrixWorld(true);
  }),
  setPixelRatio: vi.fn(),
  setSize: vi.fn(),
}));

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();

  return {
    ...actual,
    WebGLRenderer: vi.fn(function WebGLRenderer() {
      return rendererMock;
    }),
  };
});

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
const webglContext = {} as WebGL2RenderingContext;
const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((contextId) => {
  return contextId === '2d' ? canvasContext : contextId === 'webgl2' || contextId === 'webgl' ? webglContext : null;
});

afterAll(() => {
  getContextSpy.mockRestore();
});

afterEach(() => {
  createdObjects.splice(0).forEach((object) => disposeObject3D(object));
});

beforeEach(() => {
  rendererMock.dispose.mockClear();
  rendererMock.render.mockClear();
  rendererMock.setPixelRatio.mockClear();
  rendererMock.setSize.mockClear();
});

describe('cube board scene helpers', () => {
  it('builds one mesh per visible surface cell with stable metadata', () => {
    const game = createInitialCubeGame(CUBE_PRESETS.starter);
    const group = buildCubeCellGroup(game);
    createdObjects.push(group);

    const cellMeshes: THREE.Mesh[] = [];
    group.traverse((object) => {
      if (object instanceof THREE.Mesh && isCubeCellUserData(object.userData)) {
        cellMeshes.push(object);
      }
    });

    expect(cellMeshes).toHaveLength(6 * CUBE_PRESETS.starter.size * CUBE_PRESETS.starter.size);
    expect(cellMeshes.some((mesh) => isCubeCellUserData(mesh.userData) && mesh.userData.face === 'front' && mesh.userData.row === 1 && mesh.userData.col === 1)).toBe(
      true,
    );
    expect(cellMeshes.every((mesh) => mesh.geometry instanceof THREE.PlaneGeometry)).toBe(true);
  });

  it('adds non-cell backing meshes behind each face to catch gap picks', () => {
    const game = createInitialCubeGame(CUBE_PRESETS.starter);
    const group = buildCubeCellGroup(game);
    createdObjects.push(group);

    const backingMeshes = group.children
      .flatMap((faceGroup) => faceGroup.children)
      .filter((object): object is THREE.Mesh => object instanceof THREE.Mesh && object.name.endsWith('-backing'));

    expect(backingMeshes).toHaveLength(6);
    expect(backingMeshes.every((mesh) => mesh.geometry instanceof THREE.PlaneGeometry)).toBe(true);
    expect(backingMeshes.every((mesh) => !isCubeCellUserData(mesh.userData))).toBe(true);
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

  it('preserves the latest rotation when game meshes are rebuilt', () => {
    const game = createInitialCubeGame(CUBE_PRESETS.starter);
    const controller = createCubeBoardScene(document.createElement('canvas'));

    try {
      controller.updateRotation({ x: 24, y: 67 });
      controller.updateGame(game);

      const cubeGroup = getLastRenderedCubeGroup();

      expect(cubeGroup.rotation.x).toBeCloseTo(THREE.MathUtils.degToRad(24));
      expect(cubeGroup.rotation.y).toBeCloseTo(THREE.MathUtils.degToRad(67));
    } finally {
      controller.dispose();
    }
  });

  it('returns null when the nearest raycast hit is not a cube cell', () => {
    const game = createInitialCubeGame(CUBE_PRESETS.starter);
    const canvas = document.createElement('canvas');
    const controller = createCubeBoardScene(canvas);
    const backingObject = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
    const cellObject = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
    const intersectObjectsSpy = vi.spyOn(THREE.Raycaster.prototype, 'intersectObjects');

    backingObject.userData = { kind: 'cube-face-backing' };
    cellObject.userData = { kind: 'cube-cell', face: 'front', row: 1, col: 2, depth: 0 };
    Object.defineProperty(canvas, 'getBoundingClientRect', {
      value: () => ({ bottom: 100, height: 100, left: 0, right: 100, top: 0, width: 100, x: 0, y: 0, toJSON: () => ({}) }),
    });

    try {
      controller.updateGame(game);
      intersectObjectsSpy.mockReturnValue([createIntersection(backingObject, 1), createIntersection(cellObject, 2)]);

      expect(controller.pickCell(50, 50)).toBeNull();

      intersectObjectsSpy.mockReturnValue([createIntersection(cellObject, 1), createIntersection(backingObject, 2)]);

      expect(controller.pickCell(50, 50)).toEqual({ face: 'front', row: 1, col: 2, depth: 0 });
    } finally {
      intersectObjectsSpy.mockRestore();
      backingObject.geometry.dispose();
      cellObject.geometry.dispose();
      controller.dispose();
    }
  });
});

function getLastRenderedCubeGroup(): THREE.Group {
  const scene = rendererMock.render.mock.calls.at(-1)?.[0] as THREE.Scene | undefined;
  const cubeGroup = scene?.children.find((child): child is THREE.Group => child instanceof THREE.Group && child.name === 'cube-cell-root');

  expect(cubeGroup).toBeInstanceOf(THREE.Group);

  return cubeGroup!;
}

function createIntersection(object: THREE.Object3D, distance: number): THREE.Intersection {
  return { distance, object, point: new THREE.Vector3() } as THREE.Intersection;
}
