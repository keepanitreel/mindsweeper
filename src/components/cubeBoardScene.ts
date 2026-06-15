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
  let currentRotation: CubeRotation = { x: 0, y: 0 };

  scene.background = new THREE.Color('#071a12');
  camera.position.set(0, 0, 8);
  scene.add(new THREE.AmbientLight('#ffffff', 1.8));
  scene.add(cubeGroup);

  function updateGame(game: CubeGameState) {
    scene.remove(cubeGroup);
    disposeObject3D(cubeGroup);
    cubeGroup = buildCubeCellGroup(game);
    applyCubeRotation(cubeGroup, currentRotation);
    scene.add(cubeGroup);
    render();
  }

  function updateRotation(rotation: CubeRotation) {
    currentRotation = { ...rotation };
    applyCubeRotation(cubeGroup, currentRotation);
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

    const hit = raycaster.intersectObjects(cubeGroup.children, true)[0];

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
    faceGroup.add(createFaceBackingMesh(face));

    const cellSize = (FACE_SIZE - CELL_GAP * (game.preset.size - 1)) / game.preset.size;
    for (let row = 0; row < game.preset.size; row += 1) {
      for (let col = 0; col < game.preset.size; col += 1) {
        const cell = game.board[face][0][row][col];
        const texture = createCellTexture(cell);
        const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true });
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

function createFaceBackingMesh(face: CubeFace): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(FACE_SIZE, FACE_SIZE);
  const material = new THREE.MeshBasicMaterial({
    depthWrite: false,
    opacity: 0,
    side: THREE.DoubleSide,
    transparent: true,
  });
  const mesh = new THREE.Mesh(geometry, material);

  mesh.name = `cube-face-${face}-backing`;
  mesh.userData = { kind: 'cube-face-backing', face };

  return mesh;
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
    alpha: true,
    antialias: true,
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

function applyCubeRotation(group: THREE.Group, rotation: CubeRotation): void {
  group.rotation.x = THREE.MathUtils.degToRad(rotation.x);
  group.rotation.y = THREE.MathUtils.degToRad(rotation.y);
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
