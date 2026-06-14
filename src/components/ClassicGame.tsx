import { Bomb, Flag, Gauge, RotateCcw, Timer, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { chordCell, createInitialGame, revealCell, toggleFlag } from '../game/engine';
import { DIFFICULTY_PRESETS, validateCustomDifficulty } from '../game/presets';
import type { Cell, Difficulty, DifficultyId, GameState } from '../game/types';

const BEST_TIMES_KEY = 'minesweeper.bestTimes';

type BestTimes = Partial<Record<DifficultyId, number>>;

const presetList = [DIFFICULTY_PRESETS.easy, DIFFICULTY_PRESETS.medium, DIFFICULTY_PRESETS.expert];

interface UndoSnapshot {
  game: GameState;
  elapsedSeconds: number;
}

export default function ClassicGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>(DIFFICULTY_PRESETS.easy);
  const [game, setGame] = useState<GameState>(() => createInitialGame(DIFFICULTY_PRESETS.easy));
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [flagMode, setFlagMode] = useState(false);
  const [customWidth, setCustomWidth] = useState(12);
  const [customHeight, setCustomHeight] = useState(10);
  const [customMines, setCustomMines] = useState(20);
  const [customError, setCustomError] = useState('');
  const [bestTimes, setBestTimes] = useState<BestTimes>(() => readBestTimes());
  const [undoSnapshot, setUndoSnapshot] = useState<UndoSnapshot | null>(null);

  useEffect(() => {
    if (game.status !== 'playing') {
      return;
    }

    const interval = window.setInterval(() => {
      setElapsedSeconds((value) => Math.min(value + 1, 999));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [game.status]);

  useEffect(() => {
    if (game.status !== 'won') {
      return;
    }

    setBestTimes((current) => {
      const currentBest = current[difficulty.id];
      if (currentBest !== undefined && currentBest <= elapsedSeconds) {
        return current;
      }

      const next = { ...current, [difficulty.id]: elapsedSeconds };
      window.localStorage.setItem(BEST_TIMES_KEY, JSON.stringify(next));
      return next;
    });
  }, [difficulty.id, elapsedSeconds, game.status]);

  const remainingMines = Math.max(0, game.difficulty.mines - game.flaggedCount);
  const statusText = game.status === 'ready' ? 'Ready' : game.status === 'playing' ? 'Playing' : game.status === 'won' ? 'You won' : 'Mine hit';
  const bestTime = bestTimes[difficulty.id];

  function startNewGame(nextDifficulty = difficulty) {
    setDifficulty(nextDifficulty);
    setGame(createInitialGame(nextDifficulty));
    setElapsedSeconds(0);
    setCustomError('');
    setUndoSnapshot(null);
  }

  function changeDifficulty(value: string) {
    if (value === 'custom') {
      const result = validateCustomDifficulty({ width: customWidth, height: customHeight, mines: customMines });
      if (!result.ok) {
        setCustomError(result.error);
        return;
      }

      startNewGame(result.value);
      return;
    }

    const nextDifficulty = DIFFICULTY_PRESETS[value as keyof typeof DIFFICULTY_PRESETS];
    startNewGame(nextDifficulty);
  }

  function applyCustomGame() {
    const result = validateCustomDifficulty({ width: customWidth, height: customHeight, mines: customMines });
    if (!result.ok) {
      setCustomError(result.error);
      return;
    }

    startNewGame(result.value);
  }

  function handleCellPrimary(cell: Cell) {
    if (flagMode) {
      setGame(toggleFlag(game, cell));
      return;
    }

    const previousGame = game;
    const previousElapsedSeconds = elapsedSeconds;
    let nextGame: GameState;

    if (cell.isRevealed) {
      nextGame = chordCell(previousGame, cell);
    } else {
      nextGame = revealCell(previousGame, cell);
    }

    if (previousGame.status !== 'lost' && nextGame.status === 'lost') {
      setUndoSnapshot({ game: previousGame, elapsedSeconds: previousElapsedSeconds });
    } else if (nextGame.status !== 'lost') {
      setUndoSnapshot(null);
    }

    setGame(nextGame);
  }

  function handleContextMenu(event: MouseEvent, cell: Cell) {
    event.preventDefault();
    setGame(toggleFlag(game, cell));
  }

  function undoLastMove() {
    if (!undoSnapshot) {
      return;
    }

    setDifficulty(undoSnapshot.game.difficulty);
    setGame(undoSnapshot.game);
    setElapsedSeconds(undoSnapshot.elapsedSeconds);
    setUndoSnapshot(null);
  }

  const boardStyle = useMemo(
    () =>
      ({
        '--columns': game.difficulty.width,
        '--rows': game.difficulty.height,
      }) as CSSProperties,
    [game.difficulty.height, game.difficulty.width],
  );

  return (
    <section className="game-panel" aria-label="Microsoft-style Minesweeper Classic Mode">
        <header className="game-header">
          <div>
            <p className="eyebrow">Classic Mode</p>
            <h1>Minesweeper</h1>
          </div>
          <div className="header-actions">
            <button className="icon-button" type="button" onClick={() => startNewGame()} aria-label="New game">
              <RotateCcw aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="control-strip">
          <label className="field-label">
            <span>Difficulty</span>
            <select aria-label="Difficulty" value={difficulty.isCustom ? 'custom' : difficulty.id} onChange={(event) => changeDifficulty(event.target.value)}>
              {presetList.map((preset) => (
                <option value={preset.id} key={preset.id}>
                  {preset.label}
                </option>
              ))}
              <option value="custom">Custom</option>
            </select>
          </label>

          <div className="custom-controls" aria-label="Custom board controls">
            <NumberField label="W" value={customWidth} min={5} max={30} onChange={setCustomWidth} />
            <NumberField label="H" value={customHeight} min={5} max={24} onChange={setCustomHeight} />
            <NumberField label="M" value={customMines} min={1} max={700} onChange={setCustomMines} />
            <button className="small-button" type="button" onClick={applyCustomGame}>
              Apply
            </button>
          </div>
        </div>

        {customError ? <p className="error-message">{customError}</p> : null}

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

        <div className="board-wrap">
          <div className="board" style={boardStyle} role="grid" aria-label={`${difficulty.label} Minesweeper board`}>
            {game.board.flat().map((cell) => (
              <button
                key={cell.id}
                type="button"
                role="gridcell"
                className={getCellClass(cell)}
                onClick={() => handleCellPrimary(cell)}
                onContextMenu={(event) => handleContextMenu(event, cell)}
                aria-label={getCellLabel(cell)}
              >
                {getCellContent(cell)}
              </button>
            ))}
          </div>
        </div>

        {game.status === 'won' || game.status === 'lost' ? (
          <div className="result-banner" role="status">
            <strong>{game.status === 'won' ? 'Board cleared' : 'Game over'}</strong>
            <span>{game.status === 'won' ? `Finished in ${elapsedSeconds} seconds.` : 'A mine ended the run.'}</span>
            <div className="result-actions">
              {game.status === 'lost' && undoSnapshot ? (
                <button type="button" onClick={undoLastMove} aria-label="Undo last move">
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

interface NumberFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

function NumberField({ label, value, min, max, onChange }: NumberFieldProps) {
  return (
    <label className="mini-field">
      <span>{label}</span>
      <input type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

interface StatProps {
  icon: ReactNode;
  label: string;
  value: string;
}

function Stat({ icon, label, value }: StatProps) {
  return (
    <div className="stat">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getCellClass(cell: Cell): string {
  return [
    'cell',
    cell.isRevealed ? 'revealed' : 'covered',
    cell.isFlagged ? 'flagged' : '',
    cell.isExploded ? 'exploded' : '',
    cell.isIncorrectFlag ? 'wrong-flag' : '',
    cell.isRevealed && !cell.hasMine && cell.neighborMines > 0 ? `number-${cell.neighborMines}` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function getCellContent(cell: Cell): string {
  if (cell.isFlagged && !cell.isIncorrectFlag) {
    return '⚑';
  }

  if (cell.isIncorrectFlag) {
    return '×';
  }

  if (!cell.isRevealed) {
    return '';
  }

  if (cell.hasMine) {
    return '✹';
  }

  return cell.neighborMines > 0 ? String(cell.neighborMines) : '';
}

function getCellLabel(cell: Cell): string {
  if (cell.isFlagged) {
    return `Flagged cell row ${cell.row + 1} column ${cell.col + 1}`;
  }

  if (!cell.isRevealed) {
    return `Covered cell row ${cell.row + 1} column ${cell.col + 1}`;
  }

  if (cell.hasMine) {
    return `Mine cell row ${cell.row + 1} column ${cell.col + 1}`;
  }

  return cell.neighborMines === 0
    ? `Empty cell row ${cell.row + 1} column ${cell.col + 1}`
    : `Cell row ${cell.row + 1} column ${cell.col + 1} with ${cell.neighborMines} neighboring mines`;
}

function formatCounter(value: number): string {
  return String(Math.max(0, Math.min(999, value))).padStart(3, '0');
}

function readBestTimes(): BestTimes {
  try {
    return JSON.parse(window.localStorage.getItem(BEST_TIMES_KEY) ?? '{}') as BestTimes;
  } catch {
    return {};
  }
}
