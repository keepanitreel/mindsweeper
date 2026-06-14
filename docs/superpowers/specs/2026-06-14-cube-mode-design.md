# Cube Mode Minesweeper Design

Date: 2026-06-14

Revision note, 2026-06-14: hidden depth stacks, depth markers, depth peeking, and the Deep Cube preset were removed after usability feedback. Current Cube Mode is surface-only across the six cube faces, with Starter Cube and Standard Cube presets.

## Goal

Add a new Cube Mode alongside the existing Classic Mode. Classic Mode must keep its current flat board gameplay, presets, best times, and UI behavior. Cube Mode should feel like familiar Minesweeper logic applied to a physical 3D object: the player rotates a cube, solves connected face grids, and drills into shallow depth stacks when needed.

The first version should be readable and fair rather than a maximal 3D simulation. The player should think, "I still understand Minesweeper, but now I am solving around a cube."

## Product Scope

Cube Mode is a separate mode selected from the main game surface. It includes:

- A rotatable cube with six connected faces.
- Grid cells on every face.
- Edge adjacency between neighboring cube faces.
- Shallow depth behind each surface cell.
- Surface numbers and separate depth markers.
- Reveal, flag, timer, mine counter, restart, win, loss, and undo-on-mine-hit behavior.
- Fixed Cube Mode presets.
- Focused tests for cube coordinate logic and gameplay behavior.

Out of scope for the first Cube Mode version:

- Replacing Classic Mode.
- Custom Cube Mode board settings.
- Deep freeform 3D minefields.
- Three.js rendering.
- Multiplayer, challenges, achievements, or new hosting work.

## Gameplay Model

Cube Mode uses one connected puzzle spread across six cube faces. Each face has a grid of surface cells. Moving beyond an edge of one face maps to the adjacent cube face, with coordinates rotated according to the cube layout. This makes edge cells meaningful and gives rotation a gameplay purpose.

Each surface coordinate can also have shallow depth cells behind it. Starter and Standard use 2 hidden depth layers behind every surface cell. Deep uses 3 hidden depth layers behind every surface cell. Mines may occupy either surface cells or hidden depth cells.

Cells use a split clue system:

- Surface number: counts nearby surface mines, including same-face neighbors and valid neighbors across cube edges.
- Depth marker: counts hidden mines directly behind that surface cell in its depth stack.

The mode should avoid a single 26-neighbor 3D number because that is hard to read and hard to learn. Splitting surface and depth clues preserves the familiar Minesweeper number while adding a clear second signal.

## Player Interaction

Cube rotation should support:

- Pointer drag on the cube.
- Small rotate buttons for keyboard, mouse, and touch fallback.
- Stable face snapping or constrained rotation so cells remain easy to target.

Cell interaction should mirror Classic where possible:

- Primary click or tap reveals a covered cell.
- Flag mode flags covered cells.
- Context menu toggles flags on desktop.
- Revealed numbered surface cells support chording when adjacent surface flags match the surface number.
- Revealing a mine loses the game and exposes the relevant mine state.
- Undo-on-mine-hit restores the prior Cube Mode state once, matching the existing Classic affordance.

Depth interaction should use drill-in plus light peeking:

- Clicking or tapping a revealed surface cell with a depth marker opens a compact stack view for that coordinate.
- The stack view shows the shallow depth cells behind that surface cell and allows reveal or flag actions on those depth cells.
- Depth stack cells reveal and flag manually in the first version. Depth chording is out of scope.
- Hover on desktop or press-and-hold on touch shows a subtle ghosted depth preview without opening the full stack view.

## First-Click Safety

First-click safety applies to Cube Mode. The first reveal should avoid placing mines on:

- The clicked surface cell.
- Nearby surface neighbors, including cross-face neighbors.
- The clicked cell's full hidden depth stack.

If a preset is too dense to preserve the full safe zone, validation should reject that preset during development rather than silently weakening the rule.

## Presets

Cube Mode starts with fixed presets:

- Starter Cube: 4x4 cells per face, 2 hidden depth layers, 24 mines.
- Standard Cube: 5x5 cells per face, 2 hidden depth layers, 50 mines.
- Deep Cube: 5x5 cells per face, 3 hidden depth layers, 80 mines.

These counts are intentionally lower than classic flat-board density because depth adds cognitive load.

## Architecture

Classic Mode should remain stable. The current app can be reorganized into a mode shell:

`App -> mode switch -> ClassicGame or CubeGame`

Classic behavior should move into `ClassicGame` with minimal behavioral change. Cube Mode should live in new modules so its spatial rules do not complicate the existing 2D engine.

