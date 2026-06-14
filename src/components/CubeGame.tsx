import { Bomb, Flag, Gauge, RotateCcw, Timer, Undo2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { chordCubeCell, createInitialCubeGame, revealCubeCell, toggleCubeFlag } from '../game/cube/engine';
import { CUBE_PRESETS } from '../game/cube/presets';
import type { CubeCell, CubeGameState, CubePreset } from '../game/cube/types';
import CubeBoard, { type CubeRotation } from './CubeBoard';

const CUBE_BEST_TIMES_KEY = 'minesweeper.cubeBestTimes';
type CubeBestTimes = Partial<Record<string, number>>;
type CubeRotationDirection = 'left' | 'right' | 'up' | 'down';

interface CubeUndoSnapshot {
  game: CubeGameState;
  elapsedSeconds: number;
}

export default function CubeGame() {
  const [preset, setPreset] = useState<CubePreset>(CUBE_PRESETS.starter);
  const [game, setGame] = useState<CubeGameState>(() => createInitialCubeGame(CUBE_PRESETS.starter));
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [flagMode, setFlagMode] = useState(false);
  const [rotation, setRotation] = useState<CubeRotation>({ x: -24, y: -32 });
  const [bestTimes, setBestTimes] = useState<CubeBestTimes>(() => readCubeBestTimes());
  const [undoSnapshot, setUndoSnapshot] = useState<CubeUndoSnapshot | null>(null);

  useEffect(() => {
    if (game.status !== 'playing') {
      return;
    }

    const interval = window.setInterval(() => setElapsedSeconds((value) => Math.min(value + 1, 999)), 1000);
    return () => window.clearInterval(interval);
  }, [game.status]);

  useEffect(() => {
    if (game.status !== 'won') {
      return;
    }

    setBestTimes((current) => {
      const currentBest = current[preset.id];
      if (currentBest !== undefined && currentBest <= elapsedSeconds) {
        return current;
      }
      const next = { ...current, [preset.id]: elapsedSeconds };
      window.localStorage.setItem(CUBE_BEST_TIMES_KEY, JSON.stringify(next));
      return next;
    });
  }, [elapsedSeconds, game.status, preset.id]);

  useEffect(() => {
    function handleCubeKeyboardRotation(event: KeyboardEvent) {
      const direction = getCubeRotationDirection(event.key);

      if (!direction || isKeyboardInputTarget(event.target)) {
        return;
      }

      event.preventDefault();
      setRotation((value) => rotateCube(value, direction));
    }

    window.addEventListener('keydown', handleCubeKeyboardRotation);
    return () => window.removeEventListener('keydown', handleCubeKeyboardRotation);
  }, []);

  const remainingMines = Math.max(0, game.preset.mines - game.flaggedCount);
  const statusText = game.status === 'ready' ? 'Ready' : game.status === 'playing' ? 'Playing' : game.status === 'won' ? 'You won' : 'Mine hit';
  const bestTime = bestTimes[preset.id];

  function startNewGame(nextPreset = preset) {
    setPreset(nextPreset);
    setGame(createInitialCubeGame(nextPreset));
    setElapsedSeconds(0);
    setUndoSnapshot(null);
  }

  function changePreset(value: string) {
    const nextPreset = CUBE_PRESETS[value as keyof typeof CUBE_PRESETS];
    startNewGame(nextPreset);
  }

  function handleCellPrimary(cell: CubeCell) {
    if (flagMode) {
      setGame(toggleCubeFlag(game, cell));
      return;
    }

    const previousGame = game;
    const previousElapsedSeconds = elapsedSeconds;

    if (cell.depth === 0 && cell.isRevealed) {
      if (cell.surfaceNeighborMines > 0) {
        commitCubeGame(chordCubeCell(previousGame, cell), previousGame, previousElapsedSeconds);
      }
      return;
    }

    commitCubeGame(revealCubeCell(previousGame, cell), previousGame, previousElapsedSeconds);
  }

  function handleCellFlag(cell: CubeCell) {
    setGame(toggleCubeFlag(game, cell));
  }

  function commitCubeGame(nextGame: CubeGameState, previousGame: CubeGameState, previousElapsedSeconds: number) {
    if (previousGame.status !== 'lost' && nextGame.status === 'lost') {
      setUndoSnapshot({ game: previousGame, elapsedSeconds: previousElapsedSeconds });
    } else if (nextGame.status !== 'lost') {
      setUndoSnapshot(null);
    }

    setGame(nextGame);
  }

  function undoLastMove() {
    if (!undoSnapshot) {
      return;
    }

    setPreset(undoSnapshot.game.preset);
    setGame(undoSnapshot.game);
    setElapsedSeconds(undoSnapshot.elapsedSeconds);
    setUndoSnapshot(null);
  }

  return (
    <section className="game-panel cube-game-panel" aria-label="Cube Mode Minesweeper">
      <header className="game-header">
        <div>
          <p className="eyebrow">{preset.label}</p>
          <h1>Cube Mode</h1>
        </div>
        <button className="icon-button" type="button" onClick={() => startNewGame()} aria-label="New cube game">
          <RotateCcw aria-hidden="true" />
        </button>
      </header>

      <div className="control-strip">
        <label className="field-label">
          <span>Cube difficulty</span>
          <select aria-label="Cube difficulty" value={preset.id} onChange={(event) => changePreset(event.target.value)}>
            {Object.values(CUBE_PRESETS).map((cubePreset) => (
              <option value={cubePreset.id} key={cubePreset.id}>
                {cubePreset.label}
              </option>
            ))}
          </select>
        </label>

        <div className="cube-rotate-controls" aria-label="Cube rotation controls">
          <button type="button" onClick={() => setRotation((value) => rotateCube(value, 'left'))} aria-label="Rotate left">
            Left
          </button>
          <button type="button" onClick={() => setRotation((value) => rotateCube(value, 'right'))} aria-label="Rotate right">
            Right
          </button>
          <button type="button" onClick={() => setRotation((value) => rotateCube(value, 'up'))} aria-label="Rotate up">
            Up
          </button>
          <button type="button" onClick={() => setRotation((value) => rotateCube(value, 'down'))} aria-label="Rotate down">
            Down
          </button>
        </div>
      </div>

      <div className="hud">
        <Stat icon={<Bomb aria-hidden="true" />} label="Mines" value={formatCounter(remainingMines)} />
        <div className={`status-pill status-${game.status}`}>{statusText}</div>
        <Stat icon={<Timer aria-hidden="true" />} label="Time" value={formatCounter(elapsedSeconds)} />
      </div>

      <div className="sub-hud">
        <button className={`flag-toggle ${flagMode ? 'active' : ''}`} type="button" onClick={() => setFlagMode((value) => !value)} aria-pressed={flagMode}>
          <Flag aria-hidden="true" />
          Flag mode
        </button>
        <span className="best-time">
          <Gauge aria-hidden="true" />
          Best {bestTime === undefined ? '--' : `${bestTime}s`}
        </span>
      </div>

      <div className="cube-play-area">
        <CubeBoard game={game} rotation={rotation} onRotate={setRotation} onCellPrimary={handleCellPrimary} onCellFlag={handleCellFlag} />
      </div>

      {game.status === 'won' || game.status === 'lost' ? (
        <div className="result-banner" role="status">
          <strong>{game.status === 'won' ? 'Cube cleared' : 'Game over'}</strong>
          <span>{game.status === 'won' ? `Finished in ${elapsedSeconds} seconds.` : 'A mine ended the cube run.'}</span>
          <div className="result-actions">
            {game.status === 'lost' && undoSnapshot ? (
              <button type="button" onClick={undoLastMove} aria-label="Undo last cube move">
                <Undo2 aria-hidden="true" />
                Undo
              </button>
            ) : null}
            <button type="button" onClick={() => startNewGame()}>
              New game
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="stat">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatCounter(value: number): string {
  return String(Math.max(0, value)).padStart(3, '0');
}

function getCubeRotationDirection(key: string): CubeRotationDirection | null {
  if (key === 'ArrowLeft') {
    return 'left';
  }
  if (key === 'ArrowRight') {
    return 'right';
  }
  if (key === 'ArrowUp') {
    return 'up';
  }
  if (key === 'ArrowDown') {
    return 'down';
  }
  return null;
}

function rotateCube(rotation: CubeRotation, direction: CubeRotationDirection): CubeRotation {
  if (direction === 'left') {
    return { ...rotation, y: rotation.y - 90 };
  }
  if (direction === 'right') {
    return { ...rotation, y: rotation.y + 90 };
  }
  if (direction === 'up') {
    return { ...rotation, x: rotation.x + 90 };
  }
  return { ...rotation, x: rotation.x - 90 };
}

function isKeyboardInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement || target.isContentEditable;
}

function readCubeBestTimes(): CubeBestTimes {
  try {
    return JSON.parse(window.localStorage.getItem(CUBE_BEST_TIMES_KEY) ?? '{}') as CubeBestTimes;
  } catch {
    return {};
  }
}
