import type { CSSProperties, MouseEvent, PointerEvent } from 'react';
import { useRef } from 'react';
import { CUBE_FACES } from '../game/cube/geometry';
import type { CubeCell, CubeFace, CubeGameState } from '../game/cube/types';
import CubeCellButton from './CubeCellButton';

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

export default function CubeBoard({ game, rotation, onRotate, onCellPrimary, onCellFlag, onPeek }: CubeBoardProps) {
  const dragStart = useRef<{ x: number; y: number; rotation: CubeRotation } | null>(null);
  const boardStyle = {
    '--cube-size': game.preset.size,
    '--cube-cell-size': getCubeCellSize(game.preset.size),
    '--cube-rotate-x': `${rotation.x}deg`,
    '--cube-rotate-y': `${rotation.y}deg`,
  } as CSSProperties;

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    const isButtonTarget = event.target instanceof Element && event.target.closest('button');
    if (event.button !== 0 || getCellFromPoint(event.currentTarget, game, event.clientX, event.clientY) || isButtonTarget) {
      return;
    }

    dragStart.current = { x: event.clientX, y: event.clientY, rotation };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragStart.current) {
      return;
    }

    const deltaX = event.clientX - dragStart.current.x;
    const deltaY = event.clientY - dragStart.current.y;
    onRotate({
      x: dragStart.current.rotation.x - deltaY * 0.35,
      y: dragStart.current.rotation.y + deltaX * 0.35,
    });
  }

  function handlePointerUp() {
    dragStart.current = null;
  }

  function handleClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (event.detail === 0) {
      return;
    }

    const cell = getCellFromPoint(event.currentTarget, game, event.clientX, event.clientY);
    if (!cell) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onCellPrimary(cell);
  }

  function handleContextMenuCapture(event: MouseEvent<HTMLDivElement>) {
    const cell = getCellFromPoint(event.currentTarget, game, event.clientX, event.clientY);
    if (!cell) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onCellFlag(cell);
  }

  function handlePointerMoveCapture(event: PointerEvent<HTMLDivElement>) {
    if (dragStart.current) {
      return;
    }

    onPeek(getCellFromPoint(event.currentTarget, game, event.clientX, event.clientY));
  }

  return (
    <div
      className="cube-stage"
      style={boardStyle}
      onPointerDown={handlePointerDown}
      onPointerMoveCapture={handlePointerMoveCapture}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={() => onPeek(null)}
      onClickCapture={handleClickCapture}
      onContextMenuCapture={handleContextMenuCapture}
    >
      <div className="cube" aria-label={`${game.preset.label} cube board`}>
        {CUBE_FACES.map((face) => (
          <div className={`cube-face cube-face-${face}`} role="grid" aria-label={`${face} cube face`} key={face}>
            {game.board[face][0].flat().map((cell) => (
              <CubeCellButton key={cell.id} cell={cell} onPrimary={onCellPrimary} onFlag={onCellFlag} onPeek={onPeek} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function getCellFromPoint(stage: HTMLDivElement, game: CubeGameState, clientX: number, clientY: number): CubeCell | null {
  const face = getFaceFromPoint(stage, clientX, clientY);
  const faceName = face ? getFaceName(face) : null;
  const localPoint = face ? getFaceLocalPoint(face, clientX, clientY) : null;

  if (!face || !faceName || !localPoint) {
    return null;
  }

  const cell = face?.querySelector<HTMLElement>('.cube-cell');
  if (!cell) {
    return null;
  }

  const faceStyle = getComputedStyle(face);
  const gridX = localPoint.x - (parseCssPixel(faceStyle.paddingLeft) ?? 0);
  const gridY = localPoint.y - (parseCssPixel(faceStyle.paddingTop) ?? 0);
  const strideX = cell.offsetWidth + (parseCssPixel(faceStyle.columnGap) ?? 0);
  const strideY = cell.offsetHeight + (parseCssPixel(faceStyle.rowGap) ?? 0);
  const col = Math.floor(gridX / strideX);
  const row = Math.floor(gridY / strideY);
  const cellX = gridX - col * strideX;
  const cellY = gridY - row * strideY;

  if (row < 0 || row >= game.preset.size || col < 0 || col >= game.preset.size) {
    return null;
  }

  if (cellX < 0 || cellX > cell.offsetWidth || cellY < 0 || cellY > cell.offsetHeight) {
    return null;
  }

  return game.board[faceName][0][row][col];
}

function getFaceFromPoint(stage: HTMLDivElement, clientX: number, clientY: number): HTMLElement | null {
  const elementFromPoint = stage.ownerDocument.elementFromPoint;
  if (!elementFromPoint) {
    return null;
  }

  stage.classList.add('cube-stage-picking');

  try {
    const element = elementFromPoint.call(stage.ownerDocument, clientX, clientY);
    const face = element instanceof Element ? element.closest<HTMLElement>('.cube-face') : null;
    return face && stage.contains(face) ? face : null;
  } finally {
    stage.classList.remove('cube-stage-picking');
  }
}

function getFaceName(face: HTMLElement): CubeFace | null {
  return CUBE_FACES.find((cubeFace) => face.classList.contains(`cube-face-${cubeFace}`)) ?? null;
}

function getFaceLocalPoint(face: HTMLElement, clientX: number, clientY: number): { x: number; y: number } | null {
  const view = face.ownerDocument.defaultView;
  if (!view) {
    return null;
  }

  let point: { x: number; y: number } | null = null;
  face.addEventListener(
    'mousemove',
    (event) => {
      point = { x: event.offsetX, y: event.offsetY };
      event.stopImmediatePropagation();
    },
    { capture: true, once: true },
  );
  face.dispatchEvent(new view.MouseEvent('mousemove', { clientX, clientY, bubbles: false, view }));

  return point;
}

function parseCssPixel(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
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
