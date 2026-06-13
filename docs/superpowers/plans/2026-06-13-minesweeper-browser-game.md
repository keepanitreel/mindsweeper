# Minesweeper Browser Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-playable Microsoft Minesweeper-inspired Classic Mode game with tested game logic, polished React UI, and browser verification.

**Architecture:** Keep Minesweeper rules in framework-independent TypeScript modules under `src/game` and keep React responsible for rendering, timer lifecycle, storage, and input wiring. Implement the app test-first with Vitest for deterministic game behavior and Playwright for browser-level smoke coverage.

**Tech Stack:** React, TypeScript, Vite, Vitest, Testing Library, Playwright, CSS variables.

---

## File Structure

- Create `package.json`: scripts and dependencies for Vite, tests, build, and browser verification.
- Create `index.html`: Vite document entry.
- Create `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`: project configuration.
- Create `src/main.tsx`: React app mount.
- Create `src/App.tsx`: game container, state transitions, timer, local best times, and UI wiring.
- Create `src/App.test.tsx`: React interaction tests.
- Create `src/styles.css`: Microsoft Minesweeper-inspired visual system and responsive board layout.
- Create `src/game/types.ts`: shared game types.
- Create `src/game/presets.ts`: difficulty presets and custom validation.
- Create `src/game/presets.test.ts`: preset and custom validation tests.
- Create `src/game/engine.ts`: pure game engine for board creation, mine placement, reveal, flagging, chording, and status changes.
- Create `src/game/engine.test.ts`: deterministic game logic tests.
- Create `tests/minesweeper.spec.ts`: Playwright browser verification.

## Task 1: Scaffold Project Tooling

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`

- [ ] **Step 1: Create package and config files**

Add `package.json`:

```json
{
  "name": "microsoft-style-minesweeper",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview --host 127.0.0.1",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "verify": "npm run test && npm run build && npm run test:e2e"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^6.0.7",
    "typescript": "^5.7.2",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "lucide-react": "^0.468.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.1",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^19.0.1",
    "@types/react-dom": "^19.0.2",
    "jsdom": "^25.0.1",
    "vitest": "^2.1.8"
  }
}
```

Add `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Minesweeper</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Add `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src", "tests", "vite.config.ts", "vitest.config.ts", "playwright.config.ts"]
}
```

Add `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts", "vitest.config.ts", "playwright.config.ts"]
}
```

Add `vite.config.ts`:

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
});
```

Add `vitest.config.ts`:

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
});
```

Add `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  webServer: {
    command: 'npm run dev -- --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
});
```

Add `src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

Add temporary `src/App.tsx`:

```tsx
export default function App() {
  return (
    <main className="app-shell">
      <h1>Minesweeper</h1>
    </main>
  );
}
```

Add temporary `src/styles.css`:

```css
:root {
  color: #eef7df;
  background: #10261d;
  font-family: "Segoe UI", system-ui, sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}

.app-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
}
```

- [ ] **Step 2: Install dependencies**

Run:

```bash
npm install
```

Expected: `package-lock.json` is created and npm exits with code 0.

- [ ] **Step 3: Run baseline build**

Run:

```bash
npm run build
```

Expected: TypeScript and Vite complete successfully and create `dist/`.

- [ ] **Step 4: Commit scaffold**

Run:

```bash
git add package.json package-lock.json index.html tsconfig.json tsconfig.node.json vite.config.ts vitest.config.ts playwright.config.ts src/main.tsx src/App.tsx src/styles.css
git commit -m "chore: scaffold minesweeper web app"
```

Expected: commit succeeds.

## Task 2: Add Difficulty Preset Validation

**Files:**
- Create: `src/game/types.ts`
- Create: `src/game/presets.ts`
- Create: `src/game/presets.test.ts`
- Create: `src/test-setup.ts`

- [ ] **Step 1: Write failing preset tests**

Add `src/test-setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

Add `src/game/presets.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DIFFICULTY_PRESETS, validateCustomDifficulty } from './presets';

describe('difficulty presets', () => {
  it('matches classic Minesweeper dimensions', () => {
    expect(DIFFICULTY_PRESETS.easy).toEqual({
      id: 'easy',
      label: 'Easy',
      width: 9,
      height: 9,
      mines: 10,
      isCustom: false,
    });
    expect(DIFFICULTY_PRESETS.medium).toMatchObject({ width: 16, height: 16, mines: 40 });
    expect(DIFFICULTY_PRESETS.expert).toMatchObject({ width: 30, height: 16, mines: 99 });
  });

  it('accepts safe custom dimensions', () => {
    expect(validateCustomDifficulty({ width: 12, height: 10, mines: 20 })).toEqual({
      ok: true,
      value: {
        id: 'custom',
        label: 'Custom',
        width: 12,
        height: 10,
        mines: 20,
        isCustom: true,
      },
    });
  });

  it('rejects invalid custom dimensions and mine counts', () => {
    expect(validateCustomDifficulty({ width: 3, height: 9, mines: 4 })).toEqual({
      ok: false,
      error: 'Width must be between 5 and 30.',
    });
    expect(validateCustomDifficulty({ width: 9, height: 4, mines: 4 })).toEqual({
      ok: false,
      error: 'Height must be between 5 and 24.',
    });
    expect(validateCustomDifficulty({ width: 9, height: 9, mines: 80 })).toEqual({
      ok: false,
      error: 'Mines must leave at least 9 safe cells.',
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- src/game/presets.test.ts
```

