import type { CSSProperties, PointerEvent } from 'react';
import { useRef } from 'react';
import { CUBE_FACES } from '../game/cube/geometry';
import type { CubeCell, CubeGameState } from '../game/cube/types';
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
}

export default function CubeBoard({ game, rotation, onRotate, onCellPrimary, onCellFlag }: CubeBoardProps) {
  const dragStart = useRef<{ x: number; y: number; rotation: CubeRotation } | null>(null);
  const boardStyle = {
    '--cube-size': game.preset.size,
    '--cube-cell-size': getCubeCellSize(game.preset.size),
    '--cube-rotate-x': `${rotation.x}deg`,
    '--cube-rotate-y': `${rotation.y}deg`,
  } as CSSProperties;

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.target instanceof Element && event.target.closest('button')) {
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

  return (
    <div
      className="cube-stage"
      style={boardStyle}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="cube" aria-label={`${game.preset.label} cube board`}>
        {CUBE_FACES.map((face) => (
          <div className={`cube-face cube-face-${face}`} role="grid" aria-label={`${face} cube face`} key={face}>
            {game.board[face][0].flat().map((cell) => (
              <CubeCellButton key={cell.id} cell={cell} onPrimary={onCellPrimary} onFlag={onCellFlag} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
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
