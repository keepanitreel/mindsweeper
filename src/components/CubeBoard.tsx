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
  onPeek: (cell: CubeCell | null) => void;
}

export default function CubeBoard({ game, rotation, onRotate, onCellPrimary, onCellFlag, onPeek }: CubeBoardProps) {
  const dragStart = useRef<{ x: number; y: number; rotation: CubeRotation } | null>(null);
  const boardStyle = {
    '--cube-size': game.preset.size,
    '--cube-rotate-x': `${rotation.x}deg`,
    '--cube-rotate-y': `${rotation.y}deg`,
  } as CSSProperties;

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
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
              <CubeCellButton key={cell.id} cell={cell} onPrimary={onCellPrimary} onFlag={onCellFlag} onPeek={onPeek} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