Expected: FAIL because `src/game/presets.ts` does not exist.

- [ ] **Step 3: Implement preset types and validation**

Add `src/game/types.ts`:

```ts
export type DifficultyId = 'easy' | 'medium' | 'expert' | 'custom';

export interface Difficulty {
  id: DifficultyId;
  label: string;
  width: number;
  height: number;
  mines: number;
  isCustom: boolean;
}

export type GameStatus = 'ready' | 'playing' | 'won' | 'lost';

export interface Cell {
  id: string;
  row: number;
  col: number;
  hasMine: boolean;
  neighborMines: number;
  isRevealed: boolean;
  isFlagged: boolean;
  isExploded: boolean;
  isIncorrectFlag: boolean;
}

export type Board = Cell[][];

export interface GameState {
  difficulty: Difficulty;
  board: Board;
  status: GameStatus;
  isArmed: boolean;
  revealedCount: number;
  flaggedCount: number;
}

export interface Coordinate {
  row: number;
  col: number;
}
```

Add `src/game/presets.ts`:

```ts
import type { Difficulty } from './types';

export const DIFFICULTY_PRESETS = {
  easy: { id: 'easy', label: 'Easy', width: 9, height: 9, mines: 10, isCustom: false },
  medium: { id: 'medium', label: 'Medium', width: 16, height: 16, mines: 40, isCustom: false },
  expert: { id: 'expert', label: 'Expert', width: 30, height: 16, mines: 99, isCustom: false },
} as const satisfies Record<string, Difficulty>;

export const CUSTOM_LIMITS = {
  minWidth: 5,
  maxWidth: 30,
  minHeight: 5,
  maxHeight: 24,
  firstClickSafeCells: 9,
};

export type CustomDifficultyInput = Pick<Difficulty, 'width' | 'height' | 'mines'>;

export type CustomDifficultyResult =
  | { ok: true; value: Difficulty }
  | { ok: false; error: string };

export function validateCustomDifficulty(input: CustomDifficultyInput): CustomDifficultyResult {
  const width = Math.floor(input.width);
  const height = Math.floor(input.height);
  const mines = Math.floor(input.mines);

  if (width < CUSTOM_LIMITS.minWidth || width > CUSTOM_LIMITS.maxWidth) {
    return { ok: false, error: `Width must be between ${CUSTOM_LIMITS.minWidth} and ${CUSTOM_LIMITS.maxWidth}.` };
  }

  if (height < CUSTOM_LIMITS.minHeight || height > CUSTOM_LIMITS.maxHeight) {
    return { ok: false, error: `Height must be between ${CUSTOM_LIMITS.minHeight} and ${CUSTOM_LIMITS.maxHeight}.` };
  }

  const maxMines = width * height - CUSTOM_LIMITS.firstClickSafeCells;
  if (mines < 1) {
    return { ok: false, error: 'Mines must be at least 1.' };
  }

  if (mines > maxMines) {
    return { ok: false, error: `Mines must leave at least ${CUSTOM_LIMITS.firstClickSafeCells} safe cells.` };
  }

  return {
    ok: true,
    value: {
      id: 'custom',
      label: 'Custom',
      width,
      height,
      mines,
      isCustom: true,
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- src/game/presets.test.ts
```

Expected: PASS with 3 tests.

- [ ] **Step 5: Commit presets**

Run:

```bash
git add src/test-setup.ts src/game/types.ts src/game/presets.ts src/game/presets.test.ts
git commit -m "feat: add minesweeper difficulty presets"
```

Expected: commit succeeds.

## Task 3: Add Board Creation and Mine Placement

**Files:**
- Create: `src/game/engine.ts`
- Create: `src/game/engine.test.ts`

- [ ] **Step 1: Write failing board creation tests**

