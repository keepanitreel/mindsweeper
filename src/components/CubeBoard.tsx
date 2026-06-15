import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent, PointerEvent } from 'react';
import { CUBE_FACES } from '../game/cube/geometry';
import type { CubeCell, CubeGameState } from '../game/cube/types';
import CubeCellButton from './CubeCellButton';
import { hasPointerDragged, snapCubeRotation, type CubeSurfacePick, type PointerPosition } from './cubeBoardPicking';
import { createCubeBoardScene, type CubeBoardSceneController } from './cubeBoardScene';

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
    '--cube-rotate-x': `${rotation.x}deg`,
    '--cube-rotate-y': `${rotation.y}deg`,
  } as CSSProperties;

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) {
      return;
    }

    if (!hasWebGLSupport(canvas)) {
      setCanvasFailed(true);
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

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
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

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
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

  function handlePointerUp(event: PointerEvent<HTMLCanvasElement>) {
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

  function handlePointerCancel(event: PointerEvent<HTMLCanvasElement>) {
    if (pointerState.current?.pointerId === event.pointerId) {
      pointerState.current = null;
    }
  }

  function handleContextMenu(event: MouseEvent<HTMLCanvasElement>) {
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

function hasWebGLSupport(canvas: HTMLCanvasElement): boolean {
  const view = canvas.ownerDocument.defaultView;

  return Boolean(view?.WebGLRenderingContext || view?.WebGL2RenderingContext);
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
