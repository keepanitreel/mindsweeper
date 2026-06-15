import { Profiler } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { createInitialCubeGame } from '../game/cube/engine';
import { CUBE_PRESETS } from '../game/cube/presets';
import type { CubeCell, CubeGameState } from '../game/cube/types';
import CubeBoard, { type CubeRotation } from './CubeBoard';
import { createCubeBoardScene, type CubeBoardSceneController } from './cubeBoardScene';

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
const originalWebGL2RenderingContext = window.WebGL2RenderingContext;

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
    setWebGLSupport(true);
  });

  afterAll(() => {
    window.PointerEvent = originalPointerEvent;
    Object.defineProperty(window, 'WebGLRenderingContext', {
      configurable: true,
      value: originalWebGLRenderingContext,
    });
    Object.defineProperty(window, 'WebGL2RenderingContext', {
      configurable: true,
      value: originalWebGL2RenderingContext,
    });
  });

  beforeEach(() => {
    setWebGLSupport(true);
    vi.mocked(createCubeBoardScene).mockClear();
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

  it('initializes the scene on mount with game, rotation, and stage size', () => {
    renderBoard();

    const canvas = screen.getByLabelText(/interactive cube board/i);

    expect(createCubeBoardScene).toHaveBeenCalledWith(canvas);
    expect(sceneMock.controller!.updateGame).toHaveBeenCalledTimes(1);
    expect(sceneMock.controller!.updateGame).toHaveBeenCalledWith(game);
    expect(sceneMock.controller!.updateRotation).toHaveBeenCalledTimes(1);
    expect(sceneMock.controller!.updateRotation).toHaveBeenCalledWith({ x: -24, y: -32 });
    expect(sceneMock.controller!.resize).toHaveBeenCalledWith(600, 600);
  });

  it('updates the scene when a new game is rendered', () => {
    const view = renderBoard();
    const nextGame = createInitialCubeGame(CUBE_PRESETS.standard);
    sceneMock.controller!.updateGame.mockClear();

    view.rerender(renderBoardElement({ game: nextGame }));

    expect(sceneMock.controller!.updateGame).toHaveBeenCalledTimes(1);
    expect(sceneMock.controller!.updateGame).toHaveBeenCalledWith(nextGame);
  });

  it('updates the scene when a new rotation is rendered', () => {
    const view = renderBoard();
    const nextRotation = { x: 0, y: 90 };
    sceneMock.controller!.updateRotation.mockClear();

    view.rerender(renderBoardElement({ rotation: nextRotation }));

    expect(sceneMock.controller!.updateRotation).toHaveBeenCalledTimes(1);
    expect(sceneMock.controller!.updateRotation).toHaveBeenCalledWith(nextRotation);
  });

  it('disposes the scene on unmount', () => {
    const view = renderBoard();

    view.unmount();

    expect(sceneMock.controller!.dispose).toHaveBeenCalledTimes(1);
  });

  it('shows the accessible fallback without creating a scene when WebGL is unavailable', () => {
    setWebGLSupport(false);

    renderBoard();

    expect(createCubeBoardScene).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/accessible cube board/i)).toHaveClass('visible');
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
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 30, clientY: 40 });
    fireEvent(canvas, event);

    expect(onCellFlag).toHaveBeenCalledWith(game.board.right[0][2][3]);
    expect(event.defaultPrevented).toBe(true);
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

  it('ignores drag movement from a different pointer', () => {
    renderBoard();

    const canvas = screen.getByLabelText(/interactive cube board/i);
    fireEvent.pointerDown(canvas, { button: 0, pointerId: 1, clientX: 20, clientY: 20 });
    fireEvent.pointerMove(canvas, { pointerId: 2, clientX: 50, clientY: 20 });
    fireEvent.pointerUp(canvas, { button: 0, pointerId: 1, clientX: 20, clientY: 20 });

    expect(onRotate).not.toHaveBeenCalled();
  });

  it('does not rerender for repeated equivalent canvas picks', () => {
    const onRender = vi.fn();
    sceneMock.controller!.pickCell.mockImplementation(() => ({ face: 'top', row: 0, col: 2, depth: 0 }));
    render(<Profiler id="cube-board" onRender={onRender}>{renderBoardElement()}</Profiler>);

    const canvas = screen.getByLabelText(/interactive cube board/i);
    onRender.mockClear();

    fireEvent.pointerMove(canvas, { clientX: 30, clientY: 40 });
    expect(canvas).toHaveAttribute('data-last-pick', 'top:0:2');

    fireEvent.pointerMove(canvas, { clientX: 31, clientY: 41 });
    expect(canvas).toHaveAttribute('data-last-pick', 'top:0:2');
    expect(onRender).toHaveBeenCalledTimes(1);
  });

  it('keeps real grid buttons for non-pointer interaction', () => {
    renderBoard();

    fireEvent.click(screen.getByRole('gridcell', { name: /covered cube cell front row 2 column 2 surface/i }));

    expect(onCellPrimary).toHaveBeenCalledWith(game.board.front[0][1][1]);
  });

  function renderBoard(props: Partial<{ game: CubeGameState; rotation: CubeRotation }> = {}) {
    return render(renderBoardElement(props));
  }

  function renderBoardElement({ game: boardGame = game, rotation = { x: -24, y: -32 } }: Partial<{ game: CubeGameState; rotation: CubeRotation }> = {}) {
    return (
      <CubeBoard
        game={boardGame}
        rotation={rotation}
        onRotate={onRotate}
        onCellPrimary={onCellPrimary}
        onCellFlag={onCellFlag}
        onPeek={onPeek}
      />
    );
  }
});

function setWebGLSupport(enabled: boolean) {
  Object.defineProperty(window, 'WebGLRenderingContext', {
    configurable: true,
    value: enabled ? class TestWebGLRenderingContext {} : undefined,
  });
  Object.defineProperty(window, 'WebGL2RenderingContext', {
    configurable: true,
    value: enabled ? class TestWebGL2RenderingContext {} : undefined,
  });
}