Recommended module shape:

- `src/game/cube/types.ts`: cube coordinates, cells, presets, and game state types.
- `src/game/cube/geometry.ts`: face layout, edge mappings, coordinate rotation, and neighbor lookup.
- `src/game/cube/engine.ts`: board creation, mine placement, clue calculation, reveal, flag, chord, win, loss, and undo-supporting state transitions.
- `src/components/ClassicGame.tsx`: extracted current Classic UI and behavior.
- `src/components/CubeGame.tsx`: Cube Mode HUD, timer, mode-specific controls, selected preset, restart, and state lifecycle.
- `src/components/CubeBoard.tsx`: rotatable cube surface and face rendering.
- `src/components/CubeCellButton.tsx`: surface cell display, surface number, depth marker, flag, mine, and accessibility labels.
- `src/components/DepthStackPopover.tsx`: drill-in stack view for a revealed surface coordinate.

The cube engine should be pure TypeScript and independent of React, matching the current Classic engine pattern.

## Data Flow

Cube UI components render a single immutable Cube Mode game state. User actions produce new game state through pure engine functions:

- `revealCubeCell(state, coordinate)`
- `toggleCubeFlag(state, coordinate)`
- `chordCubeCell(state, coordinate)`
- `rotateCubeView(viewState, direction)` for UI-only rotation state
- `openDepthStack(surfaceCoordinate)` for UI-only drill-in state

Cube Mode timer and best-time storage should be owned by `CubeGame`, separate from Classic timing. Best times should use separate keys from Classic because Cube presets are not comparable to flat presets.

## Error Handling And Edge Cases

Preset validation should fail loudly in tests if a Cube preset cannot satisfy first-click safety or mine count requirements.

User-facing invalid states should be avoided by using fixed presets. If the cube engine receives an invalid coordinate, it should return the current game state unchanged, matching Classic's defensive behavior.

The depth stack view should close when:

- A new game starts.
- The selected cell is no longer valid.
- The game enters a terminal won or lost state.
- The player switches back to Classic Mode.

Rotation should not change game state. It only changes which faces are visible and how the player views the puzzle.

## Accessibility

Cube cells should remain real buttons where practical. CSS 3D is preferred for the first version because it preserves normal DOM controls, focus behavior, and testability better than a canvas-first 3D scene.

Cube Mode should include:

- Keyboard-focusable cells.
- Accessible labels that include face, row, column, revealed state, flag state, surface number, and depth marker.
- Rotate buttons with clear labels.
- A mode switch that is keyboard accessible.
- Stack view controls that trap neither focus nor pointer interaction unnecessarily.

## Visual Direction

Cube Mode should inherit the current polished green Minesweeper visual system while adding a stronger spatial presentation. The cube should be the first-screen focus. Controls should stay compact and avoid covering the board.

The cube should be readable before it is flashy:

- Stable cell sizing.
- Clear face boundaries.
- Visible active/front face.
- Subtle side faces for orientation.
- Large surface numbers and smaller depth markers.
- Peek overlays that do not obscure core numbers.

## Testing

Vitest coverage should prove:

- Cube edge mappings and coordinate rotation.
- Surface neighbor lookup across cube faces.
- Depth stack lookup.
- Mine placement and first-click safety.
- Surface number calculation.
- Depth marker calculation.
- Reveal and zero-cell flood behavior across cube surface adjacency.
- Flagging for surface and depth cells.
- Surface chording behavior using surface numbers and surface flags.
- Win and loss detection.
- Undo snapshot compatibility for mine hits.

React or app tests should prove:

- The app can switch between Classic and Cube Mode.
- Classic Mode still renders and starts a game.
- Cube Mode renders the cube HUD and cells.
- The depth stack opens from a revealed cell with a depth marker.

Playwright checks should prove:

- The app loads in a browser.
- Classic Mode remains playable.
- Cube Mode can be selected.
- The cube can rotate through controls or pointer interaction.
- A Cube Mode cell can be revealed and flagged.
- A depth stack can be opened.
- The layout remains usable at desktop and mobile sizes.

## Acceptance Criteria

- Classic Mode remains available and functionally unchanged.
- Cube Mode is selectable as a separate mode.
- Cube Mode uses one connected six-face puzzle, not six isolated boards.
- Cube Mode supports shallow depth behind surface cells.
- Cube cells show a surface number and a separate depth marker.
- Depth can be inspected through a compact drill-in stack view.
- Light peek hints are available for depth awareness.
- First-click safety works for Cube Mode.
- Automated tests cover cube geometry, clue generation, and core gameplay.
- Browser verification covers both Classic and Cube Mode.
