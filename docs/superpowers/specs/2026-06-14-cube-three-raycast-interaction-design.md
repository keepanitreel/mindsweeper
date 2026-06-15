# Cube Three.js Interaction Redesign

Date: 2026-06-14

## Goal

Replace Cube Mode's CSS transformed DOM hit testing with a Three.js cube renderer that uses raycasting for pointer interaction. The purpose is to make click, hover, drag, and right-click targeting feel physically aligned with the cube instead of inferred from transformed DOM geometry.

Classic Mode and the existing Cube Mode game rules must remain intact. This redesign changes how the cube is rendered and picked, not how mines, clues, flags, depth stacks, first-click safety, wins, or losses work.

## Problem

The current Cube Mode renders each face as transformed DOM buttons. Recent edge-click work improved the worst misses, but the interaction still depends on several fragile browser geometry behaviors:

- `elementFromPoint` must find the transformed face under the pointer.
- Cell pointer events are temporarily disabled during picking.
- A synthetic mouse event is dispatched to recover local face offsets.
- Manual row and column math estimates the target cell from those offsets.

That stack is hard to make consistently crisp because the browser is rendering a 3D-transformed DOM surface while the app is trying to recover game coordinates after the fact.

## Chosen Approach

Use plain Three.js for the Cube Mode board surface:

- Add `three` as the only new runtime dependency.
- Replace the visual cube in `CubeBoard` with a `canvas`-backed renderer.
- Build six plane meshes, one per cube face, with stable face metadata.
- Raycast pointer positions into the scene to identify face, row, and column.
- Translate the picked coordinate into the existing `CubeCell`.
- Call the existing `onCellPrimary`, `onCellFlag`, and `onPeek` callbacks.

Do not move game rules into Three.js. The renderer receives immutable Cube Mode state, renders it, and reports picked cells back to React.

## Interaction Model

Pointer interaction should feel like manipulating a real object:

- Left click on a raycasted cell reveals that cell, or flags it when flag mode is enabled.
- Right click on a raycasted cell toggles its flag and suppresses the browser context menu.
- Pointer hover updates depth peek for the raycasted cell.
- Pointer drag rotates the cube when the drag starts away from a deliberate cell click or exceeds a small movement threshold.
- Dragging should not accidentally reveal the cell where the drag started.
- Rotation should settle to stable angles after drag, so the front-most face remains readable.
- Existing rotate buttons and arrow-key rotation remain available as deterministic controls.

The click-versus-drag threshold should be explicit. A pointer sequence that moves less than the threshold counts as a click; a sequence that crosses the threshold counts as rotation only.

## Rendering Model

The renderer should own only rendering concerns:

- Scene, camera, renderer, raycaster, and face meshes are created once and cleaned up on unmount.
- Canvas size tracks the rendered stage using `ResizeObserver`.
- Face meshes are square planes arranged as a cube.
- Each surface cell is drawn into a face texture or represented as simple per-cell plane geometry.
- Cell colors, number colors, flags, mines, and depth markers match the existing visual language closely.
- The cube uses the current `CubeRotation` state as the source of truth.

The recommended first implementation is per-cell plane geometry grouped by face. It makes raycast metadata direct and avoids redrawing texture atlases during early iteration. If performance becomes an issue for larger cube presets, the cell rendering can later move to canvas textures without changing the public component contract.

## Component Boundaries

Keep the existing Cube Mode state ownership:

- `CubeGame` owns game state, elapsed time, flag mode, rotation, selected depth stack, peek cell, best times, and undo snapshot.
- `CubeBoard` remains the board component API boundary.
- A new internal Three.js renderer module can be extracted from `CubeBoard` if the component becomes hard to read.

Recommended file shape:

- `src/components/CubeBoard.tsx`: React shell, canvas mount, event wiring, callbacks.
- `src/components/cubeBoardScene.ts`: Three.js scene creation, mesh updates, picking helpers, disposal.
- `src/components/cubeBoardScene.test.ts` or `src/game/cube/picking.test.ts`: pure picking math where possible.

Avoid coupling Three.js code to React state setters directly. The scene helper should expose small methods such as `updateGame`, `updateRotation`, `resize`, `pickCell`, `render`, and `dispose`.

## Data Flow

The data flow remains one-way:

1. `CubeGame` renders `CubeBoard` with `game` and `rotation`.
2. `CubeBoard` updates the Three.js scene from the latest props.
3. Pointer coordinates are converted from client space to normalized device coordinates.
4. The raycaster intersects visible cell meshes.
5. Mesh metadata identifies `{ face, row, col, depth: 0 }`.
6. `CubeBoard` reads `game.board[face][0][row][col]`.
7. `CubeBoard` invokes the appropriate existing callback.
8. The engine returns new game state and React re-renders the board.

Depth stack cells stay in the existing `DepthStackPopover`. Three.js only handles surface cube cells in this redesign.

## Accessibility

Moving the visible board to canvas must not remove keyboard and screen-reader access.

Cube Mode should keep:

- Existing rotate buttons.
- Arrow-key rotation outside text inputs.
- A synchronized accessible grid for the active or front-most face.
- Real buttons for keyboard reveal and flag actions.
- Accessible labels that include face, row, column, reveal state, flag state, surface number, and depth marker.

The accessible grid can be visually compact or screen-reader oriented, but it must stay operable. The canvas should have an accessible label describing the visual cube board, while real controls provide non-pointer interaction.

## Error Handling And Edge Cases

The renderer should be defensive:

- If WebGL initialization fails, show the accessible grid and existing non-canvas controls rather than leaving a blank play area.
- If a raycast lands between cells or on no face, no gameplay action occurs.
- If a picked coordinate is invalid for the current game state, return `null` and leave state unchanged.
- If the game preset changes, stale meshes must be rebuilt for the new size.
- If the game is won or lost, picking can still hover for display but should not mutate state beyond existing engine behavior.
- All Three.js geometries, materials, textures, and renderers must be disposed on unmount or rebuild.

## Testing

Unit and component tests should cover:

- Coordinate metadata generation for all six faces.
- Cell index calculation or mesh metadata lookup for face coordinates.
- Click-versus-drag threshold behavior.
- `CubeBoard` callback routing for primary, flag, and peek actions.
- Accessible grid remains present and operable.

Playwright coverage should prove:

- Cube Mode loads with a nonblank canvas on desktop.
- A raycasted click changes the intended Cube Mode coordinate.
- A right-click flags the intended Cube Mode coordinate.
- Dragging rotates the cube without revealing the drag-start cell.
- Rotate controls still change the cube orientation.
- The layout remains usable on mobile.

Visual verification should include desktop and mobile screenshots plus a simple canvas pixel check to confirm the rendered cube is not blank.

## Acceptance Criteria

- Cube Mode uses Three.js raycasting for primary pointer targeting.
- The old CSS transformed DOM picking helpers are removed.
- Existing Cube Mode rules and engine tests continue to pass.
- Clicks and right-clicks target the intended face, row, and column.
- Dragging the cube does not accidentally reveal or flag cells.
- Depth peek and depth stack behavior continue to work.
- Keyboard and screen-reader access remain available through real DOM controls.
- Automated verification covers unit tests, production build, Playwright interactions, and nonblank canvas rendering.