Add `src/game/engine.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DIFFICULTY_PRESETS } from './presets';
import { createInitialGame, getNeighborCoordinates, armBoard } from './engine';

describe('game engine board setup', () => {
  it('creates an unarmed hidden board for the selected difficulty', () => {
    const game = createInitialGame(DIFFICULTY_PRESETS.easy);

    expect(game.status).toBe('ready');
    expect(game.isArmed).toBe(false);
    expect(game.board).toHaveLength(9);
    expect(game.board[0]).toHaveLength(9);
    expect(game.board.flat().every((cell) => !cell.hasMine && !cell.isRevealed && !cell.isFlagged)).toBe(true);
  });

  it('returns all valid neighboring coordinates around a cell', () => {
    expect(getNeighborCoordinates(0, 0, 3, 3)).toEqual([
      { row: 0, col: 1 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
    ]);

    expect(getNeighborCoordinates(1, 1, 3, 3)).toHaveLength(8);
  });

  it('arms the board without placing mines on the first click safe zone', () => {
    const game = createInitialGame(DIFFICULTY_PRESETS.easy);
    const armed = armBoard(game, { row: 4, col: 4 }, () => 0);
    const mines = armed.board.flat().filter((cell) => cell.hasMine);
    const forbidden = [{ row: 4, col: 4 }, ...getNeighborCoordinates(4, 4, 9, 9)];

    expect(armed.isArmed).toBe(true);
    expect(mines).toHaveLength(10);
    expect(forbidden.every((coordinate) => !armed.board[coordinate.row][coordinate.col].hasMine)).toBe(true);
    expect(armed.board.flat().some((cell) => cell.neighborMines > 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- src/game/engine.test.ts
```

Expected: FAIL because `src/game/engine.ts` does not exist.

- [ ] **Step 3: Implement board creation and mine placement**

Add `src/game/engine.ts`:

```ts
import type { Board, Cell, Coordinate, Difficulty, GameState } from './types';

export type RandomSource = () => number;

export function createInitialGame(difficulty: Difficulty): GameState {
  return {
    difficulty,
    board: createEmptyBoard(difficulty.width, difficulty.height),
    status: 'ready',
    isArmed: false,
    revealedCount: 0,
    flaggedCount: 0,
  };
}

export function createEmptyBoard(width: number, height: number): Board {
  return Array.from({ length: height }, (_, row) =>
    Array.from({ length: width }, (_, col): Cell => ({
      id: `${row}-${col}`,
      row,
      col,
      hasMine: false,
      neighborMines: 0,
      isRevealed: false,
      isFlagged: false,
      isExploded: false,
      isIncorrectFlag: false,
    })),
  );
}

export function getNeighborCoordinates(row: number, col: number, width: number, height: number): Coordinate[] {
  const neighbors: Coordinate[] = [];

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
      if (rowOffset === 0 && colOffset === 0) {
        continue;
      }

      const nextRow = row + rowOffset;
      const nextCol = col + colOffset;
      if (nextRow >= 0 && nextRow < height && nextCol >= 0 && nextCol < width) {
        neighbors.push({ row: nextRow, col: nextCol });
      }
    }
  }

  return neighbors;
}

export function armBoard(game: GameState, firstClick: Coordinate, random: RandomSource = Math.random): GameState {
  if (game.isArmed) {
    return game;
  }

  const board = cloneBoard(game.board);
  const { width, height, mines } = game.difficulty;
  const safeKeys = new Set([
    coordinateKey(firstClick),
    ...getNeighborCoordinates(firstClick.row, firstClick.col, width, height).map(coordinateKey),
  ]);
  const candidates = board.flat().filter((cell) => !safeKeys.has(coordinateKey(cell)));
  const shuffled = shuffle(candidates, random);

  shuffled.slice(0, mines).forEach((cell) => {
    board[cell.row][cell.col] = { ...board[cell.row][cell.col], hasMine: true };
  });

  board.forEach((row) => {
    row.forEach((cell) => {
      board[cell.row][cell.col] = {
        ...board[cell.row][cell.col],
        neighborMines: getNeighborCoordinates(cell.row, cell.col, width, height).filter(
          (neighbor) => board[neighbor.row][neighbor.col].hasMine,
        ).length,
      };
    });
  });

  return {
    ...game,
    board,
    isArmed: true,
  };
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

function shuffle<T>(items: T[], random: RandomSource): T[] {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

function coordinateKey(coordinate: Coordinate): string {
  return `${coordinate.row}-${coordinate.col}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- src/game/engine.test.ts
```

Expected: PASS with 3 tests.

- [ ] **Step 5: Commit board setup**

Run:

```bash
git add src/game/engine.ts src/game/engine.test.ts
git commit -m "feat: add minesweeper board setup"
```

Expected: commit succeeds.

## Task 4: Add Reveal, Flag, Win, and Loss Rules

**Files:**
- Modify: `src/game/engine.ts`
- Modify: `src/game/engine.test.ts`

- [ ] **Step 1: Extend failing engine tests**

Update the import from `src/game/engine.ts` at the top of `src/game/engine.test.ts`:

```ts
import { armBoard, chordCell, createInitialGame, getNeighborCoordinates, revealCell, toggleFlag } from './engine';
```

Append this block to `src/game/engine.test.ts`:

```ts

