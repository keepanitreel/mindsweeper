import type { CubeCell } from '../game/cube/types';

interface CubeCellButtonProps {
  cell: CubeCell;
  onPrimary: (cell: CubeCell) => void;
  onFlag: (cell: CubeCell) => void;
}

export default function CubeCellButton({ cell, onPrimary, onFlag }: CubeCellButtonProps) {
  return (
    <button
      type="button"
      role="gridcell"
      className={getCubeCellClass(cell)}
      onClick={() => onPrimary(cell)}
      onContextMenu={(event) => {
        event.preventDefault();
        onFlag(cell);
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

  return `Revealed ${base} with ${cell.surfaceNeighborMines} surface mines`;
}
