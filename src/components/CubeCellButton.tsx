import { useRef } from 'react';
import type { CubeCell } from '../game/cube/types';

interface CubeCellButtonProps {
  cell: CubeCell;
  onPrimary: (cell: CubeCell) => void;
  onFlag: (cell: CubeCell) => void;
  onPeek: (cell: CubeCell | null) => void;
}

export default function CubeCellButton({ cell, onPrimary, onFlag, onPeek }: CubeCellButtonProps) {
  const touchPeekTimer = useRef<number | null>(null);
  const suppressNextFocusPeek = useRef(false);

  function clearTouchPeek() {
    if (touchPeekTimer.current !== null) {
      window.clearTimeout(touchPeekTimer.current);
      touchPeekTimer.current = null;
    }

    onPeek(null);
  }

  return (
    <button
      type="button"
      role="gridcell"
      className={getCubeCellClass(cell)}
      onClick={() => {
        suppressNextFocusPeek.current = false;
        onPrimary(cell);
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        onFlag(cell);
      }}
      onMouseEnter={() => onPeek(cell)}
      onMouseLeave={() => onPeek(null)}
      onFocus={() => {
        if (!suppressNextFocusPeek.current) {
          onPeek(cell);
        }
      }}
      onBlur={() => {
        suppressNextFocusPeek.current = false;
        onPeek(null);
      }}
      onPointerDown={(event) => {
        suppressNextFocusPeek.current = true;

        if (event.pointerType === 'touch') {
          touchPeekTimer.current = window.setTimeout(() => {
            touchPeekTimer.current = null;
            onPeek(cell);
          }, 450);
        }
      }}
      onPointerUp={(event) => {
        if (event.pointerType === 'touch') {
          clearTouchPeek();
        }
      }}
      onPointerCancel={(event) => {
        if (event.pointerType === 'touch') {
          clearTouchPeek();
        }
      }}
      aria-label={getCubeCellLabel(cell)}
    >
      {getCubeCellContent(cell)}
    </button>
  );
}

function getCubeCellClass(cell: CubeCell): string {
  return [
    'cube-cell',
    cell.isRevealed ? 'revealed' : 'covered',
    cell.isFlagged ? 'flagged' : '',
    cell.isExploded ? 'exploded' : '',
    cell.isIncorrectFlag ? 'wrong-flag' : '',
    cell.depthMineCount > 0 && cell.depth === 0 ? 'has-depth' : '',
    cell.isRevealed && cell.depth === 0 && cell.surfaceNeighborMines > 0 ? `number-${cell.surfaceNeighborMines}` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function getCubeCellContent(cell: CubeCell) {
  if (cell.isFlagged && !cell.isIncorrectFlag) {
    return <span className="cube-flag">⚑</span>;
  }

  if (cell.isIncorrectFlag) {
    return <span className="cube-wrong">×</span>;
  }

  if (!cell.isRevealed) {
    return null;
  }

  if (cell.hasMine) {
    return <span className="cube-mine">✹</span>;
  }

  return (
    <>
      {cell.surfaceNeighborMines > 0 ? <span className="cube-surface-number">{cell.surfaceNeighborMines}</span> : null}
      {cell.depth === 0 && cell.depthMineCount > 0 ? <span className="cube-depth-marker">{cell.depthMineCount}</span> : null}
    </>
  );
}

function getCubeCellLabel(cell: CubeCell): string {
  const layer = cell.depth === 0 ? 'surface' : `depth ${cell.depth}`;
  const base = `cube cell ${cell.face} row ${cell.row + 1} column ${cell.col + 1} ${layer}`;

  if (cell.isFlagged) {
    return `Flagged ${base}`;
  }

  if (!cell.isRevealed) {
    return `Covered ${base}`;
  }

  if (cell.hasMine) {
    return `Mine ${base}`;
  }

  return `Revealed ${base} with ${cell.surfaceNeighborMines} surface mines and ${cell.depthMineCount} depth mines`;
}
