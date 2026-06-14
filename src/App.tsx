import { Box, Grid2X2 } from 'lucide-react';
import { useState } from 'react';
import ClassicGame from './components/ClassicGame';

type GameMode = 'classic' | 'cube';

export default function App() {
  const [mode, setMode] = useState<GameMode>('classic');

  return (
    <main className="app-shell">
      <div className="mode-shell">
        <nav className="mode-switch" aria-label="Game mode">
          <button className={mode === 'classic' ? 'active' : ''} type="button" onClick={() => setMode('classic')} aria-pressed={mode === 'classic'}>
            <Grid2X2 aria-hidden="true" />
            Classic
          </button>
          <button className={mode === 'cube' ? 'active' : ''} type="button" onClick={() => setMode('cube')} aria-pressed={mode === 'cube'}>
            <Box aria-hidden="true" />
            Cube Mode
          </button>
        </nav>

        {mode === 'classic' ? <ClassicGame /> : <CubeModeShell />}
      </div>
    </main>
  );
}

function CubeModeShell() {
  return (
    <section className="game-panel cube-game-panel" aria-label="Cube Mode Minesweeper">
      <header className="game-header">
        <div>
          <p className="eyebrow">Starter Cube</p>
          <h1>Cube Mode</h1>
        </div>
      </header>
    </section>
  );
}
