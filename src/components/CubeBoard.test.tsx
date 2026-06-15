import { fireEvent, render, screen } from '@testing-library/react';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { createInitialCubeGame } from '../game/cube/engine';
import { CUBE_PRESETS } from '../game/cube/presets';
import type { CubeCell, CubeGameState } from '../game/cube/types';
import CubeBoard, { type CubeRotation } from './CubeBoard';
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

const originalPointerEvent = window.PointerEvent;
const originalWebGLRenderingContext = window.WebGLRenderingContext;

class TestPointerEvent extends MouseEvent {
  pointerId: number;

  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 0;
  }
}

describe('CubeBoard Three.js bridge', () => {
  let game: CubeGameState;
  let onRotate: Mock<(rotation: CubeRotation) => void>;
  let onCellPrimary: Mock<(cell: CubeCell) => void>;
  let onCellFlag: Mock<(cell: CubeCell) => void>;
  let onPeek: Mock<(cell: CubeCell | null) => void>;

  beforeAll(() => {
    window.PointerEvent = TestPointerEvent as typeof PointerEvent;
    Object.defineProperty(window, 'WebGLRenderingContext', {
      configurable: true,
      value: class TestWebGLRenderingContext {},
    });
  });

  afterAll(() => {
    window.PointerEvent = originalPointerEvent;
    Object.defineProperty(window, 'WebGLRenderingContext', {
      configurable: true,
      value: originalWebGLRenderingContext,
    });
  });

  beforeEach(() => {
    game = createInitialCubeGame(CUBE_PRESETS.starter);
    onRotate = vi.fn<(rotation: CubeRotation) => void>();
    onCellPrimary = vi.fn<(cell: CubeCell) => void>();
    onCellFlag = vi.fn<(cell: CubeCell) => void>();
    onPeek = vi.fn<(cell: CubeCell | null) => void>();
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
