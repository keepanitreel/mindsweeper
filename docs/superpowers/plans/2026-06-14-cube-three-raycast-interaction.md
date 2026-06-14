# Cube Three.js Interaction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Cube Mode's CSS transformed DOM picking with a Three.js canvas cube that uses raycasting for precise pointer interaction.

**Architecture:** Keep the existing cube engine and `CubeGame` state flow. Add a focused Three.js scene helper for rendering and raycasting, a small pure picking helper for drag/snap metadata, and keep a real DOM cell grid as the keyboard and screen-reader path.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, Playwright, Three.js.

---

## File Structure

- Modify `package.json` and `package-lock.json`: add `three`.
- Create `src/components/cubeBoardPicking.ts`: pure pointer threshold, rotation snap, and pick metadata helpers.
- Create `src/components/cubeBoardPicking.test.ts`: unit tests for pure picking helpers.
- Create `src/components/cubeBoardScene.ts`: Three.js scene creation, mesh rebuild, raycast picking, render, resize, and disposal.
- Create `src/components/cubeBoardScene.test.ts`: unit tests for mesh metadata and texture/material behavior that do not require WebGL.
- Modify `src/components/CubeBoard.tsx`: replace CSS-3D board with canvas event bridge plus accessible DOM grid.
- Create `src/components/CubeBoard.test.tsx`: mocked-scene component tests for click, right-click, hover, drag threshold, and accessible grid routing.
- Modify `src/styles.css`: add canvas cube styles, accessible-grid fallback styles, and remove CSS-3D picking styles.
- Modify `src/App.test.tsx`: update assertions that currently depend on CSS custom properties while preserving Cube Mode behavior coverage.
- Modify `tests/minesweeper.spec.ts`: replace CSS edge-picking coverage with canvas nonblank, raycast click, raycast flag, and drag-no-click coverage.

## Task 1: Add Dependency And Pure Picking Helpers

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/components/cubeBoardPicking.ts`
- Create: `src/components/cubeBoardPicking.test.ts`

- [ ] **Step 1: Write the failing picking-helper tests**

Create `src/components/cubeBoardPicking.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the picking-helper tests and verify they fail**

Run:

```bash
npm run test -- src/components/cubeBoardPicking.test.ts
```

Expected: FAIL because `src/components/cubeBoardPicking.ts` does not exist.

- [ ] **Step 3: Install Three.js**

Run:

```bash
npm install three
```

Expected: `package.json` and `package-lock.json` both change and `three` appears in `dependencies`.

- [ ] **Step 4: Implement the picking helper**

Create `src/components/cubeBoardPicking.ts`:

```ts
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
    x: Math.round(rotation.x / increment) * increment,
    y: Math.round(rotation.y / increment) * increment,
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
```

- [ ] **Step 5: Run the picking-helper tests and verify they pass**

Run:

```bash
npm run test -- src/components/cubeBoardPicking.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 1**

Run:

```bash
git add package.json package-lock.json src/components/cubeBoardPicking.ts src/components/cubeBoardPicking.test.ts
git commit -m "feat: add cube picking helpers"
```

## Task 2: Add The Three.js Scene Helper

**Files:**
- Create: `src/components/cubeBoardScene.ts`
- Create: `src/components/cubeBoardScene.test.ts`

- [ ] **Step 1: Write failing scene-helper tests**

Create `src/components/cubeBoardScene.test.ts`:

```ts
import * as THREE from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import { createInitialCubeGame } from '../game/cube/engine';
import { CUBE_PRESETS } from '../game/cube/presets';
import { buildCubeCellGroup, createCellTexture, disposeObject3D } from './cubeBoardScene';
import { isCubeCellUserData } from './cubeBoardPicking';

const createdObjects: THREE.Object3D[] = [];

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
    expect(meshes.some((mesh) => isCubeCellUserData(mesh.userData) && mesh.userData.face === 'front' && mesh.userData.row === 1 && mesh.userData.col === 1)).toBe(true);
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
```

- [ ] **Step 2: Run the scene-helper tests and verify they fail**

Run:

```bash
npm run test -- src/components/cubeBoardScene.test.ts
```

Expected: FAIL because `src/components/cubeBoardScene.ts` does not exist.

- [ ] **Step 3: Implement the scene helper**

Create `src/components/cubeBoardScene.ts` with these exports and behavior:

```ts
import * as THREE from 'three';
import { CUBE_FACES } from '../game/cube/geometry';
import type { CubeCell, CubeFace, CubeGameState } from '../game/cube/types';
import type { CubeRotation } from './CubeBoard';
import { createCubeCellUserData, isCubeCellUserData, type CubeSurfacePick } from './cubeBoardPicking';

