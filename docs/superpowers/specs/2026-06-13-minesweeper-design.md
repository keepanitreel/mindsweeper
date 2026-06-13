# Minesweeper Browser Game Design

Date: 2026-06-13

## Goal

Build a browser-playable Minesweeper game inspired by Microsoft Minesweeper Classic Mode. The first version should feel like a polished Microsoft Casual Games-style web app while prioritizing the core Minesweeper experience: fast board interaction, clear status feedback, fair first move behavior, and repeatable difficulty presets.

## Research Basis

- Microsoft Casual Games presents Minesweeper as classic logic gameplay with updated graphics and sound, including Expert difficulty.
- Microsoft Learn references the modern Microsoft Minesweeper app as supporting adjustable difficulty, Classic gameplay, and Adventure mode.
- Xbox Support documents Daily Challenge variants such as Classic, Flags, Detonation, Taptiles, and Treasure Hunt.
- The Microsoft Store listing emphasizes themes, play modes, achievements, and auto-chording.

V1 will implement Classic Mode only. Adventure Mode, Daily Challenges, cloud achievements, ads, and Xbox integration are intentionally out of scope.

## Tech Stack

- React + TypeScript + Vite for the browser app.
- Vitest for deterministic game-logic tests.
- Playwright for rendered browser verification.
- CSS modules or app-level CSS variables for a focused visual system.

This stack keeps gameplay state explicit and testable while making the interface easy to refine.

## Product Scope

The app opens directly to the game, not a landing page. It includes:

- Classic Minesweeper board.
- Difficulty presets: Easy, Medium, Expert, and Custom.
- Timer.
- Remaining mine counter.
- Restart control.
- Flag mode toggle for touch and mouse users.
- Win and loss overlays.
- Local best times per preset.
- Responsive layout for desktop and mobile browsers.

## Gameplay Requirements

- First click never hits a mine.
- Mines are placed after the first reveal, excluding the clicked cell and its neighbors where possible.
- Revealing a zero-value cell flood-reveals adjacent safe cells.
- Right click or flag mode toggles a flag on covered cells.
- Revealed numbered cells support chording: when adjacent flags match the number, adjacent unflagged covered cells reveal.
- Incorrect chording can lose the game if it reveals a mine.
- Winning reveals all safe cells and stops the timer.
- Losing reveals mines, marks incorrect flags, and stops the timer.
- Restart creates a fresh board using the active difficulty.

## Difficulty Presets

- Easy: 9 columns, 9 rows, 10 mines.
- Medium: 16 columns, 16 rows, 40 mines.
- Expert: 30 columns, 16 rows, 99 mines.
- Custom: user-selected width, height, and mine count within safe limits.

Custom settings must prevent impossible or degenerate boards. Mine count must be less than total cells and must leave enough cells for first-click safety.

## Interface Design

The visual direction is modern Microsoft Casual Games rather than a pixel-perfect clone. The screen should use:

- Deep green game-table background.
- Bright grass/emerald accents.
- Clean Segoe-like typography using system fonts.
- Rounded but compact controls.
- Square board tiles with crisp depth, hover, focus, and pressed states.
- Number colors that are instantly scannable.
- Simple celebratory win treatment and clear loss treatment.

The board is the first-screen focus. Supporting controls stay compact and do not obscure play.

## Architecture

Use a small game engine module independent of React. It owns:

- Board creation.
- Mine placement.
- Neighbor counts.
- Reveal and flood-fill logic.
- Flag toggling.
- Chording.
- Win/loss checks.

React owns:

- Rendering cells and controls.
- Timer lifecycle.
- Difficulty selection.
- Local storage for best times.
- Pointer, mouse, keyboard, and touch interaction wiring.

This separation keeps game rules testable without a browser.

## Accessibility

- Cells are keyboard-focusable.
- The board exposes game status with accessible labels.
- Buttons and toggles use clear labels.
- Color is supported by symbols and text where needed.
- Touch targets remain usable on small screens.

## Testing

Vitest coverage should prove:

- First-click safety.
- Mine counts and neighbor counts.
- Flood reveal.
- Flag toggling.
- Chording behavior.
- Win and loss detection.
- Preset and custom validation.

Playwright verification should prove:

- The app loads in a browser.
- A new game can be started.
- Cells can be revealed and flagged.
- Difficulty can be changed.
- The layout renders correctly at desktop and mobile sizes.

## Acceptance Criteria

- The project can be installed and run locally with documented npm scripts.
- The game runs in a web browser.
- Classic Minesweeper behavior works for Easy, Medium, Expert, and Custom games.
- The UI visibly resembles the current Microsoft Minesweeper family: modern, green, polished, and game-first.
- Automated logic tests pass.
- Browser verification passes.
