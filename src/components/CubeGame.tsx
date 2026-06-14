import { Bomb, Flag, Gauge, RotateCcw, Timer } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { createInitialCubeGame, revealCubeCell, toggleCubeFlag } from '../game/cube/engine';
import { CUBE_PRESETS } from '../game/cube/presets';
import type { CubeCell, CubeGameState, CubePreset } from '../game/cube/types';
import CubeBoard, { type CubeRotation } from './CubeBoard';
import DepthStackPopover from './DepthStackPopover';

const CUBE_BEST_TIMES_KEY = 'minesweeper.cubeBestTimes';
type CubeBestTimes = Partial<Record<string, number>>;

export default function CubeGame() {
  const [preset, setPreset] = useState<CubePreset>(CUBE_PRESETS.starter);
  const [game, setGame] = useState<CubeGameState>(() => createInitialCubeGame(CUBE_PRESETS.starter));
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [flagMode, setFlagMode] = useState(false);
  const [rotation, setRotation] = useState<CubeRotation>({ x: -24, y: -32 });
  const [selectedStackCell, setSelectedStackCell] = useState<CubeCell | null>(null);
  const [peekCell, setPeekCell] = useState<CubeCell | null>(null);
  const [bestTimes, setBestTimes] = useState<CubeBestTimes>(() => readCubeBestTimes());

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

  const remainingMines = Math.max(0, game.preset.mines - game.flaggedCount);
  const statusText = game.status === 'ready' ? 'Ready' : game.status === 'playing' ? 'Playing' : game.status === 'won' ? 'You won' : 'Mine hit';
  const bestTime = bestTimes[preset.id];

  function startNewGame(nextPreset = preset) {
    setPreset(nextPreset);
    setGame(createInitialCubeGame(nextPreset));
    setElapsedSeconds(0);
    setSelectedStackCell(null);
    setPeekCell(null);
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

    if (cell.depth === 0 && cell.isRevealed && cell.depthMineCount > 0) {
      setSelectedStackCell(cell);
      return;
    }

    setGame(revealCubeCell(game, cell));
  }

  function handleCellFlag(cell: CubeCell) {
    setGame(toggleCubeFlag(game, cell));
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
          <button type="button" onClick={() => setRotation((value) => ({ ...value, y: value.y - 90 }))} aria-label="Rotate left">
            Left
          </button>
          <button type="button" onClick={() => setRotation((value) => ({ ...value, y: value.y + 90 }))} aria-label="Rotate right">
            Right
          </button>
          <button type="button" onClick={() => setRotation((value) => ({ ...value, x: value.x + 90 }))} aria-label="Rotate up">
            Up
          </button>
          <button type="button" onClick={() => setRotation((value) => ({ ...value, x: value.x - 90 }))} aria-label="Rotate down">
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
        {peekCell?.depthMineCount ? <span className="depth-peek">Depth {peekCell.depthMineCount}</span> : null}
      </div>

      <div className="cube-play-area">
        <CubeBoard game={game} rotation={rotation} onRotate={setRotation} onCellPrimary={handleCellPrimary} onCellFlag={handleCellFlag} onPeek={setPeekCell} />
        {selectedStackCell ? (
          <DepthStackPopover game={game} surfaceCell={selectedStackCell} onReveal={handleCellPrimary} onFlag={handleCellFlag} onClose={() => setSelectedStackCell(null)} />
        ) : null}
      </div>
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
  return String(Math.max(0, Math.min(999, value))).padStart(3, '0');
}

function readCubeBestTimes(): CubeBestTimes {
  try {
    return JSON.parse(window.localStorage.getItem(CUBE_BEST_TIMES_KEY) ?? '{}') as CubeBestTimes;
  } catch {
    return {};
  }
}