const FACE_SIZE = 4;
const FACE_HALF = FACE_SIZE / 2;
const CELL_GAP = 0.025;
const TEXTURE_SIZE = 96;

export interface CubeBoardSceneController {
  updateGame: (game: CubeGameState) => void;
  updateRotation: (rotation: CubeRotation) => void;
  resize: (width: number, height: number) => void;
  pickCell: (clientX: number, clientY: number) => CubeSurfacePick | null;
  render: () => void;
  dispose: () => void;
}

export function createCubeBoardScene(canvas: HTMLCanvasElement): CubeBoardSceneController {
  const renderer = createRenderer(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let cubeGroup = new THREE.Group();

  scene.background = new THREE.Color('#071a12');
  camera.position.set(0, 0, 8);
  scene.add(new THREE.AmbientLight('#ffffff', 1.8));
  scene.add(cubeGroup);

  function updateGame(game: CubeGameState) {
    scene.remove(cubeGroup);
    disposeObject3D(cubeGroup);
    cubeGroup = buildCubeCellGroup(game);
    scene.add(cubeGroup);
    render();
  }

  function updateRotation(rotation: CubeRotation) {
    cubeGroup.rotation.x = THREE.MathUtils.degToRad(rotation.x);
    cubeGroup.rotation.y = THREE.MathUtils.degToRad(rotation.y);
    render();
  }

  function resize(width: number, height: number) {
    const safeWidth = Math.max(1, Math.floor(width));
    const safeHeight = Math.max(1, Math.floor(height));
    renderer.setSize(safeWidth, safeHeight, false);
    camera.aspect = safeWidth / safeHeight;
    camera.updateProjectionMatrix();
    render();
  }

  function pickCell(clientX: number, clientY: number): CubeSurfacePick | null {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -(((clientY - rect.top) / rect.height) * 2 - 1);
    raycaster.setFromCamera(pointer, camera);

    const hit = raycaster
      .intersectObjects(cubeGroup.children, true)
      .find((intersection) => isCubeCellUserData(intersection.object.userData));

    return hit && isCubeCellUserData(hit.object.userData) ? toSurfacePick(hit.object.userData) : null;
  }

  function render() {
    renderer.render(scene, camera);
  }

  function dispose() {
    disposeObject3D(cubeGroup);
    renderer.dispose();
  }

  return { updateGame, updateRotation, resize, pickCell, render, dispose };
}

export function buildCubeCellGroup(game: CubeGameState): THREE.Group {
  const root = new THREE.Group();
  root.name = 'cube-cell-root';

  for (const face of CUBE_FACES) {
    const faceGroup = new THREE.Group();
    faceGroup.name = `cube-face-${face}`;
    positionFaceGroup(faceGroup, face);

    const cellSize = (FACE_SIZE - CELL_GAP * (game.preset.size - 1)) / game.preset.size;
    for (let row = 0; row < game.preset.size; row += 1) {
      for (let col = 0; col < game.preset.size; col += 1) {
        const cell = game.board[face][0][row][col];
        const texture = createCellTexture(cell);
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
        const geometry = new THREE.PlaneGeometry(cellSize, cellSize);
        const mesh = new THREE.Mesh(geometry, material);

        mesh.userData = createCubeCellUserData({ face, row, col, depth: 0 });
        mesh.position.set(
          -FACE_HALF + cellSize / 2 + col * (cellSize + CELL_GAP),
          FACE_HALF - cellSize / 2 - row * (cellSize + CELL_GAP),
          0.01,
        );
        faceGroup.add(mesh);
      }
    }

    root.add(faceGroup);
  }

  return root;
}

export function createCellTexture(cell: CubeCell): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D context is required for cube cell textures.');
  }

  drawCellBackground(context, cell);
  drawCellContent(context, cell);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function disposeObject3D(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }

    const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    materials.forEach((material) => {
      const mapped = material as THREE.Material & { map?: THREE.Texture };
      mapped.map?.dispose();
      material.dispose();
    });
  });
}

function createRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
  if (!context) {
    throw new Error('WebGL is not available for Cube Mode.');
  }

  const renderer = new THREE.WebGLRenderer({
    canvas,
    context: context as WebGLRenderingContext,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  return renderer;
}

function positionFaceGroup(group: THREE.Group, face: CubeFace): void {
  if (face === 'front') {
    group.position.z = FACE_HALF;
  } else if (face === 'back') {
    group.position.z = -FACE_HALF;
    group.rotation.y = Math.PI;
  } else if (face === 'right') {
    group.position.x = FACE_HALF;
    group.rotation.y = Math.PI / 2;
  } else if (face === 'left') {
    group.position.x = -FACE_HALF;
    group.rotation.y = -Math.PI / 2;
  } else if (face === 'top') {
    group.position.y = FACE_HALF;
    group.rotation.x = -Math.PI / 2;
  } else {
    group.position.y = -FACE_HALF;
    group.rotation.x = Math.PI / 2;
  }
}

function toSurfacePick(userData: { face: CubeFace; row: number; col: number; depth: 0 }): CubeSurfacePick {
  return { face: userData.face, row: userData.row, col: userData.col, depth: 0 };
}

function drawCellBackground(context: CanvasRenderingContext2D, cell: CubeCell): void {
  const gradient = context.createLinearGradient(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  const base = cell.isExploded ? '#d44938' : cell.isIncorrectFlag ? '#f0b0a6' : cell.isRevealed ? '#d8e7c9' : '#6bae3d';
  const highlight = cell.isRevealed ? '#edf6df' : '#9dda4d';

  gradient.addColorStop(0, highlight);
  gradient.addColorStop(1, base);
  context.fillStyle = gradient;
  context.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  context.strokeStyle = 'rgba(7, 26, 18, 0.55)';
  context.lineWidth = 4;
  context.strokeRect(2, 2, TEXTURE_SIZE - 4, TEXTURE_SIZE - 4);

  if (!cell.isRevealed && !cell.isExploded && !cell.isIncorrectFlag) {
    context.strokeStyle = 'rgba(255, 255, 255, 0.36)';
    context.beginPath();
    context.moveTo(8, TEXTURE_SIZE - 8);
    context.lineTo(8, 8);
    context.lineTo(TEXTURE_SIZE - 8, 8);
    context.stroke();
  }
}

function drawCellContent(context: CanvasRenderingContext2D, cell: CubeCell): void {
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '700 46px system-ui, sans-serif';

  if (cell.isFlagged && !cell.isIncorrectFlag) {
    context.fillStyle = '#a51521';
    context.fillText('⚑', TEXTURE_SIZE / 2, TEXTURE_SIZE / 2 + 2);
    return;
  }

  if (cell.isIncorrectFlag) {
    context.fillStyle = '#102116';
    context.fillText('×', TEXTURE_SIZE / 2, TEXTURE_SIZE / 2);
    return;
  }

  if (!cell.isRevealed) {
    return;
  }

  if (cell.hasMine) {
    context.fillStyle = '#fff7ed';
    context.fillText('✹', TEXTURE_SIZE / 2, TEXTURE_SIZE / 2 + 2);
    return;
  }

  if (cell.surfaceNeighborMines > 0) {
    context.fillStyle = getNumberColor(cell.surfaceNeighborMines);
    context.fillText(String(cell.surfaceNeighborMines), TEXTURE_SIZE / 2, TEXTURE_SIZE / 2);
  }

  if (cell.depth === 0 && cell.depthMineCount > 0) {
    context.fillStyle = '#f3d34a';
    context.beginPath();
    context.arc(TEXTURE_SIZE - 20, TEXTURE_SIZE - 20, 16, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#102116';
    context.font = '800 22px system-ui, sans-serif';
    context.fillText(String(cell.depthMineCount), TEXTURE_SIZE - 20, TEXTURE_SIZE - 18);
  }
}

function getNumberColor(value: number): string {
  return ['#1d4ed8', '#15803d', '#b91c1c', '#4338ca', '#92400e', '#0f766e', '#111827', '#4b5563'][Math.max(1, Math.min(value, 8)) - 1];
}
```

- [ ] **Step 4: Run the scene-helper tests and verify they pass**

Run:

```bash
npm run test -- src/components/cubeBoardScene.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 2**

Run:

```bash
git add src/components/cubeBoardScene.ts src/components/cubeBoardScene.test.ts
git commit -m "feat: add threejs cube scene helper"
```

## Task 3: Replace CubeBoard With Canvas Bridge And Accessible Grid

**Files:**
- Modify: `src/components/CubeBoard.tsx`
- Create: `src/components/CubeBoard.test.tsx`

- [ ] **Step 1: Write failing CubeBoard component tests**

Create `src/components/CubeBoard.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialCubeGame } from '../game/cube/engine';
import { CUBE_PRESETS } from '../game/cube/presets';
import type { CubeGameState } from '../game/cube/types';
import CubeBoard from './CubeBoard';
import type { CubeBoardSceneController } from './cubeBoardScene';

type MockScene = {
  [Key in keyof CubeBoardSceneController]: ReturnType<typeof vi.fn>;
};

const sceneMock = vi.hoisted(() => ({
  controller: null as MockScene | null,
}));

vi.mock('./cubeBoardScene', () => ({
  createCubeBoardScene: vi.fn(() => sceneMock.controller),
}));

describe('CubeBoard Three.js bridge', () => {
  let game: CubeGameState;
  let onRotate: ReturnType<typeof vi.fn>;
  let onCellPrimary: ReturnType<typeof vi.fn>;
  let onCellFlag: ReturnType<typeof vi.fn>;
  let onPeek: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    game = createInitialCubeGame(CUBE_PRESETS.starter);
    onRotate = vi.fn();
    onCellPrimary = vi.fn();
    onCellFlag = vi.fn();
    onPeek = vi.fn();
    sceneMock.controller = {
      updateGame: vi.fn(),
      updateRotation: vi.fn(),
      resize: vi.fn(),
      pickCell: vi.fn(),
      render: vi.fn(),
      dispose: vi.fn(),
    };
  });

  it('routes a short canvas click to the raycasted cell', () => {
    sceneMock.controller!.pickCell.mockReturnValue({ face: 'front', row: 1, col: 1, depth: 0 });
    renderBoard();

    const canvas = screen.getByLabelText(/interactive cube board/i);
    fireEvent.pointerDown(canvas, { button: 0, pointerId: 1, clientX: 20, clientY: 20 });
    fireEvent.pointerUp(canvas, { button: 0, pointerId: 1, clientX: 22, clientY: 22 });

    expect(onCellPrimary).toHaveBeenCalledWith(game.board.front[0][1][1]);
    expect(onCellFlag).not.toHaveBeenCalled();
  });

  it('routes canvas context menu to flag without opening the browser menu', () => {
    sceneMock.controller!.pickCell.mockReturnValue({ face: 'right', row: 2, col: 3, depth: 0 });
    renderBoard();

    const canvas = screen.getByLabelText(/interactive cube board/i);
    fireEvent.contextMenu(canvas, { clientX: 30, clientY: 40 });

    expect(onCellFlag).toHaveBeenCalledWith(game.board.right[0][2][3]);
  });

  it('updates peek from raycast hover when no drag is active', () => {
    sceneMock.controller!.pickCell.mockReturnValue({ face: 'top', row: 0, col: 2, depth: 0 });
    renderBoard();

    const canvas = screen.getByLabelText(/interactive cube board/i);
    fireEvent.pointerMove(canvas, { clientX: 30, clientY: 40 });

    expect(onPeek).toHaveBeenCalledWith(game.board.top[0][0][2]);
  });

  it('rotates after threshold movement and does not reveal the drag-start cell', () => {
    sceneMock.controller!.pickCell.mockReturnValue({ face: 'front', row: 1, col: 1, depth: 0 });
    renderBoard();

    const canvas = screen.getByLabelText(/interactive cube board/i);
    fireEvent.pointerDown(canvas, { button: 0, pointerId: 1, clientX: 20, clientY: 20 });
    fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 50, clientY: 20 });
    fireEvent.pointerUp(canvas, { button: 0, pointerId: 1, clientX: 50, clientY: 20 });

    expect(onCellPrimary).not.toHaveBeenCalled();
    expect(onRotate).toHaveBeenCalledWith({ x: -24, y: -21.5 });
    expect(onRotate).toHaveBeenLastCalledWith({ x: 0, y: 0 });
  });

  it('keeps real grid buttons for non-pointer interaction', () => {
    renderBoard();

    fireEvent.click(screen.getByRole('gridcell', { name: /covered cube cell front row 2 column 2 surface/i }));

    expect(onCellPrimary).toHaveBeenCalledWith(game.board.front[0][1][1]);
  });

  function renderBoard() {
    render(
      <CubeBoard
        game={game}
        rotation={{ x: -24, y: -32 }}
        onRotate={onRotate}
        onCellPrimary={onCellPrimary}
        onCellFlag={onCellFlag}
        onPeek={onPeek}
      />,
    );
  }
});
```

- [ ] **Step 2: Run the CubeBoard component tests and verify they fail**

Run:

```bash
npm run test -- src/components/CubeBoard.test.tsx
```

Expected: FAIL because `CubeBoard` still renders the CSS-3D DOM cube and does not use `createCubeBoardScene`.

- [ ] **Step 3: Replace `CubeBoard.tsx` with the canvas bridge**

Replace `src/components/CubeBoard.tsx` with this component shape:

```tsx
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { CUBE_FACES } from '../game/cube/geometry';
import type { CubeCell, CubeGameState } from '../game/cube/types';
import CubeCellButton from './CubeCellButton';
import { createCubeBoardScene, type CubeBoardSceneController } from './cubeBoardScene';
import { hasPointerDragged, snapCubeRotation, type CubeSurfacePick, type PointerPosition } from './cubeBoardPicking';

export interface CubeRotation {
  x: number;
  y: number;
}

interface CubeBoardProps {
  game: CubeGameState;
  rotation: CubeRotation;
  onRotate: (rotation: CubeRotation) => void;
  onCellPrimary: (cell: CubeCell) => void;
  onCellFlag: (cell: CubeCell) => void;
  onPeek: (cell: CubeCell | null) => void;
}

interface PointerDragState {
  pointerId: number;
  start: PointerPosition;
  rotation: CubeRotation;
  didDrag: boolean;
}

export default function CubeBoard({ game, rotation, onRotate, onCellPrimary, onCellFlag, onPeek }: CubeBoardProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<CubeBoardSceneController | null>(null);
  const pointerState = useRef<PointerDragState | null>(null);
  const [canvasFailed, setCanvasFailed] = useState(false);
  const [lastCanvasPick, setLastCanvasPick] = useState<CubeSurfacePick | null>(null);
  const boardStyle = {
    '--cube-size': game.preset.size,
    '--cube-cell-size': getCubeCellSize(game.preset.size),
  } as CSSProperties;

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) {
      return;
    }

    let scene: CubeBoardSceneController;
    try {
      scene = createCubeBoardScene(canvas);
    } catch {
      setCanvasFailed(true);
      return;
    }

    sceneRef.current = scene;
    scene.updateGame(game);
    scene.updateRotation(rotation);

    const resize = () => {
      const rect = stage.getBoundingClientRect();
      scene.resize(rect.width || 600, rect.height || 600);
    };
    resize();

    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    observer?.observe(stage);

    return () => {
      observer?.disconnect();
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.updateGame(game);
  }, [game]);

  useEffect(() => {
    sceneRef.current?.updateRotation(rotation);
  }, [rotation]);

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0) {
      return;
    }

    pointerState.current = {
      pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      rotation,
      didDrag: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const current = { x: event.clientX, y: event.clientY };
    const active = pointerState.current;

    if (active) {
      if (hasPointerDragged(active.start, current)) {
        active.didDrag = true;
        onRotate(getDragRotation(active, current));
      }
      return;
    }

    const cell = pickCell(event.clientX, event.clientY);
    onPeek(cell);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    const active = pointerState.current;
    if (!active || active.pointerId !== event.pointerId) {
      return;
    }

    pointerState.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    const current = { x: event.clientX, y: event.clientY };

    if (active.didDrag || hasPointerDragged(active.start, current)) {
      onRotate(snapCubeRotation(getDragRotation(active, current)));
      return;
    }

    const cell = pickCell(event.clientX, event.clientY);
    if (cell) {
      onCellPrimary(cell);
    }
  }

  function handlePointerCancel(event: React.PointerEvent<HTMLCanvasElement>) {
    if (pointerState.current?.pointerId === event.pointerId) {
      pointerState.current = null;
    }
  }

  function handleContextMenu(event: React.MouseEvent<HTMLCanvasElement>) {
    const cell = pickCell(event.clientX, event.clientY);
    if (!cell) {
      return;
    }

    event.preventDefault();
    onCellFlag(cell);
  }

  function pickCell(clientX: number, clientY: number): CubeCell | null {
    const pick = sceneRef.current?.pickCell(clientX, clientY) ?? null;
    setLastCanvasPick(pick);
    if (!pick) {
      return null;
    }

    return game.board[pick.face]?.[0]?.[pick.row]?.[pick.col] ?? null;
  }

  return (
    <div
      className={`cube-stage ${canvasFailed ? 'cube-stage-fallback' : ''}`}
      data-rotation-x={rotation.x}
      data-rotation-y={rotation.y}
      style={boardStyle}
      ref={stageRef}
      onPointerLeave={() => onPeek(null)}
    >
      <canvas
        className="cube-canvas"
        ref={canvasRef}
        aria-label={`${game.preset.label} interactive cube board`}
        data-last-pick={lastCanvasPick ? `${lastCanvasPick.face}:${lastCanvasPick.row}:${lastCanvasPick.col}` : ''}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onContextMenu={handleContextMenu}
      />

      <div className={`cube-accessible-board ${canvasFailed ? 'visible' : ''}`} aria-label={`${game.preset.label} accessible cube board`}>
        {CUBE_FACES.map((face) => (
          <div className="cube-accessible-face" role="grid" aria-label={`${face} cube face`} key={face}>
            {game.board[face][0].flat().map((cell) => (
              <CubeCellButton key={cell.id} cell={cell} onPrimary={onCellPrimary} onFlag={onCellFlag} onPeek={onPeek} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function getDragRotation(active: PointerDragState, current: PointerPosition): CubeRotation {
  return {
    x: active.rotation.x - (current.y - active.start.y) * 0.35,
    y: active.rotation.y + (current.x - active.start.x) * 0.35,
  };
}

function getCubeCellSize(cubeSize: number): string {
  if (cubeSize >= 16) {
    return `clamp(16px, calc((100vw - 160px) / ${cubeSize}), 32px)`;
  }

  if (cubeSize >= 10) {
    return `clamp(24px, calc((100vw - 160px) / ${cubeSize}), 54px)`;
  }

  return `clamp(34px, calc((100vw - 160px) / ${cubeSize}), 54px)`;
}
```

- [ ] **Step 4: Run the CubeBoard component tests and verify they pass**

Run:

```bash
npm run test -- src/components/CubeBoard.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

Run:

```bash
git add src/components/CubeBoard.tsx src/components/CubeBoard.test.tsx
git commit -m "feat: render cube board through canvas bridge"
```

## Task 4: Update Styles And App Tests For Canvas Cube

**Files:**
- Modify: `src/styles.css`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Update App tests that depend on CSS-3D implementation details**

In `src/App.test.tsx`, replace the body of `renders the expanded Standard and Deep cube presets` with:

```tsx
const user = userEvent.setup();
render(<App />);

await user.click(screen.getByRole('button', { name: /cube mode/i }));

expect(screen.getByLabelText(/interactive cube board/i)).toBeInTheDocument();

await user.selectOptions(screen.getByLabelText('Cube difficulty'), 'standard');
expect(screen.getAllByRole('gridcell', { name: /covered cube cell/i })).toHaveLength(6 * 10 * 10);
expect(screen.getByText('200')).toBeInTheDocument();

await user.selectOptions(screen.getByLabelText('Cube difficulty'), 'deep');
expect(screen.getAllByRole('gridcell', { name: /covered cube cell/i })).toHaveLength(6 * 20 * 20);
expect(screen.getByText('1280')).toBeInTheDocument();
```

In `src/App.test.tsx`, replace the `cubeStage` assertions in `rotates Cube Mode with keyboard arrow keys` with:

```tsx
const cubeStage = document.querySelector<HTMLElement>('.cube-stage');

expect(cubeStage).toBeInTheDocument();
expect(cubeStage).toHaveAttribute('data-rotation-x', '-24');
expect(cubeStage).toHaveAttribute('data-rotation-y', '-32');

await user.keyboard('{ArrowLeft}');
expect(cubeStage).toHaveAttribute('data-rotation-y', '-122');

await user.keyboard('{ArrowRight}');
expect(cubeStage).toHaveAttribute('data-rotation-y', '-32');

await user.keyboard('{ArrowUp}');
expect(cubeStage).toHaveAttribute('data-rotation-x', '66');

await user.keyboard('{ArrowDown}');
expect(cubeStage).toHaveAttribute('data-rotation-x', '-24');
```

- [ ] **Step 2: Run App tests and verify the updated app assertions pass**

Run:

```bash
npm run test -- src/App.test.tsx -t "expanded Standard|keyboard arrow"
```

Expected: PASS. If this fails, fix the missing `data-rotation-x`, `data-rotation-y`, or accessible grid count before editing CSS.

- [ ] **Step 3: Replace CSS-3D board styles with canvas and fallback styles**

In `src/styles.css`, remove these selectors and their rules:

```css
.cube-stage-picking .cube-cell
.cube
.cube-stage:active .cube
.cube-face
.cube-face-front
.cube-face-back
.cube-face-right
.cube-face-left
.cube-face-top
.cube-face-bottom
```

Update the `.cube-stage` rules to:

```css
.cube-stage {
  width: min(100%, 720px);
  height: min(66dvh, 680px);
  min-height: 360px;
  position: relative;
  display: grid;
  place-items: center;
  touch-action: none;
  cursor: grab;
}

.cube-stage:active {
  cursor: grabbing;
}

.cube-canvas {
  width: 100%;
  height: 100%;
  display: block;
  border: 1px solid rgba(210, 255, 183, 0.2);
  border-radius: 8px;
  background: #071a12;
}

.cube-stage-fallback .cube-canvas {
  display: none;
}

.cube-accessible-board {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.cube-accessible-board.visible {
  position: static;
  width: min(100%, 560px);
  height: auto;
  display: grid;
  gap: 8px;
  clip-path: none;
  white-space: normal;
}

.cube-accessible-face {
  display: grid;
  grid-template-columns: repeat(var(--cube-size, 4), var(--cube-cell-size, 42px));
  grid-auto-rows: var(--cube-cell-size, 42px);
  gap: var(--cube-grid-gap, 2px);
  padding: var(--cube-face-padding, 6px);
  border: 1px solid rgba(210, 255, 183, 0.24);
  border-radius: 8px;
  background: rgba(18, 60, 43, 0.94);
}
```

Keep the `.cube-cell`, `.cube-cell.covered`, `.cube-cell.revealed`, `.cube-depth-marker`, and depth popover styles because the accessible grid and depth stack still use `CubeCellButton`.

- [ ] **Step 4: Run focused App and CubeBoard tests**

Run:

```bash
npm run test -- src/App.test.tsx src/components/CubeBoard.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit Task 4**

Run:

```bash
git add src/styles.css src/App.test.tsx
git commit -m "test: update cube canvas app coverage"
```

## Task 5: Replace Playwright Coverage With Canvas Raycast Checks

**Files:**
- Modify: `tests/minesweeper.spec.ts`

- [ ] **Step 1: Replace the projected DOM edge-click test with canvas raycast tests**

Remove the test named `clicks the intended Cube Mode square near a projected face edge`.

Add these tests and helpers to `tests/minesweeper.spec.ts`:

```ts
test('renders a nonblank Cube Mode canvas', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /cube mode/i }).click();

  const canvas = page.getByLabel(/interactive cube board/i);
  await expect(canvas).toBeVisible();

  const hasRenderedPixels = await canvas.evaluate((element) => {
    const canvasElement = element as HTMLCanvasElement;
    const gl = canvasElement.getContext('webgl2') ?? canvasElement.getContext('webgl');
    if (!gl || canvasElement.width === 0 || canvasElement.height === 0) {
      return false;
    }

    const samplePoints = [
      [0.35, 0.35],
      [0.5, 0.5],
      [0.65, 0.5],
      [0.5, 0.65],
    ];
    const colors = new Set<string>();

    for (const [x, y] of samplePoints) {
      const pixels = new Uint8Array(4);
      gl.readPixels(Math.floor(canvasElement.width * x), Math.floor(canvasElement.height * y), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      colors.add(Array.from(pixels).join(','));
    }

    return colors.size > 1;
  });

  expect(hasRenderedPixels).toBe(true);
});

test('uses canvas raycasting to reveal the picked Cube Mode coordinate', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /cube mode/i }).click();

  const canvas = page.getByLabel(/interactive cube board/i);
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();

  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);

  await expect.poll(() => canvas.getAttribute('data-last-pick')).toMatch(/^(front|right|back|left|top|bottom):\d+:\d+$/);
  const pick = await canvas.getAttribute('data-last-pick');
  expect(pick).toMatch(/^(front|right|back|left|top|bottom):\d+:\d+$/);
  await expect(page.getByRole('gridcell', { name: getRevealedCanvasPickLabel(pick!) })).toBeVisible();
});

test('uses canvas raycasting to flag the picked Cube Mode coordinate', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /cube mode/i }).click();
  await page.getByRole('button', { name: /flag mode/i }).click();

  const canvas = page.getByLabel(/interactive cube board/i);
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();

  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);

  await expect.poll(() => canvas.getAttribute('data-last-pick')).toMatch(/^(front|right|back|left|top|bottom):\d+:\d+$/);
  const pick = await canvas.getAttribute('data-last-pick');
  expect(pick).toMatch(/^(front|right|back|left|top|bottom):\d+:\d+$/);
  await expect(page.getByRole('gridcell', { name: getFlaggedCanvasPickLabel(pick!) })).toBeVisible();
});

test('dragging the Cube Mode canvas rotates without revealing the drag-start cell', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /cube mode/i }).click();

  const canvas = page.getByLabel(/interactive cube board/i);
  const stage = page.locator('.cube-stage');
  const beforeX = await stage.getAttribute('data-rotation-x');
  const beforeY = await stage.getAttribute('data-rotation-y');
  const revealedBefore = await page.getByRole('gridcell', { name: /revealed cube cell/i }).count();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();

  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 + 120, box!.y + box!.height / 2 + 20, { steps: 5 });
  await page.mouse.up();

  await expect.poll(() => stage.getAttribute('data-rotation-y')).not.toBe(beforeY);
  expect(await stage.getAttribute('data-rotation-x')).not.toBeNull();
  expect(beforeX).not.toBeNull();
  await expect(page.getByRole('gridcell', { name: /revealed cube cell/i })).toHaveCount(revealedBefore);
});

function getRevealedCanvasPickLabel(pick: string): RegExp {
  const [face, row, col] = pick.split(':');
  return new RegExp(`revealed cube cell ${face} row ${Number(row) + 1} column ${Number(col) + 1} surface`, 'i');
}

function getFlaggedCanvasPickLabel(pick: string): RegExp {
  const [face, row, col] = pick.split(':');
  return new RegExp(`flagged cube cell ${face} row ${Number(row) + 1} column ${Number(col) + 1} surface`, 'i');
}
```

- [ ] **Step 2: Run Playwright and verify the new tests pass**

Run:

```bash
npm run test:e2e
```

Expected: PASS. If a center click lands between cells at a specific viewport, adjust the click point to `box!.x + box!.width * 0.52` and `box!.y + box!.height * 0.52` in both canvas raycast tests, then rerun the command.

- [ ] **Step 3: Commit Task 5**

Run:

```bash
git add tests/minesweeper.spec.ts
git commit -m "test: cover cube canvas raycasting"
```

## Task 6: Full Verification And Cleanup

**Files:**
- Inspect: `src/components/CubeBoard.tsx`
- Inspect: `src/components/cubeBoardScene.ts`
- Inspect: `src/styles.css`
- Inspect: `tests/minesweeper.spec.ts`

- [ ] **Step 1: Search for removed CSS picking helpers**

Run:

```bash
rg -n "elementFromPoint|getFaceLocalPoint|getCellFromPoint|cube-stage-picking|cube-face-front|cube-face-back|cube-face-right|cube-face-left|cube-face-top|cube-face-bottom" src tests
```

Expected: no matches.

- [ ] **Step 2: Run the full local verification**

Run:

```bash
npm run verify
```

Expected: PASS for Vitest, TypeScript production build, Vite production build, and Playwright.

- [ ] **Step 3: Run dependency audit**

Run:

```bash
npm audit --audit-level=high
```

Expected: `found 0 vulnerabilities` or no high-severity vulnerabilities.

- [ ] **Step 4: Inspect final git diff**

Run:

```bash
git diff --stat main...HEAD
git diff -- src/components/CubeBoard.tsx src/components/cubeBoardScene.ts src/components/cubeBoardPicking.ts tests/minesweeper.spec.ts
```

Expected: changes are limited to the Three.js cube interaction redesign, tests, styles, dependency files, and docs already committed on this branch.

- [ ] **Step 5: Commit final verification notes if any tracked files changed**

Run:

```bash
git status --short
```

Expected: clean working tree. If formatting or lockfile normalization changed during verification, commit only those tracked changes:

```bash
git add -A
git commit -m "chore: finalize cube canvas interaction"
```
