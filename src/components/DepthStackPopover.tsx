import type { CubeCell, CubeCoordinate, CubeGameState } from '../game/cube/types';
import { getDepthStackCoordinates } from '../game/cube/geometry';
import CubeCellButton from './CubeCellButton';

interface DepthStackPopoverProps {
  game: CubeGameState;
  surfaceCell: CubeCell;
  onReveal: (cell: CubeCell) => void;
  onFlag: (cell: CubeCell) => void;
  onClose: () => void;
}

export default function DepthStackPopover({ game, surfaceCell, onReveal, onFlag, onClose }: DepthStackPopoverProps) {
  const stack = getDepthStackCoordinates(surfaceCell, game.preset.hiddenDepth).map(
    (coordinate: CubeCoordinate) => game.board[coordinate.face][coordinate.depth][coordinate.row][coordinate.col],
  );

  return (
    <aside className="depth-popover" aria-label={`Depth stack for ${surfaceCell.face} row ${surfaceCell.row + 1} column ${surfaceCell.col + 1}`}>
      <div className="depth-popover-header">
        <strong>Depth stack</strong>
        <button type="button" onClick={onClose} aria-label="Close depth stack">
          ×
        </button>
      </div>
      <div className="depth-stack-grid" role="grid">
        {stack.map((cell) => (
          <CubeCellButton key={cell.id} cell={cell} onPrimary={onReveal} onFlag={onFlag} onPeek={() => undefined} />
        ))}
      </div>
    </aside>
  );
}
