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
