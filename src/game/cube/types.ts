export type CubeFace = 'front' | 'right' | 'back' | 'left' | 'top' | 'bottom';

export type CubePresetId = 'starter' | 'standard';

export interface CubePreset {
  id: CubePresetId | string;
  label: string;
  size: number;
  mines: number;
}

export type CubeGameStatus = 'ready' | 'playing' | 'won' | 'lost';

export interface CubeCoordinate {
  face: CubeFace;
  row: number;
  col: number;
  depth: number;
}

export type CubeSurfaceCoordinate = Pick<CubeCoordinate, 'face' | 'row' | 'col'>;

export interface CubeCell {
  id: string;
  face: CubeFace;
  row: number;
  col: number;
  depth: number;
  hasMine: boolean;
  surfaceNeighborMines: number;
  isRevealed: boolean;
  isFlagged: boolean;
  isExploded: boolean;
  isIncorrectFlag: boolean;
}

export type CubeFaceBoard = CubeCell[][][];
export type CubeBoard = Record<CubeFace, CubeFaceBoard>;

export interface CubeGameState {
  preset: CubePreset;
  board: CubeBoard;
  status: CubeGameStatus;
  isArmed: boolean;
  revealedCount: number;
  flaggedCount: number;
}