describe('game engine actions', () => {
  it('reveals the first clicked safe area and starts play', () => {
    const game = createInitialGame(DIFFICULTY_PRESETS.easy);
    const next = revealCell(game, { row: 4, col: 4 }, () => 0);

    expect(next.status).toBe('playing');
    expect(next.isArmed).toBe(true);
    expect(next.board[4][4].isRevealed).toBe(true);
    expect(next.board[4][4].hasMine).toBe(false);
    expect(next.revealedCount).toBeGreaterThan(0);
  });

  it('toggles flags on covered cells and leaves revealed cells unchanged', () => {
    const game = createInitialGame(DIFFICULTY_PRESETS.easy);
    const flagged = toggleFlag(game, { row: 0, col: 0 });
    const unflagged = toggleFlag(flagged, { row: 0, col: 0 });
    const revealed = revealCell(game, { row: 4, col: 4 }, () => 0);
    const unchanged = toggleFlag(revealed, { row: 4, col: 4 });

    expect(flagged.board[0][0].isFlagged).toBe(true);
    expect(flagged.flaggedCount).toBe(1);
    expect(unflagged.board[0][0].isFlagged).toBe(false);
    expect(unflagged.flaggedCount).toBe(0);
    expect(unchanged.board[4][4].isFlagged).toBe(false);
  });

  it('loses and reveals mines when a mine is revealed', () => {
    const game = createInitialGame({ id: 'custom', label: 'Custom', width: 5, height: 5, mines: 1, isCustom: true });
    const armed = armBoard(game, { row: 2, col: 2 }, () => 0);
    const mine = armed.board.flat().find((cell) => cell.hasMine);
    const lost = revealCell(armed, { row: mine!.row, col: mine!.col });

    expect(lost.status).toBe('lost');
    expect(lost.board[mine!.row][mine!.col].isExploded).toBe(true);
    expect(lost.board.flat().filter((cell) => cell.hasMine).every((cell) => cell.isRevealed)).toBe(true);
  });

  it('wins when every safe cell is revealed', () => {
    let game = createInitialGame({ id: 'custom', label: 'Custom', width: 5, height: 5, mines: 1, isCustom: true });
    game = armBoard(game, { row: 2, col: 2 }, () => 0);

    for (const cell of game.board.flat()) {
      if (!cell.hasMine) {
        game = revealCell(game, { row: cell.row, col: cell.col });
      }
    }

    expect(game.status).toBe('won');
  });

  it('chords a revealed number when adjacent flags match its number', () => {
    let game = createInitialGame({ id: 'custom', label: 'Custom', width: 5, height: 5, mines: 1, isCustom: true });
    game = armBoard(game, { row: 2, col: 2 }, () => 0);
    const mine = game.board.flat().find((cell) => cell.hasMine)!;
    const numbered = getNeighborCoordinates(mine.row, mine.col, 5, 5).find((coordinate) => !game.board[coordinate.row][coordinate.col].hasMine)!;
    game = revealCell(game, numbered);
    game = toggleFlag(game, { row: mine.row, col: mine.col });

    const chorded = chordCell(game, numbered);

    expect(chorded.revealedCount).toBeGreaterThan(game.revealedCount);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- src/game/engine.test.ts
```

Expected: FAIL because `revealCell`, `toggleFlag`, and `chordCell` are not exported.

- [ ] **Step 3: Implement actions**

Replace `src/game/engine.ts` with:

```ts
import type { Board, Cell, Coordinate, Difficulty, GameState } from './types';

export type RandomSource = () => number;

export function createInitialGame(difficulty: Difficulty): GameState {
  return {
    difficulty,
    board: createEmptyBoard(difficulty.width, difficulty.height),
    status: 'ready',
    isArmed: false,
    revealedCount: 0,
    flaggedCount: 0,
  };
}

export function createEmptyBoard(width: number, height: number): Board {
  return Array.from({ length: height }, (_, row) =>
    Array.from({ length: width }, (_, col): Cell => ({
      id: `${row}-${col}`,
      row,
      col,
      hasMine: false,
      neighborMines: 0,
      isRevealed: false,
      isFlagged: false,
      isExploded: false,
      isIncorrectFlag: false,
    })),
  );
}

export function getNeighborCoordinates(row: number, col: number, width: number, height: number): Coordinate[] {
  const neighbors: Coordinate[] = [];

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
      if (rowOffset === 0 && colOffset === 0) {
        continue;
      }

      const nextRow = row + rowOffset;
      const nextCol = col + colOffset;
      if (nextRow >= 0 && nextRow < height && nextCol >= 0 && nextCol < width) {
        neighbors.push({ row: nextRow, col: nextCol });
      }
    }
  }

  return neighbors;
}

export function armBoard(game: GameState, firstClick: Coordinate, random: RandomSource = Math.random): GameState {
  if (game.isArmed) {
    return game;
  }

  const board = cloneBoard(game.board);
  const { width, height, mines } = game.difficulty;
  const safeKeys = new Set([
    coordinateKey(firstClick),
    ...getNeighborCoordinates(firstClick.row, firstClick.col, width, height).map(coordinateKey),
  ]);
  const candidates = board.flat().filter((cell) => !safeKeys.has(coordinateKey(cell)));
  const shuffled = shuffle(candidates, random);

  shuffled.slice(0, mines).forEach((cell) => {
    board[cell.row][cell.col] = { ...board[cell.row][cell.col], hasMine: true };
  });

  board.forEach((row) => {
    row.forEach((cell) => {
      board[cell.row][cell.col] = {
        ...board[cell.row][cell.col],
        neighborMines: getNeighborCoordinates(cell.row, cell.col, width, height).filter(
          (neighbor) => board[neighbor.row][neighbor.col].hasMine,
        ).length,
      };
    });
  });

  return {
    ...game,
    board,
    isArmed: true,
  };
}

export function revealCell(game: GameState, coordinate: Coordinate, random: RandomSource = Math.random): GameState {
  if (game.status === 'won' || game.status === 'lost') {
    return game;
  }

  const armed = game.isArmed ? game : armBoard(game, coordinate, random);
  const target = armed.board[coordinate.row]?.[coordinate.col];

  if (!target || target.isFlagged || target.isRevealed) {
    return armed;
  }

  if (target.hasMine) {
    return revealLoss(armed, coordinate);
  }

  const board = cloneBoard(armed.board);
  const revealed = revealSafeCells(board, coordinate, armed.difficulty.width, armed.difficulty.height);
  const revealedCount = countRevealed(board);
  const status = revealedCount === armed.difficulty.width * armed.difficulty.height - armed.difficulty.mines ? 'won' : 'playing';

  return {
    ...armed,
    board,
    status,
    revealedCount,
    flaggedCount: countFlags(board),
  };
}

export function toggleFlag(game: GameState, coordinate: Coordinate): GameState {
  if (game.status === 'won' || game.status === 'lost') {
    return game;
  }

  const target = game.board[coordinate.row]?.[coordinate.col];
  if (!target || target.isRevealed) {
    return game;
  }

  const board = cloneBoard(game.board);
  board[coordinate.row][coordinate.col] = {
    ...board[coordinate.row][coordinate.col],
    isFlagged: !board[coordinate.row][coordinate.col].isFlagged,
  };

  return {
    ...game,
    board,
    flaggedCount: countFlags(board),
  };
}

export function chordCell(game: GameState, coordinate: Coordinate): GameState {
  if (game.status !== 'playing') {
    return game;
  }

  const target = game.board[coordinate.row]?.[coordinate.col];
  if (!target?.isRevealed || target.neighborMines === 0) {
    return game;
  }

  const neighbors = getNeighborCoordinates(coordinate.row, coordinate.col, game.difficulty.width, game.difficulty.height);
  const flagCount = neighbors.filter((neighbor) => game.board[neighbor.row][neighbor.col].isFlagged).length;
  if (flagCount !== target.neighborMines) {
    return game;
  }

  return neighbors.reduce((nextGame, neighbor) => {
    if (nextGame.status === 'lost') {
      return nextGame;
    }

    const cell = nextGame.board[neighbor.row][neighbor.col];
    if (cell.isRevealed || cell.isFlagged) {
      return nextGame;
    }

    return revealCell(nextGame, neighbor);
  }, game);
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

function revealSafeCells(board: Board, start: Coordinate, width: number, height: number): number {
  const queue = [start];
  const visited = new Set<string>();
  let revealed = 0;

  while (queue.length > 0) {
    const coordinate = queue.shift()!;
    const key = coordinateKey(coordinate);
    if (visited.has(key)) {
      continue;
    }

    visited.add(key);
    const cell = board[coordinate.row][coordinate.col];
    if (cell.isRevealed || cell.isFlagged || cell.hasMine) {
      continue;
    }

    board[coordinate.row][coordinate.col] = { ...cell, isRevealed: true };
    revealed += 1;

    if (cell.neighborMines === 0) {
      getNeighborCoordinates(cell.row, cell.col, width, height).forEach((neighbor) => queue.push(neighbor));
    }
  }

  return revealed;
}

function revealLoss(game: GameState, exploded: Coordinate): GameState {
  const board = cloneBoard(game.board);

  board.forEach((row) => {
    row.forEach((cell) => {
      if (cell.hasMine) {
        board[cell.row][cell.col] = {
          ...cell,
          isRevealed: true,
          isExploded: cell.row === exploded.row && cell.col === exploded.col,
        };
      } else if (cell.isFlagged) {
        board[cell.row][cell.col] = {
          ...cell,
          isIncorrectFlag: true,
        };
      }
    });
  });

  return {
    ...game,
    board,
    status: 'lost',
    revealedCount: countRevealed(board),
    flaggedCount: countFlags(board),
  };
}

function countRevealed(board: Board): number {
  return board.flat().filter((cell) => cell.isRevealed && !cell.hasMine).length;
}

function countFlags(board: Board): number {
  return board.flat().filter((cell) => cell.isFlagged).length;
}

function shuffle<T>(items: T[], random: RandomSource): T[] {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

function coordinateKey(coordinate: Coordinate): string {
  return `${coordinate.row}-${coordinate.col}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- src/game/engine.test.ts
```

Expected: PASS with 8 tests.

- [ ] **Step 5: Commit game actions**

Run:

```bash
git add src/game/engine.ts src/game/engine.test.ts
git commit -m "feat: add minesweeper game actions"
```

Expected: commit succeeds.

## Task 5: Build React Game UI and Interaction Tests

**Files:**
- Create: `src/App.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write failing React interaction tests**

Add `src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('Minesweeper app', () => {
  it('renders the Microsoft-style Classic Mode shell', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Minesweeper' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new game/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Difficulty')).toHaveValue('easy');
    expect(screen.getByText('Classic Mode')).toBeInTheDocument();
    expect(screen.getAllByRole('gridcell', { name: /covered cell/i })).toHaveLength(81);
  });

  it('reveals and flags cells from the board', async () => {
    const user = userEvent.setup();
    render(<App />);

    const firstCell = screen.getAllByRole('gridcell', { name: /covered cell/i })[40];
    await user.click(firstCell);

    expect(screen.getByText(/playing/i)).toBeInTheDocument();

    const flagMode = screen.getByRole('button', { name: /flag mode/i });
    await user.click(flagMode);
    const coveredCell = screen.getAllByRole('gridcell', { name: /covered cell/i })[0];
    await user.click(coveredCell);

    expect(screen.getByRole('gridcell', { name: /flagged cell/i })).toBeInTheDocument();
  });

  it('changes to expert difficulty and creates a 480-cell board', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(screen.getByLabelText('Difficulty'), 'expert');

    expect(screen.getAllByRole('gridcell', { name: /covered cell/i })).toHaveLength(480);
    expect(screen.getByText('099')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- src/App.test.tsx
```

Expected: FAIL because `App.tsx` only renders a temporary heading.

- [ ] **Step 3: Implement React UI**

Replace `src/App.tsx` with:

```tsx
import { Bomb, Flag, Gauge, RotateCcw, Timer } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { chordCell, createInitialGame, revealCell, toggleFlag } from './game/engine';
import { DIFFICULTY_PRESETS, validateCustomDifficulty } from './game/presets';
import type { Cell, Difficulty, DifficultyId, GameState } from './game/types';

const BEST_TIMES_KEY = 'minesweeper.bestTimes';

type BestTimes = Partial<Record<DifficultyId, number>>;

const presetList = [DIFFICULTY_PRESETS.easy, DIFFICULTY_PRESETS.medium, DIFFICULTY_PRESETS.expert];

export default function App() {
  const [difficulty, setDifficulty] = useState<Difficulty>(DIFFICULTY_PRESETS.easy);
  const [game, setGame] = useState<GameState>(() => createInitialGame(DIFFICULTY_PRESETS.easy));
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [flagMode, setFlagMode] = useState(false);
  const [customWidth, setCustomWidth] = useState(12);
  const [customHeight, setCustomHeight] = useState(10);
  const [customMines, setCustomMines] = useState(20);
  const [customError, setCustomError] = useState('');
  const [bestTimes, setBestTimes] = useState<BestTimes>(() => readBestTimes());

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
      setGame((current) => toggleFlag(current, cell));
      return;
    }

    if (cell.isRevealed) {
      setGame((current) => chordCell(current, cell));
      return;
    }

    setGame((current) => revealCell(current, cell));
  }

  function handleContextMenu(event: MouseEvent, cell: Cell) {
    event.preventDefault();
    setGame((current) => toggleFlag(current, cell));
  }

  const boardStyle = useMemo(
    () => ({
      '--columns': game.difficulty.width,
      '--rows': game.difficulty.height,
    }) as CSSProperties,
    [game.difficulty.height, game.difficulty.width],
  );

  return (
    <main className="app-shell">
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
            <button type="button" onClick={() => startNewGame()}>
              New game
            </button>
          </div>
        ) : null}
      </section>
    </main>
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
```

- [ ] **Step 4: Add polished Microsoft-style CSS**

Replace `src/styles.css` with:

```css
:root {
  color: #eef7df;
  background: #0d2118;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  --panel: rgba(11, 34, 24, 0.94);
  --panel-strong: #123c2b;
  --accent: #76c043;
  --accent-strong: #9bd84c;
  --tile: #78b64b;
  --tile-top: #96cf5d;
  --tile-revealed: #d8d4bf;
  --ink: #102116;
  --danger: #e8503f;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}

button,
select,
input {
  font: inherit;
}

.app-shell {
  min-height: 100vh;
  padding: 22px;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 12% 10%, rgba(157, 218, 77, 0.22), transparent 34%),
    linear-gradient(135deg, #07150f 0%, #153d2b 48%, #071c14 100%);
}

.game-panel {
  width: min(100%, 1120px);
  padding: 18px;
  border: 1px solid rgba(210, 255, 183, 0.22);
  border-radius: 8px;
  background: var(--panel);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.38);
}

.game-header,
.control-strip,
.hud,
.sub-hud {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.eyebrow {
  margin: 0 0 4px;
  color: var(--accent-strong);
  font-size: 0.77rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: clamp(2rem, 5vw, 4.5rem);
  line-height: 0.92;
}

.icon-button,
.small-button,
.flag-toggle,
.result-banner button {
  border: 0;
  color: #102116;
  background: var(--accent-strong);
  cursor: pointer;
  font-weight: 800;
  border-radius: 6px;
  box-shadow: inset 0 -3px 0 rgba(0, 0, 0, 0.22);
}

.icon-button {
  width: 48px;
  height: 48px;
  display: inline-grid;
  place-items: center;
}

.icon-button svg,
.flag-toggle svg,
.stat svg,
.best-time svg {
  width: 19px;
  height: 19px;
}

.control-strip {
  margin-top: 18px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 8px;
}

.field-label,
.mini-field {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #cde9bc;
  font-size: 0.88rem;
  font-weight: 700;
}

select,
input {
  color: #112318;
  background: #eef7df;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 6px;
  min-height: 38px;
  padding: 0 10px;
}

.custom-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.mini-field input {
  width: 72px;
}

.small-button {
  min-height: 38px;
  padding: 0 14px;
}

.error-message {
  color: #ffd0c8;
  margin: 10px 4px 0;
  font-weight: 700;
}

.hud {
  margin-top: 14px;
}

.stat,
.status-pill,
.best-time,
.flag-toggle {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
}

.stat,
.best-time {
  background: #071a12;
  color: #d7efc9;
}

.stat strong {
  font-variant-numeric: tabular-nums;
  color: #ffffff;
  font-size: 1.35rem;
}

.status-pill {
  background: #1b5837;
  color: #f4ffe8;
  font-weight: 900;
  min-width: 112px;
  justify-content: center;
}

.status-won {
  background: #71b841;
  color: #112318;
}

.status-lost {
  background: var(--danger);
}

.sub-hud {
  margin-top: 12px;
}

.flag-toggle.active {
  background: #f3d34a;
}

.board-wrap {
  margin-top: 18px;
  overflow: auto;
  padding: 8px;
  background: #071a12;
  border-radius: 8px;
}

.board {
  --cell-size: clamp(28px, calc((100vw - 92px) / var(--columns)), 42px);
  display: grid;
  grid-template-columns: repeat(var(--columns), var(--cell-size));
  grid-auto-rows: var(--cell-size);
  width: max-content;
  margin: 0 auto;
  gap: 2px;
}

.cell {
  width: var(--cell-size);
  height: var(--cell-size);
  border: 0;
  border-radius: 3px;
  cursor: pointer;
  display: grid;
  place-items: center;
  padding: 0;
  color: var(--ink);
  font-weight: 900;
  font-size: calc(var(--cell-size) * 0.5);
  font-variant-numeric: tabular-nums;
}

.cell.covered {
  background: linear-gradient(145deg, var(--tile-top), var(--tile));
  box-shadow:
    inset 2px 2px 0 rgba(255, 255, 255, 0.38),
    inset -3px -3px 0 rgba(0, 0, 0, 0.18);
}

.cell.covered:hover,
.cell.covered:focus-visible {
  filter: brightness(1.09);
  outline: 2px solid #f4ffe8;
  outline-offset: -2px;
}

.cell.revealed {
  background: var(--tile-revealed);
  box-shadow: inset 0 0 0 1px rgba(29, 44, 32, 0.18);
  cursor: default;
}

.cell.flagged {
  color: #a51521;
}

.cell.exploded {
  background: var(--danger);
  color: #fff7ed;
}

.cell.wrong-flag {
  background: #f0b0a6;
}

.number-1 { color: #2563eb; }
.number-2 { color: #15803d; }
.number-3 { color: #dc2626; }
.number-4 { color: #3730a3; }
.number-5 { color: #9f1239; }
.number-6 { color: #0f766e; }
.number-7 { color: #111827; }
.number-8 { color: #57534e; }

.result-banner {
  margin-top: 16px;
  padding: 12px;
  border-radius: 8px;
  background: #eef7df;
  color: #102116;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.result-banner button {
  min-height: 38px;
  padding: 0 14px;
}

@media (max-width: 720px) {
  .app-shell {
    padding: 10px;
  }

  .game-panel {
    padding: 12px;
  }

  .control-strip,
  .hud,
  .sub-hud {
    align-items: stretch;
  }

  .stat,
  .status-pill,
  .flag-toggle,
  .best-time {
    flex: 1 1 120px;
    justify-content: center;
  }
}
```

- [ ] **Step 5: Run React interaction tests**

Run:

```bash
npm test -- src/App.test.tsx
```

Expected: PASS with 3 tests.

- [ ] **Step 6: Commit UI**

Run:

```bash
git add src/App.tsx src/App.test.tsx src/styles.css
git commit -m "feat: build minesweeper classic mode UI"
```

Expected: commit succeeds.

## Task 6: Add Browser Verification

**Files:**
- Create: `tests/minesweeper.spec.ts`

- [ ] **Step 1: Write Playwright verification**

Add `tests/minesweeper.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('plays a basic desktop game interaction', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Minesweeper' })).toBeVisible();
  await expect(page.getByText('Classic Mode')).toBeVisible();

  const centerCell = page.getByRole('gridcell', { name: /covered cell row 5 column 5/i });
  await centerCell.click();
  await expect(page.getByText('Playing')).toBeVisible();

  await page.getByRole('button', { name: /flag mode/i }).click();
  await page.getByRole('gridcell', { name: /covered cell/i }).first().click();
  await expect(page.getByRole('gridcell', { name: /flagged cell/i }).first()).toBeVisible();
});

test('changes difficulty and renders the expert board', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Difficulty').selectOption('expert');

  await expect(page.getByText('099')).toBeVisible();
  await expect(page.getByRole('grid', { name: /expert minesweeper board/i })).toBeVisible();
  await expect(page.getByRole('gridcell', { name: /covered cell/i })).toHaveCount(480);
});

test('renders usable mobile layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Minesweeper' })).toBeVisible();
  await expect(page.getByRole('button', { name: /new game/i })).toBeVisible();
  await expect(page.getByRole('grid')).toBeVisible();
});
```

- [ ] **Step 2: Install Playwright browsers**

Run:

```bash
npx playwright install chromium
```

Expected: Chromium browser installation completes or reports that Chromium is already installed.

- [ ] **Step 3: Run Playwright verification**

Run:

```bash
npm run test:e2e
```

Expected: PASS for chromium and mobile-chrome projects.

- [ ] **Step 4: Commit browser tests**

Run:

```bash
git add tests/minesweeper.spec.ts playwright.config.ts
git commit -m "test: add minesweeper browser verification"
```

Expected: commit succeeds.

## Task 7: Full Verification and Final Polish

**Files:**
- Modify only files required by failed tests, TypeScript errors, or browser layout defects.

- [ ] **Step 1: Run full automated verification**

Run:

```bash
npm run verify
```

Expected: Vitest passes, Vite builds, and Playwright passes.

- [ ] **Step 2: Start local dev server for manual browser review**

Run:

```bash
npm run dev -- --port 5173
```

Expected: Vite prints a local URL at `http://127.0.0.1:5173/`.

- [ ] **Step 3: Verify the rendered app in a browser**

Open `http://127.0.0.1:5173/` and confirm:

- The first screen is the playable game.
- The board is visible without a landing page.
- The visual style is green, polished, and game-first.
- Easy, Medium, Expert, and Custom can start a game.
- Revealing, flagging, and chording are usable with mouse.
- Mobile viewport still keeps controls and board usable.

- [ ] **Step 4: Fix any verification failures with TDD**

For each logic or UI failure:

1. Add or update the narrow failing Vitest or Playwright test that demonstrates the failure.
2. Run that test and confirm it fails for the expected reason.
3. Make the smallest code change that satisfies the test.
4. Re-run the narrow test.
5. Re-run `npm run verify`.

- [ ] **Step 5: Commit final polish**

If files changed after Task 6, run:

```bash
git add src tests package.json package-lock.json *.config.ts
git commit -m "fix: polish minesweeper verification"
```

Expected: commit succeeds when there are changes. If there are no changes, `git status --porcelain` prints no output and no commit is needed.

## Self-Review Notes

- Spec coverage: Classic Mode, first-click safety, flood reveal, flags, chording, win/loss states, difficulty presets, custom validation, local best times, responsive UI, automated tests, and browser verification are covered.
- Out-of-scope features from the spec remain excluded: Adventure Mode, Daily Challenges, cloud achievements, ads, and Xbox integration.
- Type consistency: `Difficulty`, `GameState`, `Cell`, `Coordinate`, `createInitialGame`, `armBoard`, `revealCell`, `toggleFlag`, and `chordCell` are used consistently across tasks.
